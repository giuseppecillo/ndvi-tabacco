/**
 * MANUAL PHASE-1 ENTRYPOINT. Never run from app/workflow/build/post-merge.
 * Bundle with esbuild and run with --project-ref REF --host HOST --metadata-only.
 * The CLI accepts ONLY nonsecret target identifiers; the DSN stays in Secrets.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import type { TLSSocket } from "node:tls";
import {
  assertCleanEnvironment, cleanInventoryEnvironment, inventoryConfig,
  APPROVED_CA_SHA256, DRIVER_FAILURES, InventoryBlocked, redactReport, safeFailure, type ApprovedTarget,
} from "./guard";
import { readMetadata, readSessionDiagnostic, withCatalogConnection } from "./catalog";

async function worker(diagnosticOnly = false) {
  assertCleanEnvironment(process.env);
  const target: ApprovedTarget = {
    projectRef: process.env.SUPABASE_QA_PROJECT_REF ?? "",
    host: process.env.SUPABASE_QA_EXPECTED_HOST ?? "",
  };
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  const ca = process.env.SUPABASE_QA_CA_PEM;
  const config = inventoryConfig(secret, target, ca);
  // Load the driver only AFTER clean-env/target validation in the child.
  const { Client } = await import("pg");
  const client = new Client(config);
  const report = await withCatalogConnection(client, () => {
    const stream = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
    if (!stream.encrypted || !stream.authorized) throw new InventoryBlocked("TLS_VERIFICATION_REQUIRED");
  }, async () => {
    if (diagnosticOnly) {
      const session = await readSessionDiagnostic(client);
      return {
        status: "session_diagnostic_complete", target,
        tls: { certificateVerified: true, hostnameVerified: true },
        session, inventoryContinued: false,
      };
    }
    const metadata = await readMetadata(client);
    return {
      status: "metadata_read_complete", target, capturedAt: new Date().toISOString(),
      tls: { certificateVerified: true, hostnameVerified: true,
        trust: ca ? "user-supplied-official-supabase-ca" : "system-ca",
        ...(ca ? { caSha256: APPROVED_CA_SHA256 } : {}) },
      limits: [
        "No application rows or SQL definitions/bodies read.",
        "Schema hints are not authoritative proof of current Data API exposure.",
        "No write/DDL/permission tests authorized or executed.",
      ],
      metadata,
    };
  });
  // Emit success only AFTER rollback and connection closure succeeded.
  console.log(redactReport(report, secret));
}

function parent() {
  const args = process.argv.slice(2);
  const diagnosticOnly = args[4] === "--session-diagnostic";
  if (![5, 7].includes(args.length) || args[0] !== "--project-ref" || args[2] !== "--host" ||
      (!diagnosticOnly && args[4] !== "--metadata-only") || (args.length === 7 && args[5] !== "--ca-file")) {
    throw new InventoryBlocked("EXPLICIT_TARGET_ARGUMENTS_REQUIRED");
  }
  const target = { projectRef: args[1], host: args[3] };
  // Read ONLY this secret; never enumerate/copy the parent process environment.
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  let ca: string | undefined;
  if (args.length === 7) {
    if (statSync(args[6]).size > 16_384) throw new InventoryBlocked("PUBLIC_CA_INVALID");
    ca = readFileSync(args[6], "utf8");
  }
  const env = cleanInventoryEnvironment(secret, target, ca);
  const child = spawnSync(process.execPath, [process.argv[1], diagnosticOnly ? "--worker-diagnostic" : "--worker"], {
    env, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (child.error || child.signal) throw new InventoryBlocked("ISOLATED_PROCESS_FAILED");
  // Never forward stderr, stack traces or arbitrary output.
  let report: { status?: string; reason?: string };
  try { report = JSON.parse(child.stdout); } catch { throw new InventoryBlocked("INVENTORY_OUTPUT_INVALID"); }
  const expectedStatus = diagnosticOnly ? "session_diagnostic_complete" : "metadata_read_complete";
  if (child.status !== 0 || report.status !== expectedStatus) {
    const permitted = new Set([
      "INHERITED_ENVIRONMENT_FORBIDDEN", "METADATA_APPROVAL_REQUIRED",
      "SERVER_IDENTITY_OR_READONLY_MISMATCH", "TLS_VERIFICATION_REQUIRED",
      "METADATA_LIMIT_EXCEEDED", "CONNECTION_OR_QUERY_FAILED",
      "PUBLIC_CA_INVALID", "PUBLIC_CA_NOT_APPROVED",
      "SESSION_DIAGNOSTIC_INCOMPLETE",
      "UNAUTHORIZED_CATALOG_QUERY", "TRANSACTION_NOT_READ_ONLY",
      "ROLLBACK_FAILED", "CONNECTION_CLOSE_FAILED",
      ...Object.values(DRIVER_FAILURES),
    ]);
    throw new InventoryBlocked(permitted.has(report.reason ?? "") ? report.reason! : "INVENTORY_BLOCKED");
  }
  console.log(redactReport(report, secret));
}

Promise.resolve().then(() => process.argv[2] === "--worker" ? worker() :
  process.argv[2] === "--worker-diagnostic" ? worker(true) : parent())
  .catch(error => { console.log(JSON.stringify(safeFailure(error))); process.exitCode = 1; });
