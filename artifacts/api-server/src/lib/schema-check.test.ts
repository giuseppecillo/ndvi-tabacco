import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_COLUMNS, REQUIRED_CHECKS, REQUIRED_UNIQUE_KEYS,
  schemaIncompatibilities, type SchemaMetadata, type SchemaRow,
} from "./schema-contract";
import {
  verifyApplicationSchema, SCHEMA_QUERIES, ADMIN_MAPPING_QUERY,
  BEGIN_SCHEMA_CHECK, SCHEMA_READONLY_PROBE,
} from "./schema-check";

function fixture(): SchemaMetadata {
  const metadata: SchemaMetadata = { relations: [], columns: [], constraints: [], indexes: [] };
  for (const [table, columns] of Object.entries(APPLICATION_COLUMNS)) {
    metadata.relations.push({ table_name: table, kind: "r", visible: true });
    for (const [name, column] of Object.entries(columns)) metadata.columns.push({
      table_name: table, column_name: name, type: column.type, not_null: column.notNull,
      default_expression: column.defaultExpression, identity: "", generated: "",
    });
    metadata.constraints.push({
      table_name: table, kind: "p", validated: true, deferrable: false,
      columns: [table === "security_state" ? "key" : "id"],
    });
    for (const columns of REQUIRED_UNIQUE_KEYS[table]) metadata.indexes.push({
      table_name: table, columns, unique: true, valid: true, ready: true,
      immediate: true, partial: false, expression: false,
    });
  }
  for (const [table, name] of [["osservazioni", "owner_id"], ["privacy_requests", "user_id"]]) {
    metadata.constraints.push({
      table_name: table, kind: "f", validated: true, deferrable: false,
      columns: [name], foreign_schema: "public", foreign_table: "app_users",
      foreign_columns: ["id"], delete_action: "c",
    });
  }
  for (const definition of REQUIRED_CHECKS) metadata.constraints.push({
    table_name: "app_users", kind: "c", validated: true, definition,
  });
  return metadata;
}

function fakeClient(metadata = fixture()) {
  const calls: string[] = [];
  const client = {
    async query(sql: string): Promise<{ rows: SchemaRow[] }> {
      calls.push(sql);
      if (sql === BEGIN_SCHEMA_CHECK || sql === "ROLLBACK") return { rows: [] };
      if (sql === SCHEMA_READONLY_PROBE) return { rows: [{ transaction_read_only: "on" }] };
      if (sql === ADMIN_MAPPING_QUERY) return { rows: [{ valid_initial_admin: true }] };
      const key = (Object.keys(SCHEMA_QUERIES) as (keyof SchemaMetadata)[])
        .find(key => SCHEMA_QUERIES[key] === sql);
      assert.ok(key, "no unauthorized query, DDL or DML");
      return { rows: metadata[key] };
    },
  };
  return { client, calls };
}

test("valid schema passes with only READ ONLY SELECTs and ROLLBACK", async () => {
  const { client, calls } = fakeClient();
  await verifyApplicationSchema(client);
  assert.equal(calls[0], BEGIN_SCHEMA_CHECK);
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(calls.length, 12);
  for (let i = 1; i < calls.length - 1; i += 2) assert.equal(calls[i], SCHEMA_READONLY_PROBE);
  assert.ok(calls.every(sql => [BEGIN_SCHEMA_CHECK, "ROLLBACK", SCHEMA_READONLY_PROBE,
    ADMIN_MAPPING_QUERY, ...Object.values(SCHEMA_QUERIES)].includes(sql)));
});
test("contract covers all 60 columns and does not depend on physical order", () => {
  const metadata = fixture();
  assert.equal(metadata.columns.length, 60);
  metadata.columns.reverse();
  assert.deepEqual(schemaIncompatibilities(metadata), []);
});
for (const table of Object.keys(APPLICATION_COLUMNS)) {
  test(`missing ${table} blocks without trying to bootstrap`, async () => {
    const metadata = fixture();
    metadata.relations = metadata.relations.filter(row => row.table_name !== table);
    const { client, calls } = fakeClient(metadata);
    await assert.rejects(verifyApplicationSchema(client), /required table missing/);
    assert.ok(!calls.includes(ADMIN_MAPPING_QUERY));
    assert.equal(calls.at(-1), "ROLLBACK");
  });
  for (const column of Object.keys(APPLICATION_COLUMNS[table])) {
    test(`missing ${table}.${column} is explicit`, () => {
      const metadata = fixture();
      metadata.columns = metadata.columns.filter(row => row.table_name !== table || row.column_name !== column);
      assert.ok(schemaIncompatibilities(metadata).some(issue => issue.includes(`${table}.${column}:`)));
    });
  }
}
for (const [field, value] of [
  ["type", "double precision"], ["not_null", false], ["default_expression", "gen_random_uuid()"],
  ["identity", "a"], ["generated", "s"],
]) {
  test(`incompatible column ${field} is rejected`, () => {
    const metadata = fixture();
    metadata.columns.find(row => row.table_name === "app_users" && row.column_name === "id")![String(field)] = value;
    assert.ok(schemaIncompatibilities(metadata).length > 0);
  });
}
test("nullable audit identifiers must remain nullable for anonymization", () => {
  for (const name of ["actor_id", "target_id"]) {
    const metadata = fixture();
    metadata.columns.find(row => row.table_name === "security_events" && row.column_name === name)!.not_null = true;
    assert.ok(schemaIncompatibilities(metadata).some(issue => issue.includes(`security_events.${name}`)));
  }
});
test("views, shadowed relations and incompatible extra required columns are rejected", () => {
  for (const mutation of ["view", "shadow", "extra"]) {
    const metadata = fixture();
    if (mutation === "view") metadata.relations[0].kind = "v";
    if (mutation === "shadow") metadata.relations[0].visible = false;
    if (mutation === "extra") metadata.columns.push({
      table_name: "app_users", column_name: "extra", not_null: true,
      default_expression: null, identity: "", generated: "",
    });
    assert.ok(schemaIncompatibilities(metadata).length);
  }
});
test("missing/invalid PK, checks or cascading FK are rejected", () => {
  for (const kind of ["p", "c", "f"]) {
    const metadata = fixture();
    metadata.constraints = metadata.constraints.filter(row => row.kind !== kind);
    assert.ok(schemaIncompatibilities(metadata).length);
  }
  const metadata = fixture();
  metadata.constraints.find(row => row.kind === "f")!.delete_action = "a";
  assert.ok(schemaIncompatibilities(metadata).length);
});
for (const property of ["unique", "valid", "ready", "immediate"]) {
  test(`unique index requires ${property}`, () => {
    const metadata = fixture();
    metadata.indexes[0][property] = false;
    assert.ok(schemaIncompatibilities(metadata).length);
  });
}
test("partial/expression/reordered composite unique indexes are rejected", () => {
  for (const property of ["partial", "expression", "columns"]) {
    const metadata = fixture();
    const row = metadata.indexes.find(row => row.table_name === "osservazioni" &&
      (row.columns as string[]).length === 2)!;
    row[property] = property === "columns" ? ["observation_id", "owner_id"] : true;
    assert.ok(schemaIncompatibilities(metadata).length);
  }
});
test("loss of READ ONLY stops before any metadata or account read", async () => {
  const { client, calls } = fakeClient();
  const original = client.query;
  client.query = sql => sql === SCHEMA_READONLY_PROBE
    ? (calls.push(sql), Promise.resolve({ rows: [{ transaction_read_only: "off" }] })) : original(sql);
  await assert.rejects(verifyApplicationSchema(client), /not READ ONLY/);
  assert.deepEqual(calls, [BEGIN_SCHEMA_CHECK, SCHEMA_READONLY_PROBE, "ROLLBACK"]);
});
test("missing admin mapping causes failure, never a new account or reassignment", async () => {
  const { client, calls } = fakeClient();
  const original = client.query;
  client.query = sql => sql === ADMIN_MAPPING_QUERY
    ? (calls.push(sql), Promise.resolve({ rows: [{ valid_initial_admin: false }] })) : original(sql);
  await assert.rejects(verifyApplicationSchema(client), /bootstrap disabled/);
  assert.equal(calls.at(-1), "ROLLBACK");
});
for (const failure of [BEGIN_SCHEMA_CHECK, SCHEMA_READONLY_PROBE, SCHEMA_QUERIES.columns, "ROLLBACK"]) {
  test(`query failure is sanitized and rollback attempted: ${failure.slice(0, 35)}`, async () => {
    const { client, calls } = fakeClient();
    const original = client.query;
    client.query = sql => {
      if (sql === failure) { calls.push(sql); throw new Error("synthetic private driver detail"); }
      return original(sql);
    };
    await assert.rejects(verifyApplicationSchema(client), error => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /private driver detail/);
      return true;
    });
    assert.equal(calls.at(-1), "ROLLBACK");
  });
}
test("oversized metadata is an explicit failure, not silent success", async () => {
  const metadata = fixture();
  metadata.columns = Array.from({ length: 501 }, () => ({}));
  await assert.rejects(verifyApplicationSchema(fakeClient(metadata).client), /exceeds verification limits/);
});
