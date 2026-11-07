import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connectionConfig, EXPECTED, verifyPrimaryIdentity } from "./source-guard.mjs";

const hostname = "ep-synthetic-only.eu-west-1.aws.neon.tech";
const url = `postgresql://neondb_owner:synthetic_password@${hostname}/neondb?sslmode=require`;
const good = { ...EXPECTED, recovery: false, tls_active: true, server_version_num: "160015" };

test("explicit host, TLS hostname verification and session read-only are mandatory", () => {
  const config = connectionConfig(url, hostname);
  assert.equal(config.host, hostname);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.servername, hostname);
  assert.match(config.options, /default_transaction_read_only=on/);
  assert.equal(config.enableChannelBinding, true);
});
for (const [name, candidate, approved] of [
  ["missing credential", undefined, hostname],
  ["missing public hostname", url, undefined],
  ["development URL", "postgres://postgres:synthetic@localhost/heliumdb", hostname],
  ["Supabase URL", "postgres://postgres:synthetic@aws-0-eu-west-1.pooler.supabase.com/neondb", hostname],
  ["different endpoint", url, "ep-other.eu-west-1.aws.neon.tech"],
  ["pooler", url.replace("ep-synthetic-only.", "ep-synthetic-only-pooler."), hostname.replace("ep-synthetic-only.", "ep-synthetic-only-pooler.")],
  ["TLS disabled", url.replace("sslmode=require", "sslmode=disable"), hostname],
  ["TLS prefer", url.replace("sslmode=require", "sslmode=prefer"), hostname],
  ["arbitrary options", `${url}&options=-c%20default_transaction_read_only=off`, hostname],
  ["custom TLS file option", `${url}&sslrootcert=unknown`, hostname],
  ["wrong database", url.replace("/neondb?", "/other?"), hostname],
  ["non PostgreSQL protocol", url.replace("postgresql:", "https:"), hostname],
]) {
  test(`rejects ${name} before any connection`, () => {
    assert.throws(() => connectionConfig(candidate, approved));
  });
}

function fakeClient(row = good, readOnly = "on", failIdentity = false) {
  const queries = [];
  return {
    queries,
    async query(query) {
      queries.push(query);
      if (query.includes(" AS read_only")) return { rows: [{ read_only: readOnly }] };
      if (query.includes("AS database")) {
        if (failIdentity) throw new Error("synthetic connection error");
        return { rows: [row] };
      }
      return { rows: [] };
    },
  };
}
test("identity reader opens READ ONLY, probes, reads metadata, then ROLLBACK", async () => {
  const client = fakeClient();
  assert.equal((await verifyPrimaryIdentity(client)).primary, true);
  assert.match(client.queries[0], /REPEATABLE READ READ ONLY/);
  assert.match(client.queries[1], /transaction_read_only/);
  assert.equal(client.queries.at(-1), "ROLLBACK");
  assert.equal(client.queries.length, 4);
  assert.ok(client.queries.every((q) => !/\b(CREATE|ALTER|INSERT|UPDATE|DELETE|COMMIT|GRANT)\b/i.test(q)));
});
for (const [field, value] of [
  ["database", "heliumdb"], ["project", "other"], ["branch", "other"],
  ["role", "unexpected"], ["recovery", true], ["tls_active", false],
  ["server_version_num", "170001"],
]) {
  test(`rejects incompatible ${field} and rolls back`, async () => {
    const client = fakeClient({ ...good, [field]: value });
    await assert.rejects(verifyPrimaryIdentity(client), /IDENTITY_NOT_CONFIRMED/);
    assert.equal(client.queries.at(-1), "ROLLBACK");
  });
}
test("read-only off stops before identity SELECT, then rolls back", async () => {
  const client = fakeClient(good, "off");
  await assert.rejects(verifyPrimaryIdentity(client), /READ_ONLY_REQUIRED/);
  assert.equal(client.queries.length, 3);
  assert.equal(client.queries.at(-1), "ROLLBACK");
});
test("metadata failure still rolls back", async () => {
  const client = fakeClient(good, "on", true);
  await assert.rejects(verifyPrimaryIdentity(client));
  assert.equal(client.queries.at(-1), "ROLLBACK");
});
test("identity-only CLI with no dedicated secret refuses to connect or export", () => {
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL("./verify-source.mjs", import.meta.url)), "--read-only-identity"],
    { env: { PATH: process.env.PATH }, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /SOURCE_IDENTITY_BLOCKED/);
  assert.doesNotMatch(result.stderr, /postgresql:\/\/|password=/);
});
test("backup output is excluded from both Git and deployment", () => {
  const root = fileURLToPath(new URL("../../../../", import.meta.url));
  const ignored = spawnSync("git",
    ["check-ignore", "generated-artifacts/production-backup/example/database.dump.age"],
    { cwd: root, env: { PATH: process.env.PATH }, encoding: "utf8" });
  assert.equal(ignored.status, 0);
  assert.match(readFileSync(new URL("../../../../.replitignore", import.meta.url), "utf8"),
    /^\/generated-artifacts\/$/m);
});
