-- INACTIVE: manual, separately authorized application on Agri Precision only.
-- Do not add to a migration runner, startup, post-merge or the baseline manifest.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(84688001);

-- Authorized administrator creates this ONE schema; do not grant database-wide
-- CREATE to the migrator. The session must already be allowed to SET ROLE.
CREATE SCHEMA IF NOT EXISTS agronomy_catalogue AUTHORIZATION app_migrator;
SET LOCAL ROLE app_migrator;
DO $guard$
BEGIN
  IF (SELECT nspowner <> 'app_migrator'::regrole FROM pg_namespace
      WHERE nspname = 'agronomy_catalogue') THEN
    RAISE EXCEPTION 'CATALOGUE_SCHEMA_OWNER_MISMATCH';
  END IF;
END;
$guard$;

CREATE TABLE IF NOT EXISTS agronomy_catalogue.versions (
  version text PRIMARY KEY,
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  calculations_enabled boolean NOT NULL DEFAULT false CHECK (NOT calculations_enabled)
);
CREATE TABLE IF NOT EXISTS agronomy_catalogue.profiles (
  version text NOT NULL REFERENCES agronomy_catalogue.versions(version) ON DELETE RESTRICT,
  profile_id uuid NOT NULL,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  PRIMARY KEY (version, profile_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_identity_key
  ON agronomy_catalogue.profiles (version, (data->>'Coltura'), (data->>'Varietà'));

-- Structural guard shared with the generated apply/verify/rollback files:
-- no IF NOT EXISTS may silently accept an incompatible pre-existing relation.
DO $guard$
DECLARE actual text[];
BEGIN
  SELECT array_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod)
                   || ':' || a.attnotnull::text ORDER BY a.attnum) INTO actual
  FROM pg_attribute a
  WHERE a.attrelid = 'agronomy_catalogue.versions'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped;
  IF actual IS DISTINCT FROM ARRAY['version:text:true','manifest:jsonb:true',
                                  'calculations_enabled:boolean:true'] THEN
    RAISE EXCEPTION 'CATALOGUE_VERSIONS_SHAPE_MISMATCH';
  END IF;
  SELECT array_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod)
                   || ':' || a.attnotnull::text ORDER BY a.attnum) INTO actual
  FROM pg_attribute a
  WHERE a.attrelid = 'agronomy_catalogue.profiles'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped;
  IF actual IS DISTINCT FROM ARRAY['version:text:true','profile_id:uuid:true',
                                  'data:jsonb:true','provenance:jsonb:true'] THEN
    RAISE EXCEPTION 'CATALOGUE_PROFILES_SHAPE_MISMATCH';
  END IF;
END;
$guard$;

REVOKE ALL ON SCHEMA agronomy_catalogue FROM PUBLIC, anon, authenticated,
  app_runtime, app_readonly;
REVOKE ALL ON agronomy_catalogue.versions, agronomy_catalogue.profiles
  FROM PUBLIC, anon, authenticated, app_runtime, app_readonly;
ALTER TABLE agronomy_catalogue.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomy_catalogue.profiles ENABLE ROW LEVEL SECURITY;
-- No runtime grant or RLS policy in this preparation. A later, approved API
-- integration must choose the read contract; direct Data API access stays closed.
COMMIT;
