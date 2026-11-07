// No network, pg import, database creation or production credentials.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TABLES, copyHeader, validatedCopyHeader, applicationCopy, countAssertions, fingerprint } from "./data.mjs";
import { migrationPause } from "./maintenance.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
async function collect(input) {
  const counts = {};
  const output = [];
  for await (const line of applicationCopy(input, counts)) output.push(line);
  return { counts, output: output.join("") };
}
const fixture = () => Object.keys(TABLES).flatMap((table) => [copyHeader(table), "synthetic", "\\."]);
test("exactly five approved tables and all 60 explicit columns", () => {
  assert.equal(Object.keys(TABLES).length, 5);
  assert.equal(Object.values(TABLES).reduce((n, columns) => n + columns.length, 0), 60);
  for (const [table, columns] of Object.entries(TABLES)) {
    assert.equal(new Set(columns).size, columns.length);
    assert.deepEqual(validatedCopyHeader(copyHeader(table)), { table, columns });
  }
  for (const column of ["owner_id","observation_id","lat","lng","n1","n5","media","dose","bbch"]) {
    assert.ok(TABLES.osservazioni.includes(column));
  }
  assert.ok(TABLES.app_users.includes("clerk_user_id"));
});
test("named column order can differ without changing field mapping", () => {
  assert.deepEqual(validatedCopyHeader('COPY public.security_state ("value", "key") FROM stdin;'),
    { table: "security_state", columns: ["value", "key"] });
});
for (const bad of [
  "COPY public.app_users FROM stdin;",
  'COPY public.security_state ("key") FROM stdin;',
  'COPY public.security_state ("key", "key") FROM stdin;',
  'COPY public.security_state ("key", "secret") FROM stdin;',
  'COPY auth.users ("id") FROM stdin;',
  'COPY public.unapproved ("id") FROM stdin;',
]) {
  test(`rejects invalid COPY header ${bad}`, () => assert.throws(() => validatedCopyHeader(bad)));
}
test("only COPY sections pass through; dump preambles never execute", async () => {
  const result = await collect(["SET row_security=off;", "DROP TABLE forbidden;", ...fixture(), "SELECT 42;"]);
  assert.equal(Object.values(result.counts).reduce((a, b) => a + b, 0), 5);
  assert.doesNotMatch(result.output, /DROP|SELECT 42|SET row_security/);
  assert.match(countAssertions(result.counts), /count\(\*\)/);
});
test("truncated data fails before a commit can be generated", async () => {
  await assert.rejects(collect(fixture().slice(0, -1)), /INCOMPLETE/);
});
test("duplicate tables fail", async () => {
  await assert.rejects(collect([...fixture(), copyHeader("app_users"), "\\."]), /DUPLICATE/);
});
test("referenced users must come first", async () => {
  await assert.rejects(collect([copyHeader("osservazioni")]), /ORDER/);
});
test("row counts must be nonnegative integer literals, not SQL input", () => {
  assert.throws(() => countAssertions({ app_users: "0;DROP" }), /INVALID/);
});
test("fingerprints preserve high-precision numeric and microsecond text", async () => {
  const canonical = '{"dose":12345678901234567890.123456789,"created_at":"2026-11-07T00:00:00.123456+00:00"}';
  const params = [];
  let pages = 0;
  const client = { async query(sql, values) {
    if (sql.includes(" AS read_only")) return { rows: [{ read_only: "on" }] };
    params.push(values);
    assert.match(sql, /COLLATE "C"/);
    assert.match(sql, /to_jsonb\(t\)::text/);
    return { rows: pages++ ? [] : [{ page_key: "synthetic-id", canonical }] };
  } };
  const result = await fingerprint(client, "osservazioni");
  assert.deepEqual(params, [[null], ["synthetic-id"]]);
  assert.equal(result.count, 1);
  assert.equal(result.sha256, createHash("sha256").update(canonical + "\n").digest("hex"));
});
test("fingerprints refuse a read-write transaction before reading rows", async () => {
  let calls = 0;
  await assert.rejects(fingerprint({ async query() {
    calls++; return { rows: [{ read_only: "off" }] };
  } }, "app_users"), /READ_ONLY_REQUIRED/);
  assert.equal(calls, 1);
});
test("reviewed baseline hash remains unchanged", () => {
  const manifest = JSON.parse(read("../manifest.json"));
  assert.equal(createHash("sha256").update(read("../migrations/0001_empty_target_baseline.sql")).digest("hex"),
    manifest.migrations[0].sha256);
});
test("prepared roles remain NOLOGIN; no global provider revokes", () => {
  const roles = read("./roles.sql");
  assert.equal((roles.match(/CREATE ROLE .* NOLOGIN/g) ?? []).length, 3);
  assert.doesNotMatch(roles, /REVOKE CREATE ON SCHEMA|REVOKE.*ON DATABASE|pg_catalog\.lo_/);
});
test("audit column ACL, FORCE RLS and Data API checks are explicit", () => {
  const sql = read("./protections.sql");
  assert.match(sql, /UPDATE \(actor_id, target_id\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /'anon','authenticated','service_role'/);
});
test("no CLI action runs automatically and import commits only after archive success", () => {
  assert.match(read("./apply-target.ts"), /--authorized-create-application-target/);
  const importer = read("./import.ts");
  assert.match(importer, /--authorized-import-frozen-source/);
  assert.match(importer, /--source-writes-confirmed-frozen/);
  assert.ok(importer.indexOf("await Promise.all([age.done, restore.done])") <
    importer.indexOf('await write("COMMIT;'));
  assert.match(importer, /NO FORCE ROW LEVEL SECURITY/);
  assert.match(importer, /FORCE ROW LEVEL SECURITY/);
  assert.match(read("./compare.ts"), /--authorized-compare-real-data/);
});
test("prepared maintenance gate blocks GET/account side effects, preserves health and is inactive by default", () => {
  let next = 0;
  let blocked = 0;
  const response = { setHeader() {}, status(code) {
    assert.equal(code, 503);
    return { json() { blocked++; } };
  } };
  migrationPause(false)({ path: "/api/osservazioni" }, response, () => next++);
  migrationPause(true)({ path: "/api/account" }, response, () => next++);
  migrationPause(true)({ path: "/api/osservazioni" }, response, () => next++);
  migrationPause(true)({ path: "/api/healthz" }, response, () => next++);
  assert.equal(next, 2);
  assert.equal(blocked, 2);
});
