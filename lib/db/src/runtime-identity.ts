import type { Pool } from "pg";
import { TLSSocket, checkServerIdentity } from "node:tls";
import { RUNTIME_HOST } from "./runtime-connection-config";

// Startup/preflight only. No application rows, role changes or session defaults.
export async function verifyRuntimeIdentity(pool: Pool, enabled: boolean): Promise<void> {
  if (!enabled) return;
  const client = await pool.connect();
  let success = false;
  try {
    const stream = (client as unknown as {connection:{stream:TLSSocket}}).connection.stream;
    if (!(stream instanceof TLSSocket) || !stream.encrypted || !stream.authorized ||
        stream.authorizationError || !["TLSv1.2","TLSv1.3"].includes(stream.getProtocol() ?? "")) {
      throw new Error("RUNTIME_TLS_NOT_VERIFIED");
    }
    const certificate=stream.getPeerCertificate();
    if (!certificate.raw || checkServerIdentity(RUNTIME_HOST,certificate)) {
      throw new Error("RUNTIME_TLS_HOSTNAME_NOT_VERIFIED");
    }
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      const mode=await client.query("SELECT current_setting('transaction_read_only') AS readonly");
      if(mode.rows[0]?.readonly!=="on") throw new Error("RUNTIME_PREFLIGHT_NOT_READONLY");
      const result=await client.query(`SELECT current_user AS role, session_user AS session_role,
        current_database() AS database, current_setting('transaction_read_only') AS readonly,
        rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
        FROM pg_catalog.pg_roles WHERE rolname=current_user`);
      const role=result.rows[0];
      if(!role || role.role!=="app_runtime" || role.session_role!=="app_runtime" ||
          role.database!=="postgres" || role.readonly!=="on" || role.rolsuper ||
          role.rolcreaterole || role.rolcreatedb || role.rolbypassrls) {
        throw new Error("RUNTIME_ROLE_NOT_APPROVED");
      }
    } finally { await client.query("ROLLBACK"); }
    success=true;
  } finally { client.release(!success); }
}
