// Reusable browser-pass helper. Run from artifacts/ndvi-tabacco with an
// already-created Playwright `page`; no Playwright dependency is added here.
// Example caller supplies baseURL, fixturePath, and downloadDir.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import shp from "shpjs";
import { fromFile } from "geotiff";

const langs = [
  { code: "it", option: "Italiano", heading: "Elaborazioni e Mappe", summary: "Risparmio di azoto sull’intero poligono", zip: /Scarica Shapefile/, tif: /Scarica GeoTIFF/ },
  { code: "en", option: "English", heading: "Processing and maps", summary: "Nitrogen savings across the entire polygon", zip: /Download Shapefile/, tif: /Download GeoTIFF/ },
  { code: "es", option: "Español", heading: "Procesamiento y mapas", summary: "Ahorro de nitrógeno en todo el polígono", zip: /Descargar Shapefile/, tif: /Descargar GeoTIFF/ },
];

export async function runIdwBrowserPass(page, { baseURL, fixturePath, downloadDir }) {
  await fs.mkdir(downloadDir, { recursive: true });
  await page.goto(`${baseURL}/tests/idw.html?module=maps`);
  const language = page.locator("select").first();
  const file = page.locator("input[type=file][accept='.kml,.kmz,.zip']");
  await language.selectOption({ label: "Italiano" });
  await file.setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Spazializza i tuoi dati" }).click();
  await page.locator('[data-testid="nitrogen-savings"]').waitFor({ state: "visible" });
  assert.match(await page.locator('[data-testid="summary-saved-kg"]').innerText(), /49[,.]7/);
  assert.match(await page.locator('[data-testid="summary-saved-percent"]').innerText(), /50[,.]0%/);

  for (const lang of langs) {
    await language.selectOption({ label: lang.option });
    assert.equal(await page.locator('[data-testid="text-module-title"]').innerText(), lang.heading);
    assert.equal(await page.locator("#nitrogen-comparison-title").innerText(), lang.summary);
    assert.match(await page.locator('[data-testid="summary-saved-kg"]').innerText(), /49[,.]7/);
    for (const [kind, pattern] of [["shapefile", lang.zip], ["result", lang.tif]]) {
      const button = page.getByRole("button", { name: pattern });
      const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
      await download.saveAs(path.join(downloadDir, `${lang.code}-${kind}.${kind === "shapefile" ? "zip" : "tif"}`));
    }
  }
  for (const lang of langs) {
    const zipPath = path.join(downloadDir, `${lang.code}-shapefile.zip`);
    const zip = await JSZip.loadAsync(await fs.readFile(zipPath));
    for (const ext of [".shp", ".shx", ".dbf", ".prj", ".csv"])
      assert(Object.keys(zip.files).some(name => name.toLowerCase().endsWith(ext)));
    const geo = await shp(await fs.readFile(zipPath));
    const features = Array.isArray(geo) ? geo.flatMap(item => item.features ?? []) : geo.features;
    assert.equal(features.length, 100);
    assert.equal(features[0].properties.N_SAVE_KG, 49.7);
    const image = await (await fromFile(path.join(downloadDir, `${lang.code}-result.tif`))).getImage();
    assert((await image.readRasters())[0] instanceof Float32Array);
    assert.equal(image.getGDALNoData(), -9999);
    assert.equal(image.getGeoKeys().GeographicTypeGeoKey, 4326);
  }
}
