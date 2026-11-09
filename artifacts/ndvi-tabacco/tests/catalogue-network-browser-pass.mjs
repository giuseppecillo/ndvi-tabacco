/**
 * Synthetic-network end-to-end pass for the real NitroCrop portal.
 *
 * Run with BASE_URL=https://<preview-host> node tests/catalogue-network-browser-pass.mjs
 * No Clerk ticket, credentials, database, or API server is used. The Clerk
 * React ESM dependency is replaced only in the browser context; all writes,
 * /api/__clerk requests, unapproved API reads, and external HTTP calls fail
 * closed. This file is test-only and does not alter app/auth source.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error("Set BASE_URL to the running NitroCrop preview origin.");
const origin = new URL(baseURL).origin;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../generated-artifacts/catalogue-network");
await fs.mkdir(root, { recursive: true });

const account = {
  id: "synthetic-catalogue-account", email: "synthetic.catalogue@example.com",
  name: "Cliente Sintetico", role: "user", status: "active",
  privacyAcknowledged: true, privacyVersion: "2024-1", activated: true,
  createdAt: "2025-01-01T00:00:00Z", subscriptionExpiresAt: "2099-12-31T00:00:00Z",
  subscriptionDurationDays: 36500, subscriptionDaysRemaining: 27000,
  subscriptionExpired: false, subscriptionExempt: false,
};
const usage = {
  userId: account.id, planManagementReady: true, plan: "pro", state: "active",
  periodId: "synthetic-period", startsOn: "2025-01-01", expiresAt: "2099-12-31T00:00:00Z",
  visitsUsed: 0, mapsUsed: 0, visitsTotal: 0, observationsTotal: 0, mapsTotal: 0,
  storageBytes: 0, storageMb: 0, visitsLimit: 1000, mapsLimit: 1000,
  storageLimitBytes: 1_000_000_000, trackingSince: "2025-01-01", periods: [],
};
const columns = [
  "Coltura", "Varietà", "Destinazione", "Impiego", "Precocità", "Piante/ha",
  "Resa media (t/ha)", "Azoto Totale (kg/ha)", "Fase F1", "N F1 (kg/ha)",
  "BBCH F1", "NDVI F1", "Fase F2", "N F2 (kg/ha)", "BBCH F2", "NDVI F2",
  "Fase F3", "N F3 (kg/ha)", "BBCH F3", "NDVI F3", "Fase F4", "N F4 (kg/ha)",
  "BBCH F4", "NDVI F4",
];
const syntheticRows = [
  ["Kiwi", "Synthetic Variety Alpha", "Mercato fresco", "Consumo diretto", "Media", "1200", "12.3", "88", "Ripresa vegetativa", "12.5", "07-09", "0.47", "Fioritura", "26.4", "61-65", "0.63", "Accrescimento dei frutti", "39.6", "71-79", "0.81", "Maturazione dei frutti", "9.3", "81-89", "0.68"],
  ["Mele", "Synthetic Variety Beta", "Mercato fresco", "Consumo diretto", "Precoce", "1450", "21.7", "104", "Ripresa vegetativa", "15.6", "07-09", "0.45", "Fioritura", "31.2", "61-65", "0.62", "Accrescimento dei frutti", "46.8", "71-79", "0.79", "Maturazione dei frutti", "10.4", "81-89", "0.66"],
  ["Kiwi", "Synthetic Variety Gamma", "Industria", "Trasformazione", "Tardiva", "1100", "18.9", "96", "Ripresa vegetativa", "13.8", "07-09", "0.44", "Fioritura", "28.8", "61-65", "0.61", "Accrescimento dei frutti", "43.2", "71-79", "0.78", "Maturazione dei frutti", "10.1", "81-89", "0.65"],
];
const langs = { it: { empty: "Il catalogo è vuoto.", error: "Impossibile caricare il catalogo colture.", retry: "Riprova" }, en: { empty: "The catalogue is empty.", error: "Unable to load the crop catalogue.", retry: "Retry" }, es: { empty: "El catálogo está vacío.", error: "No se puede cargar el catálogo de cultivos.", retry: "Reintentar" } };
const cases = [
  { width: 390, height: 844, lang: "it" },
  { width: 390, height: 844, lang: "en" },
  { width: 390, height: 844, lang: "es" },
  { width: 820, height: 1180, lang: "it" },
  { width: 820, height: 1180, lang: "en" },
  { width: 820, height: 1180, lang: "es" },
];
// A transport failure has no HTTP response; keep both distinct from a 503.
const errorModes = ["503", "connectionreset", "aborted"];
const draftFor = c => ({
  customer: `Azienda prova ${c.width}-${c.lang}`,
  plot: `Parcella Alfa ${c.width}-${c.lang}`,
  yield: "4.7", ndvi: ["0.51", "0.53", "0.55", "0.57", "0.59"],
});
const json = (data, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(data) });

async function makeContext(browser, c, mode) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.height }, timezoneId: "UTC",
    serviceWorkers: "block",
  });
  context.setDefaultTimeout(4000);
  const state = {
    mode, requests: [], attempts: [], writes: [], blockedApis: [], blockedExternal: [],
    clerkModules: 0, observations: 0, pending: [], pageErrors: [], websockets: [],
    transportFailures: [], catalogueResponses: [],
  };
  await context.route("**/*", async route => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    if (!["GET", "HEAD"].includes(method)) {
      state.writes.push({ method, path: u.pathname });
      return route.abort();
    }
    if (u.origin !== origin) {
      state.blockedExternal.push({ method, host: u.host, path: u.pathname });
      return route.abort();
    }
    if (!/^\/api(?:\/|$)/.test(u.pathname)) return route.continue();
    state.attempts.push({ method, path: u.pathname });
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      state.writes.push({ method, path: u.pathname });
      return route.abort();
    }
    if (u.pathname.startsWith("/api/__clerk/")) {
      state.blockedApis.push({ method, path: u.pathname });
      return route.abort();
    }
    if (u.pathname === "/api/auth/me") return route.fulfill(json(account));
    if (u.pathname === "/api/auth/usage") return route.fulfill(json(usage));
    if (u.pathname === "/api/osservazioni") {
      state.observations++;
      return route.fulfill(json([]));
    }
    if (u.pathname === "/api/catalogo-colture") {
      const record = { method, status: "pending" };
      state.requests.push(record);
      if (state.mode === "hold" || state.mode === "delayed-success") {
        await new Promise(resolve => state.pending.push({ resolve, route, record }));
        return;
      }
      if (state.mode === "503") {
        record.status = 503;
        return route.fulfill(json({ error: "synthetic unavailable" }, 503));
      }
       if (state.mode === "connectionreset" || state.mode === "aborted") {
         record.status = state.mode;
         return route.abort(state.mode);
       }
      record.status = 200;
      return route.fulfill(json(state.mode === "empty" ? { columns: [], rows: [] } : { columns, rows: syntheticRows }));
    }
    state.blockedApis.push({ method, path: u.pathname });
    return route.abort();
  });
  // These exact static ESM routes run before the broad same-origin static allow.
  await context.route("**/node_modules/.vite/deps/@clerk_react.js*", route => {
    state.clerkModules++;
    return route.fulfill({
      contentType: "text/javascript",
      body: `export const ClerkProvider=({children})=>children;
export const useAuth=()=>({isLoaded:true,isSignedIn:true,userId:"synthetic-catalogue",sessionId:"synthetic-session",getToken:async()=>null});
export const useClerk=()=>({addListener:()=>()=>{},signOut:async()=>{throw Error("synthetic write blocked")},openUserProfile:()=>{throw Error("outside test scope")}});
export const SignIn=()=>{throw Error("SignIn outside synthetic test scope")};
export const SignUp=()=>{throw Error("SignUp outside synthetic test scope")};`,
    });
  });
  await context.route("**/node_modules/.vite/deps/@clerk_react_internal.js*", route => route.fulfill({
    contentType: "text/javascript",
    body: `export const publishableKeyFromHost=()=>"pk_test_synthetic_browser_only";`,
  }));
   await context.routeWebSocket("**/*", ws => {
     state.websockets.push("websocket blocked");
     ws.close({ code: 1008, reason: "test isolation" });
   });
  const page = await context.newPage();
  page.on("pageerror", e => state.pageErrors.push(e.message));
  page.on("requestfailed", req => {
    if (new URL(req.url()).pathname === "/api/catalogo-colture") {
      state.transportFailures.push({ method: req.method(), error: req.failure()?.errorText });
    }
  });
  page.on("response", response => {
    if (new URL(response.url()).pathname === "/api/catalogo-colture") {
      state.catalogueResponses.push(response.status());
    }
  });
  page.on("websocket", ws => state.websockets.push(new URL(ws.url()).hostname === new URL(origin).hostname ? "same-origin websocket observed" : "external websocket observed"));
  return { context, page, state };
}

async function selectLanguage(page, lang, viewportWidth) {
  await page.getByTestId("button-brand-menu").click();
  const selector = page.locator('label:has(select[aria-label="Lingua"]) select:visible').first();
  await selector.selectOption(lang);
  await page.keyboard.press("Escape");
}
const draftLabels = {
  it: { customer: "Cliente (nome azienda)", plot: "Appezzamento", yield: "Resa Desiderata (t/ha)", reading: i => `Misura ${i}` },
  en: { customer: "Customer (farm name)", plot: "Field", yield: "Target yield (t/ha)", reading: i => `Reading ${i}` },
  es: { customer: "Cliente (nombre de la explotación)", plot: "Parcela", yield: "Rendimiento objetivo (t/ha)", reading: i => `Lectura ${i}` },
};
async function fillDraft(page, draft, lang) {
  const l = draftLabels[lang];
  await page.getByLabel(l.customer).fill(draft.customer);
  await page.getByLabel(l.plot).fill(draft.plot);
  await page.getByLabel(l.yield).fill(draft.yield);
  for (let i = 1; i <= 5; i++) await page.getByLabel(l.reading(i)).fill(draft.ndvi[i - 1]);
}
async function readDraft(page, lang) {
  const l = draftLabels[lang];
  return {
    customer: await page.getByLabel(l.customer).inputValue(),
    plot: await page.getByLabel(l.plot).inputValue(),
    yield: await page.getByLabel(l.yield).inputValue(),
    ndvi: await Promise.all([1, 2, 3, 4, 5].map(i => page.getByLabel(l.reading(i)).inputValue())),
  };
}
async function nav(page, which) {
  if (!await page.getByTestId("nav-dropdown").isVisible()) {
    await page.getByTestId("button-brand-menu").click();
  }
  await page.getByTestId(which === "catalogue" ? "link-nav-catalogue" : "link-nav-portal").click();
}
async function releaseAll(state, payload, status = 200) {
  const pending = [...state.pending];
  state.pending.length = 0;
  await Promise.all(pending.map(async p => {
    p.record.status = status;
    const fulfilled = p.route.fulfill(json(payload, status));
    p.resolve(fulfilled);
    await fulfilled;
  }));
}
async function screenshot(page, c, phase) {
  await page.screenshot({ path: path.join(root, `${c.width}x${c.height}-${c.lang}-${phase}.png`), fullPage: false });
}
function sameDraft(actual, expected) { return JSON.stringify(actual) === JSON.stringify(expected); }

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const report = [];
try {
  for (const c of cases) {
    const draft = draftFor(c), expected = langs[c.lang];
    const checks = [];
    const record = { case: `${c.width}x${c.height}-${c.lang}`, draft, checks, empty: {}, error: {}, recovery: {}, errorScenarios: {} };

    // Fresh isolated context: held GET -> navigate away/back -> empty success.
    const emptyRun = await makeContext(browser, c, "hold");
    let { page, state } = emptyRun;
    await page.goto(`${origin}/user-portal`);
     // Exclude the editor's floating development banner, not application UI.
     await page.addStyleTag({ content: "#replit-dev-banner{display:none!important}" });
    await page.getByTestId("button-brand-menu").waitFor();
    if (c.lang !== "it") await selectLanguage(page, c.lang, c.width);
    await fillDraft(page, draft, c.lang);
    await nav(page, "catalogue");
    await page.locator('[aria-busy="true"]').waitFor();
    const loading = await page.evaluate(() => ({
      busy: document.querySelectorAll('[aria-busy="true"]').length,
       loadingLabel: document.querySelector('[aria-busy="true"]')?.getAttribute("aria-label"),
      skeletons: document.querySelectorAll(".nc-skel").length,
      empty: document.body.innerText.includes("Il catalogo è vuoto.") || document.body.innerText.includes("The catalogue is empty.") || document.body.innerText.includes("El catálogo está vacío."),
      alerts: document.querySelectorAll('[role="alert"]').length,
      tables: document.querySelectorAll('[data-testid="table-catalogue-scroll"]').length,
      clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
    }));
    await page.getByTestId("input-catalogue-search").fill("synthetic");
    const searchEditable = await page.getByTestId("input-catalogue-search").isEnabled();
    const editable = await page.getByTestId("select-catalogue-crop").isEnabled();
    await screenshot(page, c, "loading");
    await nav(page, "portal");
    const whileHeldDraft = await readDraft(page, c.lang);
    await nav(page, "catalogue");
    state.mode = "empty";
    await releaseAll(state, { columns: [], rows: [] });
    await page.getByText(expected.empty).waitFor();
    const emptyStatus = await page.evaluate(() => ({
      busy: document.querySelectorAll('[aria-busy="true"]').length,
      alerts: document.querySelectorAll('[role="alert"]').length,
      tables: document.querySelectorAll('[data-testid="table-catalogue-scroll"]').length,
      text: document.querySelector('[data-testid="module-catalogue"]')?.innerText ?? "",
    }));
    await screenshot(page, c, "empty");
    await nav(page, "portal");
    const afterEmptyDraft = await readDraft(page, c.lang);
    checks.push(
      { name: "loading-state", pass: loading.busy > 0 && loading.skeletons > 0 && !loading.empty && loading.alerts === 0 && loading.tables === 0 },
       { name: "localized-loading-label", pass: loading.loadingLabel === { it: "Caricamento…", en: "Loading…", es: "Cargando…" }[c.lang] },
      { name: "search-filter-editable", pass: editable && searchEditable },
      { name: "no-horizontal-overflow", pass: loading.scrollWidth <= loading.clientWidth },
      { name: "draft-preserved-while-pending", pass: sameDraft(whileHeldDraft, draft) },
      { name: "localized-empty-state", pass: emptyStatus.text.includes(expected.empty) && emptyStatus.busy === 0 && emptyStatus.alerts === 0 && emptyStatus.tables === 0 },
      { name: "draft-preserved-after-empty", pass: sameDraft(afterEmptyDraft, draft) },
       { name: "empty-flow-isolation", pass: state.writes.length === 0 && state.blockedApis.length === 0 && state.clerkModules > 0 && state.pageErrors.length === 0 },
    );
    record.empty = { loading, emptyStatus, requestCount: state.requests.length, attempts: [...state.attempts], writes: [...state.writes], blockedApis: [...state.blockedApis], blockedExternal: [...state.blockedExternal], clerkModules: state.clerkModules, observations: state.observations, pageErrors: [...state.pageErrors], websockets: [...state.websockets] };
    await emptyRun.context.close();

    // Each failure gets a fresh cache/browser context, with the draft re-entered.
    for (const errorMode of errorModes) {
    const firstCheck = checks.length;
    const errorRun = await makeContext(browser, c, errorMode);
    try {
    page = errorRun.page; state = errorRun.state;
    await page.goto(`${origin}/user-portal`);
     await page.addStyleTag({ content: "#replit-dev-banner{display:none!important}" });
    await page.getByTestId("button-brand-menu").waitFor();
    if (c.lang !== "it") await selectLanguage(page, c.lang, c.width);
    await fillDraft(page, draft, c.lang);
    await nav(page, "catalogue");
    const alert = page.getByRole("alert");
    await alert.waitFor({ timeout: 15000 });
    const alertText = await alert.innerText();
    const retryText = (await alert.locator("button").innerText()).trim();
    const errorBusy = await page.locator('[aria-busy="true"]').count();
    const errorTable = await page.locator('[data-testid="table-catalogue-scroll"]').count();
    await screenshot(page, c, errorMode);
    await nav(page, "portal");
    const duringErrorDraft = await readDraft(page, c.lang);
    const preRemountErrors = state.requests.length;
    await nav(page, "catalogue");
    await alert.waitFor({ timeout: 15000 });
    for (let i = 0; i < 300 && state.requests.length <= preRemountErrors; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const remountRequests = state.requests.length - preRemountErrors;
     // A cached error may render before the remount's automatic retries settle.
     // Wait for the four default attempts so the manual Retry is unambiguous.
     for (let i = 0; i < 300 && state.requests.length < preRemountErrors + 4; i++) {
       await new Promise(resolve => setTimeout(resolve, 50));
     }
     await alert.waitFor({ timeout: 15000 });
    const alertAfterRemount = await page.getByRole("alert").innerText();
    checks.push(
      { name: "localized-error-message", pass: alertText.includes(expected.error) },
      { name: "localized-retry-label", pass: retryText === expected.retry, observed: retryText },
      { name: "error-no-busy-or-table", pass: errorBusy === 0 && errorTable === 0 },
      { name: "draft-preserved-while-error", pass: sameDraft(duringErrorDraft, draft) },
      { name: "error-persists-after-remount", pass: alertAfterRemount.includes(expected.error) && remountRequests > 0 },
    );
    const beforeRetry = state.requests.length;
    state.mode = "delayed-success";
    const retryButton = page.getByRole("alert").locator("button");
    await retryButton.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="button-brand-menu"]') !== null);
    for (let i = 0; i < 40 && state.pending.length === 0; i++) await new Promise(resolve => setTimeout(resolve, 50));
    const retryPending = state.pending.length > 0;
    const pendingState = await page.evaluate(() => ({
      busy: document.querySelectorAll('[aria-busy="true"]').length,
      alerts: document.querySelectorAll('[role="alert"]').length,
      tables: document.querySelectorAll('[data-testid="table-catalogue-scroll"]').length,
    }));
     // Do not click the brand here: it navigates home and unmounts the catalogue.
     // Recovery must be proved on this very error view, with exactly one GET
     // caused by the manual Retry, not a successful remount refetch.
     const navigationEnabled = await page.getByTestId("button-brand-menu").isEnabled();
     const pendingRequests = state.requests.length;
     state.mode = "success";
    await releaseAll(state, { columns, rows: syntheticRows });
    await page.getByTestId("row-catalogue-0").waitFor();
    const rowCount = await page.locator('[data-testid^="row-catalogue-"]').count();
    const cellValues = await page.locator('[data-testid="row-catalogue-0"] td').allInnerTexts();
    const tableText = await page.locator('[data-testid="table-catalogue-scroll"]').innerText();
    const recoveredAlerts = await page.getByRole("alert").count();
    const countText = await page.getByTestId("text-catalogue-count").innerText();
    await screenshot(page, c, `${errorMode}-recovered`);
    await nav(page, "portal");
    const afterRecoveryDraft = await readDraft(page, c.lang);
    checks.push(
      { name: "retry-increases-request-count", pass: state.requests.length > beforeRetry },
       { name: "retry-keeps-navigation-enabled", pass: retryPending && navigationEnabled },
       { name: "manual-retry-alone-recovers-mounted-view", pass: pendingRequests === beforeRetry + 1 && state.requests.length === beforeRetry + 1 },
      { name: "recovered-three-rows", pass: rowCount === 3 },
      { name: "recovered-count", pass: countText.trim() === { it: "3 di 3 varietà", en: "3 of 3 varieties", es: "3 de 3 variedades" }[c.lang] },
      { name: "error-alert-removed", pass: recoveredAlerts === 0 },
      { name: "variety-and-numeric-strings-unchanged", pass: cellValues[1] === syntheticRows[0][1] && cellValues[6] === syntheticRows[0][6] && cellValues[7] === syntheticRows[0][7] && cellValues[11] === syntheticRows[0][11] && tableText.includes("Synthetic Variety Alpha") },
      { name: "draft-preserved-after-recovery", pass: sameDraft(afterRecoveryDraft, draft) },
      { name: "zero-writes", pass: state.writes.length === 0 },
       { name: "error-flow-isolation", pass: state.blockedApis.length === 0 && state.clerkModules > 0 && state.pageErrors.length === 0 },
      { name: "exact-failure-and-retry-sequence", pass: beforeRetry === 8 && state.requests.length === 9 && state.requests.slice(0, beforeRetry).every(r => r.status === (errorMode === "503" ? 503 : errorMode)) && state.requests.at(-1).status === 200 },
      { name: "transport-versus-http-evidence", pass: errorMode === "503"
        ? state.transportFailures.length === 0 && JSON.stringify(state.catalogueResponses) === JSON.stringify([...Array(8).fill(503), 200])
        : state.transportFailures.length === 8 && state.transportFailures.every(r => r.error === (errorMode === "connectionreset" ? "net::ERR_CONNECTION_RESET" : "net::ERR_ABORTED")) && JSON.stringify(state.catalogueResponses) === "[200]" },
    );
    const error = { alertText, retryText, requestStatuses: state.requests.map(r => r.status), attempts: [...state.attempts], busy: errorBusy, table: errorTable, remountRequests, preservedDraft: duringErrorDraft, transportFailures: [...state.transportFailures], httpResponses: [...state.catalogueResponses] };
    const recovery = { beforeRetry, requestCount: state.requests.length, retryPending, pendingState, navigationEnabled, pendingRequests, rowCount, countText, cellValues, recoveredAlerts, preservedDraft: afterRecoveryDraft, writes: [...state.writes], blockedApis: [...state.blockedApis], blockedExternal: [...state.blockedExternal], clerkModules: state.clerkModules, observations: state.observations, pageErrors: [...state.pageErrors], websockets: [...state.websockets] };
    record.errorScenarios[errorMode] = { error, recovery };
    if (errorMode === "503") {
      record.error = error;
      record.recovery = recovery;
    }
    for (const check of checks.slice(firstCheck)) check.name = `${errorMode}: ${check.name}`;
    } finally {
      await errorRun.context.close();
    }
    }
    report.push(record);
     await fs.writeFile(path.join(root, "report.json"), JSON.stringify({ baseOrigin: origin, cases: report }, null, 2));
    console.log(`finished ${record.case}: ${checks.filter(x => x.pass).length}/${checks.length} checks passed`);
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(root, "report.json"), JSON.stringify({ baseOrigin: origin, cases: report }, null, 2));
const failed = report.flatMap(c => c.checks.filter(x => !x.pass).map(x => `${c.case}: ${x.name}${x.observed ? ` (observed ${x.observed})` : ""}`));
console.log(JSON.stringify({ report: path.join(root, "report.json"), cases: report.length, failures: failed }, null, 2));
if (failed.length) process.exitCode = 1;
