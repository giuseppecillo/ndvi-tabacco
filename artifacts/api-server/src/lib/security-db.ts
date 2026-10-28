import { randomUUID } from "node:crypto";
import pool from "./db";

export const PRIVACY_VERSION = "2026-10-28";
export const bootstrapEmail = () => (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();

/**
 * Additive migration, run before accepting requests in either environment.
 * Historical IDs remain intact. observation_id is the user-facing ID; the
 * global primary key is internal, so two users can both save observation "1".
 */
export async function initializeSecurity() {
  const email = bootstrapEmail();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Configure ADMIN_BOOTSTRAP_EMAIL before starting the API.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(76290411)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id text PRIMARY KEY,
        clerk_user_id text UNIQUE,
        email text UNIQUE NOT NULL,
        name text NOT NULL DEFAULT '',
        role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleting')),
        privacy_version text,
        privacy_ack_at timestamptz,
        invitation_id text,
        invited_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS security_state (
        key text PRIMARY KEY,
        value text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS privacy_requests (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        type text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        response text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS security_events (
        id text PRIMARY KEY,
        actor_id text,
        target_id text,
        action text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE osservazioni ADD COLUMN IF NOT EXISTS owner_id text REFERENCES app_users(id) ON DELETE CASCADE;
      ALTER TABLE osservazioni ADD COLUMN IF NOT EXISTS observation_id text;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS subscription_duration_days integer DEFAULT 30 CHECK (subscription_duration_days BETWEEN 1 AND 3650);
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT (now() + interval '30 days');
      UPDATE osservazioni SET observation_id = id WHERE observation_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS osservazioni_owner_display_idx ON osservazioni(owner_id, observation_id);
    `);
    const seeded = await client.query("SELECT value FROM security_state WHERE key='initial_admin'");
    if (!seeded.rowCount) {
      // The configured recipient must prove email ownership through Clerk before
      // this local authorization can be bound to a real identity.
      const admin = await client.query(
        `INSERT INTO app_users(id,email,role) VALUES($1,$2,'admin')
         ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,role`,
        [randomUUID(), email],
      );
      if (admin.rows[0].role !== "admin") throw new Error("Bootstrap account role conflict.");
      await client.query("UPDATE osservazioni SET owner_id=$1 WHERE owner_id IS NULL", [admin.rows[0].id]);
      await client.query("INSERT INTO security_state(key,value) VALUES('initial_admin',$1)", [admin.rows[0].id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
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
