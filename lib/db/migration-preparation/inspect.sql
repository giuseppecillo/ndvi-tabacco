-- READ-ONLY DRAFT. Not executed in this preparation.
-- Collect metadata in a READ ONLY transaction, never full customer rows.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user, session_user;
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname IN (current_user, 'app_runtime', 'app_readonly', 'app_migrator');
SELECT member_role.rolname AS member_name, parent_role.rolname AS granted_role
FROM pg_auth_members m
JOIN pg_roles member_role ON member_role.oid=m.member
JOIN pg_roles parent_role ON parent_role.oid=m.roleid;
SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
       numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('app_users','security_state','privacy_requests','security_events','osservazioni')
ORDER BY table_name, ordinal_position;
SELECT c.relname, pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S');
SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';
SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public';
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public';
SELECT grantee, table_name, privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' ORDER BY grantee, table_name, privilege_type;
SELECT n.nspname, p.proname, p.prosecdef, p.provolatile,
       pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege(current_user, p.oid, 'EXECUTE') AS executable
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public';
SELECT n.nspname, c.relname, pg_get_triggerdef(t.oid)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname='public';
COMMIT;
