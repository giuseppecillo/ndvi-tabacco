/**
 * Isolated language/dose/export browser pass.
 * Run: BROWSER=firefox BASE_URL=https://<running-preview-origin> node artifacts/ndvi-tabacco/tests/dose-export-languages-browser-pass.mjs
 * BROWSER supports chromium (default), firefox, and webkit (not branded Safari).
 * Only the development fixture is opened. API, external HTTP, and WebSockets
 * fail closed; observation data is synthetic localStorage only.
 */
import { chromium, firefox, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { doseExportRecords, doseExportStorageKey } from "./fixtures/dose-export-languages.mjs";

const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error("Set BASE_URL to the running NitroCrop preview origin.");
const origin = new URL(baseURL).origin;
const engine = process.env.BROWSER ?? "chromium";
const browserType = { chromium, firefox, webkit }[engine];
assert.ok(browserType, `Unsupported BROWSER: ${engine}`);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../generated-artifacts/dose-export-languages", engine);
await fs.mkdir(root, { recursive: true });
const expected = JSON.stringify(doseExportRecords);
const browser = await browserType.launch({
  headless: true,
  ...(engine === "chromium" && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  ...(engine === "webkit" && process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH } : {}),
});
const context = await browser.newContext({ acceptDownloads: true, timezoneId: "UTC", serviceWorkers: "block",
  ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "1" });
await Promise.all(["en", "es"].map(lang => fs.mkdir(path.join(root, lang), { recursive: true })));
const blocked = [];
const downloads = [];
const pageErrors = [];
let storageChecks = 0;
await context.route("**/*", async route => {
  const u = new URL(route.request().url());
  if (u.origin !== origin || /^\/api(?:\/|$)/.test(u.pathname) || !["GET", "HEAD"].includes(route.request().method())) {
    blocked.push(u.href);
    return route.abort();
  }
  return route.continue();
});
const page = await context.newPage();
page.on("pageerror", error => pageErrors.push(error.message));
await page.routeWebSocket("**/*", ws => { blocked.push("websocket"); ws.close(); });
await page.addInitScript(({ key, value }) => {
  // Seed once, never reset on navigation: resetting would hide data mutations.
  if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  if (localStorage.getItem("nitrocrop-language") === null) localStorage.setItem("nitrocrop-language", "it");
  window.__doseFixtureWrites = [];
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === key) window.__doseFixtureWrites.push({ key: k, value: v });
    return original.call(this, k, v);
  };
}, { key: doseExportStorageKey, value: expected });

async function unchanged() {
  const state = await page.evaluate(key => ({
    json: localStorage.getItem(key),
    writes: window.__doseFixtureWrites,
  }), doseExportStorageKey);
  if (state.json !== expected || state.writes.length) throw new Error("Synthetic observation storage changed.");
  storageChecks++;
}
async function download(lang, label, file) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: label }).click();
  const item = await event;
  assert.equal(await item.failure(), null);
  const destination = path.join(root, lang, file);
  await item.saveAs(destination);
  const bytes = await fs.readFile(destination);
  assert.ok(bytes.length > 0, `Empty download: ${lang}/${file}`);
  assert.equal(path.extname(item.suggestedFilename()), path.extname(file));
  downloads.push({ language: lang, file, suggestedFilename: item.suggestedFilename(),
    bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  await unchanged();
}

async function checkTable(table, doseColumn, suffix = "") {
  await table.waitFor({ state: "visible" });
  await table.locator("tbody tr").filter({ has: page.getByText(doseExportRecords[0].id, { exact: true }) }).waitFor();
  assert.equal(await table.locator("tbody tr").count(), doseExportRecords.length);
  for (const record of doseExportRecords) {
    const row = table.locator("tbody tr").filter({ has: page.getByText(record.id, { exact: true }) });
    assert.equal(await row.count(), 1);
    const expectedDose = record.id.endsWith("ZERO") ? "0.0" : record.id.endsWith("TENTH") ? "0.1" : "0.006";
    assert.equal((await row.locator("td").nth(doseColumn).innerText()).trim(), expectedDose + suffix);
  }
  await unchanged();
}

try {
  await page.goto(`${origin}/tests/catalogue-calculations.html`);
  const register = page.locator("table").filter({ has: page.locator("th", { hasText: "GPS" }) });
  for (const lang of ["en", "es"]) {
    await page.getByTestId(`test-language-${lang}`).click();
    await checkTable(register, 17);
    const chartDetails = page.locator("details").filter({ has: page.locator("#elenco-punti-grafico") });
    if (!await chartDetails.evaluate(el => el.open)) await chartDetails.locator("summary").click();
    const chartTable = page.locator("table").filter({ has: page.locator("tbody td", { hasText: /^0\.006 kg\/ha$/ }) });
    await checkTable(chartTable, 5, " kg/ha");
    await download(lang, lang === "en" ? /Export PDF/i : /Exportar PDF/i, "home.pdf");
    await download(lang, lang === "en" ? /Export CSV/i : /Exportar CSV/i, "home.csv");
  }

  await unchanged();
  await page.getByRole("link", { name: "Storico Rilievi" }).click();
  await page.getByTestId("observation-list-item").locator("summary").first().click();
  for (const lang of ["es", "en"]) {
    await page.getByTestId(`test-language-${lang}`).click();
    await checkTable(page.getByTestId("observation-group-table"), 9);
    for (const record of doseExportRecords) {
      const detail = page.locator("details").filter({ has: page.locator("summary", { hasText: `#${record.id}` }) }).last();
      if (!await detail.evaluate(el => el.open)) await detail.locator("summary").click();
      const dose = record.id.endsWith("ZERO") ? "0.0" : record.id.endsWith("TENTH") ? "0.1" : "0.006";
      for (const label of lang === "en" ? ["Recommended rate", "Nitrogen allocation"] : ["Dosis indicada", "Cuota de nitrógeno"]) {
        const value = detail.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
        assert.equal(await value.innerText(), `${dose} kg N/ha`);
      }
      for (const value of [record.cliente, record.varieta, record.appezzamento]) {
        assert.ok((await detail.locator("dl").innerText()).includes(value));
      }
    }
    await download(lang, lang === "en" ? "Export Excel (.xlsx)" : "Exportar Excel (.xlsx)", "history.xlsx");
  }
  await page.getByTestId("test-language-it").click();
  await checkTable(page.getByTestId("observation-group-table"), 9);
  await unchanged();
  assert.equal(downloads.length, 6);
  assert.deepEqual(pageErrors, []);
  await page.screenshot({ path: path.join(root, "history-it.png"), fullPage: true });
  const report = { ok: true, engine, browserVersion: browser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    blocked, pageErrors, downloads, storageChecks, storageUnchanged: true,
    storageSha256: createHash("sha256").update(expected).digest("hex"),
    artifacts: root, finalUrl: page.url() };
  await fs.writeFile(path.join(root, "browser-pass.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
