import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("./pilot-browser-check.js", import.meta.url), "utf8");
const id = "QA-MIGRAZIONE-20261108";
const fixture = {
  id, coltura: "tabacco", cliente: "TEST MIGRAZIONE",
  appezzamento: "SINTETICO", n1: 0.5, media: 0.5, dose: 10,
};
async function run({ origin = "https://agri-precision-hub.replit.app",
  synthetic = [fixture], failUpdate = false, wrongUpdate = false } = {}) {
  let rows = [{ id: "originale", cliente: "NON_MODIFICARE" }, ...structuredClone(synthetic)];
  const calls = [], logs = [], errors = [];
  await vm.runInNewContext(source, {
    location: { origin },
    console: { log: (...v) => logs.push(v), error: (...v) => errors.push(v) },
    fetch: async (path, options) => {
      calls.push({ path, options });
      assert.equal(options.credentials, "same-origin");
      if (options.method === "POST") {
        if (failUpdate) return { ok: false, status: 503 };
        const payload = JSON.parse(options.body);
        assert.equal(payload.id, id);
        rows = rows.map(row => row.id === id ? { ...payload,
          ...(wrongUpdate ? { media: 0.5 } : {}) } : row);
      }
      if (options.method === "DELETE") {
        assert.equal(path, "/api/osservazioni/" + id);
        rows = rows.filter(row => row.id !== id);
      }
      return { ok: true, json: async () => structuredClone(
        options.method === "GET" ? rows : { ok: true }) };
    },
  });
  assert.deepEqual(rows.find(row => row.id === "originale"),
    { id: "originale", cliente: "NON_MODIFICARE" });
  return { rows, calls, logs, errors };
}
test("updates and deletes only the exact synthetic record through scoped API", async () => {
  const result = await run();
  assert.deepEqual(result.logs, [["COLLAUDO_COMPLETATO_UPDATE_DELETE"]]);
  assert.equal(result.rows.some(row => row.id === id), false);
  assert.equal(result.calls.filter(call => call.options.method === "POST").length, 1);
  assert.equal(result.calls.filter(call => call.options.method === "DELETE").length, 1);
});
test("wrong origin never sends a request", async () => {
  assert.equal((await run({ origin: "https://example.com" })).calls.length, 0);
});
for (const [name, synthetic] of [
  ["missing test record", []],
  ["duplicate test identifiers", [fixture, fixture]],
  ["real client sharing the identifier", [{ ...fixture, cliente: "Cliente reale" }]],
  ["wrong parcel", [{ ...fixture, appezzamento: "Reale" }]],
]) {
  test(name + " blocks every write", async () => {
    const result = await run({ synthetic });
    assert.ok(result.errors.length);
    assert.equal(result.calls.some(call => call.options.method !== "GET"), false);
  });
}
test("failed update or failed reread never deletes", async () => {
  for (const options of [{ failUpdate: true }, { wrongUpdate: true }]) {
    const result = await run(options);
    assert.ok(result.errors.length);
    assert.equal(result.calls.some(call => call.options.method === "DELETE"), false);
  }
});
