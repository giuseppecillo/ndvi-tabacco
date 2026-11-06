/**
 * MANUAL PHASE-1 ENTRYPOINT. Never run from app/workflow/build/post-merge.
 * Bundle with esbuild and run with --project-ref REF --host HOST --metadata-only.
 * The CLI accepts ONLY nonsecret target identifiers; the DSN stays in Secrets.
 */
import { spawnSync } from "node:child_process";
import type { TLSSocket } from "node:tls";
import {
  assertCleanEnvironment, cleanInventoryEnvironment, inventoryConfig,
  DRIVER_FAILURES, InventoryBlocked, redactReport, safeFailure, type ApprovedTarget,
} from "./guard";
import { readMetadata } from "./catalog";

async function worker() {
  assertCleanEnvironment(process.env);
  const target: ApprovedTarget = {
    projectRef: process.env.SUPABASE_QA_PROJECT_REF ?? "",
    host: process.env.SUPABASE_QA_EXPECTED_HOST ?? "",
  };
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  const config = inventoryConfig(secret, target);
  // Load the driver only AFTER clean-env/target validation in the child.
  const { Client } = await import("pg");
  const client = new Client(config);
  try {
    await client.connect();
    const stream = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
    if (!stream.encrypted || !stream.authorized) throw new InventoryBlocked("TLS_VERIFICATION_REQUIRED");
    const metadata = await readMetadata(client);
    console.log(redactReport({
      status: "metadata_read_complete", target, capturedAt: new Date().toISOString(),
      limits: [
        "No application rows or SQL definitions/bodies read.",
        "Schema hints are not authoritative proof of current Data API exposure.",
        "No write/DDL/permission tests authorized or executed.",
      ],
      metadata,
    }, secret));
  } finally { await client.end(); }
}

function parent() {
  const args = process.argv.slice(2);
  if (args.length !== 5 || args[0] !== "--project-ref" || args[2] !== "--host" ||
      args[4] !== "--metadata-only") throw new InventoryBlocked("EXPLICIT_TARGET_ARGUMENTS_REQUIRED");
  const target = { projectRef: args[1], host: args[3] };
  // Read ONLY this secret; never enumerate/copy the parent process environment.
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  const env = cleanInventoryEnvironment(secret, target);
  const child = spawnSync(process.execPath, [process.argv[1], "--worker"], {
    env, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (child.error || child.signal) throw new InventoryBlocked("ISOLATED_PROCESS_FAILED");
  // Never forward stderr, stack traces or arbitrary output.
  let report: { status?: string; reason?: string };
  try { report = JSON.parse(child.stdout); } catch { throw new InventoryBlocked("INVENTORY_OUTPUT_INVALID"); }
  if (child.status !== 0 || report.status !== "metadata_read_complete") {
    const permitted = new Set([
      "INHERITED_ENVIRONMENT_FORBIDDEN", "METADATA_APPROVAL_REQUIRED",
      "SERVER_IDENTITY_OR_READONLY_MISMATCH", "TLS_VERIFICATION_REQUIRED",
      "METADATA_LIMIT_EXCEEDED", "CONNECTION_OR_QUERY_FAILED",
      ...Object.values(DRIVER_FAILURES),
    ]);
    throw new InventoryBlocked(permitted.has(report.reason ?? "") ? report.reason! : "INVENTORY_BLOCKED");
  }
  console.log(redactReport(report, secret));
}

Promise.resolve().then(() => process.argv[2] === "--worker" ? worker() : parent())
  .catch(error => { console.log(JSON.stringify(safeFailure(error))); process.exitCode = 1; });
