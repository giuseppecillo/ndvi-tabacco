-- Only the explicitly approved catalogue runner may execute this inside its
-- transaction. No app startup/post-merge/Publish invokes this file.
CREATE SCHEMA IF NOT EXISTS agronomy_catalogue;
CREATE TABLE agronomy_catalogue.model_profiles (
  version text NOT NULL,
  crop text NOT NULL,
  variety text NOT NULL,
  model text NOT NULL CHECK(model IN ('phase-ndvi-v1','grain-v1','tomato-v1','tobacco-v1')),
  parameters jsonb NOT NULL CHECK(jsonb_typeof(parameters)='object'),
  record_hash text NOT NULL CHECK(record_hash ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY(version,crop,variety)
);
REVOKE ALL ON SCHEMA agronomy_catalogue FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA agronomy_catalogue TO app_runtime,app_readonly,app_migrator;
REVOKE ALL ON agronomy_catalogue.model_profiles FROM PUBLIC,anon,authenticated,
  service_role,app_runtime,app_readonly;
GRANT SELECT ON agronomy_catalogue.model_profiles TO app_runtime,app_readonly;
GRANT ALL ON agronomy_catalogue.model_profiles TO app_migrator;
ALTER TABLE agronomy_catalogue.model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomy_catalogue.model_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY catalogue_runtime ON agronomy_catalogue.model_profiles
  FOR SELECT TO app_runtime USING(true);
CREATE POLICY catalogue_readonly ON agronomy_catalogue.model_profiles
  FOR SELECT TO app_readonly USING(true);
CREATE POLICY catalogue_migrator ON agronomy_catalogue.model_profiles
  FOR ALL TO app_migrator USING(true) WITH CHECK(true);
CREATE POLICY catalogue_admin ON agronomy_catalogue.model_profiles
  FOR ALL TO postgres USING(true) WITH CHECK(true);
