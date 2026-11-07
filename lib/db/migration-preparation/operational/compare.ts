// Reads real data ONLY after a distinct comparison approval and source freeze.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { targetClient, assertTarget } from "./target";
// @ts-ignore Standalone JS module.
import { TABLES, fingerprint } from "./data.mjs";
// @ts-ignore Standalone pure source guard.
import { connectionConfig, verifyPrimaryIdentity } from "../backup/source-guard.mjs";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { Client } = require("pg");
let source: any;
let target: ReturnType<typeof targetClient> | undefined;
try {
  if (process.argv.length !== 4 ||
      process.argv[2] !== "--authorized-compare-real-data" ||
      process.argv[3] !== "--source-writes-confirmed-frozen") {
    throw new Error("SPECIFIC_COMPARISON_AND_FREEZE_APPROVAL_REQUIRED");
  }
  const raw = process.env.REPLIT_PROD_BACKUP_URL!;
  source = new Client(connectionConfig(raw, new URL(raw).hostname));
  target = targetClient();
  await source.connect();
  await verifyPrimaryIdentity(source);
  await target.connect();
  for (const client of [source, target]) {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL DateStyle = 'ISO, YMD'");
  }
  await assertTarget(target);
  const tables: Record<string, unknown> = {};
  for (const table of Object.keys(TABLES)) {
    const before = await fingerprint(source, table);
    const after = await fingerprint(target, table);
    tables[table] = { source: before, target: after,
      equal: before.count === after.count && before.sha256 === after.sha256 };
    if (before.count !== after.count || before.sha256 !== after.sha256) {
      throw new Error("DATA_MISMATCH_NO_CUTOVER");
    }
  }
  const checks = readFileSync(new URL("./integrity.sql", import.meta.url), "utf8");
  for (const client of [source, target]) {
    const probe = await client.query("SELECT current_setting('transaction_read_only') AS read_only");
    if (probe.rows[0]?.read_only !== "on") throw new Error("READ_ONLY_REQUIRED");
    const check = (await client.query(checks)).rows[0];
    if (!check || Number(check.orphan_observations) !== 0 ||
        Number(check.orphan_privacy_requests) !== 0 ||
        Number(check.duplicate_display_ids) !== 0 || !check.original_admin_mapping_valid ||
        Number(check.null_owners_review) !== 0) {
      throw new Error("INTEGRITY_REVIEW_REQUIRED_NO_CUTOVER");
    }
  }
  for (const client of [source, target]) await client.query("ROLLBACK");
  console.log(JSON.stringify({ status: "ALL_60_COLUMNS_MATCH_NO_CUTOVER", tables }));
} catch {
  console.error("COMPARISON_BLOCKED_OR_MISMATCH; source retained; do not cut over.");
  process.exitCode = 1;
} finally {
  for (const client of [source, target]) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* close rolls back */ }
      await client.end();
    }
  }
}
