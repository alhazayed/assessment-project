-- ===================================================================
-- Migration: Fix package_results.user_id FK inconsistency
-- ===================================================================
-- ISSUE:
--   package_results.user_id currently references auth.users(id).
--   All other patient/user references in the database use profiles(id).
--   This creates schema inconsistency and complicates authorization logic.
--
-- SOLUTION:
--   Update package_results.user_id FK to reference profiles(id).
--   Since profiles.id IS auth.users.id (Supabase guarantee), no data
--   migration needed — only FK target changes.
--
-- IMPACT:
--   - Ensures consistent schema design across all patient-scoped tables
--   - Simplifies authorization checks (all use profiles.id)
--   - No breaking changes to application code
--
-- ROLLBACK:
--   If needed, revert by:
--   ALTER TABLE public.package_results
--     DROP CONSTRAINT IF EXISTS package_results_user_id_fkey;
--   ALTER TABLE public.package_results
--     ADD CONSTRAINT package_results_user_id_fkey
--       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ===================================================================

-- Step 1: Drop existing FK constraint referencing auth.users
ALTER TABLE public.package_results
  DROP CONSTRAINT IF EXISTS package_results_user_id_fkey;

-- Step 2: Add new FK constraint referencing profiles(id)
ALTER TABLE public.package_results
  ADD CONSTRAINT package_results_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Step 3: Verify data integrity
-- All rows in package_results must have matching profiles entries
-- (This should always be true since profiles.id = auth.users.id)
DO $$
DECLARE
  orphaned_count int;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.package_results pr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = pr.user_id
  );

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % orphaned package_results rows found', orphaned_count;
  END IF;

  RAISE NOTICE 'Data integrity check passed: all package_results rows have matching profiles entries';
END;
$$;
