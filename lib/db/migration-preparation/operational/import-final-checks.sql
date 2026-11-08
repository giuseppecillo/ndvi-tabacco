-- INACTIVE: run only inside the authorized target import, after FORCE restoration.
DO $final_checks$
DECLARE t text; api_role text; column_name text; diagnostics record;
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
        AND c.relname IN ('app_users','security_state','privacy_requests','security_events','osservazioni')
        AND c.relrowsecurity AND c.relforcerowsecurity
        AND c.relowner='app_migrator'::regrole) <> 5 THEN
    RAISE EXCEPTION 'Import protections not restored';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public'
        AND c.relname IN ('app_users','security_state','privacy_requests','security_events','osservazioni')) <> 15 THEN
    RAISE EXCEPTION 'Unexpected RLS policy inventory before import commit';
  END IF;
  FOREACH t IN ARRAY ARRAY['app_users','security_state','privacy_requests','security_events','osservazioni'] LOOP
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_table_privilege(api_role,format('public.%I',t),
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        RAISE EXCEPTION 'Unexpected API access before import commit';
      END IF;
      FOR column_name IN SELECT a.attname FROM pg_catalog.pg_attribute a
        WHERE a.attrelid=format('public.%I',t)::regclass AND a.attnum>0 AND NOT a.attisdropped
      LOOP
        IF has_column_privilege(api_role,format('public.%I',t),column_name,
          'SELECT,INSERT,UPDATE,REFERENCES') THEN
          RAISE EXCEPTION 'Unexpected API column access before import commit';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  SELECT
    (SELECT count(*) FROM public.osservazioni o WHERE o.owner_id IS NULL OR
      NOT EXISTS(SELECT FROM public.app_users u WHERE u.id=o.owner_id)) AS bad_observations,
    (SELECT count(*) FROM public.privacy_requests p WHERE
      NOT EXISTS(SELECT FROM public.app_users u WHERE u.id=p.user_id)) AS bad_requests,
    EXISTS(SELECT FROM public.security_state s JOIN public.app_users u ON u.id=s.value
      WHERE s.key='initial_admin' AND u.role='admin') AS admin_valid
    INTO diagnostics;
  IF diagnostics.bad_observations<>0 OR diagnostics.bad_requests<>0 OR NOT diagnostics.admin_valid THEN
    RAISE EXCEPTION 'Imported integrity requires review; no automatic repair';
  END IF;
END
$final_checks$;
