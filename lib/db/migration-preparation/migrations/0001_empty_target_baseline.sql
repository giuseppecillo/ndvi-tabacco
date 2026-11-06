-- DRAFT / INACTIVE. Only a new EMPTY external target after explicit approval.
-- Not for Replit managed production. Never run before/over a full pg_restore.
-- Reconcile this source-derived baseline with an authorized schema-only dump
-- before activation; it is NOT an introspection of either existing database.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.app_users') IS NOT NULL
     OR to_regclass('public.osservazioni') IS NOT NULL
     OR to_regclass('public.security_state') IS NOT NULL
     OR to_regclass('public.privacy_requests') IS NOT NULL
     OR to_regclass('public.security_events') IS NOT NULL THEN
    RAISE EXCEPTION 'Baseline requires an empty application target';
  END IF;
END; $$;

CREATE TABLE public.app_users (
  id text PRIMARY KEY,
  clerk_user_id text UNIQUE,
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleting')),
  subscription_duration_days integer DEFAULT 30 CHECK (subscription_duration_days BETWEEN 1 AND 3650),
  subscription_expires_at timestamptz DEFAULT (now() + interval '30 days'),
  privacy_version text,
  privacy_ack_at timestamptz,
  invitation_id text,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.security_state (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE public.privacy_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.security_events (
  id text PRIMARY KEY, actor_id text, target_id text,
  action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.osservazioni (
  id text PRIMARY KEY,
  owner_id text REFERENCES public.app_users(id) ON DELETE CASCADE,
  observation_id text,
  data text NOT NULL,
  data_trapianto text,
  tipo_intervento text NOT NULL,
  giorni integer NOT NULL,
  eta_piantina varchar NOT NULL,
  cliente text NOT NULL,
  appezzamento text NOT NULL,
  resa numeric NOT NULL,
  varieta text NOT NULL,
  n1 numeric NOT NULL, n2 numeric NOT NULL, n3 numeric NOT NULL,
  n4 numeric NOT NULL, n5 numeric NOT NULL,
  media numeric NOT NULL, ottimale numeric NOT NULL,
  discostamento numeric NOT NULL, dose numeric NOT NULL,
  created_at timestamptz, lat numeric, lng numeric,
  piante_semi_ha numeric, piante_semi_unita text, piante_ha_equivalenti numeric,
  fase_fenologica text, bbch text, fase_fonte text,
  azoto_totale numeric, azoto_gia_distribuito numeric, quota_azoto numeric
);
CREATE UNIQUE INDEX osservazioni_owner_display_idx ON public.osservazioni(owner_id, observation_id);
COMMIT;
