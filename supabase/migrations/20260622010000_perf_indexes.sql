-- Index on feature_flags(flag_key) — queried on every page load
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_key ON public.feature_flags (flag_key);

-- Index on packages(status, sort_order) — for listing active packages
CREATE INDEX IF NOT EXISTS idx_packages_status_sort ON public.packages (status, sort_order);

-- Index on package_results(package_id, user_id) — for compute route
CREATE INDEX IF NOT EXISTS idx_package_results_pkg_user ON public.package_results (package_id, user_id);

-- Index on package_results(user_id, status) — for user result lookups
CREATE INDEX IF NOT EXISTS idx_package_results_user_status ON public.package_results (user_id, status);
