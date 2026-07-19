-- Lock down increment_promo_code_usage: revoke the implicit PUBLIC execute grant
-- so only the service role (webhook handler) can call it.
REVOKE EXECUTE ON FUNCTION increment_promo_code_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_promo_code_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_code_usage(uuid) TO service_role;