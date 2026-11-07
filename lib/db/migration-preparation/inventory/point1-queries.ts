/**
 * Migration point 1 only: fixed metadata reads, never executable DDL/DML.
 * Deparsing a definition does not invoke the function/default it describes.
 */
const tables = "('app_users','security_state','privacy_requests','security_events','osservazioni')";
export const POINT1_QUERIES = Object.freeze({
  applicationRelations: `SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
    pg_catalog.pg_get_userbyid(c.relowner) AS owner,c.relacl::text AS acl
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} ORDER BY c.relname LIMIT 6`,
  applicationColumns: `SELECT c.relname,a.attnum,a.attname,
    pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname IN ${tables}
    AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum LIMIT 501`,
  applicationConstraints: `SELECT c.relname,k.conname,k.contype,k.convalidated,
    pg_catalog.pg_get_constraintdef(k.oid,true) AS definition
    FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} ORDER BY c.relname,k.conname LIMIT 501`,
  applicationIndexes: `SELECT t.relname AS table_name,i.relname AS index_name,
    pg_catalog.pg_get_indexdef(i.oid) AS definition
    FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class t ON t.oid=x.indrelid
    JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname IN ${tables} ORDER BY t.relname,i.relname LIMIT 501`,
  rlsRoutine: `SELECT p.oid::text AS routine_oid,n.nspname,p.proname,p.prokind,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner,l.lanname,p.prosecdef,p.provolatile,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
    pg_catalog.pg_get_function_result(p.oid) AS result_type,p.proconfig,p.proacl::text AS acl,
    pg_catalog.pg_get_functiondef(p.oid) AS definition
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND p.proname='rls_auto_enable'
    AND p.pronargs=0 AND p.prokind='f' LIMIT 2`,
  rlsEventTrigger: `SELECT e.evtname,e.evtevent,e.evtenabled,e.evttags,
    e.evtfoid::text AS routine_oid,pg_catalog.pg_get_userbyid(e.evtowner) AS owner,
    n.nspname AS routine_schema,p.proname AS routine_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS argument_types,
    pg_catalog.pg_get_function_result(p.oid) AS result_type
    FROM pg_catalog.pg_event_trigger e JOIN pg_catalog.pg_proc p ON p.oid=e.evtfoid
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE e.evtname='ensure_rls' LIMIT 2`,
});
