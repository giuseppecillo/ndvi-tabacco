/**
 * Self-contained browser regression. Starts only a private, loopback Vite
 * frontend; no API server, auth account, credentials or database is required.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import { assertIds, verifyWorkbook, verifyCsv, verifyPdfText } from "./catalogue-dose-exports.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, "generated-artifacts/catalogue-dose-regression");
const storage = "nitrocrop-catalogue-synthetic-only";
const expected = [
  { id: "P06", crop: "pomodoro", applied: "249.94", dose: 0 },
  { id: "P16", crop: "pomodoro", applied: "249.84", dose: 0.1 },
  { id: "K06", crop: "Kiwi", applied: "150.94", dose: 0 },
  { id: "K16", crop: "Kiwi", applied: "150.84", dose: 0.1 },
  { id: "L006", crop: "Kiwi", dose: 0.006 },
];
const snapshot = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "[]"), storage);
function verifyRecords(records, cases) {
  assertIds(records, cases);
  for (const record of cases) {
    const saved = records.find(r => r.id === record.id);
    assert.equal(saved.coltura, record.crop);
    assert.equal(saved.dose, record.dose, `${record.id} saved dose`);
    assert.equal(saved.quotaAzoto, record.dose, `${record.id} saved quota`);
    assert.equal(saved.lat, 45.123456);
    assert.equal(saved.lng, 12.345678);
    assert.equal(saved.data, "2026-11-08");
    if (record.applied) {
      assert.equal(saved.azotoGiaDistribuito, Number(record.applied));
      assert.equal(saved.azotoTotale, record.crop === "pomodoro" ? 250 : 151);
      assert.equal(saved.varieta, record.crop === "pomodoro"
        ? "Abraracourcix — Industria · Concentrato / Passata" : "Hayward");
      for (const key of ["n1", "n2", "n3", "n4", "n5"]) assert.equal(saved[key], 0);
    }
  }
}
async function verifyTable(table, doseColumn, cases, suffix = "") {
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(cases.length);
  for (const record of cases) {
    const row = table.locator("tbody tr").filter({
      has: table.page().getByRole("cell", { name: record.id, exact: true }),
    });
    await expect(row).toHaveCount(1);
    await expect(row.locator("td").nth(doseColumn)).toHaveText(
      (record.dose === 0.006 ? "0.006" : record.dose.toFixed(1)) + suffix);
  }
}
async function download(page, button, filename) {
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  assert(file.suggestedFilename().endsWith(path.extname(filename)));
  const destination = path.join(output, filename);
  await file.saveAs(destination);
  assert.equal(await file.failure(), null);
  return readFile(destination);
}

// Fail with an actionable prerequisite before opening a browser.
try { execFileSync("pdftotext", ["-v"], { stdio: "pipe" }); }
catch { throw new Error("This regression requires pdftotext (Poppler) on PATH."); }
await mkdir(output, { recursive: true });
for (const name of ["report.json", "failure.json", "failure.png", "gps.png",
  "observations.pdf", "observations.csv", "history.xlsx"]) {
  await rm(path.join(output, name), { force: true });
}
// Own test process only; do not read or modify any auth secrets.
process.env.PORT = "5173";
process.env.BASE_PATH = "/";
delete process.env.REPL_ID; // no editor-only remote scripts in this private server
const blocked = [], errors = [], failedAssets = [], sentToServer = [];
let server, browser, context, page;
try {
  server = await createServer({
    configFile: path.join(root, "vite.config.ts"),
    mode: "development",
    cacheDir: path.join(output, "vite-cache"),
    // GIS workers discover this dependency late; prebundle it to avoid a
    // dependency-optimizer reload in the middle of a form interaction.
    optimizeDeps: { include: ["@xmldom/xmldom"] },
    server: { host: "127.0.0.1", port: 0, strictPort: false, hmr: false, open: false },
    plugins: [{
      name: "synthetic-api-deny",
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (/(^|\/)api(?:\/|$)/.test(req.url ?? "")) {
            sentToServer.push(req.url);
            res.writeHead(403).end("No APIs in synthetic test");
          } else next();
        });
      },
    }],
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, timezoneId: "UTC",
    locale: "it-IT", serviceWorkers: "block", acceptDownloads: true,
  });
  context.setDefaultTimeout(15000);
  // Installed before navigation. Even a broken fetch shim cannot call APIs.
  await context.route("**/*", route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && ["GET", "HEAD"].includes(request.method())
      && !/(^|\/)api(?:\/|$)/.test(url.pathname)) return route.continue();
    blocked.push(`${request.method()} ${url.origin === origin ? url.pathname : url.hostname}`);
    return route.abort("blockedbyclient");
  });
  await context.routeWebSocket("**/*", ws => ws.close({ code: 1008, reason: "synthetic isolation" }));
  page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.url().startsWith(origin) && !response.ok()) failedAssets.push(response.url());
  });
  const entry = `${origin}/tests/catalogue-calculations.html`;
  await page.goto(entry);
  await page.getByLabel("ID Osservazione", { exact: true }).waitFor();
  for (const [index, record] of expected.slice(0, 4).entries()) {
    await page.getByLabel("Coltura", { exact: true }).selectOption(record.crop);
    if (record.crop === "pomodoro") {
      await page.getByLabel("Varietà pomodoro", { exact: true }).selectOption({ label: "Abraracourcix" });
      await page.getByLabel("Resa Desiderata (t/ha)", { exact: true }).fill("100");
      await page.getByLabel("Data Trapianto", { exact: true }).fill("2026-10-01");
      await page.getByLabel("Fase del pomodoro", { exact: true }).selectOption("Fioritura");
    } else {
      await page.getByTestId("select-catalogue-variety").selectOption({ label: "Hayward" });
      await page.getByTestId("input-catalogue-yield").fill("31.3");
      await page.getByTestId("select-catalogue-phase").selectOption("F3");
    }
    await page.getByLabel("Confermo la fase osservata in campo", { exact: true }).check();
    await page.getByLabel("ID Osservazione", { exact: true }).fill(record.id);
    await page.getByLabel("Cliente (nome azienda)", { exact: true }).fill("Azienda Sintetica");
    await page.getByLabel("Appezzamento", { exact: true }).fill(`Parcella ${record.id}`);
    // Legacy DateInput renders a visual label without an accessible association.
    // The first date in this form is the survey date; transplant has its own aria-label.
    await page.locator('.nc-ndvi-form input[type="date"]').first().fill("2026-11-08");
    await page.getByLabel("Azoto già distribuito (kg N/ha)", { exact: true }).fill(record.applied);
    for (let i = 1; i <= 5; i++) await page.getByLabel(`Misura ${i}`, { exact: true }).fill("0");
    await expect(page.getByTestId(record.crop === "pomodoro" ? "pomodoro-dose" : "text-catalogue-dose"))
      .toHaveText(`${record.dose.toFixed(1).replace(".", ",")} kg N/ha`);
    await page.getByRole("button", { name: "Salva Osservazione" }).click();
    await expect.poll(async () => (await snapshot(page)).length).toBe(index + 1);
    verifyRecords(await snapshot(page), expected.slice(0, index + 1));
  }
  // Historical record is seeded without POST, intentionally outside new validation.
  await page.evaluate(key => {
    const records = JSON.parse(localStorage.getItem(key));
    const legacy = { ...records.find(r => r.id === "K16"), id: "L006",
      appezzamento: "Parcella L006", dose: 0.006, quotaAzoto: 0.006 };
    // Deliberately not numeric ID order: exports must be joined by ID.
    localStorage.setItem(key, JSON.stringify([records[1], legacy, records[3], records[0], records[2]]));
  }, storage);
  const beforeReload = await snapshot(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Esporta CSV" })).toBeVisible();
  verifyRecords(await snapshot(page), expected);
  assert.deepEqual(await snapshot(page), beforeReload, "reload must not mutate stored records");
  const registry = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "N punto / dose (kg/ha)", exact: true }) });
  await verifyTable(registry, 17, expected);
  await verifyTable(page.locator("#elenco-punti-grafico table"), 5, expected, " kg/ha");
  const csv = await download(page, page.getByRole("button", { name: "Esporta CSV" }), "observations.csv");
  verifyCsv(csv, expected);
  const pdf = await download(page, page.getByRole("button", { name: "Esporta PDF" }), "observations.pdf");
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const pdfText = execFileSync("pdftotext", ["-layout", path.join(output, "observations.pdf"), "-"], { encoding: "utf8" });
  verifyPdfText(pdfText, expected);
  await page.getByRole("link", { name: "Storico Rilievi", exact: true }).click();
  await page.getByTestId("observation-list-item").locator("summary").first().click();
  await verifyTable(page.getByTestId("observation-group-table"), 9, expected);
  for (const record of expected) {
    const details = page.getByTestId("observation-list").locator("details")
      .filter({ has: page.locator(`summary span`, { hasText: `#${record.id}` }) }).last();
    await details.locator("summary").click();
    for (const label of ["Dose indicata", "Quota azotata"]) {
      const value = record.dose === 0.006 ? "0.006" : record.dose.toFixed(1);
      await expect(details.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd"))
        .toHaveText(`${value} kg N/ha`);
    }
  }
  const xlsx = await download(page, page.getByRole("button", { name: "Esporta Excel (.xlsx)", exact: true }), "history.xlsx");
  await verifyWorkbook(xlsx, expected);
  await page.goto(`${entry}?module=maps`);
  // Generate the tiny invented boundary here, never reuse an earlier output.
  const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Campo sintetico</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
12.34,45.12 12.35,45.12 12.35,45.13 12.34,45.13 12.34,45.12
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
  await page.locator('input[type="file"][accept=".kml,.kmz,.zip"]').setInputFiles({
    name: "synthetic.kml", mimeType: "application/vnd.google-earth.kml+xml", buffer: Buffer.from(kml),
  });
  const gps = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Dose (kg/ha)", exact: true }) });
  await verifyTable(gps, 5, expected);
  for (const record of expected) {
    const row = gps.locator("tbody tr").filter({ has: page.getByRole("cell", { name: record.id, exact: true }) });
    await expect(row.locator("td").nth(3)).toHaveText("45.123456");
    await expect(row.locator("td").nth(4)).toHaveText("12.345678");
  }
  assert.deepEqual(await snapshot(page), beforeReload, "views and exports must not mutate records");
  assert.deepEqual(errors, [], "no uncaught browser errors");
  assert.deepEqual(failedAssets, [], "no failed local assets");
  assert.deepEqual(sentToServer, [], "no API reaches the private frontend server");
  assert(!blocked.some(url => url.includes("/api")), "fetch shim must handle all synthetic APIs");
  await page.screenshot({ path: path.join(output, "gps.png") });
  await writeFile(path.join(output, "report.json"), JSON.stringify({
    result: "PASS", saved: expected, blocked, errors, failedAssets, sentToServer,
    checks: ["four UI saves", "reload", "legacy 0.006", "registry", "chart accessible table",
      "grouped history", "detail dose and quota", "GPS table", "downloaded PDF/XLSX/CSV by ID", "no record mutation"],
  }, null, 2));
  console.log(`PASS: four UI saves, reload, legacy and all views/downloads by ID. Evidence: ${output}`);
} catch (error) {
  await writeFile(path.join(output, "failure.json"), JSON.stringify({
    error: String(error.stack ?? error), blocked, errors, failedAssets, sentToServer,
  }, null, 2));
  await page?.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
  throw error;
} finally {
  await context?.close();
  await browser?.close();
  await server?.close();
}
