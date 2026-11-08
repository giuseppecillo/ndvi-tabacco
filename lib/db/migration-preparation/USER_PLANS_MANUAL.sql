-- PREPARED ONLY. Do not run without the owner's explicit authorization.
-- Target: the existing "Agri Precision" Supabase project only.
-- No DATABASE_URL changes, data migration, user assignment or modification of
-- existing tables/default privileges/managed roles. Never run at app startup.
-- A pre-existing table is an error, not an invitation to replace its data.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.app_plan_state (
  key text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  value text NOT NULL,
  CONSTRAINT app_plan_state_namespace CHECK (
    key LIKE 'nc_plan:%' OR key LIKE 'nc_contract:%' OR key LIKE 'nc_usage:%'
  )
);
CREATE INDEX app_plan_state_owner_idx ON public.app_plan_state(owner_id);

-- Protect the new table before COMMIT makes it visible to the Data API.
REVOKE ALL ON TABLE public.app_plan_state FROM PUBLIC, anon, authenticated, service_role, app_runtime, app_readonly;
ALTER TABLE public.app_plan_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_plan_state FORCE ROW LEVEL SECURITY;
CREATE POLICY app_plan_state_runtime ON public.app_plan_state
  FOR ALL TO app_runtime USING (true) WITH CHECK (true);
CREATE POLICY app_plan_state_readonly ON public.app_plan_state
  FOR SELECT TO app_readonly USING (true);
CREATE POLICY app_plan_state_migrator ON public.app_plan_state
  FOR ALL TO app_migrator USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_plan_state TO app_runtime;
GRANT SELECT ON public.app_plan_state TO app_readonly;
GRANT ALL ON public.app_plan_state TO app_migrator;
ALTER TABLE public.app_plan_state OWNER TO app_migrator;

DO $verification$
DECLARE api_role text; operation text; policy_count integer;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_table_privilege(api_role,'public.app_plan_state','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected Data API access to plan metadata';
    END IF;
  END LOOP;
  FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF NOT has_table_privilege('app_runtime','public.app_plan_state',operation) THEN
      RAISE EXCEPTION 'Missing runtime privilege on plan metadata';
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='app_plan_state'
      AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN RAISE EXCEPTION 'Plan metadata RLS is not enforced'; END IF;
  SELECT count(*) INTO policy_count FROM pg_policy WHERE polrelid='public.app_plan_state'::regclass;
  IF policy_count <> 3 THEN RAISE EXCEPTION 'Unexpected plan metadata policies'; END IF;
END
$verification$;
COMMIT;
-- Any error must be followed by ROLLBACK/connection closure, never partial retries.
