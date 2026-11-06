import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import shp from "shpjs";
import { createImportFixtures, coordinates, polygonName, ring } from "./fixtures/idw-imports.mjs";

test("synthetic KMZs contain the baseline KML, at root or nested with uppercase suffix", async () => {
  const fixtures = await createImportFixtures();
  for (const [key, entry] of [["kmz", "doc.kml"], ["nestedKmz", "layers/FIELD.KML"]]) {
    const zip = await JSZip.loadAsync(fixtures[key].buffer);
    assert.equal(await zip.file(entry).async("string"), fixtures.kml.buffer.toString());
  }
  const broken = await JSZip.loadAsync(fixtures.emptyKmz.buffer);
  assert.equal(Object.keys(broken.files).filter(n => /\.kml$/i.test(n)).length, 0);
});

test("independent Shapefile parser reads the invented polygon and selectable point fields", async () => {
  const fixtures = await createImportFixtures();
  const field = await shp(fixtures.polygon.buffer);
  assert.equal(field.features.length, 1);
  assert.equal(field.features[0].geometry.type, "Polygon");
  const parsedRing = field.features[0].geometry.coordinates[0];
  assert.equal(parsedRing.length, ring.length);
  parsedRing.forEach((p, i) => p.forEach((value, axis) =>
    assert(Math.abs(value - [...ring].reverse()[i][axis]) < 1e-10)));
  assert.equal(field.features[0].properties.NOME, polygonName);
  const points = await shp(fixtures.points.buffer);
  assert.equal(points.features.length, 4);
  points.features.forEach((p, i) => {
    assert.equal(p.geometry.type, "Point");
    p.geometry.coordinates.forEach((value, axis) => assert(Math.abs(value - coordinates[i][axis]) < 1e-10));
    assert.deepEqual(p.properties, { ID: i + 1, DOSE: 60, KG_HA: 30, CLIENTE: "QA sintetico" });
    assert.equal(p.properties.N_PLAN_HA, undefined);
  });
});
