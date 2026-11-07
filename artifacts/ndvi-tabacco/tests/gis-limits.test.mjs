import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { GIS_ERRORS, GIS_LIMITS, checkGisFileSize, readBoundedZip } from "../src/utils/gisLimits.ts";
import { readShpPointLayers } from "../src/utils/shapefileImport.ts";
import { parseKml, parseKmz, parseShpPolygons } from "../src/utils/geoUtils.ts";
import { canSpatialize, createPolygonImporter } from "../src/utils/polygonImport.ts";
import { decodeGis } from "../src/utils/gisWorkerClient.ts";
import { setLanguage, t } from "../src/i18n/runtime.ts";
import { createGisLimitFixtures } from "./fixtures/gis-limits.mjs";
import { createImportFixtures } from "./fixtures/idw-imports.mjs";

globalThis.DOMParser = DOMParser;
const ab = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const fixtures = createGisLimitFixtures();
test("size is checked before reading any File bytes; exact limit is allowed", async () => {
  checkGisFileSize(GIS_LIMITS.fileBytes);
  assert.throws(() => checkGisFileSize(GIS_LIMITS.fileBytes + 1), { message: GIS_ERRORS.file });
  let state, result = "old export", reads = 0;
  const importer = createPolygonImporter(s => { state = s; }, () => { result = null; });
  await importer.load({ name: "huge.zip", size: GIS_LIMITS.fileBytes + 1,
    arrayBuffer: async () => { reads++; throw Error("must not read"); } });
  assert.equal(reads, 0);
  assert.equal(result, null);
  assert.equal(state.error, GIS_ERRORS.file);
  assert.deepEqual(state.polygons, []);
  assert.equal(canSpatialize(state, 4, false), false);
});
test("all ZIP budgets reject real synthetic archives on point, polygon and KMZ paths", async () => {
  const files = await fixtures;
  for (const kind of ["expanded", "entries", "layers"]) {
    for (const parse of [readShpPointLayers, parseShpPolygons, parseKmz]) {
      await assert.rejects(() => parse(ab(files[kind].buffer)), { message: GIS_ERRORS[kind] });
    }
  }
  for (const kind of ["features", "vertices"]) {
    for (const parse of [readShpPointLayers, parseShpPolygons]) {
      await assert.rejects(() => parse(ab(files[kind].buffer)), { message: GIS_ERRORS[kind] });
    }
  }
});
test("actual inflation is bounded even when ZIP size fields lie", async () => {
  const files = await fixtures;
  await assert.rejects(() => readBoundedZip(ab(files.forged.buffer)), { message: GIS_ERRORS.expanded });
});
test("SHP and DBF declared counts are rejected before shpjs allocation", async () => {
  const valid = await createImportFixtures();
  for (const ext of ["shp", "dbf"]) {
    const zip = await JSZip.loadAsync(valid.polygon.buffer);
    const bytes = await zip.file(`field.${ext}`).async("nodebuffer");
    bytes.writeUInt32LE(ext === "shp" ? GIS_LIMITS.vertices + 1 : GIS_LIMITS.features + 1,
      ext === "shp" ? 148 : 4);
    zip.file(`field.${ext}`, bytes);
    await assert.rejects(() => readShpPointLayers(ab(Buffer.from([])))); // Empty ZIP must also fail.
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    await assert.rejects(() => parseShpPolygons(buffer),
      { message: ext === "shp" ? GIS_ERRORS.invalid : GIS_ERRORS.features });
  }
});

test("KML budgets and recovery after failed imports clear old polygons and exports", async () => {
  const valid = await createImportFixtures();
  const files = await fixtures;
  const loadable = file => ({ ...file, size: file.buffer.length,
    arrayBuffer: async () => ab(file.buffer), text: async () => file.buffer.toString() });
  let state, result;
  const importer = createPolygonImporter(s => { state = s; }, () => { result = null; });
  for (const file of Object.values(files)) {
    await importer.load(loadable(valid.polygon));
    assert.equal(state.polygons.length, 1);
    result = "old export";
    const pending = importer.load(loadable(file));
    assert.equal(result, null);
    assert.equal(state.loading, true);
    assert.equal(state.polygons.length, 0);
    await pending;
    assert(state.error);
    assert.equal(state.selectedIndex, null);
    assert.equal(canSpatialize(state, 4, false), false);
  }
  await importer.load(loadable(valid.kmz));
  assert.equal(state.error, null);
  assert.equal(state.polygons.length, 1);
  assert.throws(() => parseKml(`<kml>${"<Folder/>".repeat(17)}</kml>`), { message: GIS_ERRORS.layers });
  assert.throws(() => parseKml(`<kml>${"<Polygon/>".repeat(10001)}</kml>`), { message: GIS_ERRORS.features });
  assert.throws(() => parseKml(`<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${
    "12,42 ".repeat(100001)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`),
  { message: GIS_ERRORS.vertices });
});
test("all limit messages translate IT/EN/ES", () => {
  for (const lang of ["en", "es", "it"]) {
    setLanguage(lang);
    for (const message of Object.values(GIS_ERRORS)) {
      if (lang === "it") assert.equal(t(message), message);
      else assert.notEqual(t(message), message);
    }
  }
});
test("worker deadlines and cancellation terminate decoding without accepting late results", async context => {
  const original = globalThis.Worker;
  const workers = [];
  globalThis.Worker = class {
    constructor() { workers.push(this); }
    postMessage() {}
    terminate() { this.terminated = true; }
  };
  context.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const timed = decodeGis("points", new ArrayBuffer(0));
    const assertion = assert.rejects(timed, { message: GIS_ERRORS.timeout });
    context.mock.timers.tick(GIS_LIMITS.timeoutMs);
    await assertion;
    assert.equal(workers[0].terminated, true);
    const controller = new AbortController();
    const cancelled = decodeGis("zip", new ArrayBuffer(0), controller.signal);
    controller.abort();
    await assert.rejects(cancelled, /cancelled/);
    assert.equal(workers[1].terminated, true);
  } finally {
    globalThis.Worker = original;
    context.mock.timers.reset();
  }
});
