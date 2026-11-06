import assert from "node:assert/strict";
import test from "node:test";
import shp from "shpjs";
import { createMultiLayerFixtures, polygonName } from "./fixtures/idw-imports.mjs";
import { parseShpPolygons } from "../src/utils/geoUtils.ts";
import { readShpPointLayers, pointLayerControls, SHP_POINT_POLICY,
  SHP_POLYGON_POLICY, SHP_POINT_ERROR, SHP_DOSE_ERROR } from "../src/utils/shapefileImport.ts";
import { createPolygonImporter } from "../src/utils/polygonImport.ts";
import { setLanguage, t } from "../src/i18n/runtime.ts";

const asArrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
test("real multi-layer ZIPs retain every polygon with separate source identities", async () => {
  const files = await createMultiLayerFixtures();
  for (const key of ["polygons", "mixed"]) {
    const raw = await shp(files[key].buffer);
    assert(Array.isArray(raw));
    const parsed = await parseShpPolygons(asArrayBuffer(files[key].buffer));
    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed.map(p => p.name), [polygonName, polygonName]);
    assert.deepEqual(parsed.map(p => p.sourceLayer), ["campi_A", "campi_B"]);
    assert.deepEqual(parsed.map(p => p.sourceId), [101, 202]);
    let state;
    const importer = createPolygonImporter(s => { state = s; }, () => {});
    await importer.load({ name: files[key].name, size: files[key].buffer.length,
      arrayBuffer: async () => asArrayBuffer(files[key].buffer) });
    assert.equal(state.polygons.length, 2);
    assert.equal(state.error, null);
  }
});
test("points remain separate despite overlapping positions and IDs, with layer-specific fields", async () => {
  const files = await createMultiLayerFixtures();
  for (const key of ["points", "mixed"]) {
    const layers = await readShpPointLayers(asArrayBuffer(files[key].buffer));
    assert.deepEqual(layers.map(l => l.name), ["rilievi_A", "rilievi_B"]);
    assert.equal(layers[0].features.length, 4);
    assert.equal(layers[1].features.length, 4);
    assert(layers[0].numericFields.includes("DOSE"));
    assert(!layers[1].numericFields.includes("DOSE"));
    const a = pointLayerControls(layers[0], "DOSE");
    const b = pointLayerControls(layers[1], "KG_HA");
    assert.deepEqual(a.map(p => p.obsId), ["1", "2", "3", "4"]);
    assert.deepEqual(b.map(p => p.obsId), a.map(p => p.obsId));
    assert.equal(a.length, 4);
    assert.equal(b.length, 4);
    assert(a.every(p => p.dose === 60 && p.sourceLayer === "rilievi_A"));
    assert(b.every(p => p.dose === 90 && p.appezzamento === "Campo B"));
    assert.throws(() => pointLayerControls(layers[1], "DOSE"), /Dose/);
  }
});
test("mixed archives find compatible layers even after an incompatible first layer", async () => {
  const files = await createMultiLayerFixtures();
  assert.equal((await parseShpPolygons(asArrayBuffer(files.pointsFirst.buffer))).length, 1);
  assert.equal((await readShpPointLayers(asArrayBuffer(files.polygonsFirst.buffer))).length, 1);
  assert.equal((await readShpPointLayers(asArrayBuffer(files.polygons.buffer))).length, 0);
  await assert.rejects(() => parseShpPolygons(asArrayBuffer(files.points.buffer)));
  await assert.rejects(() => readShpPointLayers(asArrayBuffer(files.corrupt.buffer)));
});
test("layer policy, selection and errors translate into all supported languages", () => {
  const messages = [SHP_POINT_POLICY, SHP_POLYGON_POLICY, SHP_POINT_ERROR, SHP_DOSE_ERROR,
    "Livello di punti", "Seleziona un livello di punti", "Caricamento dei punti in corso…"];
  for (const lang of ["en", "es"]) {
    setLanguage(lang);
    for (const message of messages) assert.notEqual(t(message), message);
  }
  setLanguage("it");
  for (const message of messages) assert.equal(t(message), message);
});
