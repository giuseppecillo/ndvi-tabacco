-- DRAFT / INACTIVE. No password literals and no automatic execution.
-- Run only on the approved EXTERNAL Supabase target after separate approval.
-- First reconcile existing grants, membership, RLS, views and functions.
-- Existing Supabase technical roles are NOT to be removed.
-- This draft intentionally fails on existing role names rather than overwriting.
BEGIN;
CREATE ROLE app_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE app_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- Activation must separately provision LOGIN + credentials through the secure
-- mechanism; neither runtime nor readonly may be members of app_migrator.
-- app_migrator must own ONLY application objects (via reviewed restore ownership
-- mapping). This script deliberately does not transfer existing object owners.
-- PUBLIC grants are shared: revoke only after auditing all affected consumers.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- PostgreSQL normally grants TEMPORARY to PUBLIC on a database. Merely setting
-- default_transaction_read_only does not prevent a role from turning it off.
-- Review ALL consumers before applying this database-wide change on a target.
DO $$
BEGIN
  EXECUTE format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END; $$;
GRANT USAGE, CREATE ON SCHEMA public TO app_migrator;
GRANT USAGE ON SCHEMA public TO app_runtime, app_readonly;

REVOKE ALL ON public.app_users, public.security_state, public.privacy_requests,
  public.security_events, public.osservazioni FROM app_runtime, app_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users, public.privacy_requests,
  public.osservazioni TO app_runtime;
GRANT SELECT ON public.security_state TO app_runtime;
GRANT SELECT, INSERT ON public.security_events TO app_runtime;
-- Readonly scope is deliberately explicit, never ALL TABLES / future tables.
-- Review personal-data exposure and substitute redacted views before activation.
GRANT SELECT ON public.app_users, public.security_state, public.privacy_requests,
  public.security_events, public.osservazioni TO app_readonly;
ALTER ROLE app_readonly SET default_transaction_read_only = on;

-- Large-object SQL functions can write outside ordinary table ACLs. There is
-- no per-role DENY overriding PUBLIC EXECUTE: review the impact on ALL database
-- consumers before activation. A hosted target may require its administrator
-- to authorize these catalog-function revocations; never silently skip them.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pg_catalog' AND p.proname = ANY(ARRAY[
      'lo_create','lo_creat','lo_from_bytea','lo_put','lo_unlink',
      'lo_import','lo_export','lo_open','lowrite','lo_truncate','lo_truncate64'
    ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f.signature);
  END LOOP;
END; $$;

-- Permissions for NEW functions created by the migration owner. A global
-- default revoke is required; schema-only revoke cannot undo a global default.
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- No future tables/sequences automatically granted. Each migration must carry
-- explicit grants and function/trigger review. No service_role/anon grants.
-- Existing PUBLIC function EXECUTE and inherited privileges require an audited
-- revocation plan; this draft must NOT be treated as complete role hardening.
COMMIT;
