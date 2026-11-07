import { schemaIncompatibilities, type SchemaRow, type SchemaMetadata } from "./schema-contract";

const tables = "('app_users','security_state','privacy_requests','security_events','osservazioni')";
/** Fixed catalog SELECTs; expressions are deparsed, never evaluated. */
export const SCHEMA_QUERIES = Object.freeze({
  relations: `SELECT c.relname AS table_name,c.relkind AS kind,
    pg_catalog.pg_table_is_visible(c.oid) AS visible
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} LIMIT 6`,
  columns: `SELECT c.relname AS table_name,a.attname AS column_name,
    pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,
    a.attidentity AS identity,a.attgenerated AS generated,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname IN ${tables}
    AND a.attnum>0 AND NOT a.attisdropped LIMIT 501`,
  constraints: `SELECT c.relname AS table_name,k.contype AS kind,k.convalidated AS validated,
    k.condeferrable AS deferrable,pg_catalog.pg_get_constraintdef(k.oid,true) AS definition,
    ARRAY(SELECT a.attname::text FROM pg_catalog.unnest(k.conkey) WITH ORDINALITY AS key(attnum,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum ORDER BY key.ord) AS columns,
    fn.nspname AS foreign_schema,fc.relname AS foreign_table,k.confdeltype AS delete_action,
    ARRAY(SELECT a.attname::text FROM pg_catalog.unnest(k.confkey) WITH ORDINALITY AS key(attnum,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=fc.oid AND a.attnum=key.attnum ORDER BY key.ord) AS foreign_columns
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_catalog.pg_class fc ON fc.oid=k.confrelid
    LEFT JOIN pg_catalog.pg_namespace fn ON fn.oid=fc.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} LIMIT 501`,
  indexes: `SELECT t.relname AS table_name,i.indisunique AS unique,i.indisvalid AS valid,
    i.indisready AS ready,i.indimmediate AS immediate,
    (i.indpred IS NOT NULL) AS partial,(i.indexprs IS NOT NULL) AS expression,
    ARRAY(SELECT a.attname::text FROM pg_catalog.unnest(i.indkey) WITH ORDINALITY AS key(attnum,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid AND a.attnum=key.attnum
      WHERE key.ord<=i.indnkeyatts ORDER BY key.ord) AS columns
    FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname IN ${tables} LIMIT 501`,
});
export const ADMIN_MAPPING_QUERY = `SELECT EXISTS (
  SELECT 1 FROM public.security_state s JOIN public.app_users u ON u.id=s.value
  WHERE s.key='initial_admin' AND u.role='admin'
) AS valid_initial_admin`;
export const BEGIN_SCHEMA_CHECK = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY";
export const SCHEMA_READONLY_PROBE =
  "SELECT pg_catalog.current_setting('transaction_read_only') AS transaction_read_only";
export interface SchemaCheckClient {
  query(sql: string): Promise<{ rows: SchemaRow[] }>;
}
export class SchemaVerificationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Database schema verification failed: ${issues.join("; ")}. Authorized migration required; no automatic changes were made.`);
    this.name = "SchemaVerificationError";
  }
}

/** Runs before listen. No DDL, seed, advisory lock, backfill, COMMIT or retries. */
export async function verifyApplicationSchema(client: SchemaCheckClient): Promise<void> {
  const allowed = new Set<string>([...Object.values(SCHEMA_QUERIES), ADMIN_MAPPING_QUERY]);
  try {
    await client.query(BEGIN_SCHEMA_CHECK);
    const select = async (sql: string) => {
      if (!allowed.has(sql)) throw new SchemaVerificationError(["unauthorized verification query"]);
      const probe = await client.query(SCHEMA_READONLY_PROBE);
      if (probe.rows.length !== 1 || probe.rows[0].transaction_read_only !== "on") {
        throw new SchemaVerificationError(["verification transaction is not READ ONLY"]);
      }
      const result = await client.query(sql);
      if (result.rows.length > (sql === SCHEMA_QUERIES.relations ? 5 : 500)) {
        throw new SchemaVerificationError(["catalog result exceeds verification limits"]);
      }
      return result.rows;
    };
    const metadata = {} as SchemaMetadata;
    for (const key of Object.keys(SCHEMA_QUERIES) as (keyof SchemaMetadata)[]) {
      metadata[key] = await select(SCHEMA_QUERIES[key]);
    }
    const issues = schemaIncompatibilities(metadata);
    if (issues.length) throw new SchemaVerificationError(issues);
    // Only a boolean leaves the database: no account details or identifiers.
    const mapping = await select(ADMIN_MAPPING_QUERY);
    if (mapping.length !== 1 || mapping[0].valid_initial_admin !== true) {
      throw new SchemaVerificationError(["existing initial administrator mapping missing or invalid; bootstrap disabled"]);
    }
  } catch (error) {
    if (error instanceof SchemaVerificationError) throw error;
    // Do not leak driver details, SQL parameters, URLs or account information.
    throw new SchemaVerificationError(["could not complete read-only schema verification"]);
  } finally {
    try { await client.query("ROLLBACK"); }
    catch { throw new SchemaVerificationError(["verification ROLLBACK failed"]); }
  }
}
