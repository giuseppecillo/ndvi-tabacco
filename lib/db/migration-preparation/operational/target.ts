// Connection factory only; no connection on import, application imports or fallback.
import { readFileSync } from "node:fs";
import { checkServerIdentity, type TLSSocket } from "node:tls";
import { Client } from "pg";
import { inventoryConfig } from "../inventory/guard";

export const PROJECT = "bhnaarbzpmcniesxyldx";
export const HOST = "aws-0-eu-west-1.pooler.supabase.com";
export function targetClient() {
  const secret = process.env.SUPABASE_QA_ADMIN_URL;
  if (!secret) throw new Error("TARGET_SECRET_MISSING");
  const ca = readFileSync(new URL("../inventory/fixtures/supabase-root-2021.pem", import.meta.url), "utf8");
  return new Client(inventoryConfig(secret, { projectRef: PROJECT, host: HOST }, ca));
}
export function verifyTargetTls(client: Client) {
  const socket = (client as unknown as { connection: { stream: TLSSocket } }).connection.stream;
  const certificate = socket.getPeerCertificate();
  const protocol = socket.getProtocol();
  if (socket.encrypted !== true || socket.authorized !== true ||
      socket.authorizationError || !certificate.raw?.length ||
      checkServerIdentity(HOST, certificate) ||
      !["TLSv1.2", "TLSv1.3"].includes(protocol ?? "")) {
    throw new Error("CLIENT_TLS_NOT_VERIFIED");
  }
  return { encrypted: true, certificateAuthorized: true, hostnameVerified: true, protocol };
}
export async function assertTarget(client: Client) {
  const transport = verifyTargetTls(client);
  const result = await client.query(`SELECT current_database() AS database,
    current_user::text AS role,
    (SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`);
  if (result.rows.length !== 1 || result.rows[0].database !== "postgres" ||
      result.rows[0].role !== "postgres") {
    throw new Error("TARGET_IDENTITY_NOT_CONFIRMED");
  }
  // Supavisor terminates client TLS. The backend flag is diagnostic, not
  // evidence for client -> pooler encryption; verified client TLS is mandatory.
  return { transport, backendReportsTls: result.rows[0].tls };
}
