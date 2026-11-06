/**
 * Fixed, catalog-only statements. No table contents, defaults, policy
 * expressions, function bodies, server/user-mapping options or passwords.
 */
import { InventoryBlocked } from "./guard";

export const METADATA_QUERIES = Object.freeze({
  identity: `SELECT pg_catalog.current_database() AS database,
    current_user::text AS current_user, session_user::text AS session_user,
    pg_catalog.current_setting('server_version') AS server_version,
    pg_catalog.current_setting('transaction_read_only') AS transaction_read_only,
    pg_catalog.current_setting('default_transaction_read_only') AS default_transaction_read_only`,
  database: `SELECT d.datname, pg_catalog.pg_get_userbyid(d.datdba) AS owner, d.datacl::text AS acl,
    pg_catalog.has_database_privilege(current_user,d.oid,'CREATE') AS admin_can_create_schema,
    pg_catalog.has_database_privilege(current_user,d.oid,'TEMP') AS admin_can_create_temp
    FROM pg_catalog.pg_database d WHERE d.datname=pg_catalog.current_database()`,
  roles: `SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin,
    rolreplication, rolbypassrls, rolconnlimit,
    COALESCE(rolconfig @> ARRAY['default_transaction_read_only=on'],false) AS readonly_default
    FROM pg_catalog.pg_roles ORDER BY rolname LIMIT 5001`,
  memberships: `SELECT r.rolname AS granted_role, u.rolname AS member,
    g.rolname AS grantor, m.admin_option,
    pg_catalog.to_jsonb(m)->>'inherit_option' AS inherit_option,
    pg_catalog.to_jsonb(m)->>'set_option' AS set_option
    FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.roleid
    JOIN pg_catalog.pg_roles u ON u.oid=m.member
    JOIN pg_catalog.pg_roles g ON g.oid=m.grantor
    ORDER BY r.rolname,u.rolname LIMIT 5001`,
  schemas: `SELECT n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) AS owner, n.nspacl::text AS acl
    FROM pg_catalog.pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    ORDER BY n.nspname LIMIT 5001`,
  relations: `SELECT n.nspname, c.relname,c.relkind,
    pg_catalog.pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text AS acl
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    AND c.relkind IN ('r','p','v','m','f','S') ORDER BY n.nspname,c.relname LIMIT 5001`,
  columns: `SELECT n.nspname,c.relname,a.attnum,a.attname,
    pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,
    a.atthasdef AS has_default,a.attidentity,a.attgenerated,a.attacl::text AS acl
    FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    AND c.relkind IN ('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY n.nspname,c.relname,a.attnum LIMIT 5001`,
  constraints: `SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,
    k.condeferrable,k.condeferred,k.conkey,k.confkey,k.confdeltype,k.confupdtype
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_namespace n ON n.oid=k.connamespace
    LEFT JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    ORDER BY n.nspname,c.relname,k.conname LIMIT 5001`,
  indexes: `SELECT n.nspname,t.relname AS table_name,c.relname AS index_name,
    i.indisunique,i.indisprimary,i.indisvalid,i.indkey::text AS column_numbers,
    (i.indexprs IS NOT NULL) AS has_expressions,(i.indpred IS NOT NULL) AS has_predicate
    FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class t ON t.oid=i.indrelid
    JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    ORDER BY n.nspname,t.relname,c.relname LIMIT 5001`,
  routines: `SELECT n.nspname,p.proname,p.prokind,p.oid::text AS oid,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner,l.lanname,p.prosecdef,p.provolatile,p.proleakproof,
    p.proacl::text AS acl,
    EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang
    WHERE (n.nspname !~ '^pg_' AND n.nspname<>'information_schema') OR
      (n.nspname='pg_catalog' AND p.proname=ANY(ARRAY[
        'lo_create','lo_creat','lo_from_bytea','lo_put','lo_unlink',
        'lo_import','lo_export','lo_open','lowrite','lo_truncate','lo_truncate64']))
    ORDER BY n.nspname,p.proname,p.oid LIMIT 5001`,
  defaults: `SELECT r.rolname AS creator,n.nspname,d.defaclobjtype,d.defaclacl::text AS acl
    FROM pg_catalog.pg_default_acl d JOIN pg_catalog.pg_roles r ON r.oid=d.defaclrole
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
    ORDER BY r.rolname,n.nspname,d.defaclobjtype LIMIT 5001`,
  policies: `SELECT n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,p.polroles,
    (p.polqual IS NOT NULL) AS has_using,(p.polwithcheck IS NOT NULL) AS has_check
    FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    ORDER BY n.nspname,c.relname,p.polname LIMIT 5001`,
  extensions: `SELECT e.extname,e.extversion,n.nspname,e.extrelocatable
    FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace
    ORDER BY e.extname LIMIT 5001`,
  triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgfoid::text AS routine_oid
    FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    ORDER BY n.nspname,c.relname,t.tgname LIMIT 5001`,
  eventTriggers: `SELECT evtname,evtevent,evtenabled,evtfoid::text AS routine_oid
    FROM pg_catalog.pg_event_trigger ORDER BY evtname LIMIT 5001`,
  apiSchemaHints: `SELECT r.rolname,d.datname,setting AS schema_setting
    FROM pg_catalog.pg_db_role_setting s
    LEFT JOIN pg_catalog.pg_roles r ON r.oid=s.setrole
    LEFT JOIN pg_catalog.pg_database d ON d.oid=s.setdatabase
    CROSS JOIN LATERAL pg_catalog.unnest(s.setconfig) AS setting
    WHERE pg_catalog.split_part(setting,'=',1) IN ('pgrst.db_schemas','pgrst.db_extra_search_path')
    ORDER BY r.rolname,d.datname,setting LIMIT 5001`,
});

export interface CatalogClient {
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
}
export async function readMetadata(client: CatalogClient) {
  const result: Record<string, Record<string, unknown>[]> = {};
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    for (const [name, sql] of Object.entries(METADATA_QUERIES)) {
      const { rows } = await client.query(sql);
      if (rows.length > 5000) throw new InventoryBlocked("METADATA_LIMIT_EXCEEDED");
      result[name] = rows;
      if (name === "identity" && (rows.length !== 1 ||
          rows[0].database !== "postgres" || rows[0].current_user !== "postgres" ||
          rows[0].session_user !== "postgres" || rows[0].transaction_read_only !== "on" ||
          rows[0].default_transaction_read_only !== "on")) {
        throw new InventoryBlocked("SERVER_IDENTITY_OR_READONLY_MISMATCH");
      }
    }
    return result;
  } finally {
    // Also on success: no COMMIT, no DDL/DML, no temp objects.
    await client.query("ROLLBACK");
  }
}
