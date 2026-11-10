import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Socket } from "node:net";
import { TLSSocket, type DetailedPeerCertificate } from "node:tls";
import type { PoolClient } from "pg";
import {
  aggregateComparison, canonical, ComparisonError, createFingerprinter, readSnapshot, TABLES,
} from "./connection-comparison";
import { runProductionConnectionComparison, type ApprovedIdentity } from "./production-connection-comparison";

type Data = Record<string, Record<string, unknown>[]>;
const sourceIdentity: ApprovedIdentity = { host: "source.invalid", port: 5432,
  connectionUser: "legacy_runtime", database: "legacy", role: "legacy_runtime", sessionRole: "legacy_runtime" };
const targetIdentity: ApprovedIdentity = { host: "aws-0-eu-west-1.pooler.supabase.com", port: 5432,
  connectionUser: "app_runtime.bhnaarbzpmcniesxyldx", database: "postgres",
  role: "app_runtime", sessionRole: "app_runtime" };
const environment = { NODE_ENV: "production", REPLIT_DEPLOYMENT: "1",
  NITROCROP_DB_BACKEND: "supabase", NITROCROP_CONNECTION_COMPARISON: "approved-once" };
const approval = () => ({ reference: "synthetic-approval",
  expiresAt: new Date(Date.now() + 60_000).toISOString(), source: sourceIdentity, target: targetIdentity });

// Fake transport only in tests. No network or application pool is ever imported.
class FakeTLS extends TLSSocket {
  constructor(private host: string) { super(new Socket()); this.authorized = true; }
  override getProtocol() { return "TLSv1.3"; }
  override getPeerCertificate() {
    return { subjectaltname: `DNS:${this.host}`, raw: Buffer.from("synthetic") } as DetailedPeerCertificate;
  }
}
function fixture(data: Data, identity = sourceIdentity) {
  let table = "", offset = 0, released = false, readonly = true, failRollback = false;
  const calls: string[] = [];
  const stream = new FakeTLS(identity.host);
  const client = {
    connection: { stream },
    connectionParameters: { host: identity.host, port: identity.port, user: identity.connectionUser, database: identity.database },
    release(_destroy?: boolean) { released = true; stream.destroy(); },
    async query(sql: string, values?: string[]) {
      calls.push(sql);
      if (sql === "ROLLBACK" && failRollback) throw new Error("secret-driver-url-and-private-data");
      if (sql.startsWith("SELECT pg_catalog.current_database()")) return { rows: [{
        database: identity.database, role: identity.role, session_role: identity.sessionRole,
        replica: false, readonly: readonly ? "on" : "off", rolsuper: false, rolcreaterole: false,
        rolcreatedb: false, rolbypassrls: false,
      }] };
      if (sql.includes("FROM pg_catalog.pg_class c")) {
        table = `${values![0]}.${values![1]}`;
        const manifest = TABLES.find(t => `${t.schema}.${t.name}` === table)!;
        return { rows: Object.hasOwn(data, table) ? [{
          kind: "r", rls: true, forced_rls: true, readable: true,
          columns: [...new Set([...manifest.keys, ...manifest.owners])].map(k => [k, "text", true]),
          constraints: ["PRIMARY KEY"],
        }] : [] };
      }
      if (sql.startsWith("DECLARE")) { offset = 0; return { rows: [] }; }
      if (sql.startsWith("FETCH")) {
        const rows = data[table].slice(offset, offset + 100).map(row => ({ payload: canonical(row) }));
        offset += rows.length;
        return { rows };
      }
      return { rows: [] };
    },
  };
  return { client: client as unknown as PoolClient, calls,
    pool: { async connect() { return client as unknown as PoolClient; } },
    released: () => released, readonly: (value: boolean) => { readonly = value; },
    failRollback: () => { failRollback = true; } };
}
const budget = () => ({ rows: 0, bytes: 0, deadline: Date.now() + 60_000 });

test("equal counts cannot hide changed rows or account ownership differences; report has no PII", async () => {
  const fingerprint = createFingerprinter();
  const a = fixture({
    "public.app_users": [{ id: "account-private", email: "private@example.invalid", clerk_user_id: "clerk-private" }],
    "public.osservazioni": [{ owner_id: "account-private", observation_id: "point-private", media: 0.5, created_at: "2026-10-01T12:00:00Z" }],
  });
  const b = fixture({
    "public.app_users": [{ id: "account-private", email: "changed@example.invalid", clerk_user_id: "clerk-private" }],
    "public.osservazioni": [{ owner_id: "orphan-private", observation_id: "point-private", media: 0.5, created_at: "2026-10-01T12:00:00Z" }],
  });
  const report = aggregateComparison(await readSnapshot(a.client, fingerprint, budget()),
    await readSnapshot(b.client, fingerprint, budget()));
  assert.deepEqual(report[0].differences, { onlySource: 0, onlyTarget: 0, changed: 1 });
  assert.deepEqual(report[2].differences, { onlySource: 1, onlyTarget: 1, changed: 0 });
  assert.equal(report[2].target?.unmatchedOwnerReferences, 1);
  assert.equal(report[2].source?.firstCreatedAt, "2026-10-01T12:00:00.000Z");
  assert.equal(report[5].differences, null); // Missing is not empty/equal.
  assert.doesNotMatch(JSON.stringify(report), /private|example|clerk|point-/);
  a.client.release(); b.client.release();
});

test("changes to old records are compared, not filtered by created_at", async () => {
  const fingerprint = createFingerprinter();
  const row = { owner_id: "a", observation_id: "p", created_at: "2020-01-01T00:00:00Z", dose: 1 };
  const a = fixture({ "public.osservazioni": [row] });
  const b = fixture({ "public.osservazioni": [{ ...row, dose: 2 }] });
  const report = aggregateComparison(await readSnapshot(a.client, fingerprint, budget()),
    await readSnapshot(b.client, fingerprint, budget()));
  assert.equal(report[2].differences?.changed, 1);
  assert.equal(report[2].source?.unmatchedOwnerReferences, null);
  a.client.release(); b.client.release();
});

test("row limits fail rather than return a successful partial comparison", async () => {
  const a = fixture({ "public.app_users": Array.from({ length: 5_001 }, (_, id) => ({ id: String(id) })) });
  await assert.rejects(readSnapshot(a.client, createFingerprinter(), budget()), { code: "LIMIT_EXCEEDED" });
  assert.equal(a.calls.at(-1), "CLOSE comparison_rows");
  a.client.release();
});

test("duplicate keys, byte budget and expired deadline are rejected", async () => {
  const a = fixture({ "public.app_users": [{ id: "duplicate" }, { id: "duplicate" }] });
  await assert.rejects(readSnapshot(a.client, createFingerprinter(), budget()), { code: "UNEXPECTED_SHAPE" });
  await assert.rejects(readSnapshot(a.client, createFingerprinter(), { ...budget(), bytes: 33 * 1024 * 1024 }),
    { code: "LIMIT_EXCEEDED" });
  await assert.rejects(readSnapshot(a.client, createFingerprinter(), { ...budget(), deadline: 0 }),
    { code: "LIMIT_EXCEEDED" });
  a.client.release();
});

test("Production approval gates prevent any connection in development or with expired consent", async () => {
  let connections = 0;
  const pool = { async connect(): Promise<PoolClient> { connections++; throw Error("must not connect"); } };
  for (const [env, consent] of [
    [{ ...environment, NODE_ENV: "development" }, approval()],
    [environment, { ...approval(), expiresAt: "2020-01-01T00:00:00Z" }],
    [{ ...environment, NITROCROP_CONNECTION_COMPARISON: "0" }, approval()],
    [environment, { ...approval(), target: { ...targetIdentity, role: "postgres" } }],
  ] as const) {
    await assert.rejects(runProductionConnectionComparison(env, consent, pool, pool),
      { code: "PRODUCTION_APPROVAL_REQUIRED" });
  }
  assert.equal(connections, 0);
});

test("mock Production run uses READ ONLY, ROLLBACK and releases both clients; no write SQL", async () => {
  const a = fixture({ "public.app_users": [{ id: "a" }] });
  const b = fixture({ "public.app_users": [{ id: "a" }] }, targetIdentity);
  const result = await runProductionConnectionComparison(environment, approval(), a.pool, b.pool);
  assert.equal((result as { status: string }).status, "compared_visible_rows");
  for (const f of [a, b]) {
    assert.ok(f.calls.includes("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"));
    assert.equal(f.calls.at(-1), "ROLLBACK");
    assert.ok(f.released());
    assert.ok(f.calls.every(sql => /^(SELECT|BEGIN|SET LOCAL|DECLARE|FETCH|CLOSE|ROLLBACK)\b/.test(sql)));
    assert.doesNotMatch(f.calls.join("\n"), /\b(COMMIT|INSERT|DELETE|UPDATE|GRANT|CREATE|ALTER|SET ROLE)\b/);
  }
});

test("TLS/role/read-only failures are closed; raw driver errors are redacted and cleanup releases", async () => {
  const a = fixture({}, { ...sourceIdentity, host: "unapproved.invalid" });
  const b = fixture({}, targetIdentity);
  await assert.rejects(runProductionConnectionComparison(environment, approval(), a.pool, b.pool),
    { code: "TLS_REJECTED" });
  assert.ok(a.released());
  assert.equal(a.calls.length, 0);
  assert.equal(b.calls.length, 0);
  const c = fixture({});
  c.readonly(false);
  await assert.rejects(runProductionConnectionComparison(environment, approval(), c.pool, b.pool),
    { code: "READONLY_REQUIRED" });
  assert.ok(c.released());
  const d = fixture({});
  d.failRollback();
  await assert.rejects(runProductionConnectionComparison(environment, approval(), d.pool, b.pool),
    error => error instanceof ComparisonError && error.code === "CLEANUP_FAILED"
      && !JSON.stringify(error).includes("secret-driver"));
  assert.ok(d.released());
  b.client.release();
});

test("no application entry point imports the diagnostic; no pool constructors, secrets or output in it", () => {
  for (const name of ["index.ts", "app.ts", "routes/index.ts"]) {
    assert.doesNotMatch(readFileSync(resolve("src", name), "utf8"), /diagnostics|runProductionConnectionComparison/);
  }
  for (const name of ["connection-comparison.ts", "production-connection-comparison.ts"]) {
    const text = readFileSync(resolve("src/diagnostics", name), "utf8");
    assert.doesNotMatch(text, /process\.env|process\.argv|new Pool|new Client|console\.|writeFile|@workspace\/db|from.*lib\/db/);
  }
});
