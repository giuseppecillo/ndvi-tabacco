// INACTIVE unless the owner separately approves exactly this target-writing action.
import { readFileSync } from "node:fs";
import { targetClient, assertTarget } from "./target";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
let client: ReturnType<typeof targetClient> | undefined;
let transaction = false;
let stage = "approval";
try {
  if (process.argv.length !== 3 || process.argv[2] !== "--authorized-create-application-target") {
    throw new Error("EXPLICIT_TARGET_WRITE_APPROVAL_REQUIRED");
  }
  stage = "connection";
  client = targetClient();
  // Never let an idle connection error print its raw diagnostic/credentials.
  client.on("error", () => {});
  await client.connect();
  await client.query("BEGIN");
  transaction = true;
  stage = "identity";
  await assertTarget(client);
  // Never rerun over existing objects or use IF NOT EXISTS to mask differences.
  stage = "existing_roles_guard";
  await client.query(`DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('app_migrator','app_runtime','app_readonly')) THEN
      RAISE EXCEPTION 'Application roles already exist';
    END IF;
  END $$`);
  stage = "roles_and_default_privileges";
  await client.query(read("./roles.sql"));
  await client.query("SET LOCAL ROLE app_migrator");
  // Reuse the already-reconciled 60-column baseline, not a second schema copy.
  stage = "baseline";
  const baseline = read("../migrations/0001_empty_target_baseline.sql");
  if ((baseline.match(/^BEGIN;$/gm) ?? []).length !== 1 ||
      (baseline.match(/^COMMIT;$/gm) ?? []).length !== 1) {
    throw new Error("BASELINE_TRANSACTION_LAYOUT_CHANGED");
  }
  await client.query(baseline.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
  stage = "rls_and_acl";
  await client.query(read("./protections.sql"));
  stage = "commit";
  await client.query("COMMIT");
  transaction = false;
  console.log("TARGET_APPLICATION_SCHEMA_PREPARED; roles remain NOLOGIN; no data imported.");
} catch (error) {
  const code = (error as { code?: unknown })?.code;
  let rollbackConfirmed = false;
  if (client && transaction) {
    try {
      await client.query("ROLLBACK");
      rollbackConfirmed = true;
    } catch { /* do not claim a confirmed rollback after a disconnect */ }
  }
  console.error(JSON.stringify({
    status: "TARGET_PREPARATION_BLOCKED",
    stage,
    sqlstate: typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : null,
    rollbackConfirmed,
    commitOutcome: stage === "commit" ? "requires_readonly_confirmation" : "not_sent",
    automaticRetry: false,
  }));
  process.exitCode = 1;
} finally {
  if (client) {
    try { await client.end(); } catch {
      console.error("TARGET_CONNECTION_CLOSE_FAILED; inspect only sanitized diagnostics.");
      process.exitCode = 1;
    }
  }
}
