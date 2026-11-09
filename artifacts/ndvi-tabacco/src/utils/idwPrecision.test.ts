import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import shp from "shpjs";
import { fromArrayBuffer } from "geotiff";
import { NitrogenSavings } from "../components/NitrogenSavings";
import {
  computeIdwGrid, downloadGeoTiff, downloadShapefile, findDoseCell,
  type ControlPoint, type KmlPolygon,
} from "./geoUtils";
import { conservativeIdwValue, conservativeFloat32, formatIdwValue } from "./idwPrecision";

// Only synthetic, in-memory data. No app login, API or database.
const polygon: KmlPolygon = { name: "synthetic_precision", ring: [
  [12, 42], [12.0012, 42], [12.0012, 42.0009], [12, 42.0009], [12, 42],
] };
const points: ControlPoint[] = [
  { obsId: "synthetic-a", coltura: "pomodoro", cliente: "QA", appezzamento: "QA",
    lng: 12.0002, lat: 42.0002, dose: 0, azotoTotale: 10, azotoGiaDistribuito: 9.99 },
  { obsId: "synthetic-b", coltura: "grano_duro", cliente: "QA", appezzamento: "QA",
    lng: 12.001, lat: 42.0007, dose: .1, azotoTotale: 10, azotoGiaDistribuito: 9.89 },
];

test("four decimals never increase values, including adjacent binary boundaries, and are idempotent", () => {
  assert.equal(formatIdwValue(.00009), "0.0000");
  assert.equal(formatIdwValue(.00019), "0.0001");
  assert.equal(formatIdwValue(.06), "0.0600");
  assert.equal(formatIdwValue(.1), "0.1000");
  assert.equal(formatIdwValue(10 - 9.9), "0.0999");
  assert.throws(() => conservativeIdwValue(NaN));
  const buf = new ArrayBuffer(8), view = new DataView(buf);
  for (const value of [.0001, .0003, .06, .1, .2, 10, 250]) {
    view.setFloat64(0, value);
    const bits = view.getBigUint64(0);
    for (const offset of [-1n, 0n, 1n]) {
      view.setBigUint64(0, bits + offset);
      const input = view.getFloat64(0);
      const dose = conservativeIdwValue(input);
      assert(dose <= input);
      assert.equal(conservativeIdwValue(dose), dose);
      assert.equal(Number(formatIdwValue(dose)), dose);
      assert(conservativeFloat32(dose) <= dose);
    }
  }
  // Float32 round-to-nearest really does prescribe more than 0.1.
  assert(Math.fround(.1) > .1);
  assert(conservativeFloat32(.1) < .1);
});

test("mixed crops: reproduce one-decimal overshoot and cap every derived cell, without mutating controls", () => {
  const before = structuredClone(points);
  const result = computeIdwGrid(polygon, points);
  let reproduced = 0;
  assert(result.grid.length > 20);
  for (const cell of result.grid) {
    // Independent fixture identity: residual - .01 is the mathematical raw
    // dose here, since each input residual is dose + .01.
    const residual = cell.azotoTotale! - cell.azotoGiaDistribuito!;
    const rawDose = residual - .01;
    if (Number(rawDose.toFixed(1)) > residual) reproduced++;
    assert(cell.dose <= residual);
    assert(Number(formatIdwValue(cell.dose)) <= residual);
    assert(conservativeFloat32(cell.dose) <= residual);
    assert.equal(findDoseCell(result, cell.lng, cell.lat)?.dose, cell.dose);
  }
  assert(reproduced > 0, "fixture must demonstrate the original overshoot");
  assert.deepEqual(points, before);
  const meanResidual = result.grid.reduce((sum, g) => sum + g.azotoTotale! - g.azotoGiaDistribuito!, 0) / result.grid.length;
  assert(Number(formatIdwValue(result.stats.mean)) <= meanResidual);
  assert.equal(result.stats.mean, result.grid.reduce((sum, g) => sum + g.dose, 0) / result.grid.length);
});

test("historical over-budget doses are capped only in the derived map; no hidden clipping of already-applied N", () => {
  const controls = points.map(p => ({ ...p, dose: .06, azotoTotale: 10, azotoGiaDistribuito: 9.99 }));
  const result = computeIdwGrid(polygon, controls);
  assert(result.grid.every(g => g.dose === .0099));
  assert(controls.every(p => p.dose === .06));
  const excess = computeIdwGrid(polygon, controls.map(p => ({ ...p, azotoGiaDistribuito: 11 })));
  assert(excess.grid.every(g => g.dose === 0));
  assert.equal(excess.nitrogenSummary!.indicatedPerHa, 11);
  assert.equal(excess.nitrogenSummary!.savedPerHa, 0);
});

test("absent, partial or invalid imported budget cannot fabricate residuals or savings", () => {
  for (const controls of [
    points.map(p => ({ ...p, dose: .06009, azotoTotale: undefined })),
    points.map((p, i) => ({ ...p, dose: .06009, azotoTotale: i ? undefined : 10 })),
    points.map(p => ({ ...p, azotoGiaDistribuito: NaN })),
  ]) {
    const before = structuredClone(controls);
    const result = computeIdwGrid(polygon, controls);
    assert.equal(result.nitrogenSummary, undefined);
    assert(result.grid.every(g => g.azotoTotale === undefined && g.azotoGiaDistribuito === undefined));
    assert.deepEqual(controls, before);
    const html = renderToStaticMarkup(createElement(NitrogenSavings, { result }));
    assert(html.includes("Risparmio non disponibile"));
    if (controls[0].dose === .06009) assert(result.grid.every(g => g.dose === .06));
  }
});

async function captureDownload(run: () => void | Promise<void>): Promise<ArrayBuffer> {
  const documentBefore = globalThis.document;
  const urlBefore = URL.createObjectURL;
  const timeoutBefore = globalThis.setTimeout;
  let blob: Blob | undefined;
  globalThis.document = { createElement: () => ({ style: {}, click() {} }),
    body: { appendChild() {}, removeChild() {} } } as unknown as Document;
  URL.createObjectURL = value => { blob = value as Blob; return "blob:synthetic"; };
  globalThis.setTimeout = (() => 0) as unknown as typeof setTimeout;
  try { await run(); } finally {
    globalThis.document = documentBefore;
    URL.createObjectURL = urlBefore;
    globalThis.setTimeout = timeoutBefore;
  }
  assert(blob);
  return blob.arrayBuffer();
}

test("real DBF, CSV, GeoTIFF and savings markup agree on conservative precision", async () => {
  const result = computeIdwGrid(polygon, points);
  const bytes = await captureDownload(() => downloadShapefile(result));
  const parsed = await shp(bytes);
  assert(!Array.isArray(parsed));
  parsed.features.forEach((f, i) => {
    assert.equal(f.properties!.DOSE_IDW, result.grid[i].dose);
    assert.equal(f.properties!.N_IDW_HA, Number(formatIdwValue(result.nitrogenSummary!.indicatedPerHa)));
    assert.equal(f.properties!.N_SAVE_KG, Number(formatIdwValue(result.nitrogenSummary!.savedTotalKg)));
  });
  const zip = await JSZip.loadAsync(bytes);
  const csv = await zip.file("synthetic_precision_riepilogo_azoto.csv")!.async("string");
  const summary = result.nitrogenSummary!;
  assert(csv.includes(formatIdwValue(summary.indicatedPerHa).replace(".", ",")));
  assert(csv.includes(formatIdwValue(summary.savedTotalKg).replace(".", ",")));
  const html = renderToStaticMarkup(createElement(NitrogenSavings, { result }));
  assert(html.includes(formatIdwValue(summary.indicatedPerHa)));
  assert(html.includes(formatIdwValue(summary.savedPercent)));
  assert(html.includes(formatIdwValue(summary.savedTotalKg)));
  const image = await (await fromArrayBuffer(await captureDownload(() => downloadGeoTiff(result)))).getImage();
  const raster = await image.readRasters({ interleave: true });
  let checked = 0;
  for (const g of result.grid) {
    const col = Math.floor((g.lng - result.bbox[0]) / result.cellSizeDeg.lon);
    const row = Math.floor((result.bbox[3] - g.lat) / result.cellSizeDeg.lat);
    const value = raster[row * image.getWidth() + col];
    if (value === -9999) continue;
    checked++;
    assert(value <= g.dose, "including pixels with multiple contributing cells");
    assert(value <= g.azotoTotale! - g.azotoGiaDistribuito!);
  }
  assert(checked > 0);
  const description = String(await image.getFileDirectory().loadValue("ImageDescription"));
  assert(description.includes(formatIdwValue(summary.indicatedPerHa)));
  // Unknown budgets export doses but no invented comparison.
  const imported = computeIdwGrid(polygon, points.map(p => ({ ...p, azotoTotale: undefined })));
  const importedZip = await JSZip.loadAsync(await captureDownload(() => downloadShapefile(imported)));
  assert(!Object.keys(importedZip.files).some(name => name.endsWith(".csv")));
});
