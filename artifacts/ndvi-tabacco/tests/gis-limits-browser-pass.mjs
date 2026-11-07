import assert from "node:assert/strict";
import { createGisLimitFixtures } from "./fixtures/gis-limits.mjs";
import { createImportFixtures } from "./fixtures/idw-imports.mjs";

/** Runs only against the isolated, development-only synthetic component harness. */
export async function runGisLimitsBrowserPass(page, { baseURL }) {
  await page.route("**/api/**", route => route.abort("blockedbyclient"));
  const valid = await createImportFixtures();
  const excessive = await createGisLimitFixtures();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseURL}/tests/idw.html?module=maps&lang=it`);
  const polygon = page.locator("input[accept='.kml,.kmz,.zip']");
  const points = page.locator("input[accept='.zip']");
  const run = page.getByRole("button", { name: "Spazializza i tuoi dati", exact: true });
  const downloads = page.getByRole("button").filter({ hasText: /Scarica (GeoTIFF|Shapefile)/ });
  await page.evaluate(() => {
    window.gisHeartbeat = 0;
    window.gisHeartbeatTimer = setInterval(() => window.gisHeartbeat++, 10);
  });
  for (const file of [...Object.values(excessive), {
    name: "oversize.zip", mimeType: "application/zip", buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  }]) {
    await polygon.setInputFiles(valid.kmz);
    await run.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("button")]
      .some(b => b.textContent === "Spazializza i tuoi dati" && !b.disabled));
    await run.click();
    await downloads.first().waitFor();
    await polygon.setInputFiles(file);
    await page.getByRole("alert").waitFor();
    assert.equal(await downloads.count(), 0);
    assert.equal(await run.isDisabled(), true);
  }
  await polygon.setInputFiles(valid.polygon);
  await page.getByRole("button", { name: "📁 Da Shapefile esterno", exact: true }).click();
  for (const file of Object.values(excessive)) {
    await points.setInputFiles(valid.points);
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 4);
    await run.click();
    await downloads.first().waitFor();
    await points.setInputFiles(file);
    await page.getByRole("alert").waitFor();
    assert.equal(await page.locator("tbody tr").count(), 0);
    assert.equal(await downloads.count(), 0);
    assert.equal(await run.isDisabled(), true);
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
  await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 4);
  await run.click();
  await downloads.first().waitFor();
  assert(await page.evaluate(() => window.gisHeartbeat > 0));
  await page.evaluate(() => clearInterval(window.gisHeartbeatTimer));
  assert.deepEqual(errors, []);
}
