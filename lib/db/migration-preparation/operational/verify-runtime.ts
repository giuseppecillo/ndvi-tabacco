// INACTIVE. Temporary QA Secret and LOGIN activation need authorization.
import pg from "pg";
import {runtimeConnectionConfig} from "../../src/runtime-connection-config";
import {verifyRuntimeIdentity} from "../../src/runtime-identity";

let pool: pg.Pool | undefined;
try {
  if(process.argv.length!==3 || process.argv[2]!=="--authorized-runtime-readonly-check") {
    throw new Error("RUNTIME_READONLY_AUTHORIZATION_REQUIRED");
  }
  const url=process.env.NITROCROP_RUNTIME_QA_URL ?? "";
  pool=new pg.Pool(runtimeConnectionConfig({
    NITROCROP_DB_BACKEND:"supabase",NITROCROP_RUNTIME_DATABASE_URL:url,
  }));
  await verifyRuntimeIdentity(pool,true);
  console.log("RUNTIME_TLS_AND_IDENTITY_VERIFIED_READONLY; no application rows read.");
} catch {
  console.error("RUNTIME_PREFLIGHT_BLOCKED; no cutover.");
  process.exitCode=1;
} finally { await pool?.end(); }
