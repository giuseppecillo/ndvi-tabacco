import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import proj4 from "proj4";
import JSZip from "jszip";
import shp from "shpjs";
import { fromArrayBuffer } from "geotiff";
import {
  parseKml, parseKmz, parseShpPolygons, computeIdwGrid, findDoseCell,
  pointInField, downloadGeoTiff, downloadShapefile,
} from "../src/utils/geoUtils.ts";
import { createPolygonImporter } from "../src/utils/polygonImport.ts";
import {
  createHoleImportFixtures, createEquatorHoleImportFixtures,
  createImportFixtures, holeRings, ring,
} from "./fixtures/idw-imports.mjs";

// XML only: no browser, auth, network, database or application identity.
globalThis.DOMParser = DOMParser;
const controls = [
  { obsId: "synthetic-1", cliente: "QA", appezzamento: "QA", lng: 12.0003, lat: 42.0003, dose: 30, azotoTotale: 100, azotoGiaDistribuito: 20 },
  { obsId: "synthetic-2", cliente: "QA", appezzamento: "QA", lng: 12.0009, lat: 42.0006, dose: 30, azotoTotale: 100, azotoGiaDistribuito: 20 },
];
const asArrayBuffer = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const near = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const polygonFixture = { name: "QA_holes", ring, holes: holeRings };
const inExcludedRectangle = (lng, lat) => holeRings.some(r =>
  lng >= r[0][0] && lng <= r[2][0] && lat >= r[0][1] && lat <= r[2][1]);

function metricArea(r) {
  const projected = r.map(p => proj4("EPSG:4326", "+proj=utm +zone=33 +datum=WGS84 +units=m", p));
  // Translate first: independent shoelace calculation avoids large-number cancellation.
  const [x0, y0] = projected[0];
  const local = projected.map(([x, y]) => [x - x0, y - y0]);
  return Math.abs(local.reduce((sum, [x, y], i) => {
    const [xx, yy] = local[(i + 1) % local.length];
    return sum + x * yy - xx * y;
  }, 0)) / 2;
}

test("KML, KMZ and real Shapefile preserve two holes and yield equivalent cultivated grids and nitrogen totals", async () => {
  const fixtures = await createHoleImportFixtures();
  const parsed = [
    parseKml(fixtures.kml.buffer.toString()),
    await parseKmz(asArrayBuffer(fixtures.kmz.buffer)),
    await parseShpPolygons(asArrayBuffer(fixtures.polygon.buffer)),
  ];
  const independent = await shp(fixtures.polygon.buffer);
  assert.equal(independent.features[0].geometry.coordinates.length, 3);
  let reference;
  for (const polygons of parsed) {
    assert.equal(polygons.length, 1);
    const polygon = polygons[0];
    assert.equal(polygon.holes.length, 2);
    const result = computeIdwGrid(polygon, controls);
    assert(result.grid.length > 0 && result.grid.length < 100);
    for (const p of result.grid) {
      assert(!inExcludedRectangle(p.lng, p.lat));
      near(p.dose, 30);
    }
    const expectedArea = (metricArea(ring) - holeRings.reduce((n, r) => n + metricArea(r), 0)) / 10000;
    const summary = result.nitrogenSummary;
    near(summary.areaHa, expectedArea, 1e-7);
    near(summary.plannedPerHa, 100);
    near(summary.indicatedPerHa, 50);
    near(summary.savedPercent, 50);
    near(summary.plannedTotalKg, 100 * expectedArea, 1e-5);
    near(summary.indicatedTotalKg, 50 * expectedArea, 1e-5);
    near(summary.savedTotalKg, 50 * expectedArea, 1e-5);
    if (reference) {
      assert.equal(result.grid.length, reference.grid.length);
      result.grid.forEach((p, i) => {
        near(p.lng, reference.grid[i].lng);
        near(p.lat, reference.grid[i].lat);
        near(p.dose, reference.grid[i].dose);
      });
      near(summary.areaHa, reference.nitrogenSummary.areaHa, 1e-7);
    }
    reference = result;
  }
});

test("KML MultiGeometry and Shapefile MultiPolygon keep holes with their own outer part", async () => {
  const fixtures = await createHoleImportFixtures({ multipart: true });
  const polygons = await parseShpPolygons(asArrayBuffer(fixtures.polygon.buffer));
  assert.equal(polygons.length, 2);
  assert.deepEqual(polygons.map(p => p.holes.length), [2, 1]);
  near(polygons[1].holes[0][0][0], holeRings[0][0][0] + 0.003);
  const original = fixtures.kml.buffer.toString();
  const first = original.match(/<Polygon>[\s\S]*?<\/Polygon>/)[0];
  const withoutSecondHole = first.replace(first.match(/<innerBoundaryIs>[\s\S]*?<\/innerBoundaryIs>/g)[1], "");
  const second = withoutSecondHole.replace(/12(?:\.\d+)?(?=,)/g, n => String(Number(n) + 0.003));
  const multi = original.replace(first, `<MultiGeometry>${first}${second}</MultiGeometry>`);
  const kmlPolygons = parseKml(multi);
  assert.deepEqual(kmlPolygons.map(p => p.holes.length), [2, 1]);
  near(kmlPolygons[1].holes[0][0][0], polygons[1].holes[0][0][0]);
  // Prefixes are legal KML namespaces, not a reason to lose excluded rings.
  const prefixed = original.replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)/g, "<$1k:$2")
    .replace('xmlns=', 'xmlns:k=');
  assert.deepEqual(parseKml(prefixed), parseKml(original));
});

test("hole interiors, vertices and edges have no inspectable dose and excluded controls cannot change IDW", () => {
  const result = computeIdwGrid(polygonFixture, controls);
  const baseline = computeIdwGrid(polygonFixture, [...controls,
    { ...controls[0], obsId: "excluded", lng: 12.0006, lat: 42.00045, dose: 9999, azotoTotale: undefined },
    { ...controls[0], obsId: "excluded-edge", lng: 12.00045, lat: 42.00045, dose: 9999 },
  ]);
  assert.deepEqual(baseline, result);
  for (const [lng, lat] of [[12.0006, 42.00045], [12.00014, 42.00016],
    ...holeRings.flat(), [12.00045, 42.00045], [12.00075, 42.00045],
    [12.0006, 42.00032], [12.0006, 42.00058]]) {
    assert.equal(findDoseCell(result, lng, lat), undefined);
    assert.equal(pointInField(lng, lat, polygonFixture), false);
  }
  assert(findDoseCell(result, 12.0003, 42.0003));
  assert.equal(computeIdwGrid(polygonFixture, [
    { ...controls[0], lng: 12.0006, lat: 42.00045 },
  ]).grid.length, 0);
  // Open/closed rings and winding order must not change the net geometry.
  const reversed = computeIdwGrid({ ...polygonFixture, ring: [...ring].reverse(),
    holes: holeRings.map(r => r.slice(0, -1).reverse()) }, controls);
  assert.deepEqual(reversed.grid, result.grid);
  near(reversed.nitrogenSummary.areaHa, result.nitrogenSummary.areaHa, 1e-7);
});

test("removing excluded nodes does not change the IDW model at retained nodes with varying doses", () => {
  const variableControls = controls.map((c, i) => ({ ...c, dose: i ? 70 : 10 }));
  const outerOnly = computeIdwGrid({ name: polygonFixture.name, ring }, variableControls);
  const withHoles = computeIdwGrid(polygonFixture, variableControls);
  assert.deepEqual(withHoles.grid, outerOnly.grid.filter(g => !inExcludedRectangle(g.lng, g.lat)));
});

test("legacy fields without holes retain their existing 100-cell result in all three formats", async () => {
  const f = await createImportFixtures();
  const parsed = [parseKml(f.kml.buffer.toString())[0], (await parseKmz(asArrayBuffer(f.kmz.buffer)))[0],
    (await parseShpPolygons(asArrayBuffer(f.polygon.buffer)))[0]];
  for (const p of parsed) {
    assert.equal(p.holes, undefined);
    const result = computeIdwGrid(p, controls);
    assert.equal(result.grid.length, 100);
    near(result.stats.mean, 30);
  }
});

async function captureDownload(run) {
  const savedDocument = globalThis.document;
  const savedURL = URL.createObjectURL;
  const savedTimeout = globalThis.setTimeout;
  let blob;
  globalThis.document = { createElement: () => ({ style: {}, click() {} }),
    body: { appendChild() {}, removeChild() {} } };
  URL.createObjectURL = value => { blob = value; return "blob:synthetic"; };
  globalThis.setTimeout = () => 0;
  try { await run(); } finally {
    globalThis.document = savedDocument;
    URL.createObjectURL = savedURL;
    globalThis.setTimeout = savedTimeout;
  }
  assert(blob);
  return blob.arrayBuffer();
}

test("parsed point SHP/DBF/CSV exports exclude holes and use net nitrogen totals", async () => {
  const result = computeIdwGrid(polygonFixture, controls);
  const bytes = await captureDownload(() => downloadShapefile(result));
  const parsed = await shp(bytes);
  assert.equal(parsed.features.length, result.grid.length);
  parsed.features.forEach(f => {
    assert(!inExcludedRectangle(...f.geometry.coordinates));
    assert.equal(f.properties.DOSE_IDW, 30);
    near(f.properties.AREA_HA, Number(result.nitrogenSummary.areaHa.toFixed(2)));
    near(f.properties.N_PLAN_KG, Number(result.nitrogenSummary.plannedTotalKg.toFixed(1)));
    near(f.properties.N_IDW_KG, Number(result.nitrogenSummary.indicatedTotalKg.toFixed(1)));
    near(f.properties.N_SAVE_KG, Number(result.nitrogenSummary.savedTotalKg.toFixed(1)));
  });
  const zip = await JSZip.loadAsync(bytes);
  const csv = await zip.file("QA_holes_riepilogo_azoto.csv").async("string");
  assert(csv.includes(result.nitrogenSummary.savedTotalKg.toFixed(1).replace(".", ",")));
});

test("GeoTIFF hole-centre pixels are NODATA, not doses from adjacent grid cells", async () => {
  const result = computeIdwGrid(polygonFixture, controls);
  const tiff = await fromArrayBuffer(await captureDownload(() => downloadGeoTiff(result)));
  const image = await tiff.getImage();
  assert.equal(image.getGDALNoData(), -9999);
  const raster = await image.readRasters();
  let holePixels = 0, validPixels = 0;
  for (let row = 0; row < image.getHeight(); row++) {
    for (let col = 0; col < image.getWidth(); col++) {
      const lng = result.bbox[0] + (col + 0.5) * result.cellSizeDeg.lon;
      const lat = result.bbox[3] - (row + 0.5) * result.cellSizeDeg.lat;
      const dose = raster[0][row * image.getWidth() + col];
      if (inExcludedRectangle(lng, lat)) {
        holePixels++;
        assert.equal(dose, -9999);
      } else if (dose !== -9999) {
        validPixels++;
        near(dose, 30);
      }
    }
  }
  assert(holePixels > 0 && validPixels > 0);
  const description = String(await image.getFileDirectory().loadValue("ImageDescription"));
  assert(description.includes(result.nitrogenSummary.areaHa.toFixed(2)));
});

test("malformed inner rings fail import and clear previous geometry rather than silently filling holes", async () => {
  const f = await createHoleImportFixtures();
  const invalid = f.kml.buffer.toString().replace("12.00045,42.00032", "NaN,42.00032");
  assert.throws(() => parseKml(invalid), /ring/);
  let state;
  let clears = 0;
  const importer = createPolygonImporter(value => { state = value; }, () => { clears++; });
  const file = text => ({ name: "synthetic.kml", size: text.length, text: async () => text });
  await importer.load(file(f.kml.buffer.toString()));
  assert.equal(state.polygons[0].holes.length, 2);
  await importer.load(file(invalid));
  assert.equal(state.polygons.length, 0);
  assert(state.error);
  assert.equal(clears, 2);
});

test("map rendering clips cell rectangles with even-odd rings and draws inner outlines", () => {
  const source = readFileSync(new URL("../src/ElaborazioniMappe.tsx", import.meta.url), "utf8");
  assert(source.includes('ctx.clip("evenodd")'));
  assert(source.indexOf('ctx.clip("evenodd")') < source.indexOf("ctx.fillRect("));
  assert(source.match(/L\.polygon\(\s*\[result\.polygon\.ring, \.\.\.\(result\.polygon\.holes \?\? \[\]\)\]/));
});

for (const { centre, south } of [
  { centre: 0.00005, south: false },
  { centre: -0.00005, south: true },
]) {
  test(`equator-crossing hole stays excluded through imports, IDW, inspection and exports (UTM 33${south ? "S" : "N"})`, async t => {
    const f = await createEquatorHoleImportFixtures(centre);
    const inside = (lng, lat, r) => lng >= r[0][0] && lng <= r[2][0]
      && lat >= r[0][1] && lat <= r[2][1];
    const excluded = (lng, lat) => inside(lng, lat, f.hole);
    // This rectangle oracle does not use production pointInField/masking logic.
    const cultivated = (lng, lat) => inside(lng, lat, f.outer) && !excluded(lng, lat);
    const assertBothSides = points => {
      assert(points.some(p => p.lat < 0), "cultivated nodes survive south of equator");
      assert(points.some(p => p.lat > 0), "cultivated nodes survive north of equator");
    };
    assert(f.outer[0][1] < 0 && f.outer[2][1] > 0);
    assert(f.hole[0][1] < 0 && f.hole[2][1] > 0);
    near((f.outer[0][1] + f.outer[2][1]) / 2, centre);
    const imports = [
      ["KML", parseKml(f.kml.buffer.toString())],
      ["KMZ", await parseKmz(asArrayBuffer(f.kmz.buffer))],
      ["Shapefile", await parseShpPolygons(asArrayBuffer(f.polygon.buffer))],
    ];
    let reference;
    for (const [format, polygons] of imports) {
      await t.test(format, async () => {
        assert.equal(polygons.length, 1);
        const polygon = polygons[0];
        const assertRing = (actual, expected) => {
          assert.equal(actual.length, expected.length);
          // ESRI outer winding differs from KML; PRJ decoding adds roundoff.
          for (const [x, y] of expected) assert(actual.some(([lng, lat]) =>
            Math.abs(lng - x) < 1e-12 && Math.abs(lat - y) < 1e-12));
        };
        assertRing(polygon.ring, f.outer);
        assert.equal(polygon.holes.length, 1);
        assertRing(polygon.holes[0], f.hole);
        const result = computeIdwGrid(polygon, f.controls);
        assert.equal(result.utmZone, 33);
        assert.equal(result.utmSouth, south);
        assert(result.grid.length >= 70 && result.grid.length < 100, "bounded 10 m grid, with excluded nodes");
        assertBothSides(result.grid);
        result.grid.forEach(p => {
          assert(cultivated(p.lng, p.lat));
          assert(p.dose >= 20 && p.dose <= 60);
        });
        if (reference) {
          assert.equal(result.grid.length, reference.grid.length);
          result.grid.forEach((p, i) => {
            near(p.lng, reference.grid[i].lng, 1e-12);
            near(p.lat, reference.grid[i].lat, 1e-12);
            near(p.dose, reference.grid[i].dose, 1e-6);
          });
        }
        reference = result;
        const outerOnly = computeIdwGrid({ ...polygon, holes: undefined }, f.controls);
        const removed = outerOnly.grid.filter(p => excluded(p.lng, p.lat));
        assert(removed.length >= 8, "hole actually removes multiple nodes");
        assertBothSides(removed);
        assert.deepEqual(result.grid, outerOnly.grid.filter(p => !excluded(p.lng, p.lat)));

        // Poison interiors on both sides, equator, vertices and all four edges.
        const probes = [
          [15, -0.00009], [15, 0], [15, 0.00009], ...f.hole,
          [14.99985, 0], [15.00015, 0], [15, -0.00018], [15, 0.00018],
        ];
        const poisoned = probes.map(([lng, lat], i) => ({
          ...f.controls[0], obsId: `excluded-${i}`, lng, lat, dose: 999_999,
          azotoTotale: undefined,
        }));
        assert.deepEqual(computeIdwGrid(polygon, [...f.controls, ...poisoned]), result,
          "excluded measurements cannot alter doses, controls, statistics or nitrogen summary");
        assert.equal(computeIdwGrid(polygon, poisoned).grid.length, 0);
        for (const [lng, lat] of probes) {
          assert.equal(pointInField(lng, lat, polygon), false);
          assert.equal(findDoseCell(result, lng, lat), undefined);
        }
        for (const p of f.controls) assert(findDoseCell(result, p.lng, p.lat));

        const zipBytes = await captureDownload(() => downloadShapefile(result));
        const zip = await JSZip.loadAsync(zipBytes);
        const prj = Object.values(zip.files).filter(entry => entry.name.endsWith(".prj"));
        assert.equal(prj.length, 1);
        assert.match(await prj[0].async("string"), /^GEOGCS\["GCS_WGS_1984"/);
        const exported = await shp(zipBytes);
        assert.equal(exported.features.length, result.grid.length);
        const points = exported.features.map((feature, i) => {
          assert.equal(feature.geometry.type, "Point");
          const [lng, lat] = feature.geometry.coordinates;
          assert(cultivated(lng, lat), "exported node is not in the hole");
          near(lng, result.grid[i].lng);
          near(lat, result.grid[i].lat);
          assert.equal(feature.properties.DOSE_IDW, Number(result.grid[i].dose.toFixed(4)));
          return { lng, lat };
        });
        assertBothSides(points);

        const image = await (await fromArrayBuffer(
          await captureDownload(() => downloadGeoTiff(result)),
        )).getImage();
        assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
        assert.equal(image.getGeoKeys().GTModelTypeGeoKey, 2);
        assert.equal(image.getGeoKeys().GTRasterTypeGeoKey, 1);
        assert.equal(image.getGDALNoData(), -9999);
        const [west, minLat, east, north] = result.bbox;
        const { lon, lat } = result.cellSizeDeg;
        const cols = Math.ceil((east - west) / lon), rows = Math.ceil((north - minLat) / lat);
        assert.equal(image.getWidth(), cols);
        assert.equal(image.getHeight(), rows);
        assert.deepEqual(image.getOrigin(), [west, north, 0]);
        assert.deepEqual(image.getResolution(), [lon, -lat, 0]);
        const raster = await image.readRasters({ interleave: true });
        const expected = new Float32Array(cols * rows).fill(-9999);
        for (const p of result.grid) {
          const col = Math.floor((p.lng - west) / lon), row = Math.floor((north - p.lat) / lat);
          if (!cultivated(west + (col + .5) * lon, north - (row + .5) * lat)) continue;
          const i = row * cols + col;
          expected[i] = Math.max(expected[i], Math.fround(p.dose));
        }
        assert.deepEqual(Array.from(raster), Array.from(expected));
        const holePixels = [], validPixels = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const lng = west + (col + .5) * lon, y = north - (row + .5) * lat;
            const value = raster[row * cols + col];
            if (excluded(lng, y)) {
              holePixels.push({ lng, lat: y });
              assert.equal(value, -9999, "hole pixel centres must have NoData");
            } else if (value !== -9999) {
              assert(cultivated(lng, y));
              assert(value >= 20 && value <= 60);
              validPixels.push({ lng, lat: y });
            }
          }
        }
        assert(holePixels.length >= 8, "non-vacuous raster hole coverage");
        assertBothSides(holePixels);
        assertBothSides(validPixels);
      });
    }
  });
}
