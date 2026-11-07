// Manual, separately authorized export. Never imported by startup or workflows.
import { createRequire } from "node:module";
import { accessSync, mkdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connectionConfig, verifyPrimaryIdentity } from "./source-guard.mjs";
import { encryptDump } from "./pipeline.mjs";

const require = createRequire(new URL("../../package.json", import.meta.url));
let client;
let emptyDirectory;
try {
  if (process.argv.length !== 5 ||
      process.argv[2] !== "--authorized-export-production" ||
      process.argv[3] !== "--production-binding-confirmed" ||
      !/^age1[a-z0-9]{58}$/.test(process.argv[4])) {
    throw new Error("SPECIFIC_EXPORT_APPROVAL_AND_PUBLIC_RECIPIENT_REQUIRED");
  }
  const raw = process.env.REPLIT_PROD_BACKUP_URL;
  const config = connectionConfig(raw, new URL(raw).hostname);
  const caPath = "/etc/ssl/certs/ca-certificates.crt";
  accessSync(caPath);
  const { Client } = require("pg");
  client = new Client(config);
  await client.connect();
  const identity = await verifyPrimaryIdentity(client);
  await client.end();
  client = undefined;
  const root = fileURLToPath(new URL("../../../../generated-artifacts/production-backup/", import.meta.url));
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(root + new Date().toISOString().replaceAll(":", "-") + "-");
  emptyDirectory = directory + "/session";
  mkdirSync(emptyDirectory, { mode: 0o700 });
  const passwordFile = emptyDirectory + "/empty.pgpass";
  const serviceFile = emptyDirectory + "/empty.pg_service.conf";
  writeFileSync(passwordFile, "", { mode: 0o600, flag: "wx" });
  writeFileSync(serviceFile, "", { mode: 0o600, flag: "wx" });
  const result = await encryptDump({
    recipient: process.argv[4], outputPath: directory + "/database.dump.age",
    dumpArgs: ["--format=custom", "--compress=3", "--quote-all-identifiers",
      "--lock-wait-timeout=1000", "--no-password"],
    env: {
      PATH: process.env.PATH ?? "", PGHOST: config.host, PGPORT: "5432",
      PGDATABASE: config.database, PGUSER: config.user, PGPASSWORD: config.password,
      PGPASSFILE: passwordFile, PGSERVICEFILE: serviceFile,
      PGSSLMODE: "verify-full", PGSSLROOTCERT: caPath,
      PGOPTIONS: "-c default_transaction_read_only=on -c lock_timeout=1000 -c statement_timeout=300000",
    },
  });
  const report = {
    status: "ENCRYPTED_AND_FULLY_PARSED_NOT_RESTORE_CERTIFIED",
    createdAt: new Date().toISOString(), identity,
    encryptedBytes: result.encryptedBytes, sha256: result.encryptedSha256,
  };
  writeFileSync(directory + "/checksum.json", JSON.stringify(report, null, 2),
    { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ status: report.status, directory,
    encryptedBytes: report.encryptedBytes, sha256: report.sha256 }));
} catch {
  console.error("PRODUCTION_EXPORT_BLOCKED_OR_FAILED; no valid backup claimed.");
  process.exitCode = 1;
} finally {
  if (client) await client.end();
  if (emptyDirectory) {
    for (const name of ["empty.pgpass", "empty.pg_service.conf"]) {
      try { unlinkSync(emptyDirectory + "/" + name); } catch { /* no credential contents */ }
    }
    try { rmdirSync(emptyDirectory); } catch { /* no database action */ }
  }
}
