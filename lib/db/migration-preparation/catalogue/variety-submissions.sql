-- Manual migration only. No startup/build/post-merge imports.
CREATE TABLE agronomy_catalogue.variety_submissions (
  id uuid PRIMARY KEY,
  crop text NOT NULL CHECK(length(crop) BETWEEN 1 AND 80),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  submitted_by text NOT NULL,
  reference_id text NOT NULL CHECK(length(reference_id)=64),
  reference_name text NOT NULL,
  profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'
    AND profile->>'crop'=crop AND profile->>'name'=name),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text CHECK(length(review_note)<=500),
  CHECK((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status<>'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX variety_submissions_live_name
  ON agronomy_catalogue.variety_submissions(crop,lower(name))
  WHERE status IN ('pending','approved');
CREATE INDEX variety_submissions_owner ON agronomy_catalogue.variety_submissions(submitted_by,created_at DESC);
ALTER TABLE agronomy_catalogue.variety_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomy_catalogue.variety_submissions FORCE ROW LEVEL SECURITY;
-- Portable to Replit Publish: no policy references to project-specific roles.
-- Table grants are restricted separately. Application account checks are in Express.
CREATE POLICY variety_submissions_backend ON agronomy_catalogue.variety_submissions
  FOR ALL TO PUBLIC
  USING (current_user IN ('app_runtime','app_migrator')
    OR current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='agronomy_catalogue.variety_submissions'::regclass)))
  WITH CHECK (current_user IN ('app_runtime','app_migrator')
    OR current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='agronomy_catalogue.variety_submissions'::regclass)));
REVOKE ALL ON agronomy_catalogue.variety_submissions FROM PUBLIC;
