/**
 * NOT imported by startup or routes. No executable main and no Secret access.
 * Future authorized Production operator supplies the two EXISTING runtime pools.
 */
import type { Pool, PoolClient } from "pg";
import { TLSSocket, checkServerIdentity } from "node:tls";
import { performance } from "node:perf_hooks";
import { aggregateComparison, checkBudget, ComparisonError, createFingerprinter, readSnapshot } from "./connection-comparison";

export interface ApprovedIdentity {
  host: string;
  port: number;
  connectionUser: string;
  database: string;
  role: string;
  sessionRole: string;
}
interface Approval {
  // Filled only after a new, specific operational authorization.
  reference: string;
  expiresAt: string;
  source: ApprovedIdentity;
  target: ApprovedIdentity;
}
const BEGIN = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY";
const IDENTITY = `SELECT pg_catalog.current_database() AS database,
  current_user AS role,session_user AS session_role,pg_catalog.pg_is_in_recovery() AS replica,
  pg_catalog.current_setting('transaction_read_only') AS readonly,
  rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user`;

function verifyTransport(client: PoolClient, expected: ApprovedIdentity) {
  const internal = client as unknown as {
    connection: { stream: TLSSocket };
    connectionParameters: { host: string; port: number; user: string; database: string };
  };
  const stream = internal.connection?.stream;
  const p = internal.connectionParameters;
  if (!(stream instanceof TLSSocket) || !stream.encrypted || !stream.authorized
    || stream.authorizationError || !["TLSv1.2", "TLSv1.3"].includes(stream.getProtocol() ?? "")
    || !stream.getPeerCertificate().raw || checkServerIdentity(expected.host, stream.getPeerCertificate())) {
    throw new ComparisonError("TLS_REJECTED");
  }
  if (!p || p.host !== expected.host || p.port !== expected.port
    || p.user !== expected.connectionUser || p.database !== expected.database) {
    throw new ComparisonError("IDENTITY_REJECTED");
  }
}
async function start(client: PoolClient, expected: ApprovedIdentity) {
  await client.query(BEGIN);
  await client.query("SET LOCAL statement_timeout='5s'");
  await client.query("SET LOCAL lock_timeout='1s'");
  await client.query("SET LOCAL idle_in_transaction_session_timeout='15s'");
  await client.query("SET LOCAL timezone='UTC'");
  await client.query("SET LOCAL datestyle='ISO, YMD'");
  await client.query("SET LOCAL search_path=pg_catalog");
  const rows = (await client.query(IDENTITY)).rows;
  const identity = rows[0];
  if (rows.length !== 1 || identity.readonly !== "on") throw new ComparisonError("READONLY_REQUIRED");
  if (identity.database !== expected.database || identity.role !== expected.role
    || identity.session_role !== expected.sessionRole || identity.replica !== false
    || identity.rolsuper || identity.rolcreaterole || identity.rolcreatedb || identity.rolbypassrls) {
    throw new ComparisonError("IDENTITY_REJECTED");
  }
}
// Late connections are destroyed after timeout, not leaked into an abandoned job.
async function connect(pool: Pick<Pool, "connect">): Promise<PoolClient> {
  const pending = pool.connect();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  try {
    return await Promise.race([pending.then(client => {
      if (expired) { client.release(true); throw new ComparisonError("LIMIT_EXCEEDED"); }
      return client;
    }), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(new ComparisonError("LIMIT_EXCEEDED")); }, 10_000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function runProductionConnectionComparison(
  env: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "REPLIT_DEPLOYMENT" | "NITROCROP_DB_BACKEND"
    | "NITROCROP_CONNECTION_COMPARISON" | "NODE_TLS_REJECT_UNAUTHORIZED">>,
  approval: Approval, sourcePool: Pick<Pool, "connect">, targetPool: Pick<Pool, "connect">,
) {
  // No network before checking gates. Flag must never be enabled by app startup.
  if (env.NODE_ENV !== "production" || env.REPLIT_DEPLOYMENT !== "1"
    || env.NITROCROP_DB_BACKEND !== "supabase" || env.NITROCROP_CONNECTION_COMPARISON !== "approved-once"
    || env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
    || !approval?.reference?.trim() || !Number.isFinite(Date.parse(approval.expiresAt))
    || Date.parse(approval.expiresAt) <= Date.now() || Date.parse(approval.expiresAt) > Date.now() + 3_600_000
    || !approval.source?.host || !approval.source.connectionUser || !approval.source.database
    || !approval.source.role || !approval.source.sessionRole || approval.source.port !== 5432
    || approval.target?.host !== "aws-0-eu-west-1.pooler.supabase.com" || approval.target.port !== 5432
    || approval.target.connectionUser !== "app_runtime.bhnaarbzpmcniesxyldx" || approval.target.database !== "postgres"
    || approval.target.role !== "app_runtime" || approval.target.sessionRole !== "app_runtime") {
    throw new ComparisonError("PRODUCTION_APPROVAL_REQUIRED");
  }
  const clients: { client: PoolClient; begun: boolean; verified: boolean }[] = [];
  let report: object | undefined;
  let failure: ComparisonError | undefined;
  const began = new Date().toISOString();
  const clock = performance.now();
  // Both origins share one overall data budget. No data is sampled or skipped on limit.
  const budget = { rows: 0, bytes: 0, deadline: Date.now() + 60_000 };
  const fingerprint = createFingerprinter();
  try {
    const snapshots = [];
    const windows = [];
    // Sequential snapshots keep each READ ONLY transaction active, avoiding idle
    // timeout while the other origin is being scanned. They are NOT simultaneous.
    for (const [pool, identity] of [[sourcePool, approval.source], [targetPool, approval.target]] as const) {
      checkBudget(budget);
      const client = await connect(pool);
      const state = { client, begun: false, verified: false };
      clients.push(state);
      const from = new Date().toISOString();
      verifyTransport(client, identity);
      state.verified = true;
      state.begun = true;
      await start(client, identity);
      snapshots.push(await readSnapshot(client, fingerprint, budget));
      await client.query("ROLLBACK");
      state.begun = false;
      windows.push({ from, to: new Date().toISOString() });
    }
    checkBudget(budget);
    report = { status: "compared_visible_rows", startedAt: began, endedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - clock), snapshots: windows,
      tlsAndIdentityVerified: true, readOnly: true, simultaneousSnapshots: false,
      cutoverAuthorized: false, fullVisibilityCertified: false,
      tables: aggregateComparison(snapshots[0], snapshots[1]) };
  } catch (error) {
    failure = error instanceof ComparisonError ? error : new ComparisonError("COMPARISON_FAILED");
  } finally {
    for (const { client, begun, verified } of clients) {
      let destroy = !verified;
      try { if (begun) await client.query("ROLLBACK"); }
      catch { destroy = true; failure = new ComparisonError("CLEANUP_FAILED"); }
      try { client.release(destroy); }
      catch { failure = new ComparisonError("CLEANUP_FAILED"); }
    }
  }
  if (failure) throw failure;
  return report!;
}
