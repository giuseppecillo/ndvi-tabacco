-- INACTIVE. Backend Express/Clerk enforces account isolation.
-- These policies authorize backend DB roles, NOT Supabase API/JWT users.
DO $protection$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_users','security_state','privacy_requests','security_events','osservazioni'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_readonly', t);
    EXECUTE format(
      'CREATE POLICY migration_owner ON public.%I FOR ALL TO app_migrator USING (true) WITH CHECK (true)', t);
    EXECUTE format(
      'CREATE POLICY backend_read ON public.%I FOR SELECT TO app_runtime, app_readonly USING (true)', t);
    EXECUTE format('GRANT SELECT ON public.%I TO app_runtime, app_readonly', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['app_users','privacy_requests','osservazioni'] LOOP
    EXECUTE format(
      'CREATE POLICY backend_write ON public.%I FOR ALL TO app_runtime USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO app_runtime', t);
  END LOOP;
END
$protection$;

GRANT INSERT ON public.security_events TO app_runtime;
GRANT UPDATE (actor_id, target_id) ON public.security_events TO app_runtime;
CREATE POLICY backend_audit_insert ON public.security_events
  FOR INSERT TO app_runtime WITH CHECK (true);
CREATE POLICY backend_audit_anonymize ON public.security_events
  FOR UPDATE TO app_runtime USING (true) WITH CHECK (true);
-- No UPDATE(action), UPDATE(id), DELETE or TRUNCATE audit grants.
-- security_state stays SELECT-only for runtime; initial_admin comes from source.

DO $verify$
DECLARE t text; api_role text;
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'
        AND c.relname IN ('app_users','security_state','privacy_requests','security_events','osservazioni')
        AND c.relrowsecurity AND c.relforcerowsecurity
        AND c.relowner='app_migrator'::regrole) <> 5 THEN
    RAISE EXCEPTION 'Application ownership/RLS verification failed';
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'app_users','security_state','privacy_requests','security_events','osservazioni'
  ] LOOP
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_table_privilege(api_role,format('public.%I',t),
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        RAISE EXCEPTION 'Unexpected Data API ACL on application table';
      END IF;
    END LOOP;
    IF has_table_privilege('app_readonly',format('public.%I',t),
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected readonly application write ACL';
    END IF;
  END LOOP;
  IF NOT has_column_privilege('app_runtime','public.security_events','actor_id','UPDATE')
     OR NOT has_column_privilege('app_runtime','public.security_events','target_id','UPDATE')
     OR has_column_privilege('app_runtime','public.security_events','action','UPDATE')
     OR has_table_privilege('app_readonly','public.osservazioni','INSERT')
     OR has_table_privilege('anon','public.osservazioni','SELECT')
     OR has_table_privilege('authenticated','public.osservazioni','SELECT')
     OR has_table_privilege('service_role','public.osservazioni','SELECT') THEN
    RAISE EXCEPTION 'Application ACL verification failed';
  END IF;
END
$verify$;
