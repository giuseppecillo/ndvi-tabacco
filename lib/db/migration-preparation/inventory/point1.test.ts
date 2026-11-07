import test from "node:test";
import assert from "node:assert/strict";
import {
  readPoint1Metadata, METADATA_QUERIES, BEGIN_READ_ONLY, READ_ONLY_PROBE, withReadOnlyCatalog,
} from "./catalog";
import { POINT1_QUERIES } from "./point1-queries";

function fixture(change?: (rows: Record<string, unknown>[], name: string) => Record<string, unknown>[]) {
  const calls: string[] = [];
  const client = {
    async query(sql: string) {
      calls.push(sql);
      if (sql === BEGIN_READ_ONLY || sql === "ROLLBACK") return { rows: [] };
      if (sql === READ_ONLY_PROBE) return { rows: [{ transaction_read_only: "on" }] };
      if (sql === METADATA_QUERIES.identity) return { rows: [{
        database: "postgres", current_user: "postgres", session_user: "postgres", transaction_read_only: "on",
      }] };
      const name = Object.entries(POINT1_QUERIES).find(([, value]) => value === sql)?.[0];
      assert.ok(name, "only fixed point-1 SQL");
      const rows = name === "rlsRoutine" ? [{
        routine_oid: "123", result_type: "event_trigger", definition: "synthetic definition",
      }] : name === "rlsEventTrigger" ? [{
        routine_oid: "123", result_type: "event_trigger",
      }] : [];
      return { rows: change ? change(rows, name) : rows };
    },
  };
  return { client, calls };
}

test("point 1 uses seven catalog SELECTs, each preceded by a RO probe; always rolls back", async () => {
  const { client, calls } = fixture();
  const result = await readPoint1Metadata(client);
  assert.equal(result.applicationRelations.length, 0);
  assert.equal(calls[0], BEGIN_READ_ONLY);
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(calls.filter(sql => sql === READ_ONLY_PROBE).length, 7);
  for (let i = 2; i < calls.length - 1; i += 2) assert.equal(calls[i - 1], READ_ONLY_PROBE);
  assert.equal(calls.length, 16);
});

for (const name of ["rlsRoutine", "rlsEventTrigger"]) {
  for (const count of [0, 2]) {
    test(`reject ${count} rows for ${name}`, async () => {
      const { client, calls } = fixture((rows, key) => key === name
        ? Array.from({ length: count }, () => rows[0]) : rows);
      await assert.rejects(readPoint1Metadata(client), /POINT1_TRIGGER_METADATA_INCOMPLETE/);
      assert.equal(calls.at(-1), "ROLLBACK");
    });
  }
}
test("reject mismatched trigger OID", async () => {
  const { client } = fixture((rows, name) => name === "rlsEventTrigger"
    ? [{ ...rows[0], routine_oid: "456" }] : rows);
  await assert.rejects(readPoint1Metadata(client), /POINT1_TRIGGER_METADATA_INCOMPLETE/);
});
test("reject non-event-trigger routine", async () => {
  const { client } = fixture((rows, name) => name === "rlsRoutine"
    ? [{ ...rows[0], result_type: "void" }] : rows);
  await assert.rejects(readPoint1Metadata(client), /POINT1_TRIGGER_METADATA_INCOMPLETE/);
});
test("stop before metadata if read-only is lost", async () => {
  const { client, calls } = fixture();
  const query = client.query;
  client.query = async sql => sql === READ_ONLY_PROBE
    ? (calls.push(sql), { rows: [{ transaction_read_only: "off" }] }) : query(sql);
  await assert.rejects(readPoint1Metadata(client), /TRANSACTION_NOT_READ_ONLY/);
  assert.deepEqual(calls, [BEGIN_READ_ONLY, READ_ONLY_PROBE, "ROLLBACK"]);
});
test("reject excessive application columns", async () => {
  const { client } = fixture((rows, name) => name === "applicationColumns"
    ? Array.from({ length: 501 }, () => ({})) : rows);
  await assert.rejects(readPoint1Metadata(client), /METADATA_LIMIT_EXCEEDED/);
});
test("every added statement is catalog-only and does not call either event-trigger function", () => {
  for (const sql of Object.values(POINT1_QUERIES)) {
    assert.match(sql, /^SELECT /);
    assert.doesNotMatch(sql, /(?:FROM|JOIN)\s+(?:public|auth|storage|vault)\./i);
    assert.doesNotMatch(sql, /public\.rls_auto_enable\s*\(|pg_event_trigger_ddl_commands\s*\(/i);
    assert.doesNotMatch(sql, /;\s*(?:CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE)/i);
  }
});
test("original inventory mode cannot read the newly authorized function body", async () => {
  const { client, calls } = fixture();
  await assert.rejects(
    withReadOnlyCatalog(client, select => select(POINT1_QUERIES.rlsRoutine)),
    /UNAUTHORIZED_CATALOG_QUERY/,
  );
  assert.deepEqual(calls, [BEGIN_READ_ONLY, "ROLLBACK"]);
});
