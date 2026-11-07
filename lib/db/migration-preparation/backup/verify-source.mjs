// Identity-only entrypoint. This program cannot export data.
import { createRequire } from "node:module";
import { connectionConfig, verifyPrimaryIdentity } from "./source-guard.mjs";

const require = createRequire(new URL("../../package.json", import.meta.url));
let client;
try {
  if (![3, 4].includes(process.argv.length) ||
      process.argv[2] !== "--read-only-identity") {
    throw new Error("READ_ONLY_IDENTITY_FLAG_AND_HOST_REQUIRED");
  }
  const rawUrl = process.env.REPLIT_PROD_BACKUP_URL;
  // The source URL comes only from the owner's dedicated secret, never from
  // DATABASE_URL. Its hostname is not logged. An independent host pin is optional.
  const approvedHost = process.argv[3] ?? new URL(rawUrl).hostname;
  const config = connectionConfig(rawUrl, approvedHost);
  const { Client } = require("pg");
  client = new Client(config);
  await client.connect();
  const verified = await verifyPrimaryIdentity(client);
  console.log(JSON.stringify({ status: "VERIFIED_IDENTITY_ONLY_NO_EXPORT", ...verified }));
} catch {
  console.error("SOURCE_IDENTITY_BLOCKED: missing/unapproved source or failed read-only/TLS/primary check. No export performed.");
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
