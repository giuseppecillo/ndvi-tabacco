// Identity-only entrypoint. This program cannot export data.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { connectionConfig, verifyPrimaryIdentity } from "./source-guard.mjs";

const require = createRequire(new URL("../../package.json", import.meta.url));
let client;
try {
  const parent = process.argv[2] === "--read-only-identity";
  const child = process.argv[2] === "--read-only-identity-child";
  if (![3, 4].includes(process.argv.length) || (!parent && !child)) {
    throw new Error("READ_ONLY_IDENTITY_FLAG_AND_HOST_REQUIRED");
  }
  const rawUrl = process.env.REPLIT_PROD_BACKUP_URL;
  // The source URL comes only from the owner's dedicated secret, never from
  // DATABASE_URL. Its hostname is not logged. An independent host pin is optional.
  const approvedHost = process.argv[3] ?? new URL(rawUrl).hostname;
  const config = connectionConfig(rawUrl, approvedHost);
  if (parent) {
    const result = spawnSync(process.execPath,
      [process.argv[1], "--read-only-identity-child", approvedHost],
      { env: { REPLIT_PROD_BACKUP_URL: rawUrl, NITROCROP_SOURCE_IDENTITY_ONLY: "yes" },
        stdio: "inherit", timeout: 20000 });
    process.exitCode = result.status === 0 ? 0 : 1;
  } else {
    if (process.env.NITROCROP_SOURCE_IDENTITY_ONLY !== "yes" ||
        Object.keys(process.env).some((key) =>
          !["REPLIT_PROD_BACKUP_URL", "NITROCROP_SOURCE_IDENTITY_ONLY"].includes(key))) {
      throw new Error("INHERITED_ENVIRONMENT_FORBIDDEN");
    }
    const { Client } = require("pg");
    client = new Client(config);
    client.on("error", () => { process.exitCode = 1; });
    await client.connect();
    const verified = await verifyPrimaryIdentity(client);
    await client.end();
    client = undefined;
    console.log(JSON.stringify({ status: "VERIFIED_IDENTITY_ONLY_NO_EXPORT",
      host: approvedHost, ...verified }));
  }
} catch (error) {
  const codes = new Set(["28P01", "28000", "42501", "42704", "57014",
    "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN",
    "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_HAS_EXPIRED",
    "ERR_TLS_CERT_ALTNAME_INVALID"]);
  const reasons = new Set(["READ_ONLY_IDENTITY_FLAG_AND_HOST_REQUIRED",
    "PRODUCTION_SOURCE_NOT_CONFIGURED", "INVALID_SOURCE_URL", "UNAPPROVED_SOURCE",
    "UNAPPROVED_CONNECTION_OPTION", "INHERITED_ENVIRONMENT_FORBIDDEN",
    "READ_ONLY_REQUIRED", "PRIMARY_IDENTITY_NOT_CONFIRMED", "CLIENT_TLS_NOT_VERIFIED"]);
  console.error(JSON.stringify({
    status: "SOURCE_IDENTITY_BLOCKED",
    reason: codes.has(error?.code) ? error.code :
      reasons.has(error?.message) ? error.message : "CONNECTION_OR_QUERY_FAILED",
    ...(error?.message === "PRIMARY_IDENTITY_NOT_CONFIRMED" ? { checks: error.checks } : {}),
    exportPerformed: false,
  }));
  process.exitCode = 1;
} finally {
  if (client) {
    try { await client.end(); } catch {
      console.error("SOURCE_IDENTITY_BLOCKED: connection cleanup failed; no export.");
      process.exitCode = 1;
    }
  }
}
