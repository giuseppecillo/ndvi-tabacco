import assert from "node:assert/strict";
import { createMultiLayerFixtures } from "./fixtures/idw-imports.mjs";

/** Component harness only. Never visits auth, APIs or real observations. */
export async function runMultiLayerBrowserPass(page, { baseURL }) {
  const files = await createMultiLayerFixtures();
  await page.route("**/api/**", route => route.abort("blockedbyclient"));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/tests/idw.html?module=maps&lang=it`);
    const polygon = page.locator("input[accept='.kml,.kmz,.zip']");
    const points = page.locator("input[accept='.zip']");
    const language = page.locator("select").first();
    await polygon.setInputFiles(files.polygons);
    for (const name of ["campi_A", "campi_B"]) {
      await page.getByRole("button").filter({ hasText: name }).waitFor();
    }
    await page.getByRole("button").filter({ hasText: "campi_B" }).click();
    await page.getByRole("button", { name: "📁 Da Shapefile esterno", exact: true }).click();
    await points.setInputFiles(files.points);
    const layers = page.locator("select").filter({ has: page.locator("option", { hasText: "rilievi_A" }) });
    await layers.waitFor();
    assert.equal(await layers.inputValue(), "");
    assert.equal(await page.getByRole("button", { name: "Spazializza i tuoi dati", exact: true }).isDisabled(), true);
    await layers.selectOption({ label: "rilievi_A (4)" });
    await page.locator("tbody tr").nth(3).waitFor();
    assert.equal(await page.locator("tbody tr").count(), 4);
    await page.getByRole("button", { name: "Spazializza i tuoi dati", exact: true }).click();
    await page.getByTestId("nitrogen-savings").waitFor();
    await layers.selectOption({ label: "rilievi_B (4)" });
    assert.equal(await page.getByTestId("nitrogen-savings").count(), 0);
    assert.equal(await page.locator("tbody tr").count(), 4);
    const dose = page.locator("select").filter({ has: page.locator('option[value="KG_HA"]') });
    assert.equal(await dose.inputValue(), "KG_HA");
    assert.equal(await dose.locator('option[value="DOSE"]').count(), 0);
    for (const row of await page.locator("tbody tr").all()) {
      assert.equal((await row.locator("td").last().innerText()).trim(), "90.0");
    }
    // Each importer must recover compatible layers beyond an incompatible first one.
    await polygon.setInputFiles(files.mixed);
    await page.getByRole("button").filter({ hasText: "campi_B" }).waitFor();
    assert.equal(await page.getByRole("button").filter({ hasText: "campi_" }).count(), 2);
    await points.setInputFiles(files.mixed);
    await page.waitForFunction(() => [...document.querySelectorAll("select")]
      .some(s => s.value === "" && [...s.options].some(o => o.textContent === "rilievi_B (4)")));
    await layers.selectOption({ label: "rilievi_B (4)" });
    for (const [code, pointLabel, polygonPolicy, pointPolicy, error] of [
      ["it", "Livello di punti", "Sono importati tutti", "Seleziona un solo", "Impossibile caricare i punti."],
      ["en", "Point layer", "All polygon layers", "Select one point", "Unable to load points."],
      ["es", "Capa de puntos", "Se importan todas", "Selecciona una sola", "No se pueden cargar los puntos."],
    ]) {
      await language.selectOption(code);
      await page.getByRole("combobox", { name: pointLabel, exact: true }).waitFor();
      const body = await page.locator("body").innerText();
      assert(body.includes(polygonPolicy));
      assert(body.includes(pointPolicy));
      assert(body.includes("campi_A") && body.includes("campi_B"));
      await points.setInputFiles(files.corrupt);
      await page.getByRole("alert").filter({ hasText: error }).waitFor();
      assert.equal(await page.locator("tbody tr").count(), 0);
      await points.setInputFiles(files.points);
      await layers.waitFor();
      await layers.selectOption({ label: "rilievi_B (4)" });
    }
    if (width === 390) assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors, []);
  return { viewports: [1280, 390], languages: ["it", "en", "es"], fixtures: Object.keys(files) };
}
