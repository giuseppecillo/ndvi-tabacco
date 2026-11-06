import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { prepareConnection, assertOrdinaryRole, type RoleInspection, type DatabasePurpose } from "./connection";
import { inspectPreparedStartup, type ReadonlyQueryClient } from "./startup";

// All connection strings and role inspections in this suite are synthetic.
// No pg import, pool, database credentials or database connection is used.
const input = {
  url: "postgresql://app_runtime:synthetic-only@approved.invalid:5432/postgres",
  expectedHost: "approved.invalid",
  purpose: "runtime" as const,
};
const safeRole: RoleInspection = {
  currentUser: "app_runtime", sessionUser: "app_runtime",
  superuser: false, createRole: false, createDatabase: false, replication: false,
  bypassRls: false, ownsApplicationObjects: false,
  canCreateInApplicationSchema: false, canCreateSchema: false,
  canAssumePrivilegedRole: false, hasWritePrivileges: true,
  hasSequenceMutationPrivileges: false, hasUnsafeFunctionAccess: false,
};

test("prepares certificate-verified pg settings without opening a connection", () => {
  const config = prepareConnection(input);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.max, 3);
});
test("accepts the Supabase pooler username format", () => {
  assert.equal(prepareConnection({
    ...input, url: input.url.replace("app_runtime:", "app_runtime.project123:"),
  }).max, 3);
});
test("strips sslmode to prevent pg overriding explicit certificate settings", () => {
  const config = prepareConnection({ ...input, url: `${input.url}?sslmode=verify-full` });
  assert.equal(new URL(config.connectionString!).search, "");
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});
for (const role of ["postgres", "supabase_admin", "service_role", "app_migrator", "app_readonly", "app_runtime_extra"]) {
  test(`ordinary runtime rejects role ${role}`, () => {
    assert.throws(() => prepareConnection({ ...input, url: input.url.replace("app_runtime:", `${role}:`) }));
  });
}
for (const suffix of ["?sslmode=disable", "?sslmode=no-verify", "?ssl=false", "?options=-c%20role%3Dpostgres", "#fragment"]) {
  test(`rejects unsafe connection override ${suffix}`, () => {
    assert.throws(() => prepareConnection({ ...input, url: input.url + suffix }));
  });
}
test("rejects wrong host, protocol, missing password and unsupported purpose", () => {
  assert.throws(() => prepareConnection({ ...input, expectedHost: "other.invalid" }));
  assert.throws(() => prepareConnection({ ...input, url: input.url.replace("postgresql:", "http:") }));
  assert.throws(() => prepareConnection({ ...input, url: input.url.replace(":synthetic-only", "") }));
  assert.throws(() => prepareConnection({ ...input, purpose: "invalid" as DatabasePurpose }));
  assert.throws(() => prepareConnection({ ...input, purpose: "toString" as DatabasePurpose }));
});
test("migration configuration is distinct and requires explicit approval", () => {
  const migration = { ...input, purpose: "migration" as const, url: input.url.replace("app_runtime:", "app_migrator:") };
  assert.throws(() => prepareConnection(migration));
  assert.equal(prepareConnection({ ...migration, migrationApproved: true }).max, 1);
});
test("readonly adds defense-in-depth transaction default", () => {
  const readonly = prepareConnection({
    ...input, purpose: "readonly", url: input.url.replace("app_runtime:", "app_readonly:"),
  });
  assert.equal(readonly.options, "-c default_transaction_read_only=on");
});
test("safe runtime role passes without any database call", () => {
  assert.doesNotThrow(() => assertOrdinaryRole("runtime", safeRole));
});
for (const key of [
  "superuser", "createRole", "createDatabase", "replication", "bypassRls",
  "ownsApplicationObjects", "canCreateInApplicationSchema", "canCreateSchema",
  "canAssumePrivilegedRole", "hasUnsafeFunctionAccess",
] as const) {
  test(`rejects effective privilege ${key}`, () => {
    assert.throws(() => assertOrdinaryRole("runtime", { ...safeRole, [key]: true }));
  });
}
test("rejects SET ROLE identity mismatch and incomplete inspections", () => {
  assert.throws(() => assertOrdinaryRole("runtime", { ...safeRole, sessionUser: "postgres" }));
  const incomplete = { ...safeRole } as Partial<RoleInspection>;
  delete incomplete.bypassRls;
  assert.throws(() => assertOrdinaryRole("runtime", incomplete as RoleInspection));
});
test("readonly rejects both write and sequence mutation privileges", () => {
  const readonly = { ...safeRole, currentUser: "app_readonly", sessionUser: "app_readonly", hasWritePrivileges: false };
  assert.doesNotThrow(() => assertOrdinaryRole("readonly", readonly));
  assert.throws(() => assertOrdinaryRole("readonly", { ...readonly, hasWritePrivileges: true }));
  assert.throws(() => assertOrdinaryRole("readonly", { ...readonly, hasSequenceMutationPrivileges: true }));
});
function mockStartup(missingTable = false, missingAdmin = false) {
  const calls: string[] = [];
  const client: ReadonlyQueryClient = {
    async query(sql, params) {
      calls.push(sql);
      assert.match(sql, /^SELECT /);
      if (sql.includes("information_schema")) {
        assert.equal(params?.length, 1);
        const tables = params![0] as string[];
        return { rows: (missingTable ? tables.slice(1) : tables).map(table_name => ({ table_name })) };
      }
      return { rows: missingAdmin ? [] : [{ id: "synthetic-admin" }] };
    },
  };
  return { client, calls };
}
test("future startup checks only SELECT with an injected mock", async () => {
  const { client, calls } = mockStartup();
  await inspectPreparedStartup(client);
  assert.equal(calls.length, 2);
});
test("future startup fails explicitly without schema or existing administrator", async () => {
  await assert.rejects(inspectPreparedStartup(mockStartup(true).client));
  await assert.rejects(inspectPreparedStartup(mockStartup(false, true).client));
});
test("versioned SQL manifest matches immutable draft files", () => {
  const root = process.cwd();
  const folder = resolve(root, "lib/db/migration-preparation");
  const manifest = JSON.parse(readFileSync(resolve(folder, "manifest.json"), "utf8"));
  assert.equal(manifest.automaticExecution, false);
  assert.equal(manifest.status, "inactive-draft");
  assert.deepEqual(manifest.migrations.map((m: { version: string }) => m.version), ["0001", "0002"]);
  for (const entry of manifest.migrations) {
    assert.match(entry.file, /^\d{4}_[a-z_]+\.sql$/);
    const sql = readFileSync(resolve(folder, "migrations", entry.file));
    assert.equal(createHash("sha256").update(sql).digest("hex"), entry.sha256);
  }
});
test("all active startup, auth, pg, Drizzle and reconciliation paths match reference commit", () => {
  const paths = [
    "scripts/post-merge.sh", "lib/db/package.json", "lib/db/drizzle.config.ts",
    "lib/db/src/index.ts", "lib/db/src/schema/security.ts", "lib/db/src/schema/osservazioni.ts",
    "artifacts/api-server/src/index.ts", "artifacts/api-server/src/lib/security-db.ts",
    "artifacts/api-server/src/lib/db.ts", "artifacts/api-server/src/app.ts",
    "artifacts/api-server/src/middlewares/access.ts",
    "artifacts/ndvi-tabacco/src/security/SecurityRoot.tsx", ".replit",
  ];
  for (const path of paths) {
    const original = execFileSync("git", ["show", `baa1953:${path}`]);
    assert.deepEqual(readFileSync(resolve(process.cwd(), path)), original, path);
  }
});
