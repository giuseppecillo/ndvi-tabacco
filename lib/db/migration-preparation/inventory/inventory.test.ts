import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  inventoryConfig, validateTarget, cleanInventoryEnvironment,
  assertCleanEnvironment, safeFailure, redactReport,
  validatePublicCa,
} from "./guard";
import { METADATA_QUERIES, readMetadata, type CatalogClient } from "./catalog";

// Entirely synthetic inputs. Never import pg at runtime or open a socket.
const ref = "abcdefghijklmnopqrst";
const target = { projectRef: ref, host: `db.${ref}.supabase.co` };
const secret = `postgresql://postgres:synthetic-secret-long@${target.host}:5432/postgres`;
const clean = () => cleanInventoryEnvironment(secret, target);
const publicCa = readFileSync("lib/db/migration-preparation/inventory/fixtures/supabase-root-2021.pem", "utf8");

test("approved public CA is scoped to this pg connection, not global trust", () => {
  assert.equal(validatePublicCa(publicCa), publicCa);
  const config = inventoryConfig(secret, target, publicCa);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, servername: target.host, ca: publicCa });
  const env = cleanInventoryEnvironment(secret, target, publicCa);
  assert.equal(Object.keys(env).length, 5);
  assert.doesNotThrow(() => assertCleanEnvironment(env));
  assert.equal(env.NODE_EXTRA_CA_CERTS, undefined);
  assert.equal(env.SSL_CERT_FILE, undefined);
});
test("invalid, additional, altered and private certificates rejected before connecting", () => {
  for (const invalid of ["not a certificate", publicCa + publicCa,
    publicCa + "\n-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----",
    publicCa.replace("MIIDxD", "AAAAAA")]) {
    assert.throws(() => inventoryConfig(secret, target, invalid));
  }
});

test("approved direct destination is explicit with verified TLS and readonly options", () => {
  const config = inventoryConfig(secret, target);
  assert.equal(config.host, target.host);
  assert.equal(config.database, "postgres");
  assert.equal(config.user, "postgres");
  assert.equal(config.port, 5432);
  assert.equal(config.connectionString, undefined);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, servername: target.host });
  assert.match(config.options!, /default_transaction_read_only=on/);
  assert.match(config.options!, /search_path=pg_catalog/);
});
test("session pooler requires approved exact host AND project-specific username", () => {
  const pooler = { ...target, host: "aws-1-eu-west-1.pooler.supabase.com" };
  const url = `postgresql://postgres.${ref}:synthetic-password@${pooler.host}:5432/postgres`;
  assert.equal(inventoryConfig(url, pooler).user, `postgres.${ref}`);
  assert.throws(() => inventoryConfig(url.replace(ref, "wrongprojectaaaaaaaa"), pooler));
  assert.throws(() => inventoryConfig(url.replace(":5432", ":6543"), pooler));
  assert.throws(() => inventoryConfig(url, { ...pooler, host: "aws-0-eu-west-1.pooler.supabase.com" }));
});
for (const host of [
  "localhost", "127.0.0.1", "[::1]", "/tmp", "database",
  "ep-example.eu-central-1.aws.neon.tech", "example.replit.app",
  "example.replit.dev", "example.supabase.co.attacker.invalid",
  "supabase.co", "db.aaaaaaaaaaaaaaaaaaaa.supabase.co",
  `db.${ref}.supabase.co.evil.invalid`,
]) {
  test(`blocks nonapproved host ${host} before any client exists`, () => {
    assert.throws(() => inventoryConfig(secret.replace(target.host, host), target));
    assert.throws(() => validateTarget({ projectRef: ref, host }));
  });
}
test("rejects empty, invalid, other-project and implicit destination inputs", () => {
  for (const invalid of ["", "postgresql://postgres@/postgres", "not-a-url",
    secret.replace("postgresql:", "http:"), secret.replace("/postgres", "/otherdb"),
    secret.replace("postgres:", "app_migrator:"), secret.replace("synthetic-secret-long", ""),
    secret.replace(":5432", ":5433"), secret.replace("postgres:", "postgres.wrongprojectaaaaaa:")]) {
    assert.throws(() => inventoryConfig(invalid, target));
  }
  assert.throws(() => inventoryConfig(secret, { ...target, projectRef: "" }));
});
for (const suffix of [
  "?host=localhost", "?options=-c%20default_transaction_read_only%3Doff",
  "?sslmode=require", "?sslmode=disable", "?sslmode=no-verify", "?ssl=false",
  "?sslrootcert=/etc/passwd", "?application_name=forbidden",
  "?sslmode=verify-full&sslmode=verify-full", "#fragment",
]) {
  test(`rejects URL override ${suffix}`, () => {
    assert.throws(() => inventoryConfig(secret + suffix, target));
  });
}
test("verify-full option accepted but never passed through pg URI parsing", () => {
  assert.deepEqual(inventoryConfig(secret + "?sslmode=verify-full", target), inventoryConfig(secret, target));
});
test("child environment is a fixed allowlist, not a copy of the application environment", () => {
  const env = clean();
  assert.equal(Object.keys(env).length, 4);
  assert.doesNotThrow(() => assertCleanEnvironment(env));
  assert.equal(env.DATABASE_URL, undefined);
});
for (const key of [
  "DATABASE_URL", "PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD",
  "PGSERVICE", "PGPASSFILE", "PGOPTIONS", "PGSSLMODE", "NODE_OPTIONS",
  "CLERK_SECRET_KEY", "NITROCROP_ADMIN_PASSWORD", "PATH", "HOME",
]) {
  test(`worker refuses inherited ${key}`, () => {
    assert.throws(() => assertCleanEnvironment({ ...clean(), [key]: "synthetic-only" }));
  });
}
test("phase marker, project reference and secret are mandatory", () => {
  assert.throws(() => assertCleanEnvironment({ ...clean(), NITROCROP_METADATA_ONLY: "no" }));
  assert.throws(() => cleanInventoryEnvironment("", target));
  assert.throws(() => cleanInventoryEnvironment(secret, { ...target, projectRef: "wrong" }));
});
test("driver exceptions never expose secret messages or stacks", () => {
  const failure = safeFailure(new Error(`Failed at ${secret}`));
  assert.deepEqual(failure, { status: "blocked", reason: "CONNECTION_OR_QUERY_FAILED" });
  assert.ok(!JSON.stringify(failure).includes("synthetic-secret-long"));
});
test("only known driver codes are translated, never arbitrary remote strings", () => {
  assert.equal(safeFailure({ code: "28P01", message: secret }).reason, "AUTHENTICATION_FAILED");
  assert.equal(safeFailure({ code: "SELF_SIGNED_CERT_IN_CHAIN", message: secret }).reason, "TLS_TRUST_FAILED");
  assert.equal(safeFailure({ code: "08P01", message: secret }).reason, "PROTOCOL_OR_STARTUP_OPTIONS_REJECTED");
  assert.equal(safeFailure({ code: secret, message: secret }).reason, "CONNECTION_OR_QUERY_FAILED");
  assert.equal(safeFailure({ code: "toString" }).reason, "CONNECTION_OR_QUERY_FAILED");
});
test("report redaction happens before JSON escaping and handles encoded passwords", () => {
  const password = 'synthetic-password-"\\-end';
  const encoded = encodeURIComponent(password);
  const url = secret.replace("synthetic-secret-long", encoded);
  const output = redactReport({ nested: [url, password, encoded] }, url);
  assert.deepEqual(JSON.parse(output), { nested: ["[REDACTED]", "[REDACTED]", "[REDACTED]"] });
});

const identity = {
  database: "postgres", current_user: "postgres", session_user: "postgres",
  transaction_read_only: "on", default_transaction_read_only: "on",
};
function mock(options: { badIdentity?: Record<string, unknown>; failAt?: string; overflow?: boolean } = {}) {
  const calls: string[] = [];
  const client: CatalogClient = {
    async query(sql) {
      calls.push(sql);
      if (sql === METADATA_QUERIES.identity) return { rows: [{ ...identity, ...options.badIdentity }] };
      if (sql === options.failAt) throw new Error("synthetic query failure only");
      if (options.overflow && sql === METADATA_QUERIES.roles) return { rows: Array(5001).fill({ role: "synthetic" }) };
      return { rows: [] };
    },
  };
  return { client, calls };
}
test("only fixed catalog SELECTs execute inside read-only transaction ending in ROLLBACK", async () => {
  const { client, calls } = mock();
  const result = await readMetadata(client);
  assert.deepEqual(calls, [
    "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", ...Object.values(METADATA_QUERIES), "ROLLBACK",
  ]);
  assert.equal(Object.keys(result).length, 16);
  for (const sql of Object.values(METADATA_QUERIES)) {
    assert.match(sql, /^SELECT /);
    assert.doesNotMatch(sql, /;|pg_read_file|pg_ls_dir|pg_get_functiondef|pg_authid|rolpassword|prosrc|pg_get_expr|SELECT\s+\*/i);
    assert.doesNotMatch(sql, /\b(?:FROM|JOIN)\s+(?:public|auth|storage)\./i);
  }
});
for (const badIdentity of [
  { database: "other" }, { current_user: "app_migrator" }, { session_user: "app_migrator" },
  { transaction_read_only: "off" }, { default_transaction_read_only: "off" },
]) {
  test(`refuses unexpected server session ${JSON.stringify(badIdentity)}`, async () => {
    const { client, calls } = mock({ badIdentity });
    await assert.rejects(readMetadata(client), /SERVER_IDENTITY_OR_READONLY_MISMATCH/);
    assert.equal(calls.length, 3);
    assert.equal(calls.at(-1), "ROLLBACK");
  });
}
test("permission/compatibility failures abort inventory, rollback, and do not fall back", async () => {
  const { client, calls } = mock({ failAt: METADATA_QUERIES.roles });
  await assert.rejects(readMetadata(client));
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.ok(!calls.includes(METADATA_QUERIES.schemas));
});
test("metadata limit produces a failure instead of a silent partial inventory", async () => {
  const { client, calls } = mock({ overflow: true });
  await assert.rejects(readMetadata(client), /METADATA_LIMIT_EXCEEDED/);
  assert.equal(calls.at(-1), "ROLLBACK");
});
test("manual entrypoint is disconnected from application/production modules", () => {
  const source = readFileSync("lib/db/migration-preparation/inventory/run.ts", "utf8");
  assert.doesNotMatch(source, /@workspace\/db|api-server|initializeSecurity|process\.env\.DATABASE_URL|\.\.\.process\.env/);
  assert.match(source, /env, encoding: "utf8"/);
  assert.match(source, /stream\.authorized/);
  assert.ok(source.indexOf("const config = inventoryConfig") < source.indexOf('await import("pg")'));
});
