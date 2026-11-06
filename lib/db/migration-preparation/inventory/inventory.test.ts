import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  inventoryConfig, validateTarget, cleanInventoryEnvironment,
  assertCleanEnvironment, safeFailure, redactReport,
  validatePublicCa,
} from "./guard";
import {
  METADATA_QUERIES, readMetadata, readSessionDiagnostic, SESSION_DIAGNOSTIC_QUERY,
  BEGIN_READ_ONLY, READ_ONLY_PROBE, withReadOnlyCatalog, withCatalogConnection,
  type CatalogClient, type CatalogConnection,
} from "./catalog";

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

test("approved direct destination keeps TLS verified without changing the session default", () => {
  const config = inventoryConfig(secret, target);
  assert.equal(config.host, target.host);
  assert.equal(config.database, "postgres");
  assert.equal(config.user, "postgres");
  assert.equal(config.port, 5432);
  assert.equal(config.connectionString, undefined);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, servername: target.host });
  assert.doesNotMatch(config.options!, /default_transaction_read_only=/);
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
test("session diagnosis probes actual read-only before its sole diagnostic SELECT", async () => {
  const calls: string[] = [];
  const client: CatalogClient = { async query(sql) {
    calls.push(sql);
    return { rows: sql === READ_ONLY_PROBE ? [{ transaction_read_only: "on" }] :
      sql === SESSION_DIAGNOSTIC_QUERY ? [{ ...identity, default_transaction_read_only: "off" }] : [] };
  } };
  const session = await readSessionDiagnostic(client);
  assert.equal(session.default_transaction_read_only, "off");
  assert.equal(Object.keys(session).length, 5);
  assert.deepEqual(calls, [BEGIN_READ_ONLY, READ_ONLY_PROBE, SESSION_DIAGNOSTIC_QUERY, "ROLLBACK"]);
});
test("incomplete diagnostic results fail closed and rollback", async () => {
  const calls: string[] = [];
  await assert.rejects(readSessionDiagnostic({ async query(sql) {
    calls.push(sql);
    return { rows: sql === READ_ONLY_PROBE ? [{ transaction_read_only: "on" }] : [] };
  } }), /SESSION_DIAGNOSTIC_INCOMPLETE/);
  assert.equal(calls.at(-1), "ROLLBACK");
});
function mock(options: { badIdentity?: Record<string, unknown>; failAt?: string; overflow?: boolean } = {}) {
  const calls: string[] = [];
  const client: CatalogClient = {
    async query(sql) {
      calls.push(sql);
      if (sql === READ_ONLY_PROBE) return { rows: [{ transaction_read_only: "on" }] };
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
    BEGIN_READ_ONLY, ...Object.values(METADATA_QUERIES).flatMap(sql => [READ_ONLY_PROBE, sql]), "ROLLBACK",
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
  { transaction_read_only: "off" },
]) {
  test(`refuses unexpected server session ${JSON.stringify(badIdentity)}`, async () => {
    const { client, calls } = mock({ badIdentity });
    await assert.rejects(readMetadata(client), /SERVER_IDENTITY_OR_READONLY_MISMATCH/);
    assert.equal(calls.length, 4);
    assert.equal(calls.at(-1), "ROLLBACK");
  });
}
test("permission/compatibility failures abort inventory, rollback, and do not fall back", async () => {
  const { client, calls } = mock({ failAt: METADATA_QUERIES.roles });
  await assert.rejects(readMetadata(client));
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.ok(!calls.includes(METADATA_QUERIES.schemas));
});
test("default read-only OFF is informational, actual transaction ON remains mandatory", async () => {
  const { client, calls } = mock({ badIdentity: { default_transaction_read_only: "off" } });
  const result = await readMetadata(client);
  assert.equal(result.identity[0].default_transaction_read_only, "off");
  assert.equal(result.identity[0].transaction_read_only, "on");
  assert.ok(calls.includes(METADATA_QUERIES.roles));
  assert.ok(!calls.some(sql => /^(?:ALTER|SET)\b/.test(sql)));
});
for (const rows of [
  [], [{ transaction_read_only: "off" }], [{ transaction_read_only: "ON" }],
  [{ transaction_read_only: null }], [{ transaction_read_only: true }], [{}],
  [{ transaction_read_only: "on" }, { transaction_read_only: "on" }],
]) {
  test(`both paths refuse an invalid first read-only probe ${JSON.stringify(rows)}`, async () => {
    for (const read of [readMetadata, readSessionDiagnostic]) {
      const calls: string[] = [];
      await assert.rejects(read({ async query(sql) {
        calls.push(sql); return { rows: sql === READ_ONLY_PROBE ? rows : [] };
      } }), /TRANSACTION_NOT_READ_ONLY/);
      assert.deepEqual(calls, [BEGIN_READ_ONLY, READ_ONLY_PROBE, "ROLLBACK"]);
    }
  });
}
test("read-only loss before a later SELECT stops before that metadata query", async () => {
  const calls: string[] = [];
  let probes = 0;
  await assert.rejects(readMetadata({ async query(sql) {
    calls.push(sql);
    if (sql === READ_ONLY_PROBE) return { rows: [{ transaction_read_only: ++probes === 1 ? "on" : "off" }] };
    if (sql === METADATA_QUERIES.identity) return { rows: [{ ...identity }] };
    return { rows: [] };
  } }), /TRANSACTION_NOT_READ_ONLY/);
  assert.deepEqual(calls, [BEGIN_READ_ONLY, READ_ONLY_PROBE, METADATA_QUERIES.identity, READ_ONLY_PROBE, "ROLLBACK"]);
});
test("diagnostic response itself must confirm read-only ON", async () => {
  await assert.rejects(readSessionDiagnostic({ async query(sql) {
    return { rows: sql === READ_ONLY_PROBE ? [{ transaction_read_only: "on" }] :
      sql === SESSION_DIAGNOSTIC_QUERY ? [{ ...identity, transaction_read_only: "off" }] : [] };
  } }), /TRANSACTION_NOT_READ_ONLY/);
});
for (const sql of [
  "UPDATE public.app_users SET name='synthetic'",
  "SELECT pg_catalog.lo_create(0)", "SELECT pg_catalog.nextval('synthetic')",
  "SELECT pg_catalog.set_config('transaction_read_only','off',false)",
  "SELECT pg_catalog.pg_notify('synthetic','synthetic')",
  "SELECT public.synthetic_function()", "SELECT * FROM pg_catalog.pg_authid",
  METADATA_QUERIES.roles + "; SELECT pg_catalog.lo_create(0)",
]) {
  test(`runtime allowlist rejects nonauthorized SQL ${sql.slice(0, 60)}`, async () => {
    const calls: string[] = [];
    await assert.rejects(withReadOnlyCatalog({ async query(query) {
      calls.push(query); return { rows: [] };
    } }, select => select(sql)), /UNAUTHORIZED_CATALOG_QUERY/);
    assert.deepEqual(calls, [BEGIN_READ_ONLY, "ROLLBACK"]);
  });
}
test("every allowed function is a reviewed pg_catalog metadata reader", () => {
  const safeFunctions = new Set([
    "current_database", "current_setting", "pg_get_userbyid", "has_database_privilege",
    "to_jsonb", "format_type", "pg_get_function_identity_arguments", "aclexplode",
    "acldefault", "unnest", "split_part",
  ]);
  for (const sql of [...Object.values(METADATA_QUERIES), SESSION_DIAGNOSTIC_QUERY, READ_ONLY_PROBE]) {
    for (const [, fn] of sql.matchAll(/\bpg_catalog\.([a-z_]+)\s*\(/g)) {
      assert.ok(safeFunctions.has(fn), `Unreviewed function ${fn}`);
    }
    assert.doesNotMatch(sql, /\b(?:public|auth|storage|extensions)\.[a-z_]+\s*\(/i);
  }
});
test("connection closes after normal rollback and only then returns success", async () => {
  const events: string[] = [];
  const client: CatalogConnection = {
    async connect() { events.push("connect"); },
    async end() { events.push("close"); },
    async query(sql) {
      events.push(sql);
      if (sql === READ_ONLY_PROBE) return { rows: [{ transaction_read_only: "on" }] };
      if (sql === SESSION_DIAGNOSTIC_QUERY) return { rows: [{ ...identity }] };
      return { rows: [] };
    },
  };
  await withCatalogConnection(client, () => { events.push("tls-verified"); }, () => readSessionDiagnostic(client));
  assert.deepEqual(events, ["connect", "tls-verified", BEGIN_READ_ONLY, READ_ONLY_PROBE, SESSION_DIAGNOSTIC_QUERY, "ROLLBACK", "close"]);
});
for (const failure of ["connect", "tls", "begin", "probe", "select", "rollback", "close"]) {
  test(`connection cleanup and failure propagation on ${failure} error`, async () => {
    const events: string[] = [];
    const client: CatalogConnection = {
      async connect() { events.push("connect"); if (failure === "connect") throw new Error("synthetic"); },
      async end() { events.push("close"); if (failure === "close") throw new Error("synthetic"); },
      async query(sql) {
        events.push(sql);
        if ((failure === "begin" && sql === BEGIN_READ_ONLY) ||
            (failure === "probe" && sql === READ_ONLY_PROBE) ||
            (failure === "select" && sql === SESSION_DIAGNOSTIC_QUERY) ||
            (failure === "rollback" && sql === "ROLLBACK")) throw new Error("synthetic");
        if (sql === READ_ONLY_PROBE) return { rows: [{ transaction_read_only: "on" }] };
        if (sql === SESSION_DIAGNOSTIC_QUERY) return { rows: [{ ...identity }] };
        return { rows: [] };
      },
    };
    await assert.rejects(withCatalogConnection(client, () => {
      if (failure === "tls") throw new Error("synthetic");
    }, () => readSessionDiagnostic(client)));
    assert.equal(events.at(-1), "close");
    if (!["connect", "tls"].includes(failure)) assert.ok(events.includes("ROLLBACK"));
    else assert.ok(!events.includes(BEGIN_READ_ONLY));
  });
}
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
