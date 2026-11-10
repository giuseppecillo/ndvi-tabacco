/**
 * Isolated synthetic account-switch regression. No login, backend or DB.
 * BASE_URL=https://<preview> node artifacts/ndvi-tabacco/tests/observation-scope-browser-pass.mjs
 * Also included by observation-deletion-browser-pass.mjs.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";

const A = "qa-deletion-synthetic-only";
const B = "qa-account-b";

export async function runStorageScopePass({ browser, origin, output }) {
  await fs.mkdir(output, { recursive: true });
  const checks = [];
  const trace = [];
  const network = { api: [], external: [], writes: [], websockets: 0 };
  const pageErrors = [];
  async function scenario(name, probe, test) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
      serviceWorkers: "block" });
    const pending = [];
    const holds = [];
    let data;
    await context.route("**/*", async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin !== origin) {
        network.external.push(url.href);
        return route.abort();
      }
      if (/^\/api(?:\/|$)/.test(url.pathname)) {
        network.api.push(url.pathname);
        return route.abort();
      }
      if (!["GET", "HEAD"].includes(req.method())) {
        network.writes.push(req.method());
        return route.abort();
      }
      return route.continue();
    });
    await context.routeWebSocket("**/*", socket => {
      network.websockets++;
      socket.close();
    });
    await context.exposeBinding("qaObservationTransport", async (_source, req) => {
      if (!data) {
        const base = req.seed[0];
        const stamp = new Date().toISOString();
        data = Object.fromEntries([A, B].map(scope => [scope, [
          { ...base, id: "QA-shared-id", createdAt: stamp,
            cliente: scope === A ? "QA Account A" : "QA Account B" },
          { ...base, id: scope === A ? "QA-A-only" : "QA-B-only", createdAt: stamp,
            cliente: scope === A ? "QA Account A" : "QA Account B" },
        ]]));
      }
      trace.push({ scenario: name, scope: req.scope, method: req.method, path: req.pathname });
      let response;
      if (req.method === "GET") response = { status: 200, body: structuredClone(data[req.scope]) };
      else if (req.method === "DELETE") {
        const id = req.pathname === "/api/osservazioni" ? null
          : decodeURIComponent(req.pathname.split("/").pop());
        const deletedIds = data[req.scope].filter(row => !id || row.id === id).map(row => row.id);
        data[req.scope] = data[req.scope].filter(row => !deletedIds.includes(row.id));
        response = { status: 200, body: { ok: true, deletedIds } };
      } else throw new Error(`Unexpected synthetic request: ${req.method}`);
      const index = holds.findIndex(h => h.scope === req.scope && h.method === req.method);
      if (index !== -1) {
        const hold = holds.splice(index, 1)[0];
        return new Promise(resolve => pending.push({ ...hold, resolve, response }));
      }
      return response;
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(`${name}: ${error.message}`));
    const wait = predicate => expect.poll(predicate, { timeout: 10000 }).toBe(true);
    const hold = (scope, method) => holds.push({ scope, method });
    const waitPending = (scope, method) => wait(() => pending.some(p => p.scope === scope && p.method === method));
    const settle = async (scope, method, failure = false) => {
      const index = pending.findIndex(p => p.scope === scope && p.method === method);
      assert.ok(index >= 0, `${name}: missing held ${scope} ${method}`);
      const before = await page.evaluate(() => window.qaTransportSettled ?? 0);
      const held = pending.splice(index, 1)[0];
      held.resolve(failure ? { status: 403, body: { code: "DELETION_WINDOW_CLOSED" } } : held.response);
      await page.waitForFunction(n => (window.qaTransportSettled ?? 0) > n, before);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const switchTo = async scope => {
      await page.getByTestId(`switch-${scope}`).click();
      await expect(page.getByTestId("active-scope")).toHaveText(scope);
    };
    const focus = () => page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const probeState = () => page.getByTestId("registry-probe").textContent().then(JSON.parse);
    const emptyHistory = async () => {
      await expect(page.getByTestId("observation-list-item")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
    };
    const visibleAccount = async account => {
      await expect(page.getByTestId("observation-list-item")).toHaveCount(1);
      await expect(page.getByTestId("observation-list-item")).toContainText(`QA Account ${account}`);
      await expect(page.getByTestId("observation-list-item")).not.toContainText(`QA Account ${account === "A" ? "B" : "A"}`);
      const group = page.getByTestId("observation-list-item").locator(":scope > details");
      if (!await group.evaluate(el => el.open)) await group.locator(":scope > summary").click();
      const ids = (await page.getByTestId("observation-group-table")
        .locator("tbody td:first-child").allTextContents()).map(s => s.trim()).sort();
      assert.deepEqual(ids, ["QA-shared-id", `QA-${account}-only`].sort());
    };
    try {
      await page.goto(`${origin}/tests/observation-deletion.html?module=history${probe ? "&registryProbe=1" : ""}`);
      await page.locator("header select").first().selectOption("it");
      await test({ page, hold, waitPending, settle, switchTo, focus, probeState,
        wait, emptyHistory, visibleAccount });
      assert.equal(pending.length, 0, `${name}: all delayed responses must be released`);
      await page.screenshot({ path: path.join(output, `${name}.png`) });
      checks.push({ name, pass: true });
    } finally {
      for (const p of pending) p.resolve(p.response);
      await context.close();
    }
  }

  await scenario("hook-pending-get-scope-switch", true, async t => {
    await t.wait(async () => (await t.probeState()).ids.includes("QA-A-only"));
    t.hold(A, "GET");
    await t.focus();
    await t.waitPending(A, "GET");
    t.hold(B, "GET");
    await t.switchTo(B);
    await t.waitPending(B, "GET");
    assert.deepEqual(await t.probeState(), { ids: [], loading: true, error: false });
    await t.settle(A, "GET");
    assert.deepEqual(await t.probeState(), { ids: [], loading: true, error: false });
    await t.settle(B, "GET");
    await t.wait(async () => (await t.probeState()).ids.includes("QA-B-only"));
    // Returning to the same scope must not revalidate an older A response.
    t.hold(B, "GET");
    await t.focus();
    await t.waitPending(B, "GET");
    await t.switchTo(A);
    await t.wait(async () => (await t.probeState()).ids.includes("QA-A-only"));
    await t.switchTo(B);
    await t.wait(async () => (await t.probeState()).ids.includes("QA-B-only"));
    await t.settle(B, "GET", true);
    assert.equal((await t.probeState()).error, false);
    const commits = await t.page.evaluate(() => window.qaRegistryCommits);
    assert.ok(commits.some(c => c.scope === B && c.loading && c.ids.length === 0));
    assert.ok(commits.every(c => !c.ids.includes(c.scope === A ? "QA-B-only" : "QA-A-only")),
      "No committed render may contain the previous account's history");
  });

  for (const bulk of [false, true]) for (const failure of [false, true]) {
    const name = `app-${bulk ? "bulk" : "single"}-delete-late-${failure ? "failure" : "success"}`;
    await scenario(name, false, async t => {
      await t.visibleAccount("A");
      t.hold(A, "GET");
      await t.focus();
      await t.waitPending(A, "GET");
      t.hold(A, "DELETE");
      t.page.once("dialog", dialog => dialog.accept());
      if (bulk) {
        await t.page.getByRole("link", { name: "Rilievo e dati", exact: true }).click();
        await t.page.getByRole("button", { name: "Elimina rilievi delle ultime 24 ore", exact: true }).click();
      } else {
        const detail = t.page.locator("details").filter({ hasText: "#QA-shared-id" }).last();
        await detail.locator("summary").click();
        await detail.getByRole("button", { name: "Elimina rilievo QA-shared-id", exact: true }).click();
      }
      await t.waitPending(A, "DELETE");
      if (bulk) await t.page.getByRole("link", { name: "Storico Rilievi", exact: true }).click();
      t.hold(B, "GET");
      await t.switchTo(B);
      await t.waitPending(B, "GET");
      await t.emptyHistory();
      await t.settle(A, "GET");
      await t.emptyHistory();
      // Exercise old mutation errors both before and after B's first response.
      if (failure && !bulk) {
        await t.settle(A, "DELETE", true);
        await t.emptyHistory();
      }
      await t.settle(B, "GET");
      await t.visibleAccount("B");
      if (!(failure && !bulk)) await t.settle(A, "DELETE", failure);
      await t.visibleAccount("B"); // Shared ID catches cross-account filtering.
      await expect(t.page.getByRole("alert")).toHaveCount(0);
      await t.page.getByRole("link", { name: "Rilievo e dati", exact: true }).click();
      await expect(t.page.getByRole("button", { name: "Elimina rilievo QA-shared-id", exact: true })).toBeEnabled();
      // Old finishMutation must not trigger a GET in B.
      assert.equal(trace.filter(r => r.scenario === name && r.scope === B && r.method === "GET").length, 1);
    });
  }
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(network.api, []);
  assert.deepEqual(network.writes, []);
  const report = { pass: true, checks, trace, network, pageErrors,
    scope: "Synthetic identities and runner-memory data only; no login, real API or database. Chromium, not Safari." };
  await fs.writeFile(path.join(output, "scope-pass.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.env.BASE_URL) throw new Error("Set BASE_URL to the running preview.");
  const browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    console.log(JSON.stringify(await runStorageScopePass({ browser,
      origin: new URL(process.env.BASE_URL).origin,
      output: path.resolve("generated-artifacts/observation-scope") }), null, 2));
  } finally { await browser.close(); }
}
