// Inert preparation: no pools, environment reads, entry point, file I/O or logs.
import { createHmac, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";

export type ReadClient = Pick<PoolClient, "query">;
export const TABLES = [
  { schema: "public", name: "app_users", keys: ["id"], owners: [] },
  { schema: "public", name: "security_state", keys: ["key"], owners: [] },
  { schema: "public", name: "osservazioni", keys: ["owner_id", "observation_id"], owners: ["owner_id"] },
  { schema: "public", name: "privacy_requests", keys: ["id"], owners: ["user_id"] },
  { schema: "public", name: "security_events", keys: ["id"], owners: ["actor_id", "target_id"] },
  { schema: "public", name: "app_plan_state", keys: ["key"], owners: ["owner_id"] },
  { schema: "agronomy_catalogue", name: "model_profiles", keys: ["version", "crop", "variety"], owners: [] },
  { schema: "agronomy_catalogue", name: "variety_submissions", keys: ["id"], owners: ["submitted_by", "reviewed_by"] },
] as const;

export class ComparisonError extends Error {
  constructor(public readonly code: "LIMIT_EXCEEDED" | "UNEXPECTED_SHAPE" | "PRODUCTION_APPROVAL_REQUIRED"
    | "IDENTITY_REJECTED" | "TLS_REJECTED" | "READONLY_REQUIRED" | "COMPARISON_FAILED" | "CLEANUP_FAILED") {
    super(code); // Never preserve raw driver errors, rows, SQL or causes.
  }
}

const METADATA = `SELECT c.relkind AS kind,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced_rls,
  pg_catalog.has_table_privilege(c.oid,'SELECT') AS readable,
  (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attname,
    pg_catalog.format_type(a.atttypid,a.atttypmod),a.attnotnull) ORDER BY a.attname)
   FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
  (SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_constraintdef(k.oid,true) ORDER BY k.contype,k.conname)
   FROM pg_catalog.pg_constraint k WHERE k.conrelid=c.oid) AS constraints
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname=$1 AND c.relname=$2`;

interface Summary {
  shape: string;
  rls: boolean;
  forcedRls: boolean;
  records: Map<string, string>;
  owners: Set<string>;
  ownerReferences: string[];
  firstCreatedAt: string | null;
  lastCreatedAt: string | null;
}
export interface ComparisonBudget {
  rows: number;
  bytes: number;
  deadline: number;
}
export function checkBudget(budget: ComparisonBudget) {
  if (budget.rows > 40_000 || budget.bytes > 32 * 1024 * 1024 || Date.now() > budget.deadline) {
    throw new ComparisonError("LIMIT_EXCEEDED");
  }
}
// New random run-local HMAC key; fingerprints and identifiers never enter reports.
export function createFingerprinter() {
  const key = randomBytes(32);
  return (domain: string, value: string) => createHmac("sha256", key).update(domain).update("\0").update(value).digest("hex");
}
type Fingerprint = ReturnType<typeof createFingerprinter>;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Caller owns READ ONLY transaction and transport/identity verification. */
export async function readSnapshot(client: ReadClient, fingerprint: Fingerprint, budget: ComparisonBudget) {
  const tables = new Map<string, Summary | null>();
  for (const table of TABLES) {
    checkBudget(budget);
    const relation = `${table.schema}.${table.name}`;
    const meta = (await client.query(METADATA, [table.schema, table.name])).rows;
    if (!meta.length) { tables.set(relation, null); continue; }
    const m = meta[0];
    if (meta.length !== 1 || m.kind !== "r" || m.readable !== true || !Array.isArray(m.columns)
      || !table.keys.every(key => m.columns.some((column: unknown[]) => column[0] === key))
      || !table.owners.every(key => m.columns.some((column: unknown[]) => column[0] === key))) {
      throw new ComparisonError("UNEXPECTED_SHAPE");
    }
    const summary: Summary = { shape: canonical({ columns: m.columns, constraints: m.constraints }),
      rls: m.rls === true, forcedRls: m.forced_rls === true, records: new Map(),
      owners: new Set(), ownerReferences: [], firstCreatedAt: null, lastCreatedAt: null };
    // Only identifiers from the fixed manifest above, never user-supplied SQL.
    // Bounded output per row and batch. A large row is an error, not truncation.
    const sql = `DECLARE comparison_rows NO SCROLL CURSOR FOR SELECT
      CASE WHEN pg_catalog.octet_length(pg_catalog.to_jsonb(t)::text)<=65536
      THEN pg_catalog.to_jsonb(t)::text ELSE NULL END AS payload
      FROM "${table.schema}"."${table.name}" t
      ORDER BY ${table.keys.map(key => `"${key}"`).join(",")}`;
    await client.query(sql);
    try {
      while (true) {
        checkBudget(budget);
        const { rows } = await client.query("FETCH FORWARD 100 FROM comparison_rows");
        if (rows.length > 100) throw new ComparisonError("UNEXPECTED_SHAPE");
        for (const { payload } of rows) {
          if (typeof payload !== "string") throw new ComparisonError("LIMIT_EXCEEDED");
          budget.rows++;
          budget.bytes += Buffer.byteLength(payload);
          checkBudget(budget);
          if (summary.records.size >= 5_000) throw new ComparisonError("LIMIT_EXCEEDED");
          const row = JSON.parse(payload) as Record<string, unknown>;
          if (!row || typeof row !== "object" || Array.isArray(row)
            || table.keys.some(key => typeof row[key] !== "string")) {
            throw new ComparisonError("UNEXPECTED_SHAPE");
          }
          const key = fingerprint(relation, canonical(table.keys.map(key => row[key])));
          if (summary.records.has(key)) throw new ComparisonError("UNEXPECTED_SHAPE");
          // Hash PostgreSQL's JSONB text, not JS-parsed numbers: parsing bigint
          // or numeric into Number could hide changes beyond 2^53.
          summary.records.set(key, fingerprint(relation, payload));
          if (table.name === "app_users") summary.owners.add(fingerprint("owner", String(row.id)));
          for (const owner of table.owners) {
            if (row[owner] != null) {
              if (typeof row[owner] !== "string") throw new ComparisonError("UNEXPECTED_SHAPE");
              summary.ownerReferences.push(fingerprint("owner", row[owner]));
            }
          }
          if (typeof row.created_at === "string" && Number.isFinite(Date.parse(row.created_at))) {
            const date = new Date(row.created_at).toISOString();
            if (!summary.firstCreatedAt || date < summary.firstCreatedAt) summary.firstCreatedAt = date;
            if (!summary.lastCreatedAt || date > summary.lastCreatedAt) summary.lastCreatedAt = date;
          }
        }
        if (rows.length < 100) break;
      }
    } finally {
      await client.query("CLOSE comparison_rows");
    }
    tables.set(relation, summary);
  }
  return tables;
}

export function aggregateComparison(source: Awaited<ReturnType<typeof readSnapshot>>,
  target: Awaited<ReturnType<typeof readSnapshot>>) {
  const owners = (tables: typeof source) => tables.get("public.app_users")?.owners;
  const stats = (table: Summary | null | undefined, accounts: Set<string> | undefined) => table ? {
    rows: table.records.size, rls: table.rls, forcedRls: table.forcedRls,
    // null means unavailable, not zero; audit references may intentionally outlive accounts.
    unmatchedOwnerReferences: accounts ? table.ownerReferences.filter(id => !accounts.has(id)).length : null,
    firstCreatedAt: table.firstCreatedAt, lastCreatedAt: table.lastCreatedAt,
  } : null;
  return TABLES.map(table => {
    const name = `${table.schema}.${table.name}`;
    const a = source.get(name), b = target.get(name);
    let onlySource = 0, onlyTarget = 0, changed = 0;
    if (a && b) {
      for (const [key, hash] of a.records) {
        if (!b.records.has(key)) onlySource++;
        else if (b.records.get(key) !== hash) changed++;
      }
      for (const key of b.records.keys()) if (!a.records.has(key)) onlyTarget++;
    }
    return { table: name, source: stats(a, owners(source)), target: stats(b, owners(target)),
      schemaEqual: a && b ? a.shape === b.shape : null,
      differences: a && b ? { onlySource, onlyTarget, changed } : null };
  });
}
