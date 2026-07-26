-- Ensure the auth.users -> handle_new_user() signup trigger exists.
--
-- The baseline (20260619120000) creates trigger `on_auth_user_created`, then
-- 20260619210813_fix_duplicate_auth_trigger DROPs it and relies on
-- `trg_on_auth_user_created`. That second trigger only ever existed because it
-- was created out-of-band on the remote database — its migration
-- (20260618122343_create_patient_profile_on_signup) is a 2-line stub. As a
-- result, a from-scratch rebuild ended up with NO trigger on auth.users, so new
-- signups never created the profiles / patient_profiles rows and registration
-- failed with "Database error saving new user".
--
-- This migration idempotently guarantees exactly one signup trigger exists. It
-- is a safe no-op on databases that already have it (e.g. production).
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
