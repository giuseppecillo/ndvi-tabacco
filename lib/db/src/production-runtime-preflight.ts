import pg, { type Pool, type PoolConfig } from "pg";
import { runtimeConnectionConfig } from "./runtime-connection-config";
import { verifyRuntimeIdentity } from "./runtime-identity";
import { RuntimePreflightError, runtimePreflightErrorCode } from "./runtime-preflight-errors";
export { RuntimePreflightError } from "./runtime-preflight-errors";

type PreflightPool = Pick<Pool, "connect" | "end">;
type PoolFactory = (config: PoolConfig) => PreflightPool;

/**
 * Opt-in Production-only diagnostic using its dedicated Secret.
 * The application's pool remains on Replit. Never import the QA/admin tools.
 */
export async function verifyProductionRuntimePreflight(
  env: NodeJS.ProcessEnv,
  makePool: PoolFactory = config => new pg.Pool(config),
): Promise<"disabled" | "passed"> {
  const flag = env.NITROCROP_RUNTIME_PREFLIGHT ?? "0";
  if (flag !== "0" && flag !== "1") {
    throw new RuntimePreflightError("RUNTIME_PREFLIGHT_FLAG_INVALID");
  }
  if (flag === "0") return "disabled";
  if (env.NODE_ENV !== "production" || env.REPLIT_DEPLOYMENT !== "1") {
    throw new RuntimePreflightError("RUNTIME_PREFLIGHT_PRODUCTION_REQUIRED");
  }
  if ((env.NITROCROP_DB_BACKEND ?? "replit") !== "replit") {
    throw new RuntimePreflightError("RUNTIME_PREFLIGHT_REQUIRES_REPLIT_BACKEND");
  }

  let diagnosticPool: PreflightPool | undefined;
  try {
    if (!env.NITROCROP_RUNTIME_DATABASE_URL?.trim()) {
      throw new RuntimePreflightError("RUNTIME_SECRET_MISSING");
    }
    // Only the separate pool uses Supabase. No mutation of process.env,
    // application pool configuration, DATABASE_URL, roles or defaults.
    diagnosticPool = makePool({
      ...runtimeConnectionConfig({ ...env, NITROCROP_DB_BACKEND: "supabase" }),
      max: 1,
      query_timeout: 10000,
      statement_timeout: 8000,
      lock_timeout: 1000,
      idle_in_transaction_session_timeout: 15000,
      application_name: "nitrocrop_production_readonly_preflight",
    });
    await verifyRuntimeIdentity(diagnosticPool as Pool, true);
  } catch (error) {
    // Keep only an approved category, never the driver error or its cause.
    throw new RuntimePreflightError(runtimePreflightErrorCode(error));
  } finally {
    if (diagnosticPool) {
      try { await diagnosticPool.end(); }
      catch { throw new RuntimePreflightError("RUNTIME_PREFLIGHT_CLOSE_FAILED"); }
    }
  }
  return "passed";
}
