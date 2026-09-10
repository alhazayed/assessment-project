-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor (unindexed_foreign_keys). Purely additive: improves join and
-- cascade-delete performance. Idempotent (IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS idx_assessment_drafts_definition_id ON public.assessment_drafts(definition_id);
CREATE INDEX IF NOT EXISTS idx_clinician_invitations_patient_id ON public.clinician_invitations(patient_id);
CREATE INDEX IF NOT EXISTS idx_cpr_invitation_id ON public.clinician_patient_relationships(invitation_id);
CREATE INDEX IF NOT EXISTS idx_cpr_revoked_by ON public.clinician_patient_relationships(revoked_by);
CREATE INDEX IF NOT EXISTS idx_clinician_verifications_reviewed_by ON public.clinician_verifications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_notification_events_sender_id ON public.notification_events(sender_id);
CREATE INDEX IF NOT EXISTS idx_package_interpretations_package_id ON public.package_interpretations(package_id);
CREATE INDEX IF NOT EXISTS idx_package_purchases_package_id ON public.package_purchases(package_id);
CREATE INDEX IF NOT EXISTS idx_package_purchases_payment_id ON public.package_purchases(payment_id);
CREATE INDEX IF NOT EXISTS idx_package_sessions_result_id ON public.package_sessions(result_id);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON public.payments(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_promo_code_id ON public.payments(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_created_by ON public.promo_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_purchased_package_results_package_purchase_id ON public.purchased_package_results(package_purchase_id);
CREATE INDEX IF NOT EXISTS idx_relationship_permissions_modified_by ON public.relationship_permissions(modified_by);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_package_id ON public.stripe_prices(package_id);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_stripe_product_id ON public.stripe_prices(stripe_product_id);
