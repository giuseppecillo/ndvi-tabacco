-- DRAFT / INACTIVE. Optional data repair, separately authorized AFTER comparison.
-- Do not use as routine bootstrap or assume the source needs this repair.
-- Does NOT recreate users, reassign owners, change roles or subscription dates.
BEGIN;
UPDATE public.osservazioni SET observation_id = id WHERE observation_id IS NULL;
COMMIT;
