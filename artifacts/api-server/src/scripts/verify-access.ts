/**
 * Development-only API integration checks against real Clerk test identities.
 * No tokens/passwords are printed or persisted. Cleans up only its own fixtures.
 * Run with: pnpm --filter @workspace/api-server test:access
 */
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";
import pool from "../lib/db";
import { logger } from "../lib/logger";
import { PRIVACY_VERSION } from "../lib/security-db";

if (!process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") || !process.env.REPLIT_DEV_DOMAIN) {
  throw new Error("This check may only run with Clerk development keys and a development domain.");
}
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const identities: string[] = [];
const localIds: string[] = [];
const tokenById = new Map<string, string>();
const baseline = Number((await pool.query("SELECT count(*) FROM osservazioni")).rows[0].count);
let passed = 0;

async function request(userId: string | null, path: string, method = "GET", body?: unknown) {
  const headers: Record<string, string> = { Origin: origin, "Content-Type": "application/json" };
  // Server-side integration test only: development browser-cookie sessions need
  // Clerk's browser handshake. Browser application calls remain cookie-based.
  if (userId) headers.Authorization = `Bearer ${tokenById.get(userId)}`;
  const response = await fetch(`${origin}/api${path}`, {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  // Deliberately inspect heterogeneous successful/error JSON in this test harness.
  return { status: response.status, body: await response.json() as any };
}
function check(name: string, value: unknown) {
  assert.ok(value, name);
  passed++;
  logger.info({ check: name }, "Access integration check passed");
}
async function fixture(role: "admin" | "user" | null, bindByEmail = false) {
  const email = `nitrocrop-check-${randomUUID()}+clerk_test@example.com`;
  const identity = await clerkClient.users.createUser({
    emailAddress: [email], password: `NC!${randomBytes(24).toString("hex")}a9`,
  });
  identities.push(identity.id);
  const session = await clerkClient.sessions.createSession({ userId: identity.id });
  const token = await clerkClient.sessions.getToken(session.id);
  tokenById.set(identity.id, token.jwt);
  const id = randomUUID();
  if (role) {
    localIds.push(id);
    await pool.query(
      "INSERT INTO app_users(id,clerk_user_id,email,name,role) VALUES($1,$2,$3,'Synthetic check',$4)",
      [id, bindByEmail ? null : identity.id, email, role],
    );
  }
  return { id, identityId: identity.id };
}
const sampleObservation = (id: string) => ({
  id, data: "2026-10-28", dataTrapianto: "2026-09-16",
  cliente: "Synthetic check", appezzamento: "Synthetic check", varieta: "Burley (Non Cimato)",
  coltura: "tabacco", giorni: 42, etaPiantina: "standard", resa: 4.5,
  n1: 0.5, n2: 0.5, n3: 0.5, n4: 0.5, n5: 0.5,
  media: 0.5, ottimale: 0.64, discostamento: 0.14,
  fabbisognoN: 120, azotoTotale: 120, azotoGiaDistribuito: 0, dose: 26.3,
  lat: 41.0, lng: 15.0,
});

try {
  const admin = await fixture("admin");
  const a = await fixture("user", true);
  const b = await fixture("user");
  const unauthorized = await fixture(null);
  check("anonymous cannot read observations", (await request(null, "/osservazioni")).status === 401);
  check("unapproved identity cannot access application", (await request(unauthorized.identityId, "/auth/me")).status === 403);
  check("verified invited email binds to authorized account", (await request(a.identityId, "/auth/me")).body.id === a.id);
  check("privacy acknowledgment gates data", (await request(a.identityId, "/osservazioni")).status === 403);
  for (const user of [admin, a, b]) {
    check("privacy acknowledgment persists", (await request(user.identityId, "/auth/privacy-ack", "POST", { version: PRIVACY_VERSION })).status === 200);
  }
  check("regular user cannot administer accounts", (await request(a.identityId, "/admin/users")).status === 403);
  check("same observation ID saved for user A", (await request(a.identityId, "/osservazioni", "POST", sampleObservation("1"))).status === 201);
  check("same observation ID independently saved for user B", (await request(b.identityId, "/osservazioni", "POST", sampleObservation("1"))).status === 201);
  for (const user of [a, b]) {
    const result = await request(user.identityId, "/osservazioni");
    check("own registry contains only own data", result.status === 200 && result.body.length === 1 && result.body[0].id === "1");
  }
  const ids = await pool.query("SELECT DISTINCT owner_id FROM osservazioni WHERE owner_id=ANY($1::text[])", [[a.id, b.id]]);
  check("same display ID does not overwrite another account", ids.rowCount === 2);
  await request(b.identityId, "/osservazioni", "POST", sampleObservation("b-only"));
  await request(a.identityId, "/osservazioni/b-only", "DELETE");
  check("cannot delete another owner's observation", (await request(b.identityId, "/osservazioni")).body.some((o: { id: string }) => o.id === "b-only"));
  const exported = await request(a.identityId, "/auth/export");
  check("JSON export excludes other accounts", exported.body.account.id === a.id && exported.body.observations.length === 1);
  const privacy = await request(a.identityId, "/auth/privacy-requests", "POST", { type: "access", message: "Synthetic data access request" });
  check("privacy request saved", privacy.status === 201 && privacy.body.userId === a.id);
  check("privacy request invisible to another user", (await request(b.identityId, "/auth/privacy-requests")).body.length === 0);
  check("administrator can respond to privacy request", (await request(admin.identityId, `/admin/privacy-requests/${privacy.body.id}`, "PATCH", { status: "completed", response: "Synthetic response" })).status === 200);
  check("requester can read response", (await request(a.identityId, "/auth/privacy-requests")).body[0].response === "Synthetic response");
  check("user cannot change own subscription", (await request(a.identityId, `/admin/users/${a.id}`, "PATCH", { subscriptionDays: 999 })).status === 403);
  for (const days of [0, -1, 1.5, 3651]) {
    check("invalid duration rejected", (await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", { subscriptionDays: days })).status === 400);
  }
  check("empty update rejected", (await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", {})).status === 400);
  const renewed = await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", { subscriptionDays: 5 });
  check("admin changes duration and deadline", renewed.status === 200 && renewed.body.subscriptionDurationDays === 5 && renewed.body.subscriptionDaysRemaining === 5);
  check("another user's duration unchanged", (await request(b.identityId, "/auth/me")).body.subscriptionDurationDays === 30);
  await pool.query("UPDATE app_users SET subscription_expires_at=now()-interval '1 second' WHERE id=$1", [a.id]);
  const expired = await request(a.identityId, "/auth/me");
  check("expired account reports zero days without blocking identity", expired.status === 200 && expired.body.subscriptionExpired === true && expired.body.subscriptionDaysRemaining === 0);
  for (const method of ["GET", "POST", "DELETE"]) {
    check("expired session cannot access observation endpoints", (await request(a.identityId, "/osservazioni", method, method === "POST" ? sampleObservation("expired") : undefined)).status === 403);
  }
  check("expired user retains personal data export", (await request(a.identityId, "/auth/export")).status === 200);
  check("expired user retains privacy request access", (await request(a.identityId, "/auth/privacy-requests")).status === 200);
  check("admin renewal restores expired subscription", (await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", { subscriptionDays: 7 })).body.subscriptionDaysRemaining === 7);
  check("renewal preserves and restores own registry", (await request(a.identityId, "/osservazioni")).body.length === 1);
  check("admin can suspend", (await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", { status: "suspended" })).status === 200);
  check("existing suspended session cannot read data", (await request(a.identityId, "/osservazioni")).status === 403);
  check("existing suspended session cannot write data", (await request(a.identityId, "/osservazioni", "POST", sampleObservation("denied"))).status === 403);
  await request(admin.identityId, `/admin/users/${a.id}`, "PATCH", { status: "active" });
  check("reactivation restores authorized access", (await request(a.identityId, "/osservazioni")).status === 200);
  check("own reset succeeds", (await request(a.identityId, "/osservazioni", "DELETE")).status === 200);
  check("own reset preserves other owner's registry", (await request(b.identityId, "/osservazioni")).body.length === 2);
  check("administrator can delete user and identity", (await request(admin.identityId, `/admin/users/${b.id}`, "DELETE")).status === 200);
  check("deletion removes only target's observations", Number((await pool.query("SELECT count(*) FROM osservazioni WHERE owner_id=$1", [b.id])).rows[0].count) === 0);
  check("deleted account cannot access data", [401, 403].includes((await request(b.identityId, "/osservazioni")).status));
  const selfDelete = await request(admin.identityId, `/admin/users/${admin.id}`, "DELETE");
  check("administrator cannot delete own account", selfDelete.status >= 400 && selfDelete.status < 500);
  check("account deletion succeeds with privacy requests", (await request(admin.identityId, `/admin/users/${a.id}`, "DELETE")).status === 200);
  check("account deletion removes privacy requests", Number((await pool.query("SELECT count(*) FROM privacy_requests WHERE user_id=$1", [a.id])).rows[0].count) === 0);
} finally {
  if (localIds.length) {
    await pool.query("DELETE FROM osservazioni WHERE owner_id=ANY($1::text[])", [localIds]);
    await pool.query("DELETE FROM security_events WHERE actor_id=ANY($1::text[]) OR target_id=ANY($1::text[])", [localIds]);
    await pool.query("DELETE FROM app_users WHERE id=ANY($1::text[])", [localIds]);
  }
  for (const id of identities) {
    try { await clerkClient.users.deleteUser(id); } catch (error) {
      if ((error as { status?: number }).status !== 404) logger.error("Synthetic identity cleanup failed");
    }
  }
  const remaining = Number((await pool.query("SELECT count(*) FROM osservazioni")).rows[0].count);
  await pool.end();
  assert.equal(remaining, baseline, "Original observations must remain unchanged");
  logger.info({ passed }, "Access API integration checks complete; synthetic fixtures removed");
}
