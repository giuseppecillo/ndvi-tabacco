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
import { createHoleImportFixtures, createImportFixtures, holeRings, ring } from "./fixtures/idw-imports.mjs";

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
