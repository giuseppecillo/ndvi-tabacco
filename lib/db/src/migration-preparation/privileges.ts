/**
 * INACTIVE. Catalog-only privilege inspection; never imports a live pool.
 * Intentionally conservative: no inherited role or executable user routine is
 * approved implicitly. Review target-specific exceptions before activation.
 */
import type { RoleInspection } from "./connection";
import type { ReadonlyQueryClient } from "./startup";

export async function inspectDatabaseRole(client: ReadonlyQueryClient): Promise<RoleInspection> {
  const { rows } = await client.query(`
    WITH ordinary_schemas AS (
      SELECT oid, nspowner FROM pg_namespace
      WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
    ), relations AS (
      SELECT c.* FROM pg_class c JOIN ordinary_schemas n ON n.oid=c.relnamespace
    ), routines AS (
      SELECT p.* FROM pg_proc p JOIN ordinary_schemas n ON n.oid=p.pronamespace
    )
    SELECT current_user::text AS "currentUser", session_user::text AS "sessionUser",
      r.rolsuper AS superuser, r.rolcreaterole AS "createRole",
      r.rolcreatedb AS "createDatabase", r.rolreplication AS replication,
      r.rolbypassrls AS "bypassRls",
      (
        EXISTS(SELECT 1 FROM relations WHERE relowner=r.oid)
        OR EXISTS(SELECT 1 FROM ordinary_schemas WHERE nspowner=r.oid)
        OR EXISTS(SELECT 1 FROM routines WHERE proowner=r.oid)
        OR EXISTS(SELECT 1 FROM pg_type t JOIN ordinary_schemas n ON n.oid=t.typnamespace WHERE t.typowner=r.oid)
      ) AS "ownsApplicationObjects",
      EXISTS(SELECT 1 FROM ordinary_schemas WHERE has_schema_privilege(r.oid,oid,'CREATE'))
        AS "canCreateInApplicationSchema",
      has_database_privilege(r.oid,current_database(),'CREATE') AS "canCreateSchema",
      has_database_privilege(r.oid,current_database(),'TEMP') AS "canCreateTemporaryObjects",
      EXISTS(SELECT 1 FROM pg_roles other WHERE other.oid<>r.oid
        AND pg_has_role(r.oid,other.oid,'MEMBER')) AS "canAssumePrivilegedRole",
      EXISTS(SELECT 1 FROM relations c WHERE CASE WHEN c.relkind IN ('r','p','v','m','f') THEN (
        has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE,REFERENCES')
      ) ELSE false END) AS "hasWritePrivileges",
      EXISTS(SELECT 1 FROM relations c WHERE CASE WHEN c.relkind='S'
        THEN has_sequence_privilege(r.oid,c.oid,'USAGE,UPDATE') ELSE false END) AS "hasSequenceMutationPrivileges",
      (
        EXISTS(SELECT 1 FROM routines p WHERE has_function_privilege(r.oid,p.oid,'EXECUTE'))
        OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
          WHERE n.nspname='pg_catalog' AND p.proname = ANY(ARRAY[
            'lo_create','lo_creat','lo_from_bytea','lo_put','lo_unlink',
            'lo_import','lo_export','lo_open','lowrite','lo_truncate','lo_truncate64'
          ]) AND has_function_privilege(r.oid,p.oid,'EXECUTE'))
      )
        AS "hasUnsafeFunctionAccess"
    FROM pg_roles r WHERE r.rolname=current_user
  `);
  if (rows.length !== 1) throw new Error("Database privilege inspection did not return one role.");
  const row = rows[0];
  const booleanKeys = [
    "superuser", "createRole", "createDatabase", "replication", "bypassRls",
    "ownsApplicationObjects", "canCreateInApplicationSchema", "canCreateSchema",
    "canCreateTemporaryObjects", "canAssumePrivilegedRole", "hasWritePrivileges",
    "hasSequenceMutationPrivileges", "hasUnsafeFunctionAccess",
  ];
  if (typeof row.currentUser !== "string" || typeof row.sessionUser !== "string"
      || booleanKeys.some(key => typeof row[key] !== "boolean")) {
    throw new Error("Incomplete database privilege inspection.");
  }
  return row as unknown as RoleInspection;
}
