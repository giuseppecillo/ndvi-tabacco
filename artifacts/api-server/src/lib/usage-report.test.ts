import test from "node:test";
import assert from "node:assert/strict";
import { assembleUsage } from "./usage-report";
import { baselineUsage } from "./test-support/usage-baseline";
import { syntheticUsage } from "./test-support/usage-synthetic";
import { planKey, contractPrefix, usagePrefix, PRO_BYTES } from "./plan-model";

test("large synthetic ledger matches every original response field and ordering", () => {
  const input = syntheticUsage(40, 2_000, 20);
  input.accounts.reverse();
  input.records.reverse();
  assert.deepEqual(assembleUsage(input), baselineUsage(input));
});
test("metadata traversal is linear even with many owners and historical contracts", () => {
  const input = syntheticUsage(100, 100, 30);
  let reads = 0;
  input.records = new Proxy(input.records, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) reads++;
      return Reflect.get(target, property, receiver);
    },
  });
  assembleUsage(input);
  assert.equal(reads, input.records.length);
});

test("renewals, archive bytes, admin exemption and orphan-period events retain semantics", () => {
  const input = syntheticUsage(3, 100, 5);
  input.accounts[0].role = "admin";
  input.data[1].bytes = PRO_BYTES + 123;
  // Unassigned account with retained ledger; unknown keys still cost bytes.
  input.records = input.records.filter(row => row.key !== planKey(input.accounts[2].id));
  input.records.push({ owner_id: input.accounts[1].id, key: "unknown-namespace", value: "not JSON", bytes: 17 });
  const orphan = input.records.find(row => row.key.startsWith(usagePrefix(input.accounts[1].id)))!;
  const value = JSON.parse(orphan.value);
  value.periodId = "00000000-0000-4000-8000-000000000099";
  orphan.value = JSON.stringify(value);
  orphan.key = `${usagePrefix(value.userId)}${value.periodId}:${value.kind}:${value.entryId}`;
  assert.deepEqual(assembleUsage(input), baselineUsage(input));
  const result = assembleUsage(input);
  assert.equal(result[0].state, "exempt");
  assert.equal(result[2].visitsUsed, null);
  assert.equal(result[1].periods.length, 5);
  assert.equal(result[1].storageMb, result[1].storageBytes / 1_000_000);
  // Restore from the same source rows: no hidden cache/counter to rebuild.
  assert.deepEqual(assembleUsage(structuredClone(input)), result);
});

test("missing table, empty owners, scheduled and expired plans match baseline", () => {
  for (const now of ["1999-01-01", "2026-06-01", "2028-01-01"]) {
    const input = syntheticUsage(2, 10, 2);
    input.now = new Date(now);
    assert.deepEqual(assembleUsage(input), baselineUsage(input));
    input.ready = false; input.records = [];
    assert.deepEqual(assembleUsage(input), baselineUsage(input));
    input.accounts = [];
    assert.deepEqual(assembleUsage(input), []);
  }
});

test("malformed or cross-owner current, history and usage rows fail closed", () => {
  for (const kind of ["plan", "contract", "usage"]) {
    for (const corruption of ["json", "schema", "owner", "key"]) {
      if (kind === "plan" && corruption === "key") continue;
      const input = syntheticUsage(2, 10, 2);
      const id = input.accounts[0].id;
      const prefix = kind === "plan" ? planKey(id) : kind === "contract" ? contractPrefix(id) : usagePrefix(id);
      const row = input.records.find(row => row.key.startsWith(prefix))!;
      if (corruption === "json") row.value = "{";
      if (corruption === "schema") row.value = "{}";
      if (corruption === "owner") row.value = JSON.stringify({ ...JSON.parse(row.value), userId: input.accounts[1].id });
      if (corruption === "key") row.key += "-invalid";
      assert.throws(() => baselineUsage(input));
      assert.throws(() => assembleUsage(input));
    }
  }
});

test("unexpected owners are ignored, no row contents appear in responses, input remains unmodified", () => {
  const input = syntheticUsage(2, 100, 3);
  const before = structuredClone(input);
  const allowed = input.accounts[0];
  const report = assembleUsage({ ...input, accounts: [allowed] });
  assert.equal(report.length, 1);
  assert.equal(report[0].userId, allowed.id);
  assert.ok(!JSON.stringify(report).includes(input.accounts[1].id));
  assert.ok(!JSON.stringify(report).includes("synthetic-event-"));
  assert.deepEqual(input, before);
  // Fresh row totals after deletion; consumed event quotas are not refunded.
  input.data[0].bytes = 0; input.data[0].observations = 0; input.data[0].visits = 0;
  const after = assembleUsage({ ...input, accounts: [allowed] })[0];
  assert.equal(after.mapsUsed, report[0].mapsUsed);
  assert.equal(after.visitsUsed, report[0].visitsUsed);
  assert.ok(after.storageBytes < report[0].storageBytes);
});
