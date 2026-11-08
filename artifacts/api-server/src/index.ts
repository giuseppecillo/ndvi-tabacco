import app from "./app";
import { logger } from "./lib/logger";
import { verifySecuritySchema } from "./lib/security-db";
import {
  pool, verifyRuntimeIdentity, verifyProductionRuntimePreflight, runtimePreflightErrorCode,
} from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  const preflight = await verifyProductionRuntimePreflight(process.env);
  logger.info({ status: preflight }, "Supabase Production READ ONLY preflight");
  await verifyRuntimeIdentity(pool, process.env.NITROCROP_DB_BACKEND === "supabase");
} catch (error) {
  // Only a closed, safe category: no raw driver error, message, SQL or URL.
  logger.error(
    { preflightCode: runtimePreflightErrorCode(error) },
    "Database connection preflight failed; startup aborted without schema changes",
  );
  await pool.end();
  process.exit(1);
}
await verifySecuritySchema();
logger.info("Read-only application schema verification passed; automatic migrations disabled");
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
