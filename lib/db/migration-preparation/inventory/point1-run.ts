/**
 * MANUAL ONLY. No application imports, startup hooks or environment changes.
 * Parent stdout is a summary; function definition stays in private evidence.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, statSync, mkdirSync, chmodSync, writeFileSync, lstatSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { TLSSocket } from "node:tls";
import {
  assertCleanEnvironment, cleanInventoryEnvironment, inventoryConfig,
  InventoryBlocked, redactReport, safeFailure,
} from "./guard";
import { readPoint1Metadata, withCatalogConnection } from "./catalog";

async function worker() {
  assertCleanEnvironment(process.env);
  const target = {
    projectRef: process.env.SUPABASE_QA_PROJECT_REF ?? "",
    host: process.env.SUPABASE_QA_EXPECTED_HOST ?? "",
  };
  // This runner is pinned to the one project authorized for this migration.
  if (target.projectRef !== "bhnaarbzpmcniesxyldx" ||
      target.host !== "aws-0-eu-west-1.pooler.supabase.com") {
    throw new InventoryBlocked("DESTINATION_MISMATCH");
  }
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  const ca = process.env.SUPABASE_QA_CA_PEM;
  if (!ca) throw new InventoryBlocked("PUBLIC_CA_INVALID");
  const config = inventoryConfig(secret, target, ca);
  const { Client } = await import("pg");
  const client = new Client(config);
  const metadata = await withCatalogConnection(client, () => {
    const stream = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
    if (!stream.encrypted || !stream.authorized) throw new InventoryBlocked("TLS_VERIFICATION_REQUIRED");
  }, () => readPoint1Metadata(client));
  // Captured by parent pipe, never forwarded as a console report.
  console.log(redactReport({
    status: "point1_metadata_complete", capturedAt: new Date().toISOString(), target,
    tlsVerified: true, hostnameVerified: true, rollbackAndCloseCompleted: true, metadata,
  }, secret));
}

function parent() {
  const args = process.argv.slice(2);
  if (args.length !== 6 || args[0] !== "--project-ref" || args[2] !== "--host" ||
      args[4] !== "--ca-file") throw new InventoryBlocked("EXPLICIT_TARGET_ARGUMENTS_REQUIRED");
  const target = { projectRef: args[1], host: args[3] };
  if (target.projectRef !== "bhnaarbzpmcniesxyldx" ||
      target.host !== "aws-0-eu-west-1.pooler.supabase.com") {
    throw new InventoryBlocked("DESTINATION_MISMATCH");
  }
  if (statSync(args[5]).size > 16_384) throw new InventoryBlocked("PUBLIC_CA_INVALID");
  const ca = readFileSync(args[5], "utf8");
  const secret = process.env.SUPABASE_QA_ADMIN_URL ?? "";
  const env = cleanInventoryEnvironment(secret, target, ca);
  const child = spawnSync(process.execPath, [process.argv[1], "--point1-worker"], {
    env, encoding: "utf8", timeout: 120_000, maxBuffer: 2 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (child.error || child.signal) throw new InventoryBlocked("ISOLATED_PROCESS_FAILED");
  let report;
  try { report = JSON.parse(child.stdout); }
  catch { throw new InventoryBlocked("INVENTORY_OUTPUT_INVALID"); }
  if (child.status !== 0 || report.status !== "point1_metadata_complete") {
    // Wholly suppress arbitrary child output/error details.
    const reason = typeof report.reason === "string" &&
      /^[A-Z_]{3,80}$/.test(report.reason) ? report.reason : "INVENTORY_BLOCKED";
    throw new InventoryBlocked(reason);
  }
  const directory = resolve("generated-artifacts/migration-point1");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink()) throw new InventoryBlocked("UNSAFE_EVIDENCE_DIRECTORY");
  chmodSync(directory, 0o700);
  const evidence = resolve(directory, `supabase-${Date.now()}.json`);
  writeFileSync(evidence, redactReport(report, secret), { flag: "wx", mode: 0o600 });
  const routine = report.metadata.rlsRoutine[0];
  const { definition, ...routineMetadata } = routine;
  console.log(JSON.stringify({
    status: report.status, target, capturedAt: report.capturedAt, tlsVerified: true,
    hostnameVerified: true, rollbackAndCloseCompleted: true, evidence,
    applicationRelations: report.metadata.applicationRelations,
    applicationColumnCount: report.metadata.applicationColumns.length,
    routine: routineMetadata,
    definitionSha256: createHash("sha256").update(definition).digest("hex"),
    eventTrigger: report.metadata.rlsEventTrigger,
    dataApiExposure: "requires-official-project-settings-evidence",
  }, null, 2));
}

Promise.resolve().then(() => process.argv[2] === "--point1-worker" ? worker() : parent())
  .catch(error => { console.log(JSON.stringify(safeFailure(error))); process.exitCode = 1; });
