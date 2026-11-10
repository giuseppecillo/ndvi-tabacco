/**
 * Repeatable browser-only pass for the real DEV observation deletion harness.
 * Run from the workspace root:
 *   BASE_URL=https://<running-nitrocrop-preview> node artifacts/ndvi-tabacco/tests/observation-deletion-browser-pass.mjs
 *
 * No app/API server is started, no auth is used, and no database is accessed.
 * The harness supplies its synthetic seed through qaObservationTransport.
 */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error("Set BASE_URL to the running NitroCrop preview.");
const origin = new URL(baseURL).origin;
const harnessURL = `${origin}/tests/observation-deletion.html?module=history`;
const output = path.resolve("generated-artifacts/observation-deletion");
const screenshotDir = path.join(output, "screenshots");
await fs.mkdir(screenshotDir, { recursive: true });

const clone = value => JSON.parse(JSON.stringify(value));
const server = { records: null, trace: [], pending: [], deleted: [] };
const checks = [];
const isolatedContexts = [];
const pageErrors = [];
const languages = ["it", "en", "es"];
const expectedInitial = ["QA-recent", "QA-recent-bulk", "QA-expired", "QA-legacy", "QA-denied"];
const result = (name, actual, details = {}) => {
  checks.push({ name, pass: true, actual, ...details });
};

async function makeContext(width, height, name) {
  const context = await browser.newContext({
    viewport: { width, height }, timezoneId: "UTC", serviceWorkers: "block",
  });
  context.setDefaultTimeout(7000);
  const transport = { name, blockedApi: [], blockedExternal: [], blockedWrites: [], websockets: 0,
    failNext: false, holdNext: false, pending: [] };
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      transport.blockedExternal.push({ method: request.method(), url: url.href });
      return route.abort();
    }
    if (!["GET", "HEAD"].includes(request.method())) {
      transport.blockedWrites.push({ method: request.method(), path: url.pathname });
      return route.abort();
    }
    if (/^\/api(?:\/|$)/.test(url.pathname)) {
      transport.blockedApi.push({ method: request.method(), path: url.pathname });
      return route.abort();
    }
    return route.continue();
  });
  await context.routeWebSocket("**/*", socket => {
    transport.websockets++;
    socket.close({ code: 1008, reason: "isolated observation QA" });
  });
  await context.exposeBinding("qaObservationTransport", async (_source, request) => {
    server.trace.push({ context: name, method: request.method, path: request.pathname });
    if (!server.records) server.records = clone(request.seed);
    if (request.method === "GET") {
      const snapshot = clone(server.records);
      if (transport.failNext) {
        transport.failNext = false;
        throw new TypeError("Synthetic network failure");
      }
      if (transport.holdNext) {
        transport.holdNext = false;
        return await new Promise(resolve => transport.pending.push(() =>
          resolve({ status: 200, body: snapshot })));
      }
      return { status: 200, body: snapshot };
    }
    if (request.method === "DELETE") {
      const id = request.pathname === "/api/osservazioni"
        ? null : decodeURIComponent(request.pathname.split("/").pop());
      if (id === "QA-denied") return { status: 403, body: { code: "DELETION_WINDOW_CLOSED" } };
      const selected = server.records.filter(row =>
        (!id || row.id === id) && row.createdAt &&
        Date.now() - Date.parse(row.createdAt) <= 86_400_000);
      server.records = server.records.filter(row => !selected.includes(row));
      const deletedIds = selected.map(row => row.id);
      server.deleted.push(...deletedIds);
      return { status: 200, body: { ok: true, deletedIds } };
    }
    throw new TypeError(`Blocked synthetic method: ${request.method}`);
  });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(`${name}: ${error.message}`));
  isolatedContexts.push({ context, transport });
  return { context, page, transport, width, height, name };
}

async function openGroup(page) {
  const item = page.getByTestId("observation-list-item");
  const details = item.locator(":scope > details").first();
  if (!await details.evaluate(el => el.open)) {
    await item.locator(":scope > details > summary").first().click();
  }
  return page.getByTestId("observation-group-table");
}
async function historyIds(page) {
  const table = await openGroup(page);
  return (await table.locator("tbody td:first-child").allTextContents()).map(x => x.trim());
}
async function focusRefresh(page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}
async function go(page, linkName) {
  await page.getByRole("link", { name: linkName }).click();
}
async function setLanguage(page, lang) {
  await page.locator("header select").first().selectOption(lang);
}
async function registryTable(page, lang) {
  const header = { it: "Azioni", en: "Actions", es: "Acciones" }[lang];
  return page.locator("table").filter({ has: page.locator("th", { hasText: header }) });
}
async function registryIds(page, lang) {
  return (await (await registryTable(page, lang)).locator("tbody tr td:first-child").allTextContents())
    .map(x => x.trim());
}
async function assertUniqueSame(actual, expected, name) {
  assert.equal(new Set(actual).size, actual.length, `${name}: duplicate IDs`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${name}: ID set mismatch`);
  result(name, [...actual]);
}
async function readDisabled(page, lang, id) {
  const table = await registryTable(page, lang);
  const label = { it: `Elimina rilievo ${id}`, en: `Delete observation ${id}`,
    es: `Eliminar observación ${id}` }[lang];
  const row = table.locator("tbody tr").filter({ has: page.getByText(id, { exact: true }) });
  const button = row.getByRole("button", { name: label });
  assert.equal(await button.isDisabled(), true, `${id} should be disabled in ${lang}`);
  return (await row.innerText()).trim();
}
async function saveLanguageScreenshots(pageCase, phase) {
  await pageCase.page.evaluate(() => window.scrollTo(0, 0));
  for (const lang of languages) {
    await setLanguage(pageCase.page, lang);
    const file = `${pageCase.width}x${pageCase.height}-${lang}-${phase}.png`;
    await pageCase.page.screenshot({ path: path.join(screenshotDir, file), fullPage: false });
    result(`screenshot-${file}`, file);
  }
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});
const desktop = await makeContext(1280, 900, "desktop-1280");
const mobile = await makeContext(390, 844, "mobile-390");

try {
  await Promise.all([desktop.page.goto(harnessURL), mobile.page.goto(harnessURL)]);
  await Promise.all([
    desktop.page.getByTestId("observation-list-item").waitFor(),
    mobile.page.getByTestId("observation-list-item").waitFor(),
  ]);
  await setLanguage(desktop.page, "it");
  await setLanguage(mobile.page, "it");
  await Promise.all([openGroup(desktop.page), openGroup(mobile.page)]);
  const initialD = await historyIds(desktop.page);
  const initialM = await historyIds(mobile.page);
  assert.deepEqual([...initialD].sort(), [...expectedInitial].sort());
  assert.deepEqual([...initialM].sort(), [...expectedInitial].sort());
  await assertUniqueSame(initialD, initialM, "initial desktop/mobile history");
  const mobileDimensions = await mobile.page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(mobileDimensions.document <= mobileDimensions.viewport,
    `Mobile document overflow: ${JSON.stringify(mobileDimensions)}`);
  result("mobile document has no horizontal overflow", mobileDimensions);

  const base = clone(server.records[0]);
  for (const [id, minutes] of [["QA-added-focus", 2], ["QA-added-interval", 3]]) {
    server.records.push({ ...base, id, createdAt: new Date(Date.now() - minutes * 60_000).toISOString() });
  }
  await Promise.all([focusRefresh(desktop.page), focusRefresh(mobile.page)]);
  for (const current of [desktop, mobile]) {
    await current.page.getByTestId("observation-list-item").getByText("7 punti", { exact: true }).waitFor();
  }
  const focusedD = await historyIds(desktop.page);
  const focusedM = await historyIds(mobile.page);
  await assertUniqueSame(focusedD, focusedM, "focus sync after runner-memory insert");

  server.records.push({ ...base, id: "QA-added-interval-30s",
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString() });
  const intervalCheck = current => current.page.waitForFunction(
    () => Array.from(document.querySelectorAll('[data-testid="observation-list-item"]'))
      .some(el => el.textContent.includes("8 punti")), null, { timeout: 35_000 });
  await Promise.all([intervalCheck(desktop), intervalCheck(mobile)]);
  const intervalD = await historyIds(desktop.page);
  const intervalM = await historyIds(mobile.page);
  await assertUniqueSame(intervalD, intervalM, "real 30-second hook interval sync");

  mobile.transport.failNext = true;
  const beforeFailure = [...intervalM].sort();
  await focusRefresh(mobile.page);
  await mobile.page.getByRole("alert").waitFor({ state: "visible" });
  const failureMessage = (await mobile.page.getByRole("alert").innerText()).trim();
  assert.deepEqual([...(await historyIds(mobile.page))].sort(), beforeFailure);
  result("mobile network failure retains history", failureMessage);
  await focusRefresh(mobile.page);
  await mobile.page.getByRole("alert").waitFor({ state: "detached" });
  result("mobile recovery clears failure", true);
  desktop.transport.failNext = true;
  const desktopBeforeFailure = await historyIds(desktop.page);
  await focusRefresh(desktop.page);
  await desktop.page.getByRole("alert").waitFor({ state: "visible" });
  const desktopFailureMessage = (await desktop.page.getByRole("alert").innerText()).trim();
  assert.deepEqual([...(await historyIds(desktop.page))].sort(), [...desktopBeforeFailure].sort());
  result("desktop network failure retains history", desktopFailureMessage);
  await focusRefresh(desktop.page);
  await desktop.page.getByRole("alert").waitFor({ state: "detached" });
  result("desktop recovery clears failure", true);

  await go(mobile.page, "Rilievo e dati");
  const regIT = await registryTable(mobile.page, "it");
  const deletesBeforeCancel = server.trace.filter(x => x.method === "DELETE").length;
  mobile.page.once("dialog", dialog => dialog.dismiss());
  await regIT.locator("tbody tr").filter({ has: mobile.page.getByText("QA-recent", { exact: true }) })
    .getByRole("button", { name: "Elimina rilievo QA-recent" }).click();
  assert.equal(server.trace.filter(x => x.method === "DELETE").length, deletesBeforeCancel);
  assert.equal(await regIT.locator("tbody tr").filter({
    has: mobile.page.getByText("QA-recent", { exact: true }),
  }).count(), 1);
  result("cancel confirmation sends no DELETE", true);

  await setLanguage(mobile.page, "en");
  const expiredEN = await readDisabled(mobile.page, "en", "QA-expired");
  const legacyEN = await readDisabled(mobile.page, "en", "QA-legacy");
  result("English disabled guidance", { expiredEN, legacyEN });
  const deniedEN = (await registryTable(mobile.page, "en")).locator("tbody tr")
    .filter({ has: mobile.page.getByText("QA-denied", { exact: true }) });
  mobile.page.once("dialog", dialog => dialog.accept());
  await deniedEN.getByRole("button", { name: "Delete observation QA-denied" }).click();
  const denialEN = (await mobile.page.getByRole("alert").innerText()).trim();
  assert.equal(await deniedEN.count(), 1);
  result("English denied single delete retains row", denialEN);

  await setLanguage(mobile.page, "es");
  const denialES = (await mobile.page.getByRole("alert").innerText()).trim();
  const expiredES = await readDisabled(mobile.page, "es", "QA-expired");
  const legacyES = await readDisabled(mobile.page, "es", "QA-legacy");
  result("Spanish translated action/error guidance", { denialES, expiredES, legacyES });
  await go(mobile.page, "Storico Rilievi");
  const mobileHistory = await openGroup(mobile.page);
  const staleIDs = [...(await mobileHistory.locator("tbody td:first-child").allTextContents())].map(x => x.trim());
  const mobileGetsBeforeRace = server.trace.filter(x => x.context === mobile.name && x.method === "GET").length;
  mobile.transport.holdNext = true;
  await focusRefresh(mobile.page);
  const pendingDeadline = Date.now() + 5000;
  while (!mobile.transport.pending.length && Date.now() < pendingDeadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(mobile.transport.pending.length, 1, "request-time stale GET should be held");
  const recentDetail = mobile.page.locator("details").filter({ hasText: "#QA-recent" }).last();
  await recentDetail.locator("summary").click();
  mobile.page.once("dialog", dialog => dialog.accept());
  await recentDetail.getByRole("button", { name: "Eliminar observación QA-recent" }).click();
  await mobile.page.getByTestId("observation-group-table").locator("tbody tr")
    .filter({ has: mobile.page.getByText("QA-recent", { exact: true }) }).waitFor({ state: "detached" });
  const mutationDeadline = Date.now() + 5000;
  while (server.trace.filter(x => x.context === mobile.name && x.method === "GET").length <
      mobileGetsBeforeRace + 2 && Date.now() < mutationDeadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(server.trace.filter(x => x.context === mobile.name && x.method === "GET").length >=
    mobileGetsBeforeRace + 2, "postmutation GET should run before stale snapshot release");
  mobile.transport.pending.shift()();
  await mobile.page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterRace = await historyIds(mobile.page);
  assert.ok(staleIDs.includes("QA-recent"));
  assert.ok(!afterRace.includes("QA-recent"), "stale GET must not resurrect deleted row");
  result("Spanish stale GET rejection", { staleIDs, afterRace });
  await focusRefresh(desktop.page);
  await desktop.page.getByTestId("observation-group-table").locator("tbody tr")
    .filter({ has: desktop.page.getByText("QA-recent", { exact: true }) }).waitFor({ state: "detached" });
  const desktopAfterRace = await historyIds(desktop.page);
  await assertUniqueSame(desktopAfterRace, afterRace, "other context converges after single delete");

  const desktopRaceRow = { ...base, id: "QA-desktop-race",
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString() };
  server.records.push(desktopRaceRow);
  await focusRefresh(desktop.page);
  await desktop.page.getByTestId("observation-list-item").getByText("8 punti", { exact: true }).waitFor();
  await openGroup(desktop.page);
  const staleDesktopIDs = await historyIds(desktop.page);
  const desktopGetsBeforeRace = server.trace.filter(x =>
    x.context === desktop.name && x.method === "GET").length;
  desktop.transport.holdNext = true;
  await focusRefresh(desktop.page);
  const desktopPendingDeadline = Date.now() + 5000;
  while (!desktop.transport.pending.length && Date.now() < desktopPendingDeadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(desktop.transport.pending.length, 1);
  const desktopRaceDetail = desktop.page.locator("details")
    .filter({ hasText: "#QA-desktop-race" }).last();
  await desktopRaceDetail.locator("summary").click();
  desktop.page.once("dialog", dialog => dialog.accept());
  await desktopRaceDetail.getByRole("button", { name: "Elimina rilievo QA-desktop-race" }).click();
  await desktop.page.getByTestId("observation-group-table").locator("tbody tr")
    .filter({ has: desktop.page.getByText("QA-desktop-race", { exact: true }) })
    .waitFor({ state: "detached" });
  const desktopMutationDeadline = Date.now() + 5000;
  while (server.trace.filter(x => x.context === desktop.name && x.method === "GET").length <
      desktopGetsBeforeRace + 2 && Date.now() < desktopMutationDeadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.ok(server.trace.filter(x => x.context === desktop.name && x.method === "GET").length >=
    desktopGetsBeforeRace + 2);
  desktop.transport.pending.shift()();
  await desktop.page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterDesktopRace = await historyIds(desktop.page);
  assert.ok(staleDesktopIDs.includes("QA-desktop-race"));
  assert.ok(!afterDesktopRace.includes("QA-desktop-race"));
  result("desktop stale GET rejection", { staleDesktopIDs, afterDesktopRace });
  await focusRefresh(mobile.page);
  await mobile.page.getByTestId("observation-group-table").locator("tbody tr")
    .filter({ has: mobile.page.getByText("QA-desktop-race", { exact: true }) })
    .waitFor({ state: "detached" });

  await go(mobile.page, "Rilievo e dati");
  const beforeBulk = clone(server.records);
  mobile.page.once("dialog", dialog => dialog.accept());
  await mobile.page.getByRole("button", {
    name: "Eliminar observaciones de las últimas 24 horas",
  }).click();
  await mobile.page.locator("table").filter({
    has: mobile.page.locator("th", { hasText: "Acciones" }),
  }).locator("tbody tr").filter({ has: mobile.page.getByText("QA-added-focus", { exact: true }) })
    .waitFor({ state: "detached" });
  const remaining = server.records.map(row => row.id);
  const removed = beforeBulk.map(row => row.id).filter(id => !remaining.includes(id));
  assert.deepEqual([...remaining].sort(), ["QA-expired", "QA-legacy"]);
  assert.ok(removed.every(id => beforeBulk.find(row => row.id === id)?.createdAt &&
    Date.now() - Date.parse(beforeBulk.find(row => row.id === id).createdAt) <= 86_400_000));
  result("Spanish mobile bulk deletes recent-only", { removed, remaining });

  await focusRefresh(desktop.page);
  await go(desktop.page, "Rilievo e dati");
  await setLanguage(desktop.page, "it");
  const desktopBulkRow = { ...base, id: "QA-desktop-bulk",
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString() };
  server.records.push(desktopBulkRow);
  await focusRefresh(desktop.page);
  const registryD = await registryTable(desktop.page, "it");
  await registryD.locator("tbody tr").filter({
    has: desktop.page.getByText("QA-desktop-bulk", { exact: true }),
  }).waitFor();
  const desktopBefore = [...server.records];
  desktop.page.once("dialog", dialog => dialog.accept());
  await desktop.page.getByRole("button", { name: "Elimina rilievi delle ultime 24 ore" }).click();
  await registryD.locator("tbody tr").filter({
    has: desktop.page.getByText("QA-desktop-bulk", { exact: true }),
  }).waitFor({ state: "detached" });
  const desktopRemaining = server.records.map(row => row.id);
  assert.deepEqual([...desktopRemaining].sort(), ["QA-expired", "QA-legacy"]);
  assert.deepEqual(await registryIds(desktop.page, "it"), ["QA-expired", "QA-legacy"]);
  result("desktop bulk registry retains protected records", {
    removed: desktopBefore.map(row => row.id).filter(id => !desktopRemaining.includes(id)),
    remaining: desktopRemaining,
  });
  await focusRefresh(mobile.page);

  await go(desktop.page, "Storico Rilievi");
  await go(mobile.page, "Storico Rilievi");
  for (const current of [desktop, mobile]) {
    for (const lang of languages) {
      await go(current.page, "Rilievo e dati");
      await setLanguage(current.page, lang);
      const disabledNotes = {};
      for (const id of ["QA-expired", "QA-legacy"]) {
        const note = await readDisabled(current.page, lang, id);
        disabledNotes[id] = note;
      }
      assert.deepEqual(await registryIds(current.page, lang), ["QA-expired", "QA-legacy"]);
      result(`disabled registry controls ${current.width}x${current.height} ${lang}`, disabledNotes);
      await go(current.page, "Storico Rilievi");
      await openGroup(current.page);
      const historyDisabledNotes = {};
      for (const id of ["QA-expired", "QA-legacy"]) {
        const detail = current.page.locator("details").filter({ hasText: `#${id}` }).last();
        if (!await detail.evaluate(el => el.open)) await detail.locator("summary").click();
        const label = { it: `Elimina rilievo ${id}`, en: `Delete observation ${id}`,
          es: `Eliminar observación ${id}` }[lang];
        assert.equal(await detail.getByRole("button", { name: label }).isDisabled(), true);
        historyDisabledNotes[id] = (await detail.innerText()).trim().split("\n").slice(1, 3).join(" — ");
      }
      result(`disabled expanded-history controls ${current.width}x${current.height} ${lang}`,
        historyDisabledNotes);
      const ids = await historyIds(current.page);
      assert.deepEqual([...ids].sort(), ["QA-expired", "QA-legacy"]);
      await current.page.evaluate(() => window.scrollTo(0, 0));
      await current.page.screenshot({
        path: path.join(screenshotDir, `${current.width}x${current.height}-${lang}-history.png`),
        fullPage: false,
      });
      result(`final history screenshot ${current.width}x${current.height} ${lang}`,
        `${current.width}x${current.height}-${lang}-history.png`);
    }
  }

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join("; ")}`);
  const isolation = {
    contexts: isolatedContexts.map(x => x.transport.name),
    actualApiNetworkRequests: isolatedContexts.reduce((n, x) => n + x.transport.blockedApi.length, 0),
    blockedApi: isolatedContexts.flatMap(x => x.transport.blockedApi),
    blockedExternal: isolatedContexts.flatMap(x => x.transport.blockedExternal),
    blockedWrites: isolatedContexts.flatMap(x => x.transport.blockedWrites),
    blockedWebSockets: isolatedContexts.reduce((n, x) => n + x.transport.websockets, 0),
    syntheticTransportTrace: server.trace,
  };
  const report = {
    pass: true, browser: "Chromium", browserVersion: browser.version(),
    scope: "DEV harness only; no auth, real APIs, DB, save flow, or backend start",
    baseURL: origin, viewportSimulationOnly: ["1280x900", "390x844"],
    languages, checks, isolation, pageErrors,
    screenshots: (await fs.readdir(screenshotDir)).sort(),
  };
  await fs.writeFile(path.join(output, "browser-pass.json"), JSON.stringify(report, null, 2) + "\n");
  const markdown = [
    "# Observation history/deletion browser pass",
    "",
    `- Result: **${report.pass ? "PASS" : "FAIL"}**`,
    "- Engine: Chromium; viewports are desktop/mobile viewport simulations, not physical devices or Safari.",
    "- Scope: real App UI in the DEV harness; only `qaObservationTransport` is synthetic. No auth, actual API, DB, or save-flow claim.",
    `- Context isolation: ${isolation.contexts.join(", ")}; blocked WebSockets: ${isolation.blockedWebSockets}; real API network requests: ${isolation.actualApiNetworkRequests}.`,
    "",
    "## Checks",
    ...checks.map(item => `- ${item.pass ? "PASS" : "FAIL"} — ${item.name}: \`${JSON.stringify(item.actual)}\``),
    "",
    "## Screenshots",
    ...report.screenshots.map(file => `- \`screenshots/${file}\``),
    "",
    "The 390px history table uses its intended internal horizontal scroll; document overflow was checked separately in the interactive pass.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(output, "browser-pass.md"), markdown);
  console.log(JSON.stringify({ pass: true, checks: checks.length, isolation, screenshots: report.screenshots }, null, 2));
} finally {
  await Promise.all(isolatedContexts.map(x => x.context.close().catch(() => {})));
  await browser.close();
}
