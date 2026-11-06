import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import shp from "shpjs";
import { createImportFixtures, polygonName } from "./fixtures/idw-imports.mjs";

const languages = [
  { code: "it", option: "Italiano", run: "Spazializza i tuoi dati", polygon: "1 poligono rilevato",
    loaded: "punti caricati — campo", selected: "selezionato come Dose", external: "📁 Da Shapefile esterno",
    download: /Scarica Shapefile/, unavailable: "non disponibile", missing: "Risparmio non disponibile.",
    error: "Impossibile caricare i poligoni." },
  { code: "en", option: "English", run: "Spatialize your data", polygon: "1 polygon detected",
    loaded: "points loaded — field", selected: "selected as rate", external: "📁 From external Shapefile",
    download: /Download Shapefile/, unavailable: "not available", missing: "Savings not available.",
    error: "Unable to load polygons." },
  { code: "es", option: "Español", run: "Espacializa tus datos", polygon: "1 polígono detectado",
    loaded: "puntos cargados — campo", selected: "seleccionado como dosis", external: "📁 Desde un Shapefile externo",
    download: /Descargar Shapefile/, unavailable: "no disponible", missing: "Ahorro no disponible.",
    error: "No se pueden cargar los polígonos." },
];
function equivalent(actual, expected) {
  assert.equal(actual.features.length, expected.features.length);
  actual.features.forEach((feature, i) => {
    assert.equal(feature.geometry.type, "Point");
    assert.equal(expected.features[i].geometry.type, "Point");
    feature.geometry.coordinates.forEach((value, axis) =>
      assert(Math.abs(value - expected.features[i].geometry.coordinates[axis]) < 1e-10, "grid coordinate"));
    assert.equal(feature.properties.DOSE_IDW, expected.features[i].properties.DOSE_IDW);
  });
}

/** One real component journey, no identity or database. Supplies download evidence. */
export async function runIdwImportBrowserPass(page, { baseURL, downloadDir }) {
  await fs.mkdir(downloadDir, { recursive: true });
  const files = await createImportFixtures();
  // Defense in depth: even if the harness fetch guard regresses, never contact an API.
  await page.route("**/api/**", route => route.abort("blockedbyclient"));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const evidence = [];
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/tests/idw.html?module=maps&lang=it`);
    const language = page.locator("select").first();
    const polygonInput = page.locator("input[type=file][accept='.kml,.kmz,.zip']");
    const savings = page.locator('[data-testid="nitrogen-savings"]');
    let baseline;
    async function process(lang) {
      await page.getByRole("button", { name: lang.run, exact: true }).click();
      await page.waitForFunction(label => [...document.querySelectorAll("button")]
        .some(button => button.textContent.trim() === label && !button.disabled), lang.run);
      await savings.waitFor();
    }
    async function download(lang, label) {
      const [file] = await Promise.all([
        page.waitForEvent("download"), page.getByRole("button", { name: lang.download }).click(),
      ]);
      const filename = path.join(downloadDir, `${width}-${label}.zip`);
      await file.saveAs(filename);
      const geo = await shp(await fs.readFile(filename));
      evidence.push(filename);
      return geo;
    }
    for (const format of ["kml", "kmz", "nestedKmz", "polygon"]) {
      await language.selectOption({ label: "Italiano" });
      await polygonInput.setInputFiles(files[format]);
      await page.getByRole("button", { name: new RegExp(polygonName) }).waitFor();
      for (const lang of languages) {
        await language.selectOption({ label: lang.option });
        await page.getByText(lang.polygon, { exact: true }).waitFor();
      }
      await language.selectOption({ label: "Italiano" });
      await process(languages[0]);
      assert.match(await page.locator('[data-testid="summary-saved-percent"]').innerText(), /50[,.]0%/);
      const grid = await download(languages[0], format);
      assert.equal(grid.features.length, 100);
      grid.features.forEach(f => assert.equal(f.properties.DOSE_IDW, 30));
      if (baseline) equivalent(grid, baseline);
      else baseline = grid;
    }
    await page.getByRole("button", { name: languages[0].external, exact: true }).click();
    await page.locator("input[type=file][accept='.zip']").setInputFiles(files.points);
    const dose = page.locator("select").filter({ has: page.locator('option[value="KG_HA"]') });
    await dose.waitFor();
    assert.equal(await dose.inputValue(), "DOSE");
    await process(languages[0]);
    const auto = await download(languages[0], "external-auto-60");
    auto.features.forEach(f => assert.equal(f.properties.DOSE_IDW, 60));
    await dose.selectOption("KG_HA");
    await process(languages[0]);
    for (const lang of languages) {
      await language.selectOption({ label: lang.option });
      const body = await page.locator("body").innerText();
      assert(body.includes(lang.loaded), `${lang.code}: loaded feedback`);
      assert(body.includes(lang.selected), `${lang.code}: field feedback`);
      assert(body.includes(lang.missing), `${lang.code}: unavailable explanation`);
      assert.equal(await dose.inputValue(), "KG_HA");
      for (const id of ["summary-saved-kg", "summary-saved-percent"]) {
        const value = page.locator(`[data-testid="${id}"]`);
        assert.equal((await value.innerText()).trim(), "—");
        assert.equal(await value.locator("span").getAttribute("aria-label"), lang.unavailable);
      }
      equivalent(await download(lang, `external-selected-${lang.code}`), baseline);
    }
    // Invalid KMZ clears geometry/results; translated errors must not leave stale maps.
    for (const lang of languages) {
      await language.selectOption({ label: lang.option });
      await polygonInput.setInputFiles(files.emptyKmz);
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert((await alert.innerText()).startsWith(lang.error));
      assert.equal(await savings.count(), 0);
      assert.equal(await page.getByRole("button", { name: lang.run, exact: true }).isDisabled(), true);
    }
    // A subsequent valid ZIP must recover, retaining the selected external dose field.
    await polygonInput.setInputFiles(files.polygon);
    await page.getByRole("button", { name: new RegExp(polygonName) }).waitFor();
    await process(languages[2]);
    equivalent(await download(languages[2], "recovered"), baseline);
    if (width === 390) assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth), true, "mobile horizontal overflow");
  }
  assert.deepEqual(errors, []);
  return { viewports: [1280, 390], formats: ["KML", "KMZ", "nested KMZ", "Shapefile ZIP"],
    languages: ["it", "en", "es"], evidence };
}
