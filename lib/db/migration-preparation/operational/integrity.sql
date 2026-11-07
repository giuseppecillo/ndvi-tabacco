-- READ ONLY. Execute only after authorization to inspect real-data integrity.
-- Returns aggregate diagnostics, never IDs, coordinates or client contents.
SELECT
  (SELECT count(*) FROM public.osservazioni o
    WHERE o.owner_id IS NOT NULL AND NOT EXISTS
      (SELECT FROM public.app_users u WHERE u.id=o.owner_id)) AS orphan_observations,
  (SELECT count(*) FROM public.privacy_requests p WHERE NOT EXISTS
      (SELECT FROM public.app_users u WHERE u.id=p.user_id)) AS orphan_privacy_requests,
  (SELECT count(*) FROM public.osservazioni WHERE owner_id IS NULL) AS null_owners_review,
  (SELECT count(*) FROM (
    SELECT owner_id, observation_id FROM public.osservazioni
    WHERE owner_id IS NOT NULL AND observation_id IS NOT NULL
    GROUP BY owner_id, observation_id HAVING count(*) > 1
  ) q) AS duplicate_display_ids,
  EXISTS(SELECT FROM public.security_state s JOIN public.app_users u ON u.id=s.value
    WHERE s.key='initial_admin' AND u.role='admin') AS original_admin_mapping_valid;
