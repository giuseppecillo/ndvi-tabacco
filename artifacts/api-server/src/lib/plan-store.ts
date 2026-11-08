import type { Pool, PoolClient } from "pg";
import pool from "./db";
import type { LocalAccount } from "../middlewares/access";
import {
  PlanError, storedPlanSchema, storedUseSchema, type StoredPlan, type StoredUse,
  planKey, contractPrefix, usagePrefix, useKey, nextPlan, planState,
  assertActive, assertQuota, visitFingerprint, PRO_BYTES, STANDARD_LIMIT,
} from "./plan-model";

export type SqlClient = Pick<Pool, "query">;
type Owner = Pick<LocalAccount, "id" | "role">;
// Optional dedicated table. Never create/migrate it automatically. Existing
// security_state intentionally remains SELECT-only to app_runtime.
export async function planStoreReady(sql: SqlClient = pool) {
  const result = await sql.query("SELECT to_regclass('public.app_plan_state') IS NOT NULL AS ready");
  return result.rows[0]?.ready === true;
}
export async function readPlan(id: string, sql: SqlClient = pool): Promise<StoredPlan | null> {
  if (!await planStoreReady(sql)) return null;
  const result = await sql.query("SELECT value FROM app_plan_state WHERE key=$1 AND owner_id=$2", [planKey(id),id]);
  if (!result.rows[0]) return null;
  return storedPlanSchema.parse(JSON.parse(result.rows[0].value));
}
export async function locked<T>(id: string, action: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`nitrocrop-plan:${id}`]);
    const owner = (await client.query("SELECT role,status FROM app_users WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!owner || owner.status !== "active") throw new PlanError("ACCOUNT_UNAVAILABLE", "Account non attivo.", 403);
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
async function put(key: string, value: unknown, sql: SqlClient) {
  const userId = (value as {userId:string}).userId;
  await sql.query("INSERT INTO app_plan_state(key,owner_id,value) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value WHERE app_plan_state.owner_id=EXCLUDED.owner_id",
    [key, userId, JSON.stringify(value)]);
}
async function uses(id: string, sql: SqlClient): Promise<StoredUse[]> {
  const prefix = usagePrefix(id);
  const { rows } = await sql.query("SELECT key,value FROM app_plan_state WHERE left(key,length($1))=$1 AND owner_id=$2", [prefix,id]);
  return rows.map(row => {
    const use = storedUseSchema.parse(JSON.parse(row.value));
    if (use.userId !== id || useKey(use) !== row.key) throw new Error("Invalid usage ownership");
    return use;
  });
}
async function addUse(plan: StoredPlan, kind: StoredUse["kind"], entryId: string, sql: SqlClient, createdAt = new Date().toISOString()) {
  const use: StoredUse = { version: 1, userId: plan.userId, periodId: plan.periodId, kind, entryId, createdAt };
  await sql.query("INSERT INTO app_plan_state(key,owner_id,value) VALUES($1,$2,$3) ON CONFLICT(key) DO NOTHING",
    [useKey(use),plan.userId,JSON.stringify(use)]);
}
/** Used for both initial invitations and administrator-assigned/renewed plans. */
export async function writePlan(
  id: string, input: Parameters<typeof nextPlan>[1], client: SqlClient,
) {
  if (!await planStoreReady(client)) throw new PlanError("PLAN_STORE_NOT_READY","La gestione piani richiede l’aggiornamento autorizzato del database.",503);
  const old = await readPlan(id, client);
  const next = nextPlan(id, input, old);
  if (old?.requestId === input.requestId) return next;
  if (!old) {
    // Count existing visits saved within the chosen year too: assigning a plan
    // cannot make existing activity disappear. Never UPDATE/DELETE observations.
    const visits = await client.query(
      `SELECT DISTINCT btrim(COALESCE(cliente,'')) AS customer, left(data::text,10) AS day
       FROM osservazioni WHERE owner_id=$1 AND created_at >= $2::timestamptz AND created_at < $3::timestamptz`,
      [id, `${next.startsOn}T00:00:00Z`, next.expiresAt]);
    for (const visit of visits.rows) {
      await addUse(next, "visit", visitFingerprint(visit.customer, visit.day), client);
    }
  }
  await put(planKey(id), next, client);
  await put(`${contractPrefix(id)}${next.periodId}`, next, client);
  const duration = Math.round((Date.parse(next.expiresAt) - Date.parse(`${next.startsOn}T00:00:00Z`)) / 86_400_000);
  await client.query("UPDATE app_users SET subscription_expires_at=$2,subscription_duration_days=$3 WHERE id=$1",
    [id, next.expiresAt, duration]);
  return next;
}
export async function usageFor(accounts: Owner[], sql: SqlClient = pool, now = new Date()) {
  if (!accounts.length) return [];
  const ids = accounts.map(a => a.id);
  const ready = await planStoreReady(sql);
  const data = await sql.query(
    `SELECT owner_id, count(*)::int AS observations,
      count(DISTINCT (btrim(COALESCE(cliente,'')),left(data::text,10)))::int AS visits,
      COALESCE(sum(pg_column_size(o)),0)::float8 AS bytes
     FROM osservazioni o WHERE owner_id=ANY($1::text[]) GROUP BY owner_id`, [ids]);
  const personal = await sql.query(
    `SELECT owner_id,sum(bytes)::float8 AS bytes FROM (
       SELECT id AS owner_id, pg_column_size(u)::float8 AS bytes FROM app_users u WHERE id=ANY($1::text[])
       UNION ALL SELECT user_id AS owner_id, pg_column_size(r)::float8 AS bytes
         FROM privacy_requests r WHERE user_id=ANY($1::text[])
     ) owned GROUP BY owner_id`, [ids]);
  const records = ready ? await sql.query(
    `SELECT owner_id,key,value,pg_column_size(s)::float8 AS bytes FROM app_plan_state s
     WHERE owner_id=ANY($1::text[])`, [ids]) : {rows:[]};
  return accounts.map(account => {
    const own = records.rows.filter(row => row.owner_id === account.id);
    const currentRow = own.find(row => row.key === planKey(account.id));
    const plan = currentRow ? storedPlanSchema.parse(JSON.parse(currentRow.value)) : null;
    if (plan && plan.userId !== account.id) throw new Error("Invalid plan ownership");
    const history = own.filter(row => row.key.startsWith(contractPrefix(account.id))).map(row => {
      const contract = storedPlanSchema.parse(JSON.parse(row.value));
      if (contract.userId !== account.id || row.key !== `${contractPrefix(account.id)}${contract.periodId}`) throw new Error("Invalid contract ownership");
      return contract;
    });
    const ledger = own.filter(row => row.key.startsWith(usagePrefix(account.id))).map(row => {
      const use = storedUseSchema.parse(JSON.parse(row.value));
      if (use.userId !== account.id || row.key !== useKey(use)) throw new Error("Invalid usage ownership");
      return use;
    });
    const counts = (period: string, kind: StoredUse["kind"]) => ledger.filter(use => use.periodId === period && use.kind === kind).length;
    const stored = data.rows.find(row => row.owner_id === account.id);
    const personalBytes = personal.rows.find(row => row.owner_id === account.id)?.bytes ?? 0;
    const storageBytes = Number(stored?.bytes ?? 0) + Number(personalBytes)
      + own.reduce((sum, row) => sum + Number(row.bytes), 0);
    return {
      userId: account.id,
      planManagementReady: ready,
      plan: account.role === "admin" ? "admin" as const : plan?.plan ?? "unassigned" as const,
      state: account.role === "admin" ? "exempt" as const : plan ? planState(plan, now) : "unassigned" as const,
      periodId: plan?.periodId ?? null, startsOn: plan?.startsOn ?? null, expiresAt: plan?.expiresAt ?? null,
      visitsUsed: plan ? counts(plan.periodId, "visit") : null,
      mapsUsed: plan ? counts(plan.periodId, "map") : null,
      visitsTotal: Number(stored?.visits ?? 0), observationsTotal: Number(stored?.observations ?? 0),
      mapsTotal: ledger.filter(use => use.kind === "map").length,
      storageBytes, storageMb: storageBytes / 1_000_000,
      visitsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      mapsLimit: plan?.plan === "standard" && account.role !== "admin" ? STANDARD_LIMIT : null,
      storageLimitBytes: plan?.plan === "pro" && account.role !== "admin" ? PRO_BYTES : null,
      trackingSince: plan?.trackingSince ?? null,
      periods: history.sort((a,b) => b.startsOn.localeCompare(a.startsOn)).map(p => ({
        periodId: p.periodId, plan: p.plan, startsOn: p.startsOn, expiresAt: p.expiresAt,
        visitsUsed: counts(p.periodId, "visit"), mapsUsed: counts(p.periodId, "map"),
      })),
    };
  });
}
async function enforceStorage(account: Owner, plan: StoredPlan, sql: SqlClient) {
  if (plan.plan === "pro" && (await usageFor([account], sql))[0].storageBytes > PRO_BYTES) {
    throw new PlanError("STORAGE_QUOTA_EXCEEDED", "Raggiunto il limite di 50 GB. Lo storico resta disponibile.");
  }
}
export async function saveWithUsage<T>(account: Owner, customer: string, day: string, save: (sql: SqlClient) => Promise<T>) {
  // Legacy/unassigned accounts retain their current rules until explicit admin
  // assignment. Existing users must never be silently reassigned or locked out.
  if (account.role === "admin") return save(pool);
  return locked(account.id, async client => {
    const plan = await readPlan(account.id, client);
    if (!plan) return save(client);
    assertActive(plan);
    const entries = (await uses(account.id, client)).filter(use => use.periodId === plan.periodId && use.kind === "visit");
    const entryId = visitFingerprint(customer, day);
    assertQuota(plan, "visit", entries.length, entries.some(use => use.entryId === entryId));
    const result = await save(client);
    await addUse(plan, "visit", entryId, client);
    await enforceStorage(account, plan, client);
    return result;
  });
}
export async function countGeneratedMap(account: Owner, requestId: string) {
  if (account.role === "admin") return (await usageFor([account]))[0];
  if (!await planStoreReady()) return (await usageFor([account]))[0];
  return locked(account.id, async client => {
    const plan = await readPlan(account.id, client);
    if (!plan) return (await usageFor([account], client))[0];
    assertActive(plan);
    const all = await uses(account.id, client);
    if (all.some(use => use.kind === "map" && use.entryId === requestId)) {
      return (await usageFor([account], client))[0];
    }
    const entries = all.filter(use => use.periodId === plan.periodId && use.kind === "map");
    assertQuota(plan, "map", entries.length, entries.some(use => use.entryId === requestId));
    await addUse(plan, "map", requestId, client);
    await enforceStorage(account, plan, client);
    return (await usageFor([account], client))[0];
  });
}
/** Account deletion is the ONLY automatic removal of its contract/usage keys. */
export async function deletePlanData(id: string, sql: SqlClient) {
  if (!await planStoreReady(sql)) return;
  await sql.query("DELETE FROM app_plan_state WHERE owner_id=$1", [id]);
}
