// Connection factory only; no connection on import, application imports or fallback.
import { readFileSync } from "node:fs";
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
export async function assertTarget(client: Client) {
  const result = await client.query(`SELECT current_database() AS database,
    current_user::text AS role,
    (SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`);
  if (result.rows.length !== 1 || result.rows[0].database !== "postgres" ||
      result.rows[0].role !== "postgres" || result.rows[0].tls !== true) {
    throw new Error("TARGET_IDENTITY_NOT_CONFIRMED");
  }
}
