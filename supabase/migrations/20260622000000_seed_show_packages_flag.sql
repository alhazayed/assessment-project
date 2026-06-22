-- Seed the show_packages feature flag (hidden from users by default)
INSERT INTO feature_flags (flag_key, display_name, description, is_enabled, applies_to)
VALUES (
  'show_packages',
  'Packages Section',
  'Show the Packages section in the patient navigation menu. Disable to hide packages from users while you test and configure them.',
  false,
  ARRAY['patient']
)
ON CONFLICT (flag_key) DO NOTHING;
