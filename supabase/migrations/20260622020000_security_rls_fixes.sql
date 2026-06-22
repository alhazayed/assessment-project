-- =========================================================
-- SECURITY: Fix RLS policies identified in go-live audit
-- =========================================================

-- 1. rate_limit_log — had RLS enabled but NO policies (full anon read/write)
--    Restrict to admin/superadmin only
DROP POLICY IF EXISTS rate_limit_log_admin_only ON public.rate_limit_log;
CREATE POLICY rate_limit_log_admin_only ON public.rate_limit_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Allow the rate-limiting logic (called server-side via service role) to insert
-- The admin client bypasses RLS, so service-role inserts are unaffected.

-- 2. platform_settings — was readable by unauthenticated users (USING (true))
--    Restrict reads to authenticated users only
DROP POLICY IF EXISTS settings_read ON public.platform_settings;
CREATE POLICY settings_read ON public.platform_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep write restricted to admin/superadmin (existing policy unchanged)

-- 3. clinician_profiles — was readable by unauthenticated users
DROP POLICY IF EXISTS clin_prof_read ON public.clinician_profiles;
CREATE POLICY clin_prof_read ON public.clinician_profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. feature_flags — keep public read (intentional — controls UI visibility)
--    No change needed

-- =========================================================
-- PERFORMANCE: Missing indexes identified in go-live audit
-- =========================================================

-- feature_flags(flag_key) — queried on every page load via app layout
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_key
  ON public.feature_flags (flag_key);

-- packages(status, sort_order) — for listing active packages
CREATE INDEX IF NOT EXISTS idx_packages_status_sort
  ON public.packages (status, sort_order);

-- package_results(package_id, user_id) — for compute/result routes
CREATE INDEX IF NOT EXISTS idx_package_results_pkg_user
  ON public.package_results (package_id, user_id);

-- package_results(user_id, status) — for user result lookups
CREATE INDEX IF NOT EXISTS idx_package_results_user_status
  ON public.package_results (user_id, status);
