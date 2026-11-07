import { randomUUID } from "node:crypto";
import pool from "./db";
import { verifyApplicationSchema } from "./schema-check";

export const PRIVACY_VERSION = "2026-10-28.5";
export const bootstrapEmail = () => (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();

/** Read-only startup verification. Provisioning/migrations are never automatic. */
export async function verifySecuritySchema() {
  const client = await pool.connect();
  try {
    await verifyApplicationSchema(client);
  } finally {
    client.release();
  }
}

export async function audit(actor: string | null, target: string | null, action: string) {
  // Deliberately exclude email addresses, GPS, request contents and credentials.
  await pool.query(
    "INSERT INTO security_events(id,actor_id,target_id,action) VALUES($1,$2,$3,$4)",
    [randomUUID(), actor, target, action],
  );
}
