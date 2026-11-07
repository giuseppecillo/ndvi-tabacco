import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { createGisLimitFixtures } from "./fixtures/gis-limits.mjs";
import { createImportFixtures } from "./fixtures/idw-imports.mjs";

/** Runs only against an isolated synthetic component harness (dev or compiled). */
export async function runGisLimitsBrowserPass(page, { baseURL, entry = "/tests/idw.html" }) {
  await page.route("**/api/**", route => route.abort("blockedbyclient"));
  const valid = await createImportFixtures();
  const excessive = await createGisLimitFixtures();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseURL}${entry}?module=maps&lang=it`);
  const polygon = page.locator("input[accept='.kml,.kmz,.zip']");
  const points = page.locator("input[accept='.zip']");
  // History stays mounted in a hidden module and contains its own fixture rows.
  const pointRows = page.locator("tbody tr:visible");
  const run = page.getByRole("button", { name: "Spazializza i tuoi dati", exact: true });
  const downloads = page.getByRole("button").filter({ hasText: /Scarica (GeoTIFF|Shapefile)/ });
  const downloadEvents = [];
  page.on("download", download => downloadEvents.push(download.suggestedFilename()));
  const assertCleared = async () => {
    await page.waitForFunction(() => !document.querySelector(".nc-map-canvas"));
    assert.equal(await downloads.count(), 0);
    assert.equal(await page.locator(".nc-map-canvas").count(), 0);
    assert.equal(await run.isDisabled(), true);
  };
  const heartbeat = () => page.evaluate(() => window.gisHeartbeat);
  await page.evaluate(() => {
    window.gisHeartbeat = 0;
    window.gisHeartbeatMaxGap = 0;
    let previous = performance.now();
    window.gisHeartbeatTimer = setInterval(() => {
      const now = performance.now();
      window.gisHeartbeatMaxGap = Math.max(window.gisHeartbeatMaxGap, now - previous);
      previous = now;
      window.gisHeartbeat++;
    }, 10);
  });
  // Successful real formats exercise XML parsing in the worker and the lazy
  // Shapefile parser chunk, not mocks or main-thread parser calls.
  for (const file of [valid.kml, valid.kmz, valid.nestedKmz, valid.polygon]) {
    await polygon.setInputFiles(file);
    await page.waitForFunction(() => [...document.querySelectorAll("button")]
      .some(b => b.textContent === "Spazializza i tuoi dati" && !b.disabled));
    await run.click();
    await downloads.first().waitFor();
  }
  const rejectedFiles = [...Object.values(excessive), {
    name: "oversize.zip", mimeType: "application/zip", buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  }];
  for (const file of rejectedFiles) {
    await polygon.setInputFiles(valid.kmz);
    await run.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("button")]
      .some(b => b.textContent === "Spazializza i tuoi dati" && !b.disabled));
    await run.click();
    await downloads.first().waitFor();
    const before = await heartbeat();
    await polygon.setInputFiles(file);
    await page.getByRole("alert").waitFor();
    await assertCleared();
    await page.waitForFunction(n => window.gisHeartbeat > n, before, { timeout: 2000 });
  }
  await polygon.setInputFiles(valid.polygon);
  await page.getByRole("alert").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "📁 Da Shapefile esterno", exact: true }).click();
  for (const file of rejectedFiles) {
    await points.setInputFiles(valid.points);
    await expect(pointRows).toHaveCount(4);
    await page.getByRole("alert").waitFor({ state: "hidden" });
    await run.click();
    await downloads.first().waitFor();
    const before = await heartbeat();
    await points.setInputFiles(file);
    await page.getByRole("alert").waitFor();
    await expect(pointRows).toHaveCount(0);
    await assertCleared();
    await page.waitForFunction(n => window.gisHeartbeat > n, before, { timeout: 2000 });
  }
  for (const [lang, text] of [
    ["en", "GIS archive too large"], ["es", "Archivo GIS demasiado grande"], ["it", "Archivio GIS troppo grande"],
  ]) {
    await page.locator("select").first().selectOption(lang);
    await points.setInputFiles(excessive.forged);
    await page.getByRole("alert").filter({ hasText: text }).waitFor();
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await points.setInputFiles(valid.points);
  await expect(pointRows).toHaveCount(4);
  await run.click();
  await downloads.first().waitFor();
  assert(await page.evaluate(() => window.gisHeartbeat > 0));
  assert(await page.evaluate(() => window.gisHeartbeatMaxGap < 2000),
    "the UI heartbeat must not stall for two seconds during import/rejection");
  await page.evaluate(() => clearInterval(window.gisHeartbeatTimer));
  assert.deepEqual(downloadEvents, [], "import/rejection must never start a download");
  assert.deepEqual(errors, []);
}
