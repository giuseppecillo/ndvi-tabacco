import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromArrayBuffer as readGeoTiff } from "geotiff";
import JSZip from "jszip";
import shpjs from "shpjs";
import proj4 from "proj4";
import {
  FASI_GRANO,
  FINESTRE_DAS_LOCALI_TEMPLATE,
  GRANO_DURO_DB,
  PROFILO_FENOLOGICO_GRANO,
  calcola,
  calcolaDensita,
  calcolaDensitaGrano,
  calcolaFabbisognoNGrano,
  calcolaPianoNGrano,
  calcolaQuotaNGrano,
  faseGranoConfermataDaBbch,
  faseGranoDaBbch,
  fasiGranoPerVarieta,
  granoKgHaDaSemiMq,
  granoSemiMqDaKgHa,
  ndviOttimaleGrano,
  ndviOttimale,
  profiloFenologicoGranoDaBbch,
  profiloFenologicoGranoDaDas,
  statisticheNdvi,
  stimaFaseGranoDaDas,
} from "./calculations";
import { serieDistribuzioneOsservazioni } from "./observationDistribution";
import type { Observation } from "./App";
import { groupObservations, ndviDeviation } from "./utils/observationHistory";
import { buildObservationWorkbook } from "./utils/observationExcel";
import { readFileSync } from "node:fs";
import { setLanguage, t } from "./i18n/runtime";
import {
  computeIdwGrid,
  findDoseCell,
  downloadGeoTiff,
  downloadShapefile,
  type KmlPolygon,
  type PolyIdwResult,
} from "./utils/geoUtils";

const EPSILON = 1e-9;

function idwExportFixture(): PolyIdwResult {
  return computeIdwGrid({
    name: "Campo export prova",
    ring: [
      [12.0000, 42.0000],
      [12.0012, 42.0000],
      [12.0012, 42.0009],
      [12.0000, 42.0009],
    ],
  }, [
    {
      obsId: "export-1",
      cliente: "A",
      appezzamento: "Campo",
      lng: 12.0003,
      lat: 42.0003,
      dose: 20,
      azotoTotale: 100,
      azotoGiaDistribuito: 50,
    },
    {
      obsId: "export-2",
      cliente: "A",
      appezzamento: "Campo",
      lng: 12.0009,
      lat: 42.0006,
      dose: 30,
      azotoTotale: 100,
      azotoGiaDistribuito: 50,
    },
  ], 10, 2);
}

// Export-only fixtures: an aligned 3×3 raster avoids IDW smoothing a zero
// towards positive controls. The L-shaped field contains five cell centres;
// the four bottom-right cells are outside, not zero-dose observations.
function zeroDoseExportFixture(mixed: boolean): PolyIdwResult {
  const step = 1 / 8192; // exactly representable, including bbox and centres
  const west = 12;
  const south = 42;
  const north = south + 3 * step;
  const doses = mixed ? [0, 12.5, 0, 25.125, 0] : [0, 0, 0, 0, 0];
  const cells = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]];
  const grid = cells.map(([col, row], index) => ({
    lng: west + (col + 0.5) * step,
    lat: north - (row + 0.5) * step,
    utmX: col * 10, // unused by the WGS84 export writers
    utmY: -row * 10,
    dose: doses[index],
  }));
  return {
    polygon: {
      name: mixed ? "Dose mista sintetica" : "Dose zero sintetica",
      ring: [[0, 0], [1, 0], [1, 2], [3, 2], [3, 3], [0, 3]]
        .map(([x, y]): [number, number] => [west + x * step, south + y * step]),
    },
    controls: [],
    grid,
    bbox: [west, south, west + 3 * step, north],
    utmZone: 33,
    utmSouth: false,
    cellSizeDeg: { lon: step, lat: step },
    stats: {
      min: 0,
      max: Math.max(...doses),
      mean: doses.reduce((sum, dose) => sum + dose, 0) / doses.length,
      count: doses.length,
    },
  };
}

async function captureDownload(run: () => void | Promise<void>): Promise<{ blob: Blob; filename: string }> {
  let blob: Blob | undefined;
  let filename = "";
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  URL.createObjectURL = ((value: Blob) => {
    blob = value;
    return "blob:test-export";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;
  globalThis.document = {
    createElement: () => ({
      href: "",
      style: {},
      get download() { return filename; },
      set download(value: string) { filename = value; },
      click: () => undefined,
    }),
    body: {
      appendChild: () => undefined,
      removeChild: () => undefined,
    },
  } as unknown as Document;

  try {
    await run();
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }

  assert.ok(blob, "the export must create a downloadable Blob");
  return { blob, filename };
}

function readDbf(buffer: ArrayBuffer): Array<Record<string, string>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const recordCount = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const fields: Array<{ name: string; length: number }> = [];

  for (let offset = 32; bytes[offset] !== 0x0d; offset += 32) {
    const rawName = decoder.decode(bytes.subarray(offset, offset + 11));
    fields.push({
      name: rawName.replace(/\0.*$/, ""),
      length: bytes[offset + 16],
    });
  }

  assert.equal(
    buffer.byteLength,
    headerLength + recordCount * recordLength,
    "DBF header and record lengths must cover the complete file",
  );

  return Array.from({ length: recordCount }, (_, index) => {
    let offset = headerLength + index * recordLength;
    assert.equal(bytes[offset++], 0x20, "DBF record must be active");
    return Object.fromEntries(fields.map((field) => {
      const value = decoder.decode(bytes.subarray(offset, offset + field.length)).trim();
      offset += field.length;
      return [field.name, value];
    }));
  });
}

function readTiffAsciiTag(buffer: ArrayBuffer, wantedTag: number): string {
  const view = new DataView(buffer);
  assert.equal(view.getUint16(0, false), 0x4949, "GeoTIFF must be little-endian");
  assert.equal(view.getUint16(2, true), 42, "GeoTIFF must have the TIFF magic number");
  const ifdOffset = view.getUint32(4, true);
  const entryCount = view.getUint16(ifdOffset, true);

  for (let index = 0; index < entryCount; index++) {
    const offset = ifdOffset + 2 + index * 12;
    if (view.getUint16(offset, true) !== wantedTag) continue;
    assert.equal(view.getUint16(offset + 2, true), 2, `TIFF tag ${wantedTag} must be ASCII`);
    const count = view.getUint32(offset + 4, true);
    const valueOffset = view.getUint32(offset + 8, true);
    assert.ok(valueOffset + count <= buffer.byteLength, `TIFF tag ${wantedTag} must stay inside the file`);
    return new TextDecoder().decode(new Uint8Array(buffer, valueOffset, count)).replace(/\0$/, "");
  }

  assert.fail(`TIFF tag ${wantedTag} not found`);
}

describe("registro per cliente e giornata ed export Excel", () => {
  const png = new Uint8Array(readFileSync(new URL("../public/taurus-logo.png", import.meta.url)));
  const logos = { taurus: png };
  const fixture = (changes: Partial<Observation> = {}): Observation => ({
    id: "p1", coltura: "tabacco", data: "2026-10-01", dataTrapianto: "2026-08-20",
    giorni: 42, etaPiantina: "standard", cliente: "Rossi", appezzamento: "Nord",
    resa: 4.5, varieta: "Burley", n1: .5, n2: .5, n3: .5, n4: .5, n5: .5,
    media: .5, ottimale: .64, discostamento: .14, dose: 26.3, azotoTotale: 120,
    azotoGiaDistribuito: 0, lat: 42.0003, lng: 12.0003, ...changes,
  });

  it("raggruppa tutti i punti per cliente e data di rilievo, non per data di salvataggio", () => {
    const input = [
      fixture({ createdAt: "2026-10-02T12:00:00Z" }),
      fixture({ id: "p2", appezzamento: "Sud", createdAt: "2026-10-03T12:00:00Z" }),
      fixture({ id: "p3", data: "2026-10-02", createdAt: null }),
      fixture({ id: "p4", cliente: "Altro cliente" }),
    ];
    const groups = groupObservations(input);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].date, "2026-10-02");
    const rossi = groups.find(g => g.cliente === "Rossi" && g.date === "2026-10-01")!;
    assert.deepEqual(rossi.observations.map(o => o.id), ["p2", "p1"]);
    assert.equal(input[0].id, "p1");
  });

  it("usa uno scostamento coerente medio meno ottimale, senza inventare percentuali a denominatore zero", () => {
    const below = ndviDeviation(fixture());
    assert.ok(Math.abs(below.absolute! + .14) < 1e-10);
    assert.ok(Math.abs(below.percent! + 21.875) < 1e-10);
    assert.ok(ndviDeviation(fixture({ media: .8 })).absolute! > 0);
    assert.equal(ndviDeviation(fixture({ ottimale: 0 })).percent, null);
    assert.deepEqual(ndviDeviation(fixture({ media: NaN })), { absolute: null, percent: null });
  });

  it("esporta tutti i punti in un vero XLSX con valori numerici e testi utente mai eseguiti come formule", async () => {
    const group = groupObservations([
      fixture({ id: "=SUM(1,2)", cliente: "Rossi & Figli", appezzamento: "<Nord>" }),
      fixture({ id: "p2", cliente: "Rossi & Figli", lat: null, lng: null, createdAt: null }),
    ])[0];
    const zip = await JSZip.loadAsync(await buildObservationWorkbook(group, s => `EN ${s}`, logos));
    assert.ok(zip.file("[Content_Types].xml"));
    assert.ok(zip.file("xl/workbook.xml"));
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    assert.equal((sheet.match(/<row r=/g) ?? []).length, 6);
    assert.ok(sheet.includes('r="E1"'));
    assert.ok(sheet.includes("NitroCrop NDVI"));
    assert.ok(sheet.includes("EN Tutti i diritti Riservati"));
    assert.equal(zip.file("xl/media/nitrocrop.png"), null);
    assert.ok(zip.file("xl/media/taurus.png"));
    assert.ok(zip.file("xl/drawings/drawing1.xml"));
    assert.ok(zip.file("xl/worksheets/_rels/sheet1.xml.rels"));
    assert.ok(sheet.includes("EN NDVI medio"));
    assert.ok(sheet.includes("=SUM(1,2)"));
    assert.ok(sheet.includes("Rossi &amp; Figli"));
    assert.ok(sheet.includes("&lt;Nord&gt;"));
    assert.ok(sheet.includes("<v>26.3</v>"));
    assert.ok(sheet.includes("<v>-21.875"));
    assert.ok(!sheet.includes("<f>"));
    assert.ok(!sheet.includes("NaN"));
    assert.ok(!sheet.includes("Infinity"));
  });

  it("traduce le intestazioni del file Excel in inglese e spagnolo senza tradurre i dati del cliente", async () => {
    const group = groupObservations([fixture({ cliente: "Azienda Rossi" })])[0];
    try {
      for (const language of ["en", "es"] as const) {
        setLanguage(language);
        const zip = await JSZip.loadAsync(await buildObservationWorkbook(group, t, logos));
        const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
        assert.ok(sheet.includes(language === "en" ? "Phenological stage" : "Fase fenológica"));
        assert.ok(sheet.includes(t("Tutti i diritti Riservati")));
        const header = sheet.match(/<row r="6">([\s\S]*?)<\/row>/)![1];
        for (const italian of ["Cliente", "Data del rilievo", "Appezzamento", "Varietà", "Fase fenologica", "Fonte della fase", "Età piantina", "Scostamento registrato"]) {
          assert.ok(header.includes(t(italian)));
        }
        assert.notEqual(t("Fase fenologica"), "Fase fenologica");
        assert.ok(sheet.includes("Azienda Rossi"));
      }
    } finally {
      setLanguage("it");
    }
  });
});

describe("riepilogo azoto della mappa IDW", () => {
  it("legge la dose della cella sulla mappa senza estrapolare fuori dal poligono", () => {
    const result = computeIdwGrid({
      name: "Campo consultabile",
      ring: [[12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009]],
    }, [{ obsId: "click", cliente: "A", appezzamento: "Campo", lng: 12.0003, lat: 42.0003, dose: 20, azotoTotale: 100 }]);
    const cell = result.grid[0];
    assert.ok(cell);
    assert.equal(findDoseCell(result, cell.lng, cell.lat), cell);
    assert.equal(findDoseCell(result, 12.0006, 42.00045)?.dose, 20);
    assert.equal(findDoseCell(result, 12.1, 42.1), undefined);
    assert.equal(findDoseCell(result, NaN, 42), undefined);
    assert.equal(findDoseCell({ ...result, grid: [] }, 12.0006, 42.00045), undefined);
  });

  it("mantiene la mappa senza inventare risparmi quando il piano manca o è incompleto", () => {
    const polygon = {
      name: "Piano incompleto",
      ring: [[12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009]] as [number, number][],
    };
    const point = { obsId: "legacy", cliente: "A", appezzamento: "Campo", lng: 12.0003, lat: 42.0003, dose: 20 };
    for (const controls of [
      [point],
      [point, { ...point, obsId: "complete", lng: 12.0009, azotoTotale: 100, azotoGiaDistribuito: 50 }],
      [{ ...point, azotoTotale: Number.NaN }],
      [{ ...point, azotoTotale: -1 }],
    ]) {
      const result = computeIdwGrid(polygon, controls);
      assert.ok(result.grid.length > 0);
      assert.equal(result.nitrogenSummary, undefined);
    }
  });

  it("mostra uno zero reale e non confonde un piano nullo con dati mancanti", () => {
    const result = computeIdwGrid({
      name: "Piano zero",
      ring: [[12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009]],
    }, [{ obsId: "zero", cliente: "A", appezzamento: "Campo", lng: 12.0003, lat: 42.0003, dose: 0, azotoTotale: 0, azotoGiaDistribuito: 0 }]);
    assert.ok(result.nitrogenSummary);
    assert.equal(result.nitrogenSummary.savedTotalKg, 0);
    assert.equal(result.nitrogenSummary.savedPercent, 0);
  });

  it("confronta piano e dose IDW sull'intera superficie del poligono", () => {
    const polygon = {
      name: "Campo prova",
      ring: [
        [12.0000, 42.0000],
        [12.0012, 42.0000],
        [12.0012, 42.0009],
        [12.0000, 42.0009],
      ] as [number, number][],
    };
    const controls = [
      { obsId: 1, cliente: "A", appezzamento: "Campo", lng: 12.0003, lat: 42.0003, dose: 20, azotoTotale: 100, azotoGiaDistribuito: 50 },
      { obsId: 2, cliente: "A", appezzamento: "Campo", lng: 12.0009, lat: 42.0006, dose: 30, azotoTotale: 100, azotoGiaDistribuito: 50 },
    ];

    const result = computeIdwGrid(polygon, controls, 10, 2);
    const summary = result.nitrogenSummary;

    assert.ok(summary);
    assert.ok(summary.areaHa > 0.8 && summary.areaHa < 1.2);
    assert.equal(summary.plannedPerHa, 100);
    assert.ok(summary.indicatedPerHa > 70 && summary.indicatedPerHa < 80);
    assert.ok(summary.savedPerHa > 20 && summary.savedPerHa < 30);
    assert.ok(summary.savedPercent > 20 && summary.savedPercent < 30);
    assert.ok(Math.abs(summary.plannedTotalKg - summary.plannedPerHa * summary.areaHa) < EPSILON);
    assert.ok(Math.abs(summary.savedTotalKg - summary.savedPerHa * summary.areaHa) < EPSILON);
  });

  it("non riporta risparmio negativo se la dose IDW supera il piano", () => {
    const result = computeIdwGrid({
      name: "Campo prova",
      ring: [
        [12.0000, 42.0000],
        [12.0012, 42.0000],
        [12.0012, 42.0009],
        [12.0000, 42.0009],
      ],
    }, [
      { obsId: 1, cliente: "A", appezzamento: "Campo", lng: 12.0006, lat: 42.0004, dose: 60, azotoTotale: 100, azotoGiaDistribuito: 50 },
    ]);

    assert.equal(result.nitrogenSummary?.indicatedPerHa, 100);
    assert.equal(result.nitrogenSummary?.savedPerHa, 0);
    assert.equal(result.nitrogenSummary?.savedTotalKg, 0);
    assert.equal(result.nitrogenSummary?.savedPercent, 0);
  });
});

describe("mappe sintetiche al confine UTM 32/33 (12° est)", () => {
  // About 100 × 100 m at 42° N. The two crossing fields select opposite
  // zones: neither grid nodes nor controls may select a zone individually.
  const cases = [
    { name: "ovest", centre: 11.9992, zone: 32, crosses: false },
    { name: "est", centre: 12.0008, zone: 33, crosses: false },
    { name: "a cavallo, centro ovest", centre: 11.99995, zone: 32, crosses: true },
    { name: "a cavallo, centro est", centre: 12.00005, zone: 33, crosses: true },
  ];
  function fixture(centre: number) {
    return computeIdwGrid({
      name: "Confine sintetico",
      ring: [
        [centre - 0.0006, 42], [centre + 0.0006, 42],
        [centre + 0.0006, 42.0009], [centre - 0.0006, 42.0009],
      ],
    }, [
      { obsId: "boundary-west", cliente: "Sintetico", appezzamento: "Confine",
        lng: centre - 0.0003, lat: 42.0003, dose: 20 },
      { obsId: "boundary-east", cliente: "Sintetico", appezzamento: "Confine",
        lng: centre + 0.0003, lat: 42.0006, dose: 40 },
    ], 10, 2);
  }
  // Independent local geographic distance, not proj4 or the production IDW.
  // Over 100 m the spherical approximation differs from WGS84 by <0.3%.
  function metres(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
    const rad = Math.PI / 180;
    return 6_371_008.8 * rad * Math.hypot(
      (a.lng - b.lng) * Math.cos((a.lat + b.lat) / 2 * rad), a.lat - b.lat,
    );
  }
  function assertExtent(points: Array<{ lng: number; lat: number }>, result: PolyIdwResult) {
    assert.ok(points.length > 80 && points.length < 120, "a roughly 1 ha field has about 100 cells");
    const [west, south, east, north] = result.bbox;
    for (const point of points) {
      assert.ok(point.lng >= west && point.lng <= east, "longitude stays inside the field");
      assert.ok(point.lat >= south && point.lat <= north, "latitude stays inside the field");
    }
    const margin = 0.00015; // <17 m, at most about one cell at the edge
    assert.ok(Math.min(...points.map(p => p.lng)) < west + margin);
    assert.ok(Math.max(...points.map(p => p.lng)) > east - margin);
    assert.ok(Math.min(...points.map(p => p.lat)) < south + margin);
    assert.ok(Math.max(...points.map(p => p.lat)) > north - margin);
  }

  for (const testCase of cases) {
    describe(testCase.name, () => {
      it("mantiene estensione, passo metrico, continuità e dosi IDW senza salti di fuso", () => {
        const result = fixture(testCase.centre);
        assert.equal(result.utmZone, testCase.zone);
        assert.equal(result.utmSouth, false);
        assert.deepEqual(result.bbox, [testCase.centre - 0.0006, 42, testCase.centre + 0.0006, 42.0009]);
        assertExtent(result.grid, result);
        const minX = Math.min(...result.grid.map(p => p.utmX));
        const minY = Math.min(...result.grid.map(p => p.utmY));
        const cells = new Map(result.grid.map(p => {
          const col = (p.utmX - minX) / 10;
          const row = (p.utmY - minY) / 10;
          assert.ok(Math.abs(col - Math.round(col)) < EPSILON);
          assert.ok(Math.abs(row - Math.round(row)) < EPSILON);
          return [`${Math.round(col)},${Math.round(row)}`, p] as const;
        }));
        assert.equal(cells.size, result.grid.length, "no duplicate grid cells");
        let crossingEdges = 0;
        const visited = new Set<string>();
        const queue = [cells.keys().next().value!];
        for (let i = 0; i < queue.length; i++) {
          const key = queue[i];
          if (visited.has(key)) continue;
          visited.add(key);
          const point = cells.get(key)!;
          const [col, row] = key.split(",").map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const neighbourKey = `${col + dx},${row + dy}`;
            const neighbour = cells.get(neighbourKey);
            if (!neighbour) continue;
            const distance = metres(point, neighbour);
            assert.ok(distance > 9.9 && distance < 10.1, "adjacent cells remain 10 m apart in WGS84");
            assert.ok(Math.abs(point.dose - neighbour.dose) < 10, "no abrupt dose discontinuity");
            if ((point.lng < 12) !== (neighbour.lng < 12)) crossingEdges++;
            if (!visited.has(neighbourKey)) queue.push(neighbourKey);
          }
        }
        assert.equal(visited.size, cells.size, "the entire field is connected, including across 12° E");
        assert.equal(crossingEdges > 0, testCase.crosses);
        for (const point of result.grid) {
          const [a, b] = result.controls;
          const wa = 1 / metres(point, a) ** 2;
          const wb = 1 / metres(point, b) ** 2;
          const expected = (wa * a.dose + wb * b.dose) / (wa + wb);
          assert.ok(Number.isFinite(point.dose) && point.dose >= 20 && point.dose <= 40);
          assert.ok(Math.abs(point.dose - expected) < 0.06, "IDW agrees with independent geographic distances");
        }
        assert.equal(result.stats.count, result.grid.length);
        assert.equal(result.stats.min, Math.min(...result.grid.map(p => p.dose)));
        assert.equal(result.stats.max, Math.max(...result.grid.map(p => p.dose)));
        assert.ok(Math.abs(result.stats.mean - 30) < 1);
      });

      it("riapre lo Shapefile in WGS84 con tutta la griglia e le dosi originali", async () => {
        const result = fixture(testCase.centre);
        const { blob } = await captureDownload(() => downloadShapefile(result));
        const buffer = await blob.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const prj = Object.values(zip.files).filter(entry => entry.name.endsWith(".prj"));
        assert.equal(prj.length, 1);
        const wkt = await prj[0].async("string");
        assert.match(wkt, /^GEOGCS\["GCS_WGS_1984"/); // ESRI WKT for EPSG:4326
        assert.doesNotMatch(wkt, /PROJCS|UTM/);
        const collection = await shpjs(buffer);
        assert.ok(!Array.isArray(collection), "exactly one exported layer");
        assert.equal(collection.features.length, result.grid.length);
        const points = collection.features.map((feature, index) => {
          const expected = result.grid[index];
          assert.equal(feature.geometry.type, "Point");
          const [lng, lat] = feature.geometry.coordinates;
          assert.ok(Math.abs(lng - expected.lng) < EPSILON);
          assert.ok(Math.abs(lat - expected.lat) < EPSILON);
          assert.equal(feature.properties.DOSE_IDW, Number(expected.dose.toFixed(4)));
          assert.equal(feature.properties.LAT, Number(expected.lat.toFixed(8)));
          assert.equal(feature.properties.LNG, Number(expected.lng.toFixed(8)));
          return { lng, lat };
        });
        assertExtent(points, result);
        if (testCase.crosses) {
          assert.ok(points.some(p => p.lng < 12) && points.some(p => p.lng > 12));
        }
      });

      it("riapre il GeoTIFF EPSG:4326 senza perdita di estensione o salti al meridiano", async () => {
        const result = fixture(testCase.centre);
        const { blob } = await captureDownload(() => downloadGeoTiff(result));
        const tiff = await readGeoTiff(await blob.arrayBuffer());
        const image = await tiff.getImage();
        const [west, south, east, north] = result.bbox;
        const { lon, lat } = result.cellSizeDeg;
        const cols = Math.ceil((east - west) / lon);
        const rows = Math.ceil((north - south) / lat);
        assert.equal(image.getWidth(), cols);
        assert.equal(image.getHeight(), rows);
        assert.ok(cols >= 9 && cols <= 11 && rows >= 10 && rows <= 11);
        assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
        assert.equal(image.getGeoKeys().GTModelTypeGeoKey, 2);
        assert.equal(image.getGeoKeys().GTRasterTypeGeoKey, 1);
        assert.deepEqual(image.getOrigin(), [west, north, 0]);
        assert.deepEqual(image.getResolution(), [lon, -lat, 0]);
        const bounds = image.getBoundingBox();
        assert.ok(Math.abs(bounds[0] - west) < EPSILON && Math.abs(bounds[3] - north) < EPSILON);
        assert.ok(bounds[2] >= east && bounds[2] - east < lon);
        assert.ok(bounds[1] <= south && south - bounds[1] < lat);
        assert.equal(image.getGDALNoData(), -9999);
        const expected = new Float32Array(cols * rows).fill(-9999);
        for (const point of result.grid) {
          const col = Math.floor((point.lng - west) / lon);
          const row = Math.floor((north - point.lat) / lat);
          assert.ok(col >= 0 && col < cols && row >= 0 && row < rows);
          // Independent rectangular mask for raster pixel centres.
          if (west + (col + 0.5) * lon >= east || north - (row + 0.5) * lat <= south) continue;
          const index = row * cols + col;
          expected[index] = Math.fround(Math.max(expected[index], point.dose));
        }
        const raster = await image.readRasters({ interleave: true });
        assert.deepEqual(Array.from(raster), Array.from(expected));
        const points: Array<{ lng: number; lat: number }> = [];
        for (let row = 0; row < rows; row++) {
          const validCols: number[] = [];
          for (let col = 0; col < cols; col++) {
            const value = raster[row * cols + col];
            if (value === -9999) continue;
            assert.ok(Number.isFinite(value) && value >= 20 && value <= 40);
            validCols.push(col);
            points.push({ lng: west + (col + 0.5) * lon, lat: north - (row + 0.5) * lat });
          }
          if (validCols.length) {
            assert.equal(validCols.length, validCols.at(-1)! - validCols[0] + 1, "no internal raster gap");
          }
        }
        assertExtent(points, result);
        if (testCase.crosses) {
          assert.ok(points.some(p => p.lng < 12) && points.some(p => p.lng > 12));
        }
      });
    });
  }

  it("non cambia scala o valori spostando il centro di pochi metri dal fuso 32 al 33", () => {
    const west = fixture(11.99995);
    const east = fixture(12.00005);
    assert.equal(west.utmZone, 32);
    assert.equal(east.utmZone, 33);
    // UTM axes rotate slightly between zones; the discretised edge cells need
    // not coincide. Compare physical coverage and aggregate doses, not indices.
    assert.ok(Math.abs(west.grid.length - east.grid.length) <= 5);
    assert.ok(Math.abs(west.stats.mean - east.stats.mean) < 1);
    assert.ok(Math.abs(west.stats.min - east.stats.min) < 1);
    assert.ok(Math.abs(west.stats.max - east.stats.max) < 1);
    assert.deepEqual(west.cellSizeDeg, east.cellSizeDeg);
  });
});

describe("campi irregolari sintetici a cavallo di 12° est", () => {
  // A ~140 × 134 m field. A north-facing notch leaves a connected U;
  // the same rectangle with an interior exclusion leaves a connected annulus.
  // Both exclusions straddle the meridian. Test both choices of field-wide CRS.
  for (const centre of [11.99995, 12.00005]) {
    for (const shape of ["concavo", "con foro"] as const) {
      describe(`${shape}, centro ${centre < 12 ? "ovest" : "est"}`, () => {
        const west = centre - 0.00085;
        const south = 42;
        const width = 0.0017;
        const height = 0.0012;
        const xy = (x: number, y: number): [number, number] =>
          [west + x * width, south + y * height];
        const ring = (coords: number[][]) => coords.map(([x, y]) => xy(x, y));
        const polygon: KmlPolygon = {
          name: `Sintetico ${shape}`,
          ring: ring(shape === "concavo"
            ? [[0, 0], [1, 0], [1, 1], [.65, 1], [.65, .4], [.35, .4], [.35, 1], [0, 1]]
            : [[0, 0], [1, 0], [1, 1], [0, 1]]),
          ...(shape === "con foro"
            ? { holes: [ring([[.35, .35], [.65, .35], [.65, .7], [.35, .7]])] } : {}),
        };
        // Analytic rectangle mask, deliberately independent of pointInField.
        const excluded = (lng: number, lat: number) =>
          lng >= xy(.35, 0)[0] && lng <= xy(.65, 0)[0] &&
          lat >= xy(0, shape === "concavo" ? .4 : .35)[1] &&
          (shape === "concavo" || lat <= xy(0, .7)[1]);
        const cultivated = (lng: number, lat: number) =>
          lng > west && lng < west + width && lat > south && lat < south + height &&
          !excluded(lng, lat);
        const controls = [
          { obsId: "west", cliente: "Sintetico", appezzamento: "Irregolare",
            lng: xy(.15, .25)[0], lat: xy(.15, .25)[1], dose: 20 },
          { obsId: "east", cliente: "Sintetico", appezzamento: "Irregolare",
            lng: xy(.85, .8)[0], lat: xy(.85, .8)[1], dose: 40 },
        ];
        const fixture = () => computeIdwGrid(polygon, controls, 10, 2);
        function assertConnected(cells: Map<string, { lng: number; lat: number }>) {
          assert.ok(cells.size > 0);
          const visited = new Set<string>();
          const queue = [cells.keys().next().value!];
          let crossingEdges = 0;
          for (let i = 0; i < queue.length; i++) {
            const key = queue[i];
            if (visited.has(key)) continue;
            visited.add(key);
            const [col, row] = key.split(",").map(Number);
            const point = cells.get(key)!;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const next = `${col + dx},${row + dy}`;
              const neighbour = cells.get(next);
              if (!neighbour) continue;
              if ((point.lng < 12) !== (neighbour.lng < 12)) crossingEdges++;
              if (!visited.has(next)) queue.push(next);
            }
          }
          assert.equal(visited.size, cells.size, "all cultivated arms remain connected");
          assert.ok(crossingEdges > 0, "connected cells cross 12° E");
        }
        function assertCoverage(points: Array<{ lng: number; lat: number }>) {
          for (const p of points) assert.ok(cultivated(p.lng, p.lat), "no dose in an excluded area");
          // Do not accept an empty map, a single surviving arm, or a lost bridge.
          for (const [x, y] of [[.15, .2], [.85, .2], [.15, .8], [.85, .8], [.5, .15],
            ...(shape === "con foro" ? [[.5, .85]] : [])]) {
            const [lng, lat] = xy(x, y);
            assert.ok(points.some(p => Math.hypot(
              (p.lng - lng) * 82_700, (p.lat - lat) * 111_100,
            ) < 15), `cultivated probe ${x},${y} has a cell within 15 m`);
          }
        }

        it("copre tutti e soli i centri coltivati con passo 10 m e IDW continuo", () => {
          const result = fixture();
          const zone = centre < 12 ? 32 : 33;
          assert.equal(result.utmZone, zone);
          assert.equal(result.utmSouth, false);
          const crs = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
          const vertices = polygon.ring.map(p => proj4("EPSG:4326", crs, p));
          const minX = Math.min(...vertices.map(p => p[0]));
          const minY = Math.min(...vertices.map(p => p[1]));
          const maxX = Math.max(...vertices.map(p => p[0]));
          const maxY = Math.max(...vertices.map(p => p[1]));
          const cells = new Map(result.grid.map(p => {
            const col = (p.utmX - minX - 5) / 10;
            const row = (p.utmY - minY - 5) / 10;
            assert.ok(Math.abs(col - Math.round(col)) < EPSILON);
            assert.ok(Math.abs(row - Math.round(row)) < EPSILON);
            return [`${Math.round(col)},${Math.round(row)}`, p] as const;
          }));
          assert.equal(cells.size, result.grid.length, "no duplicate cells");
          for (let row = 0; minY + 5 + row * 10 <= maxY; row++) {
            for (let col = 0; minX + 5 + col * 10 <= maxX; col++) {
              const [lng, lat] = proj4(crs, "EPSG:4326", [minX + 5 + col * 10, minY + 5 + row * 10]);
              assert.equal(cells.has(`${col},${row}`), cultivated(lng, lat),
                `complete independent mask at ${col},${row}`);
            }
          }
          assertCoverage(result.grid);
          assertConnected(cells);
          for (const point of result.grid) {
            const weights = controls.map(c => {
              const rad = Math.PI / 180;
              const distance = 6_371_008.8 * rad * Math.hypot(
                (point.lng - c.lng) * Math.cos((point.lat + c.lat) / 2 * rad), point.lat - c.lat,
              );
              return 1 / distance ** 2;
            });
            const expected = (weights[0] * 20 + weights[1] * 40) / (weights[0] + weights[1]);
            assert.ok(point.dose >= 20 && point.dose <= 40);
            assert.ok(Math.abs(point.dose - expected) < .06, "IDW agrees with geographic distances");
          }
          assert.equal(result.stats.count, cells.size);
        });

        it("non restituisce dosi nelle esclusioni né usa i controlli interni al foro", () => {
          const result = fixture();
          const probes = shape === "con foro"
            ? [[.5, .5], [.35, .5], [.65, .5], [.5, .35], [.5, .7], [.35, .35], [.65, .7]]
            : [[.5, .5], [.5, .9]];
          for (const [x, y] of probes) assert.equal(findDoseCell(result, ...xy(x, y)), undefined);
          if (shape === "con foro") {
            const poisoned = probes.map(([x, y], i) => ({
              ...controls[0], obsId: `excluded-${i}`, lng: xy(x, y)[0], lat: xy(x, y)[1], dose: 999_999,
            }));
            const withExcludedControls = computeIdwGrid(polygon, [...controls, ...poisoned], 10, 2);
            assert.deepEqual(withExcludedControls, result, "hole interior and edge controls have no effect");
            assert.equal(computeIdwGrid(polygon, poisoned).grid.length, 0);
          }
        });

        it("riapre lo Shapefile WGS84 senza riempire concavità o foro", async () => {
          const result = fixture();
          const { blob } = await captureDownload(() => downloadShapefile(result));
          const buffer = await blob.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);
          const prj = Object.values(zip.files).filter(f => f.name.endsWith(".prj"));
          assert.equal(prj.length, 1);
          assert.match(await prj[0].async("string"), /^GEOGCS\["GCS_WGS_1984"/);
          const parsed = await shpjs(buffer);
          assert.ok(!Array.isArray(parsed));
          assert.equal(parsed.features.length, result.grid.length);
          const points = parsed.features.map((feature, i) => {
            assert.equal(feature.geometry.type, "Point");
            const [lng, lat] = feature.geometry.coordinates;
            assert.ok(Math.abs(lng - result.grid[i].lng) < EPSILON);
            assert.ok(Math.abs(lat - result.grid[i].lat) < EPSILON);
            assert.equal(feature.properties.DOSE_IDW, Number(result.grid[i].dose.toFixed(4)));
            return { lng, lat };
          });
          assertCoverage(points);
        });

        it("riapre il GeoTIFF WGS84 con dosi corrette e NoData nelle zone escluse", async () => {
          const result = fixture();
          const { blob } = await captureDownload(() => downloadGeoTiff(result));
          const image = await (await readGeoTiff(await blob.arrayBuffer())).getImage();
          const { lon, lat } = result.cellSizeDeg;
          const north = south + height;
          const cols = Math.ceil(width / lon);
          const rows = Math.ceil(height / lat);
          assert.equal(image.getWidth(), cols);
          assert.equal(image.getHeight(), rows);
          assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
          assert.equal(image.getGeoKeys().GTModelTypeGeoKey, 2);
          assert.equal(image.getGeoKeys().GTRasterTypeGeoKey, 1);
          assert.deepEqual(image.getOrigin(), [west, north, 0]);
          assert.deepEqual(image.getResolution(), [lon, -lat, 0]);
          assert.equal(image.getGDALNoData(), -9999);
          const expected = new Float32Array(cols * rows).fill(-9999);
          for (const p of result.grid) {
            const col = Math.floor((p.lng - west) / lon);
            const row = Math.floor((north - p.lat) / lat);
            if (!cultivated(west + (col + .5) * lon, north - (row + .5) * lat)) continue;
            const i = row * cols + col;
            expected[i] = Math.fround(Math.max(expected[i], p.dose));
          }
          const raster = await image.readRasters({ interleave: true });
          assert.deepEqual(Array.from(raster), Array.from(expected));
          const cells = new Map<string, { lng: number; lat: number }>();
          let excludedPixels = 0;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const lng = west + (col + .5) * lon;
              const y = north - (row + .5) * lat;
              const value = raster[row * cols + col];
              if (excluded(lng, y)) {
                excludedPixels++;
                assert.equal(value, -9999, "excluded pixel centres must never receive a dose");
              }
              if (value === -9999) continue;
              assert.ok(value >= 20 && value <= 40);
              cells.set(`${col},${row}`, { lng, lat: y });
            }
          }
          assert.ok(excludedPixels >= 10, "the exclusion is large enough to test multiple pixels");
          assertCoverage([...cells.values()]);
          assertConnected(cells);
        });
      });
    }
  }
});

describe("mappe sintetiche a cavallo dell'equatore", () => {
  // ~100 × 100 m on the central meridian of zone 33, far from a zone
  // boundary. Both fields AND both pairs of controls straddle latitude zero.
  // No observations, database, or external fixtures are used.
  function fixture(centre: number, reversed = false, closed = false) {
    const ring: KmlPolygon["ring"] = [
      [14.99955, centre - 0.00045], [15.00045, centre - 0.00045],
      [15.00045, centre + 0.00045], [14.99955, centre + 0.00045],
    ];
    if (reversed) ring.reverse();
    if (closed) ring.push([...ring[0]]);
    return computeIdwGrid({
      name: "Equatore sintetico",
      ring,
    }, [
      { obsId: "equator-south", cliente: "Sintetico", appezzamento: "Equatore",
        lng: 14.9998, lat: centre - 0.00025, dose: 20 },
      { obsId: "equator-north", cliente: "Sintetico", appezzamento: "Equatore",
        lng: 15.0002, lat: centre + 0.00025, dose: 40 },
    ], 10, 2);
  }
  // Independent WGS84 equatorial scales (a*pi/180 and a*(1-e²)*pi/180).
  // At these sub-100 m offsets, curvature corrections are negligible.
  // Do not use proj4 or the production IDW as the expected-value oracle.
  const metresLon = 111_319.490793;
  const metresLat = 110_574.275822;
  function metres(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
    return Math.hypot((a.lng - b.lng) * metresLon, (a.lat - b.lat) * metresLat);
  }
  function assertExtent(points: Array<{ lng: number; lat: number }>, result: PolyIdwResult) {
    const [west, south, east, north] = result.bbox;
    assert.ok(points.length >= 90 && points.length <= 110, "roughly 1 ha, not a false-northing-sized grid");
    assert.ok(points.some(p => p.lat < 0) && points.some(p => p.lat > 0), "both hemispheres survive");
    for (const p of points) {
      assert.ok(p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north);
    }
    const margin = 0.0001; // about one 10 m cell at each edge
    assert.ok(Math.min(...points.map(p => p.lng)) - west < margin);
    assert.ok(east - Math.max(...points.map(p => p.lng)) < margin);
    assert.ok(Math.min(...points.map(p => p.lat)) - south < margin);
    assert.ok(north - Math.max(...points.map(p => p.lat)) < margin);
  }

  for (const { label, centre, south, reversed, closed } of [
    { label: "centro appena a nord", centre: 0.00005, south: false, reversed: false, closed: false },
    { label: "centro appena a sud", centre: -0.00005, south: true, reversed: false, closed: false },
    ...[false, true].flatMap(reversed => [false, true].map(closed => ({
      label: `centro esattamente zero, anello ${reversed ? "invertito" : "originale"} ${closed ? "chiuso" : "aperto"}`,
      centre: 0, south: false, reversed, closed,
    }))),
  ]) {
    describe(label, () => {
      it("usa un unico emisfero UTM con celle di 10 m e dosi continue attraverso l'equatore", () => {
        const result = fixture(centre, reversed, closed);
        assert.equal(result.utmZone, 33);
        assert.equal(result.utmSouth, south);
        assert.deepEqual(result.bbox, [14.99955, centre - 0.00045, 15.00045, centre + 0.00045]);
        if (centre === 0) {
          assert.equal((result.bbox[1] + result.bbox[3]) / 2, 0, "centre is exactly zero, not merely near zero");
          const baseline = fixture(0);
          // Compare every coordinate and dose, not just the hemisphere flag:
          // vertex order and a repeated closing vertex must not move the grid.
          assert.deepEqual(result.grid, baseline.grid);
          assert.deepEqual(result.stats, baseline.stats);
          assert.deepEqual(result.cellSizeDeg, baseline.cellSizeDeg);
          assert.ok(result.grid.some(p => p.utmY < 0), "northern reference keeps negative northings south of zero");
          assert.ok(result.grid.some(p => p.utmY > 0));
        }
        assertExtent(result.grid, result);
        assert.ok(result.controls[0].lat < 0 && result.controls[1].lat > 0);
        const minX = Math.min(...result.grid.map(p => p.utmX));
        const minY = Math.min(...result.grid.map(p => p.utmY));
        const cells = new Map(result.grid.map(p => {
          const col = (p.utmX - minX) / 10;
          const row = (p.utmY - minY) / 10;
          assert.ok(Math.abs(col - Math.round(col)) < 1e-7);
          assert.ok(Math.abs(row - Math.round(row)) < 1e-7);
          // One false northing for the entire field, NOT one per vertex,
          // control or cell. Northern UTM permits negative northings here;
          // southern UTM permits values above 10,000,000 m north of zero.
          const northing = p.utmY - (south ? 10_000_000 : 0);
          assert.ok(Math.abs(northing - p.lat * metresLat * 0.9996) < 0.01);
          assert.ok(Math.abs(p.utmX - 500_000 - (p.lng - 15) * metresLon * 0.9996) < 0.01);
          const weights = result.controls.map(c => 1 / metres(p, c) ** 2);
          const expected = weights.reduce((sum, w, i) => sum + w * result.controls[i].dose, 0)
            / weights.reduce((sum, w) => sum + w, 0);
          assert.ok(Number.isFinite(p.dose) && p.dose >= 20 && p.dose <= 40);
          assert.ok(Math.abs(p.dose - expected) < 0.001, "independent metric IDW on both sides");
          return [`${Math.round(col)},${Math.round(row)}`, p] as const;
        }));
        assert.equal(cells.size, result.grid.length);
        const visited = new Set<string>();
        const queue = [cells.keys().next().value!];
        let crossingEdges = 0;
        for (let i = 0; i < queue.length; i++) {
          const key = queue[i];
          if (visited.has(key)) continue;
          visited.add(key);
          const p = cells.get(key)!;
          const [col, row] = key.split(",").map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const neighbourKey = `${col + dx},${row + dy}`;
            const neighbour = cells.get(neighbourKey);
            if (!neighbour) continue;
            assert.ok(Math.abs(metres(p, neighbour) - 10) < 0.01, "physical spacing stays 10 m");
            assert.ok(Math.abs(p.dose - neighbour.dose) < 8, "no dose jump at latitude zero");
            if ((p.lat < 0) !== (neighbour.lat < 0)) crossingEdges++;
            if (!visited.has(neighbourKey)) queue.push(neighbourKey);
          }
        }
        assert.ok(crossingEdges > 0, "actually checked neighbours across the equator");
        assert.equal(visited.size, cells.size, "no disconnected hemisphere");
        assert.equal(result.stats.count, cells.size);
      });

      it("riapre con shpjs lo Shapefile WGS84 conservando coordinate e dosi nei due emisferi", async () => {
        const result = fixture(centre, reversed, closed);
        const { blob } = await captureDownload(() => downloadShapefile(result));
        const buffer = await blob.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const prj = Object.values(zip.files).filter(entry => entry.name.endsWith(".prj"));
        assert.equal(prj.length, 1);
        const wkt = await prj[0].async("string");
        assert.match(wkt, /^GEOGCS\["GCS_WGS_1984"/); // ESRI WKT equivalent of EPSG:4326
        assert.doesNotMatch(wkt, /PROJCS|UTM/);
        const collection = await shpjs(buffer);
        assert.ok(!Array.isArray(collection), "one exported layer");
        assert.equal(collection.features.length, result.grid.length);
        const points = collection.features.map((feature, index) => {
          const expected = result.grid[index];
          assert.equal(feature.geometry.type, "Point");
          const [lng, lat] = feature.geometry.coordinates;
          assert.ok(Math.abs(lng - expected.lng) < EPSILON);
          assert.ok(Math.abs(lat - expected.lat) < EPSILON);
          assert.equal(feature.properties.DOSE_IDW, Number(expected.dose.toFixed(4)));
          assert.equal(feature.properties.LAT, Number(expected.lat.toFixed(8)));
          assert.equal(feature.properties.LNG, Number(expected.lng.toFixed(8)));
          return { lng, lat };
        });
        assertExtent(points, result);
      });

      it("riapre con geotiff il raster EPSG:4326 senza vuoti o dosi alterate all'equatore", async () => {
        const result = fixture(centre, reversed, closed);
        const { blob } = await captureDownload(() => downloadGeoTiff(result));
        const image = await (await readGeoTiff(await blob.arrayBuffer())).getImage();
        const [west, southLat, east, north] = result.bbox;
        const { lon, lat } = result.cellSizeDeg;
        const cols = Math.ceil((east - west) / lon);
        const rows = Math.ceil((north - southLat) / lat);
        assert.equal(image.getWidth(), cols);
        assert.equal(image.getHeight(), rows);
        assert.ok(cols >= 10 && cols <= 11 && rows >= 10 && rows <= 11);
        assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
        assert.equal(image.getGeoKeys().GTModelTypeGeoKey, 2);
        assert.equal(image.getGeoKeys().GTRasterTypeGeoKey, 1);
        assert.deepEqual(image.getOrigin(), [west, north, 0]);
        assert.deepEqual(image.getResolution(), [lon, -lat, 0]);
        const bounds = image.getBoundingBox();
        assert.ok(Math.abs(bounds[0] - west) < EPSILON && Math.abs(bounds[3] - north) < EPSILON);
        assert.ok(bounds[2] >= east && bounds[2] - east < lon);
        assert.ok(bounds[1] <= southLat && southLat - bounds[1] < lat);
        assert.ok(bounds[1] < 0 && bounds[3] > 0);
        assert.equal(image.getGDALNoData(), -9999);
        const expected = new Float32Array(cols * rows).fill(-9999);
        for (const p of result.grid) {
          const col = Math.floor((p.lng - west) / lon);
          const row = Math.floor((north - p.lat) / lat);
          assert.ok(col >= 0 && col < cols && row >= 0 && row < rows);
          if (west + (col + 0.5) * lon >= east || north - (row + 0.5) * lat <= southLat) continue;
          const index = row * cols + col;
          expected[index] = Math.max(expected[index], Math.fround(p.dose));
        }
        const raster = await image.readRasters({ interleave: true });
        assert.deepEqual(Array.from(raster), Array.from(expected));
        const points: Array<{ lng: number; lat: number }> = [];
        const validRows = new Set<number>();
        let crossingEdges = 0;
        for (let row = 0; row < rows; row++) {
          const validCols: number[] = [];
          for (let col = 0; col < cols; col++) {
            const value = raster[row * cols + col];
            if (value === -9999) continue;
            assert.ok(Number.isFinite(value) && value >= 20 && value <= 40);
            const latitude = north - (row + 0.5) * lat;
            validCols.push(col);
            validRows.add(row);
            points.push({ lng: west + (col + 0.5) * lon, lat: latitude });
            if (row + 1 < rows && raster[(row + 1) * cols + col] !== -9999
              && (latitude < 0) !== (latitude - lat < 0)) {
              crossingEdges++;
              assert.ok(Math.abs(value - raster[(row + 1) * cols + col]) < 8);
            }
          }
          if (validCols.length) assert.equal(validCols.length, validCols.at(-1)! - validCols[0] + 1);
        }
        assert.equal(validRows.size, Math.max(...validRows) - Math.min(...validRows) + 1, "no missing raster row");
        assert.ok(crossingEdges > 0, "adjacent valid pixels bridge latitude zero");
        assertExtent(points, result);
      });
    });
  }

  it("non cambia scala o dosi passando dal riferimento UTM nord a quello sud", () => {
    const north = fixture(0.00005);
    const south = fixture(-0.00005);
    assert.equal(north.utmSouth, false);
    assert.equal(south.utmSouth, true);
    assert.deepEqual(north.cellSizeDeg, south.cellSizeDeg);
    assert.equal(north.grid.length, south.grid.length);
    for (const [index, n] of north.grid.entries()) {
      const s = south.grid[index];
      assert.ok(Math.abs(n.lng - s.lng) < EPSILON);
      assert.ok(Math.abs(n.lat - s.lat - 0.0001) < EPSILON);
      assert.ok(Math.abs(n.utmX - s.utmX) < 0.001);
      assert.ok(Math.abs(s.utmY - n.utmY - 10_000_000 + 0.0001 * metresLat * 0.9996) < 0.001);
      assert.ok(Math.abs(n.dose - s.dose) < 0.001, "false northing cannot change the weights");
    }
    for (const key of ["min", "max", "mean"] as const) {
      assert.ok(Math.abs(north.stats[key] - south.stats[key]) < 0.001);
    }
  });
});

describe("export agronomici IDW", () => {
  for (const mixed of [false, true]) {
    describe(mixed ? "dosi miste zero e positive" : "dosi interamente zero", () => {
      const expectedDoses = mixed ? [0, 12.5, 0, 25.125, 0] : [0, 0, 0, 0, 0];
      const insideIndices = [0, 1, 2, 3, 6];
      const outsideIndices = [4, 5, 7, 8];

      async function reopenRaster() {
        const result = zeroDoseExportFixture(mixed);
        const { blob } = await captureDownload(() => downloadGeoTiff(result));
        const tiff = await readGeoTiff(await blob.arrayBuffer());
        const image = await tiff.getImage();
        assert.equal(image.getWidth(), 3);
        assert.equal(image.getHeight(), 3);
        assert.deepEqual(image.getOrigin(), [12, 42 + 3 / 8192, 0]);
        assert.deepEqual(image.getResolution(), [1 / 8192, -1 / 8192, 0]);
        assert.equal(image.getGDALNoData(), -9999, "zero must never be the NoData sentinel");
        const raster = await image.readRasters({ interleave: true });
        assert.equal(raster.length, 9);
        return { image, raster };
      }

      it("conserva ogni dose zero come valore GeoTIFF valido", async () => {
        const { image, raster } = await reopenRaster();
        assert.deepEqual(insideIndices.map(index => raster[index]), expectedDoses);
        for (const index of insideIndices) {
          assert.notEqual(raster[index], image.getGDALNoData());
          assert.ok(Number.isFinite(raster[index]));
        }
        const validValues = Array.from(raster).filter(value => value !== image.getGDALNoData());
        assert.equal(validValues.length, 5, "all five field cells, including zeros, must be valid");
        assert.equal(validValues.filter(value => value === 0).length, mixed ? 3 : 5);
        assert.equal(validValues.filter(value => value > 0).length, mixed ? 2 : 0);
      });

      it("lascia NoData le quattro celle GeoTIFF esterne al poligono", async () => {
        const { image, raster } = await reopenRaster();
        assert.deepEqual(outsideIndices.map(index => raster[index]), [-9999, -9999, -9999, -9999]);
        assert.equal(
          Array.from(raster).filter(value => value === image.getGDALNoData()).length,
          4,
          "only the four excluded cell centres may be NoData",
        );
      });

      it("rilegge con shpjs tutti i punti, comprese le dosi zero numeriche", async () => {
        const result = zeroDoseExportFixture(mixed);
        const { blob } = await captureDownload(() => downloadShapefile(result));
        const parsed = await shpjs(await blob.arrayBuffer());
        assert.ok(!Array.isArray(parsed), "the ZIP must contain a single layer");
        assert.equal(parsed.features.length, 5, "outside cells must not become Shapefile records");
        assert.deepEqual(parsed.features.map(feature => feature.properties.DOSE_IDW), expectedDoses);
        for (const [index, feature] of parsed.features.entries()) {
          assert.equal(typeof feature.properties.DOSE_IDW, "number", "zero is not null or missing");
          assert.equal(feature.geometry.type, "Point");
          assert.deepEqual(feature.geometry.coordinates, [result.grid[index].lng, result.grid[index].lat]);
        }
      });

      it("scrive nel DBF dosi zero esplicite, non campi vuoti o NoData", async () => {
        const result = zeroDoseExportFixture(mixed);
        const { blob } = await captureDownload(() => downloadShapefile(result));
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const dbf = Object.values(zip.files).filter(entry => entry.name.endsWith(".dbf"));
        assert.equal(dbf.length, 1);
        const records = readDbf(await dbf[0].async("arraybuffer"));
        assert.equal(records.length, 5);
        assert.deepEqual(records.map(record => record.DOSE_IDW), expectedDoses.map(dose => dose.toFixed(4)));
        assert.equal(records.filter(record => record.DOSE_IDW === "0.0000").length, mixed ? 3 : 5);
      });
    });
  }

  const southernFixture = () => computeIdwGrid({
    name: "Campo sud sintetico",
    ring: [[151, -33.001], [151.0012, -33.001], [151.0012, -33.0001], [151, -33.0001]],
  }, [
    { obsId: "south-1", cliente: "Sintetico", appezzamento: "Sud", lng: 151.0003, lat: -33.0008, dose: 20 },
    { obsId: "south-2", cliente: "Sintetico", appezzamento: "Sud", lng: 151.0009, lat: -33.0003, dose: 40 },
  ], 10, 2);

  it("genera una griglia WGS84 nell'emisfero sud usando UTM 56 sud", () => {
    const result = southernFixture();
    assert.equal(result.utmZone, 56);
    assert.equal(result.utmSouth, true);
    assert.ok(result.grid.length > 80 && result.grid.length < 140);
    for (const point of result.grid) {
      assert.ok(point.lng >= 151 && point.lng <= 151.0012);
      assert.ok(point.lat >= -33.001 && point.lat <= -33.0001);
      assert.ok(Number.isFinite(point.dose) && point.dose >= 20 && point.dose <= 40);
    }
  });

  it("riapre lo Shapefile dell'emisfero sud con coordinate e dosi corrette", async () => {
    const result = southernFixture();
    const { blob } = await captureDownload(() => downloadShapefile(result));
    const buffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const prj = Object.values(zip.files).find(entry => entry.name.endsWith(".prj"));
    assert.ok(prj);
    const wkt = await prj.async("string");
    assert.match(wkt, /^GEOGCS\["GCS_WGS_1984"/);
    assert.doesNotMatch(wkt, /PROJCS|UTM/);
    const parsed = await shpjs(buffer);
    const collection = Array.isArray(parsed) ? parsed[0] : parsed;
    assert.equal(collection.features.length, result.grid.length);
    for (const [index, feature] of collection.features.entries()) {
      const expected = result.grid[index];
      assert.equal(feature.geometry.type, "Point");
      assert.ok(Math.abs(feature.geometry.coordinates[0] - expected.lng) < EPSILON);
      assert.ok(Math.abs(feature.geometry.coordinates[1] - expected.lat) < EPSILON);
      assert.ok(feature.geometry.coordinates[1] < 0);
      assert.equal(feature.properties.POLYGON, result.polygon.name);
      assert.equal(feature.properties.DOSE_IDW, Number(expected.dose.toFixed(4)));
      assert.equal(feature.properties.LAT, Number(expected.lat.toFixed(8)));
      assert.equal(feature.properties.LNG, Number(expected.lng.toFixed(8)));
    }
  });

  it("riapre il GeoTIFF dell'emisfero sud con CRS, orientamento e celle corretti", async () => {
    const result = southernFixture();
    const { blob } = await captureDownload(() => downloadGeoTiff(result));
    const tiff = await readGeoTiff(await blob.arrayBuffer());
    const image = await tiff.getImage();
    const [west, south, east, north] = result.bbox;
    const { lon, lat } = result.cellSizeDeg;
    const cols = Math.ceil((east - west) / lon);
    const rows = Math.ceil((north - south) / lat);
    assert.ok(cols > 0 && rows > 0);
    assert.equal(image.getWidth(), cols);
    assert.equal(image.getHeight(), rows);
    assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
    assert.equal(image.getGeoKeys().GTModelTypeGeoKey, 2);
    assert.equal(image.getGeoKeys().GTRasterTypeGeoKey, 1);
    assert.deepEqual(image.getOrigin(), [west, north, 0]);
    assert.deepEqual(image.getResolution(), [lon, -lat, 0]);
    assert.ok(north < 0 && south < north);
    const expected = new Float32Array(cols * rows).fill(-9999);
    for (const point of result.grid) {
      const col = Math.floor((point.lng - west) / lon);
      const row = Math.floor((north - point.lat) / lat);
      assert.ok(col >= 0 && col < cols && row >= 0 && row < rows);
      const index = row * cols + col;
      expected[index] = Math.max(expected[index], Math.fround(point.dose));
    }
    const raster = await image.readRasters({ interleave: true });
    assert.equal(image.getGDALNoData(), -9999);
    assert.deepEqual(Array.from(raster), Array.from(expected));
    assert.ok(Array.from(raster).some(value => value === -9999));
    assert.ok(Array.from(raster).some(value => value >= 20 && value <= 40));
  });

  it("apre lo ZIP Shapefile con un parser GIS indipendente", async () => {
    const result = idwExportFixture();
    const summary = result.nitrogenSummary;
    assert.ok(summary);

    const { blob } = await captureDownload(() => downloadShapefile(result));
    const parsed = await shpjs(await blob.arrayBuffer());
    const collection = Array.isArray(parsed) ? parsed[0] : parsed;

    assert.equal(collection.type, "FeatureCollection");
    assert.equal(collection.features.length, result.grid.length);
    for (const [index, feature] of collection.features.entries()) {
      assert.equal(feature.geometry.type, "Point");
      assert.ok(
        Math.abs(feature.geometry.coordinates[0] - result.grid[index].lng) < EPSILON,
        "parsed longitude must match the exported grid point",
      );
      assert.ok(
        Math.abs(feature.geometry.coordinates[1] - result.grid[index].lat) < EPSILON,
        "parsed latitude must match the exported grid point",
      );
      assert.equal(feature.properties.POLYGON, result.polygon.name);
      assert.equal(feature.properties.LAT, Number(result.grid[index].lat.toFixed(8)));
      assert.equal(feature.properties.LNG, Number(result.grid[index].lng.toFixed(8)));
      assert.equal(feature.properties.DOSE_IDW, Number(result.grid[index].dose.toFixed(4)));
      assert.equal(feature.properties.AREA_HA, Number(summary.areaHa.toFixed(2)));
      assert.equal(feature.properties.N_PLAN_HA, Number(summary.plannedPerHa.toFixed(1)));
      assert.equal(feature.properties.N_IDW_HA, Number(summary.indicatedPerHa.toFixed(1)));
      assert.equal(feature.properties.N_SAVE_HA, Number(summary.savedPerHa.toFixed(1)));
      assert.equal(feature.properties.N_PLAN_KG, Number(summary.plannedTotalKg.toFixed(1)));
      assert.equal(feature.properties.N_IDW_KG, Number(summary.indicatedTotalKg.toFixed(1)));
      assert.equal(feature.properties.N_SAVE_KG, Number(summary.savedTotalKg.toFixed(1)));
    }
  });

  it("produce uno Shapefile completo con DBF e CSV coerenti con il riepilogo", async () => {
    const result = idwExportFixture();
    const summary = result.nitrogenSummary;
    assert.ok(summary);

    const { blob, filename } = await captureDownload(() => downloadShapefile(result));
    assert.equal(filename, "Campo_export_prova_idw.zip");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const base = "Campo_export_prova";
    const expectedNames = [
      `${base}.shp`,
      `${base}.shx`,
      `${base}.dbf`,
      `${base}.prj`,
      `${base}_riepilogo_azoto.csv`,
    ];
    assert.deepEqual(Object.keys(zip.files).sort(), expectedNames.sort());

    const shpBuffer = await zip.file(`${base}.shp`)!.async("arraybuffer");
    const shxBuffer = await zip.file(`${base}.shx`)!.async("arraybuffer");
    assert.equal(new DataView(shpBuffer).getInt32(24, false) * 2, shpBuffer.byteLength);
    assert.equal(new DataView(shxBuffer).getInt32(24, false) * 2, shxBuffer.byteLength);

    const records = readDbf(await zip.file(`${base}.dbf`)!.async("arraybuffer"));
    assert.equal(records.length, result.grid.length);
    assert.ok(records.length > 0);
    for (const record of records) {
      assert.equal(record.AREA_HA, summary.areaHa.toFixed(2));
      assert.equal(record.N_PLAN_HA, summary.plannedPerHa.toFixed(1));
      assert.equal(record.N_IDW_HA, summary.indicatedPerHa.toFixed(1));
      assert.equal(record.N_SAVE_HA, summary.savedPerHa.toFixed(1));
      assert.equal(record.N_PLAN_KG, summary.plannedTotalKg.toFixed(1));
      assert.equal(record.N_IDW_KG, summary.indicatedTotalKg.toFixed(1));
      assert.equal(record.N_SAVE_KG, summary.savedTotalKg.toFixed(1));
    }

    const csv = (await zip.file(`${base}_riepilogo_azoto.csv`)!.async("string")).replace(/^\uFEFF/, "");
    assert.deepEqual(csv.split("\r\n"), [
      "Scenario;Superficie (ha);kg N/ha;kg N totali",
      `Azoto previsto dal piano;${summary.areaHa.toFixed(2).replace(".", ",")};${summary.plannedPerHa.toFixed(1).replace(".", ",")};${summary.plannedTotalKg.toFixed(1).replace(".", ",")}`,
      `Azoto indicato dalla IDW;${summary.areaHa.toFixed(2).replace(".", ",")};${summary.indicatedPerHa.toFixed(1).replace(".", ",")};${summary.indicatedTotalKg.toFixed(1).replace(".", ",")}`,
      `Risparmio stimato;${summary.areaHa.toFixed(2).replace(".", ",")};${summary.savedPerHa.toFixed(1).replace(".", ",")};${summary.savedTotalKg.toFixed(1).replace(".", ",")}`,
    ]);
  });

  it("non corrompe i record DBF con nomi di poligono UTF-8 lunghi", async () => {
    const result = idwExportFixture();
    result.polygon.name = `Campo ${"è".repeat(64)}`;
    const summary = result.nitrogenSummary;
    assert.ok(summary);

    const { blob } = await captureDownload(() => downloadShapefile(result));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const dbfEntry = Object.values(zip.files).find((entry) => entry.name.endsWith(".dbf"));
    assert.ok(dbfEntry);
    const records = readDbf(await dbfEntry.async("arraybuffer"));

    assert.ok(records[0].POLYGON.startsWith("Campo è"));
    assert.ok(new TextEncoder().encode(records[0].POLYGON).byteLength <= 64);
    assert.equal(records[0].N_PLAN_HA, summary.plannedPerHa.toFixed(1));
    assert.equal(records[0].N_IDW_HA, summary.indicatedPerHa.toFixed(1));
    assert.equal(records[0].N_SAVE_KG, summary.savedTotalKg.toFixed(1));
  });

  it("scrive nel GeoTIFF una ImageDescription completa e valida", async () => {
    const result = idwExportFixture();
    const summary = result.nitrogenSummary;
    assert.ok(summary);

    const { blob, filename } = await captureDownload(() => downloadGeoTiff(result));
    assert.equal(filename, "Campo_export_prova_idw.tif");
    const description = readTiffAsciiTag(await blob.arrayBuffer(), 270);

    assert.deepEqual(description.split("\n"), [
      "Mappa IDW - dose di azoto (kg N/ha)",
      `Superficie: ${summary.areaHa.toFixed(2)} ha`,
      `Piano N: ${summary.plannedPerHa.toFixed(1)} kg N/ha; ${summary.plannedTotalKg.toFixed(1)} kg N totali`,
      `Indicazione IDW: ${summary.indicatedPerHa.toFixed(1)} kg N/ha; ${summary.indicatedTotalKg.toFixed(1)} kg N totali`,
      `Risparmio stimato: ${summary.savedPerHa.toFixed(1)} kg N/ha; ${summary.savedTotalKg.toFixed(1)} kg N totali`,
    ]);
  });

  it("apre il GeoTIFF con un parser GIS indipendente", async () => {
    const result = idwExportFixture();
    const summary = result.nitrogenSummary;
    assert.ok(summary);

    const { blob } = await captureDownload(() => downloadGeoTiff(result));
    const tiff = await readGeoTiff(await blob.arrayBuffer());
    const image = await tiff.getImage();
    const geoKeys = image.getGeoKeys();
    const expectedDescription = [
      "Mappa IDW - dose di azoto (kg N/ha)",
      `Superficie: ${summary.areaHa.toFixed(2)} ha`,
      `Piano N: ${summary.plannedPerHa.toFixed(1)} kg N/ha; ${summary.plannedTotalKg.toFixed(1)} kg N totali`,
      `Indicazione IDW: ${summary.indicatedPerHa.toFixed(1)} kg N/ha; ${summary.indicatedTotalKg.toFixed(1)} kg N totali`,
      `Risparmio stimato: ${summary.savedPerHa.toFixed(1)} kg N/ha; ${summary.savedTotalKg.toFixed(1)} kg N totali`,
    ].join("\n");

    assert.equal(image.getWidth(), Math.ceil(
      (result.bbox[2] - result.bbox[0]) / result.cellSizeDeg.lon,
    ));
    assert.equal(image.getHeight(), Math.ceil(
      (result.bbox[3] - result.bbox[1]) / result.cellSizeDeg.lat,
    ));
    assert.equal(geoKeys.GeographicTypeGeoKey, 4326);
    assert.equal(image.getGDALNoData(), -9999);
    assert.equal(
      String(await image.getFileDirectory().loadValue("ImageDescription")).replace(/\0$/, ""),
      expectedDescription,
    );

    const raster = await image.readRasters({ interleave: true });
    assert.equal(raster.length, image.getWidth() * image.getHeight());
    assert.ok(Array.from(raster).some((value) => value === -9999));
    assert.ok(Array.from(raster).some((value) => value !== -9999));
  });
});
const BURLEY_REFERENCE = {
  label: "Burley (Non Cimato)",
  categoria: "Light Air-Cured",
  resaDefault: 4.5,
  resaMin: 4,
  resaMax: 5.6,
  azotoDefault: 175,
  azotoMin: 150,
  azotoMax: 200,
  kgNPerTon: 36,
  densitaPianteDefault: 16_000,
  kgSemiDefault: 0.002,
};
const GRANO_CONVERSION_FIXTURES = [
  { variety: "RGT NATUR", semiMq: [440, 440], kgHa: [220, 220] },
  { variety: "Redidenari", semiMq: [360, 410], kgHa: [200, 230] },
  { variety: "Telemaco", semiMq: [360, 410], kgHa: [190, 220] },
  { variety: "President", semiMq: [300, 350], kgHa: [165, 220] },
  { variety: "Federico II", semiMq: [350, 350], kgHa: [170, 190] },
  { variety: "Egeo", semiMq: [360, 410], kgHa: [200, 230] },
  { variety: "Minosse", semiMq: [380, 430], kgHa: [210, 240] },
  { variety: "Spineto", semiMq: [400, 450], kgHa: [240, 240] },
  { variety: "Farah", semiMq: [450, 500], kgHa: [270, 270] },
  { variety: "Furio Camillo", semiMq: [400, 450], kgHa: [200, 230] },
  { variety: "Marco Aurelio", semiMq: [400, 450], kgHa: [200, 230] },
  { variety: "Nazareno", semiMq: [350, 400], kgHa: [170, 170] },
  { variety: "Quadrato", semiMq: [400, 450], kgHa: [220, 260] },
  { variety: "Giulio", semiMq: [370, 400], kgHa: [190, 220] },
] as const;

describe("RGT NATUR: user-supplied seed, protein and nitrogen plan", () => {
  it("starts at 220 kg/ha, 4.4 million seeds/ha, density factor 1 and 60 q/ha", () => {
    const variety = GRANO_DURO_DB["RGT NATUR"];
    assert.equal(variety.resaDefault, 60);
    assert.equal(variety.proteineObiettivo, 14);
    assert.equal(variety.pesoMilleSemiG, 50);
    for (const [value, unit] of [[220, "kg/ha"], [440, "semi/m²"], [4_400_000, "semi/ha"]] as const) {
      const density = calcolaDensitaGrano(value, unit, variety);
      assert.equal(density.semiHaEquivalenti, 4_400_000);
      assert.equal(density.fattoreAzoto, 1);
      assert.equal(density.fuoriRange, false);
    }
  });
  it("uses 120/150/180 kg N/ha for 40/50/60 q and the dedicated 30/90/60 split", () => {
    const phases = fasiGranoPerVarieta("RGT NATUR");
    for (const [yieldQ, expected, split] of [[40, 120, [20, 60, 40]], [50, 150, [25, 75, 50]], [60, 180, [30, 90, 60]]] as const) {
      const total = calcolaFabbisognoNGrano(yieldQ, 1).corretto;
      assert.equal(total, expected);
      assert.deepEqual(phases.map(phase => calcolaQuotaNGrano(total, phase)), split);
    }
    assert.equal(faseGranoConfermataDaBbch("41–49", false, "RGT NATUR"), null);
    assert.equal(faseGranoDaBbch("20–29", "RGT NATUR"), null);
    assert.equal(faseGranoDaBbch("41–49"), null);
  });
  it("uses each confirmed phase quota with the NDVI deficit, zero at target and the residual cap", () => {
    for (const [bbch, das, quota] of [["00–09", 10, 30], ["30–39", 150, 90], ["41–49", 190, 60]] as const) {
      const phase = faseGranoConfermataDaBbch(bbch, true, "RGT NATUR");
      assert.ok(phase);
      const reference = ndviOttimaleGrano(das);
      const plan = (mean: number, applied = 0) => calcolaPianoNGrano({
        fabbisognoN: 180, azotoGiaDistribuito: applied, fase: phase, das, lettureNdvi: Array(5).fill(mean),
      });
      assert.equal(plan(reference / 2).quotaBase, quota);
      assert.equal(plan(reference / 2).quotaProposta, quota / 2);
      assert.equal(plan(reference).quotaProposta, 0);
      assert.equal(plan(Math.min(1, reference + 0.1)).quotaProposta, 0);
      assert.equal(plan(reference / 2, 175).quotaProposta, 5);
    }
  });
});

function assertApproximately(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < EPSILON, `${message}: expected ${expected}, received ${actual}`);
}

describe("grano duro seed-rate conversions", () => {
  it("keeps seed density and seed dose reference ranges separate", () => {
    for (const fixture of GRANO_CONVERSION_FIXTURES) {
      const dati = GRANO_DURO_DB[fixture.variety];
      assert.ok(dati, `missing ${fixture.variety} from the variety database`);
      assert.equal(dati.densitaSemiMqMin, fixture.semiMq[0], `${fixture.variety} minimum seeds/m²`);
      assert.equal(dati.densitaSemiMqMax, fixture.semiMq[1], `${fixture.variety} maximum seeds/m²`);
      assert.equal(dati.doseSemeKgHaMin, fixture.kgHa[0], `${fixture.variety} minimum seed kg/ha`);
      assert.equal(dati.doseSemeKgHaMax, fixture.kgHa[1], `${fixture.variety} maximum seed kg/ha`);

      const fromDose = calcolaDensitaGrano(fixture.kgHa[0], "kg/ha", dati);
      assert.equal(fromDose.fuoriRange, false, `${fixture.variety} lower seed dose remains valid`);
      assert.equal(fromDose.fuoriRangeDose, false, `${fixture.variety} lower seed dose range`);

      const fromDensity = calcolaDensitaGrano(fixture.semiMq[0], "semi/m²", dati);
      assert.equal(fromDensity.fuoriRange, false, `${fixture.variety} lower seed density remains valid`);
      assert.equal(fromDensity.fuoriRangeDensita, false, `${fixture.variety} lower seed density range`);

      const midDose = dati.doseSemeKgHaDefault;
      const convertedDensity = granoSemiMqDaKgHa(midDose, dati);
      assertApproximately(
        granoKgHaDaSemiMq(convertedDensity, dati),
        midDose,
        `${fixture.variety} kg/ha conversion round-trip`,
      );
      assertApproximately(
        calcolaDensitaGrano(midDose, "kg/ha", dati).doseKgHaEquivalente,
        midDose,
        `${fixture.variety} planner dose conversion`,
      );
    }
  });

  it("uses the supplied PMG rather than assuming a generic varietal value", () => {
    const fiftyGramPmg = {
      label: "Fixture 50 g PMG",
      densitaSemiMqMin: 200,
      densitaSemiMqMax: 240,
      densitaSemiMqDefault: 220,
      doseSemeKgHaMin: 100,
      doseSemeKgHaMax: 120,
      doseSemeKgHaDefault: 110,
      pesoMilleSemiG: 50,
    };

    assert.equal(granoKgHaDaSemiMq(220, fiftyGramPmg), 110);
    assert.equal(granoSemiMqDaKgHa(110, fiftyGramPmg), 220);
    assert.equal(calcolaDensitaGrano(110, "kg/ha", fiftyGramPmg).semiMqEquivalenti, 220);
  });
});

describe("grano duro BBCH and local DAS estimate", () => {
  it("uses BBCH as the authoritative phase selection", () => {
    assert.equal(faseGranoDaBbch("20–29")?.label, "Accestimento");
    assert.equal(faseGranoDaBbch("37–39")?.label, "Foglia a bandiera");
    assert.equal(faseGranoDaBbch("99"), null);
  });

  it("does not activate a BBCH phase from a DAS prefill until it is explicitly confirmed", () => {
    assert.equal(faseGranoConfermataDaBbch("20–29", false), null);
    assert.equal(faseGranoConfermataDaBbch("20–29", true)?.label, "Accestimento");
  });

  it("keeps the DAS estimate separate and configurable", () => {
    assert.equal(stimaFaseGranoDaDas(30, FINESTRE_DAS_LOCALI_TEMPLATE), null);
    assert.equal(stimaFaseGranoDaDas(60, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Accestimento");
    assert.equal(stimaFaseGranoDaDas(140, FINESTRE_DAS_LOCALI_TEMPLATE)?.label, "Inizio levata");
    assert.equal(stimaFaseGranoDaDas(260, FINESTRE_DAS_LOCALI_TEMPLATE), null);
  });

  it("covers every DAS from autumn sowing to maturity with one BBCH profile", () => {
    assert.equal(PROFILO_FENOLOGICO_GRANO[0].dasMin, 0);
    assert.equal(PROFILO_FENOLOGICO_GRANO.at(-1)?.dasMax, 250);
    for (const [index, fase] of PROFILO_FENOLOGICO_GRANO.entries()) {
      const precedente = PROFILO_FENOLOGICO_GRANO[index - 1];
      if (precedente) assert.equal(fase.dasMin, precedente.dasMax + 1);
      assert.equal(profiloFenologicoGranoDaDas(fase.dasMin)?.bbch, fase.bbch);
      assert.equal(profiloFenologicoGranoDaDas(fase.dasMax)?.bbch, fase.bbch);
      assert.equal(profiloFenologicoGranoDaBbch(fase.bbch)?.label, fase.label);
    }
    for (let das = 0; das <= 250; das++) {
      assert.ok(profiloFenologicoGranoDaDas(das), `DAS ${das} must belong to a phenological profile`);
    }
  });
});

describe("grano duro nitrogen planning", () => {
  it("matches the API parity matrix for every standard variety, yield, density and phase", () => {
    // Independent expected quotas, also asserted in osservazioni.test.ts.
    const fixtures = [
      { yield: 40, ratio: 0.5, total: 108, quotas: [27, 40, 40, 20] },
      { yield: 40, ratio: 1, total: 120, quotas: [27, 40, 40, 20] },
      { yield: 40, ratio: 2, total: 132, quotas: [27, 40, 44, 22] },
      { yield: 50, ratio: 0.5, total: 135, quotas: [28, 40, 45, 22] },
      { yield: 50, ratio: 1, total: 150, quotas: [31, 45, 50, 25] },
      { yield: 50, ratio: 2, total: 165, quotas: [34, 49, 54, 27] },
      { yield: 60, ratio: 0.5, total: 162, quotas: [34, 48, 53, 27] },
      { yield: 60, ratio: 1, total: 180, quotas: [36, 50, 59, 30] },
      { yield: 60, ratio: 2, total: 198, quotas: [36, 50, 60, 30] },
    ];
    for (const [variety, data] of Object.entries(GRANO_DURO_DB)) {
      if (variety === "RGT NATUR") continue;
      for (const fixture of fixtures) {
        const seedsMq = data.densitaSemiMqDefault * fixture.ratio;
        for (const [value, unit] of [
          [seedsMq, "semi/m²"],
          [seedsMq * 10_000, "semi/ha"],
          [granoKgHaDaSemiMq(seedsMq, data), "kg/ha"],
        ] as const) {
          const density = calcolaDensitaGrano(value, unit, data);
          const total = calcolaFabbisognoNGrano(fixture.yield, density.fattoreAzoto).corretto;
          assert.equal(total, fixture.total, `${variety}, ${unit}, ${fixture.yield} q/ha`);
          for (const [index, phase] of FASI_GRANO.entries()) {
            assert.equal(calcolaQuotaNGrano(total, phase), fixture.quotas[index]);
            const das = [10, 100, 150, 180][index];
            const reference = ndviOttimaleGrano(das);
            for (const relativeNdvi of [0, 0.5, 1, 1.1]) {
              for (const alreadyApplied of [0, total - 2.4, total - 10.4, total, total + 5]) {
                const observed = reference * relativeNdvi;
                const plan = calcolaPianoNGrano({
                  lettureNdvi: Array(5).fill(observed), das, fase: phase,
                  fabbisognoN: total, azotoGiaDistribuito: alreadyApplied,
                });
                const expectedDose = Math.min(
                  Math.max(0, Math.round(total - alreadyApplied)),
                  Math.round(fixture.quotas[index] * Math.max(0, 1 - relativeNdvi)),
                );
                assert.equal(plan.quotaProposta, expectedDose, `${variety}, ${phase.bbch}, NDVI ${relativeNdvi}`);
              }
            }
          }
        }
      }
    }
    const phase = FASI_GRANO[0];
    const reference = ndviOttimaleGrano(10);
    assert.equal(calcolaQuotaNGrano(120, phase), 27);
    assert.equal(calcolaPianoNGrano({
      lettureNdvi: Array(5).fill(reference / 2), das: 10, fase: phase,
      fabbisognoN: 120, azotoGiaDistribuito: 0,
    }).quotaProposta, 14);
  });

  it("maps the yield reference boundaries to 120, 150, and 180 kg N/ha", () => {
    assert.deepEqual(calcolaFabbisognoNGrano(40, 1), { base: 120, corretto: 120 });
    assert.deepEqual(calcolaFabbisognoNGrano(50, 1), { base: 150, corretto: 150 });
    assert.deepEqual(calcolaFabbisognoNGrano(60, 1), { base: 180, corretto: 180 });
  });

  it("matches the scaled phase quotas at the lowest and highest density corrections", () => {
    const quotaFixtures = [
      { resaQHa: 40, fattoreDensita: 0.9, expected: [27, 40, 40, 20] },
      { resaQHa: 60, fattoreDensita: 0.9, expected: [34, 48, 53, 27] },
      { resaQHa: 40, fattoreDensita: 1.1, expected: [27, 40, 44, 22] },
      { resaQHa: 60, fattoreDensita: 1.1, expected: [36, 50, 60, 30] },
    ];

    for (const fixture of quotaFixtures) {
      const fabbisognoN = calcolaFabbisognoNGrano(fixture.resaQHa, fixture.fattoreDensita).corretto;
      const quote = FASI_GRANO.map((fase) => calcolaQuotaNGrano(fabbisognoN, fase));
      assert.deepEqual(
        quote,
        fixture.expected,
        `${fixture.resaQHa} q/ha at density factor ${fixture.fattoreDensita}`,
      );
      for (const [index, quota] of quote.entries()) {
        const fase = FASI_GRANO[index];
        assert.ok(quota >= fase.azotoMin && quota <= fase.azotoMax, `${fase.label} remains in range`);
      }
    }
  });

  it("uses a grain-specific NDVI reference across the autumn-to-wax-maturity calendar", () => {
    assert.equal(ndviOttimaleGrano(0), 0.2);
    assert.equal(ndviOttimaleGrano(135), 0.55);
    assert.equal(ndviOttimaleGrano(136), 0.65);
    assert.equal(ndviOttimaleGrano(165), 0.72);
    assert.equal(ndviOttimaleGrano(166), 0.73);
    assert.equal(ndviOttimaleGrano(190), 0.85);
    assert.equal(ndviOttimaleGrano(250), 0.42);
    for (const fase of PROFILO_FENOLOGICO_GRANO) {
      const riferimentoInizio = ndviOttimaleGrano(fase.dasMin);
      const riferimentoFine = ndviOttimaleGrano(fase.dasMax);
      assert.ok(riferimentoInizio >= fase.ndviMin - 0.02 && riferimentoInizio <= fase.ndviMax + 0.02);
      assert.ok(riferimentoFine >= fase.ndviMin - 0.02 && riferimentoFine <= fase.ndviMax + 0.02);
    }
  });

  it("keeps the requested NDVI reference ranges for the three nitrogen phases", () => {
    assert.deepEqual(profiloFenologicoGranoDaBbch("20–29") && {
      min: profiloFenologicoGranoDaBbch("20–29")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("20–29")?.ndviMax,
    }, { min: 0.4, max: 0.55 });
    assert.deepEqual(profiloFenologicoGranoDaBbch("30–32") && {
      min: profiloFenologicoGranoDaBbch("30–32")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("30–32")?.ndviMax,
    }, { min: 0.65, max: 0.72 });
    assert.deepEqual(profiloFenologicoGranoDaBbch("37–39") && {
      min: profiloFenologicoGranoDaBbch("37–39")?.ndviMin,
      max: profiloFenologicoGranoDaBbch("37–39")?.ndviMax,
    }, { min: 0.73, max: 0.85 });
  });

  it("indicates N only for the proportional NDVI deficit and never above the residual plan", () => {
    const fase = faseGranoDaBbch("20–29");
    assert.ok(fase);

    const adequate = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.49, 0.49, 0.49, 0.49, 0.49],
    });
    assert.equal(adequate.quotaBase, 45);
    assert.equal(adequate.deficitNdvi, 0);
    assert.equal(adequate.quotaProposta, 0);
    assert.equal(adequate.residuoPiano, 90);
    assert.equal(adequate.verificaCampo, false);

    const deficit = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.ok(Math.abs(deficit.deficitRelativo - 0.5903614457831325) < 0.000001);
    assert.equal(deficit.quotaDaDeficitNdvi, 27);
    assert.equal(deficit.quotaProposta, 27);
    assert.equal(deficit.verificaCampo, true);

    const residualExhausted = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.equal(residualExhausted.residuoPiano, 10);
    assert.equal(residualExhausted.quotaProposta, 10);

    const decimalResidual = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 140.4,
      fase,
      das: 100,
      lettureNdvi: [0.2, 0.2, 0.2, 0.2, 0.2],
    });
    assert.equal(decimalResidual.residuoPiano, 10);
    assert.equal(decimalResidual.quotaProposta, 10);

    const aboveReference = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 60,
      fase,
      das: 100,
      lettureNdvi: [0.6, 0.6, 0.6, 0.6, 0.6],
    });
    assert.equal(aboveReference.deficitNdvi, 0);
    assert.equal(aboveReference.quotaProposta, 0);
  });

  it("does not produce a grain dose without a confirmed phase or valid NDVI readings", () => {
    const noPhase = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 0,
      fase: null,
      das: 100,
      lettureNdvi: [0.7, 0.7, 0.7, 0.7, 0.7],
    });
    assert.equal(noPhase.quotaProposta, 0);

    const invalidNdvi = calcolaPianoNGrano({
      fabbisognoN: 150,
      azotoGiaDistribuito: 0,
      fase: faseGranoDaBbch("20–29"),
      das: 100,
      lettureNdvi: [1.1, 0.7, 0.7, 0.7, 0.7],
    });
    assert.equal(invalidNdvi.quotaProposta, 0);
    assert.equal(invalidNdvi.verificaCampo, true);
  });
});

describe("tobacco calculations", () => {
  it("preserves NDVI statistics and the standard nitrogen recommendation", () => {
    const stats = statisticheNdvi([0.5, 0.5, 0.5, 0.5, 0.5]);
    assert.equal(stats.media, 0.5);
    assert.equal(stats.varianza, 0);
    assert.equal(stats.coefficienteVariazione, 0);
    assert.equal(stats.valoriValidi, true);

    const result = calcola(4.5, 120, 42, 0.5, 0.5, 0.5, 0.5, 0.5, 120);
    assertApproximately(result.ottimale, 0.64, "tobacco NDVI optimum at 42 days");
    assertApproximately(result.dose, 26.3, "tobacco nitrogen indication from NDVI deficit");
    assertApproximately(result.deficitRelativo, 0.21875, "tobacco relative NDVI deficit");
    assertApproximately(result.quotaDaDeficitNdvi, 26.3, "tobacco proportional N quota");
    assert.equal(result.fabbisognoN, 120);
    assert.equal(result.rapportoAzoto, 1);
    assert.equal(result.statoAzoto, "allineato");
    assert.equal(result.statoVariabilita, "bassa");
  });

  it("keeps default tobacco density neutral in both supported units", () => {
    const variety = BURLEY_REFERENCE;
    const byPlants = calcolaDensita(variety.densitaPianteDefault, "piante/ha", variety);
    const bySeed = calcolaDensita(variety.kgSemiDefault, "kg/ha", variety);

    assert.equal(byPlants.pianteHaEquivalenti, variety.densitaPianteDefault);
    assert.equal(byPlants.rapportoDensita, 1);
    assert.equal(byPlants.fattoreAzoto, 1);
    assert.equal(bySeed.pianteHaEquivalenti, variety.densitaPianteDefault);
    assert.equal(bySeed.rapportoDensita, 1);
    assert.equal(bySeed.fattoreAzoto, 1);
  });

  it("does not recommend nitrogen when observed NDVI is already above target", () => {
    const result = calcola(4.5, 120, 42, 0.8, 0.8, 0.8, 0.8, 0.8, 120);
    assert.equal(result.dose, 0);
    assert.equal(result.statoAzoto, "allineato");
    assert.equal(result.valoriValidi, true);
  });

  it("uses zero N at the reference and proportional N below it", () => {
    const atReference = calcola(4.5, 120, 42, 0.64, 0.64, 0.64, 0.64, 0.64, 120);
    assert.equal(atReference.discostamento, 0);
    assert.equal(atReference.dose, 0);

    const belowReference = calcola(4.5, 120, 42, 0.5, 0.5, 0.5, 0.5, 0.5, 120);
    assertApproximately(belowReference.dose, 26.3, "tobacco deficit dose");
    assert.equal(belowReference.residuoPiano, 120);

    const afterPreviousApplications = calcola(
      4.5, 120, 42, 0.5, 0.5, 0.5, 0.5, 0.5, 120, "standard", 100
    );
    assert.equal(afterPreviousApplications.residuoPiano, 20);
    assert.equal(afterPreviousApplications.dose, 20);
  });

  it("keeps nursery age adjustments on the continuous NDVI curve", () => {
    assert.equal(ndviOttimale(0, "standard").ottimale, 0.28);
    assertApproximately(ndviOttimale(0, "avanzata").ottimale, 0.31, "advanced nursery curve adjustment");
    assert.equal(ndviOttimale(0, "extra").ottimale, 0.34);
  });

  it("preserves tobacco interpolation, equivalent ages and endpoint labels", () => {
    // Independent agronomic expectations, not computed by the shared module.
    const cases = [
      { giorni: -7, eta: "standard", age: 0, reference: 0.28, label: "Trapianto" },
      { giorni: 7, eta: "standard", age: 7, reference: 0.31, label: "Trapianto" },
      { giorni: 0, eta: "avanzata", age: 7, reference: 0.31, label: "Trapianto" },
      { giorni: 0, eta: "extra", age: 14, reference: 0.34, label: "Trapianto" },
      { giorni: 35, eta: "standard", age: 35, reference: 0.56, label: "Sviluppo vegetativo (35 gg)" },
      { giorni: 28, eta: "avanzata", age: 35, reference: 0.56, label: "Sviluppo vegetativo (35 gg)" },
      { giorni: 21, eta: "extra", age: 35, reference: 0.56, label: "Sviluppo vegetativo (35 gg)" },
      { giorni: 60, eta: "standard", age: 60, reference: 0.745, label: "Espansione chioma (55 gg)" },
      { giorni: 90, eta: "standard", age: 90, reference: 0.775, label: "Massimo vigore (75–85 gg)" },
      { giorni: 130, eta: "standard", age: 130, reference: 0.60, label: "Maturazione avanzata" },
      { giorni: 160, eta: "extra", age: 174, reference: 0.60, label: "Maturazione avanzata" },
    ] as const;
    for (const item of cases) {
      const result = ndviOttimale(item.giorni, item.eta);
      assertApproximately(result.ottimale, item.reference, JSON.stringify(item));
      assert.equal(result.giorniFenologici, item.age);
      assert.equal(result.label, item.label);
    }
  });

  it("preserves one-decimal tobacco quotas before applying the residual cap", () => {
    const cases = [
      { reading: 0.5, total: 120, applied: 0, quota: 26.3, residual: 120, dose: 26.3 },
      { reading: 0.5, total: 120.04, applied: 100, quota: 26.3, residual: 20, dose: 20 },
      { reading: 0.5, total: 120.06, applied: 100, quota: 26.3, residual: 20.1, dose: 20.1 },
      { reading: 0, total: 120, applied: 0, quota: 120, residual: 120, dose: 120 },
      { reading: 0.5, total: 120, applied: 125, quota: 26.3, residual: 0, dose: 0 },
      { reading: 0.64, total: 120, applied: 0, quota: 0, residual: 120, dose: 0 },
      { reading: 1, total: 120, applied: 0, quota: 0, residual: 120, dose: 0 },
    ];
    for (const c of cases) {
      const result = calcola(4.5, c.total, 42, c.reading, c.reading, c.reading, c.reading, c.reading, 120, "standard", c.applied);
      assert.equal(result.quotaDaDeficitNdvi, c.quota);
      assert.equal(result.residuoPiano, c.residual);
      assert.equal(result.dose, c.dose);
    }
  });

  it("uses the revised tobacco canopy peak and flowering regression", () => {
    assert.equal(ndviOttimale(55).ottimale, 0.70);
    assert.equal(ndviOttimale(65).ottimale, 0.79);
    assert.equal(ndviOttimale(75).ottimale, 0.80);
    assert.equal(ndviOttimale(85).ottimale, 0.80);
    assert.equal(ndviOttimale(95).ottimale, 0.75);
    assert.equal(ndviOttimale(110).ottimale, 0.68);
    assert.equal(ndviOttimale(130).ottimale, 0.60);
  });
});

describe("saved observation distribution", () => {
  it("keeps recorded point-N values while exposing the signed NDVI deviation", () => {
    const punti = serieDistribuzioneOsservazioni([
      {
        id: "tabacco-deficit",
        coltura: "tabacco",
        data: "2026-08-20",
        varieta: "Burley (Non Cimato)",
        media: 0.55,
        ottimale: 0.7,
        dose: 36,
      },
      {
        id: "grano-adeguato",
        coltura: "grano duro",
        data: "2026-03-20",
        varieta: "Redidenari",
        media: 0.7,
        ottimale: 0.65,
        dose: 12,
        quotaAzoto: 0,
      },
    ]);

    assert.equal(punti.length, 2);
    assert.equal(punti[0].id, "tabacco-deficit");
    assert.equal(punti[0].coltura, "tabacco");
    assertApproximately(punti[0].scostamento, 0.15, "tobacco deficit chart position");
    assertApproximately(punti[0].deficitNdvi, 0.15, "tobacco deficit used for dose");
    assert.equal(punti[0].azotoIndicato, 36);
    assert.equal(punti[1].id, "grano-adeguato");
    assert.equal(punti[1].coltura, "grano duro");
    assertApproximately(punti[1].scostamento, -0.05, "grain adequate chart position");
    assert.equal(punti[1].deficitNdvi, 0);
    assert.equal(punti[1].azotoIndicato, 0);
  });

  it("does not add chart points with incomplete saved numeric values", () => {
    const punti = serieDistribuzioneOsservazioni([
      {
        id: "non-valido",
        coltura: "tabacco",
        data: "2026-08-20",
        varieta: "Burley (Non Cimato)",
        media: Number.NaN,
        ottimale: 0.7,
        dose: 20,
      },
    ]);
    assert.deepEqual(punti, []);
  });
});
