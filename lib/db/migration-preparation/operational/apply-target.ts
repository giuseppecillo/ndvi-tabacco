// INACTIVE unless the owner separately approves exactly this target-writing action.
import { readFileSync } from "node:fs";
import { targetClient, assertTarget } from "./target";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
let client: ReturnType<typeof targetClient> | undefined;
let transaction = false;
try {
  if (process.argv.length !== 3 || process.argv[2] !== "--authorized-create-application-target") {
    throw new Error("EXPLICIT_TARGET_WRITE_APPROVAL_REQUIRED");
  }
  client = targetClient();
  await client.connect();
  await client.query("BEGIN");
  transaction = true;
  await assertTarget(client);
  // Never rerun over existing objects or use IF NOT EXISTS to mask differences.
  await client.query(`DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('app_migrator','app_runtime','app_readonly')) THEN
      RAISE EXCEPTION 'Application roles already exist';
    END IF;
  END $$`);
  await client.query(read("./roles.sql"));
  await client.query("SET LOCAL ROLE app_migrator");
  // Reuse the already-reconciled 60-column baseline, not a second schema copy.
  const baseline = read("../migrations/0001_empty_target_baseline.sql");
  if ((baseline.match(/^BEGIN;$/gm) ?? []).length !== 1 ||
      (baseline.match(/^COMMIT;$/gm) ?? []).length !== 1) {
    throw new Error("BASELINE_TRANSACTION_LAYOUT_CHANGED");
  }
  await client.query(baseline.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""));
  await client.query(read("./protections.sql"));
  await client.query("COMMIT");
  transaction = false;
  console.log("TARGET_APPLICATION_SCHEMA_PREPARED; roles remain NOLOGIN; no data imported.");
} catch {
  if (client && transaction) {
    try { await client.query("ROLLBACK"); } catch { /* connection close rolls back */ }
  }
  console.error("TARGET_PREPARATION_BLOCKED; no automatic retry; inspect only sanitized diagnostics.");
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
