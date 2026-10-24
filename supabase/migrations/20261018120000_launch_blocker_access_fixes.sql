-- ============================================================
-- Launch-blocker access fixes (role access audit 2026-10-15, B1–B6)
-- ============================================================
-- B1  Clinicians could set their own verification to "verified".
-- B2  Patients could write their own scores, severity and risk flag directly.
-- B3  The legacy profiles.assigned_clinician_id link kept granting a clinician
--     full access after the patient revoked consent.
-- B4  Patients could change their own assigned_clinician_id and is_active.
-- B5  Deactivated accounts and suspended clinicians kept their access.
-- B6  Admin database rules worked without the admin second factor, so an
--     admin password plus the public anon key read all PHI over PostgREST.
--     Admin rules now require an MFA-verified (aal2) session.
--
-- The server-side half of B5 (banning the auth user on deactivation) and the
-- admin TOTP login (B6) ship in the same PR. B7 is server-only.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- B5 + B6: get_my_role() is the role the database trusts for this request.
--   * inactive account          -> NULL (no role-based access at all)
--   * admin/superadmin w/o aal2 -> NULL (password alone is not enough)
-- Owner rules keyed on auth.uid() are unaffected, so an admin still reads
-- their own profile row during the MFA step of the login.
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p.is_active IS NOT TRUE THEN NULL
    WHEN p.role IN ('admin', 'superadmin')
         AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN NULL
    ELSE p.role
  END
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;


-- ══════════════════════════════════════════════════════════
-- B4 (and B5): protected profile columns.
-- Only a trusted caller may change role, assigned_clinician_id, is_active,
-- deactivated_at or deletion_requested_at. Trusted means the service role /
-- SQL editor (no end-user JWT) or an active, aal2 admin. get_my_role() is
-- NULL for inactive users and non-MFA admins, so it is never read as "trusted"
-- here: the trusted no-JWT case is detected with auth.uid() IS NULL instead.
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  caller_role text;
  caller_is_admin boolean;
BEGIN
  -- Service role, migrations and the SQL editor carry no end-user JWT.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  caller_role := public.get_my_role();
  caller_is_admin := coalesce(caller_role IN ('admin', 'superadmin'), false);

  IF NEW.role IS DISTINCT FROM OLD.role AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only administrators can change user roles'
      USING ERRCODE = '42501';
  END IF;

  -- Only a superadmin may grant, revoke, or alter a privileged role.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND (NEW.role IN ('admin', 'superadmin') OR OLD.role IN ('admin', 'superadmin'))
     AND caller_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Only a superadmin can grant or modify admin/superadmin roles'
      USING ERRCODE = '42501';
  END IF;

  -- A superadmin account may only be modified (role or activation) by a superadmin.
  IF OLD.role = 'superadmin'
     AND caller_role IS DISTINCT FROM 'superadmin'
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    RAISE EXCEPTION 'Only a superadmin can modify a superadmin account'
      USING ERRCODE = '42501';
  END IF;

  -- Account-state and care-team columns are never self-service.
  IF NOT caller_is_admin AND (
       NEW.assigned_clinician_id IS DISTINCT FROM OLD.assigned_clinician_id
    OR NEW.is_active             IS DISTINCT FROM OLD.is_active
    OR NEW.deactivated_at        IS DISTINCT FROM OLD.deactivated_at
    OR NEW.deletion_requested_at IS DISTINCT FROM OLD.deletion_requested_at
  ) THEN
    RAISE EXCEPTION 'This profile field can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger already exists (trg_prevent_role_escalation, BEFORE UPDATE).
-- Recreate it so this migration does not depend on it having survived.
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();


-- ══════════════════════════════════════════════════════════
-- B3 + B5: has_clinician_access()
--   * the legacy assigned_clinician_id arm is removed: access now comes only
--     from an active consent relationship with the permission granted, so a
--     revoke or a permission toggle takes effect for every patient.
--     (Legacy pairs were backfilled into relationships by
--     20260715130436_consolidate_clinician_authorization.sql.)
--   * the clinician must be an active, verified clinician, so suspension and
--     deactivation end their access immediately.
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_clinician_access(
  p_clinician_id uuid,
  p_patient_id   uuid,
  p_permission   text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.check_relationship_permission(p_clinician_id, p_patient_id, p_permission)
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = p_clinician_id
        AND pr.role = 'clinician'
        AND pr.is_active IS TRUE
    )
    AND EXISTS (
      SELECT 1 FROM public.clinician_verifications cv
      WHERE cv.clinician_id = p_clinician_id
        AND cv.status = 'verified'
    );
$$;

REVOKE ALL ON FUNCTION public.has_clinician_access(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_clinician_access(uuid, uuid, text) TO authenticated, service_role;


-- ══════════════════════════════════════════════════════════
-- B1: clinician_verifications
-- Owners and admins may read. All writes go through the service role
-- (/api/clinician/verification and /api/admin/clinician-verifications), so
-- there is no end-user write rule at all. The trigger is a second lock in
-- case a write rule is ever added back.
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cv_clinician_own" ON public.clinician_verifications;
DROP POLICY IF EXISTS "cv_owner_admin_read" ON public.clinician_verifications;
CREATE POLICY "cv_owner_admin_read"
  ON public.clinician_verifications FOR SELECT
  TO authenticated
  USING (
    clinician_id = (SELECT auth.uid())
    OR get_my_role() = ANY (ARRAY['admin', 'superadmin'])
  );

CREATE OR REPLACE FUNCTION public.guard_clinician_verification_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(public.get_my_role() IN ('admin', 'superadmin'), false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending_verification'
       OR NEW.reviewed_by IS NOT NULL
       OR NEW.reviewed_at IS NOT NULL
       OR NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Only an administrator can review a clinician verification'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.status           IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by      IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at      IS DISTINCT FROM OLD.reviewed_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.clinician_id     IS DISTINCT FROM OLD.clinician_id THEN
    RAISE EXCEPTION 'Only an administrator can review a clinician verification'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_clinician_verification_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_clinician_verification_review ON public.clinician_verifications;
CREATE TRIGGER trg_guard_clinician_verification_review
  BEFORE INSERT OR UPDATE ON public.clinician_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinician_verification_review();


-- ══════════════════════════════════════════════════════════
-- B2: assessment results are written only by the server.
-- /api/submit-assessment scores on the server and calls
-- submit_assessment_atomic with the service role; the guest route also uses
-- the service role. No end-user path needs to insert these rows.
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "submissions_patient_insert" ON public.assessment_submissions;
DROP POLICY IF EXISTS "responses_patient_insert"   ON public.assessment_responses;

REVOKE ALL ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb)
  TO service_role;


-- ══════════════════════════════════════════════════════════
-- B6: admin arms that read profiles.role directly bypass get_my_role(), so
-- they would keep working without MFA. Point every one of them at
-- get_my_role(). Each statement keeps the policy's owner arms unchanged.
-- ══════════════════════════════════════════════════════════

-- admin or superadmin
ALTER POLICY ci_parties_access ON public.clinician_invitations
  USING (clinician_id = auth.uid() OR patient_id = auth.uid()
         OR get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY cpr_parties_read ON public.clinician_patient_relationships
  USING (clinician_id = auth.uid() OR patient_id = auth.uid()
         OR get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY cpr_patient_update ON public.clinician_patient_relationships
  USING (patient_id = auth.uid()
         OR get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY msg_admin_read ON public.messages
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY ne_recipient_read ON public.notification_events
  USING (recipient_id = auth.uid()
         OR get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY package_assessments_admin_write ON public.package_assessments
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY package_interpretations_admin_write ON public.package_interpretations
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY package_results_admin_all ON public.package_results
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY package_sessions_admin ON public.package_sessions
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY packages_admin_write ON public.packages
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY pac_patient_read ON public.patient_access_codes
  USING (patient_id = auth.uid()
         OR get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY push_tokens_admin_read ON public.push_tokens
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY rate_limit_log_admin_only ON public.rate_limit_log
  USING (get_my_role() = ANY (ARRAY['admin', 'superadmin']))
  WITH CHECK (get_my_role() = ANY (ARRAY['admin', 'superadmin']));
ALTER POLICY rp_parties_read ON public.relationship_permissions
  USING (
    EXISTS (
      SELECT 1 FROM public.clinician_patient_relationships cpr
      WHERE cpr.id = relationship_permissions.relationship_id
        AND (cpr.clinician_id = auth.uid() OR cpr.patient_id = auth.uid())
    )
    OR get_my_role() = ANY (ARRAY['admin', 'superadmin'])
  );
ALTER POLICY rp_patient_manage ON public.relationship_permissions
  USING (
    EXISTS (
      SELECT 1 FROM public.clinician_patient_relationships cpr
      WHERE cpr.id = relationship_permissions.relationship_id
        AND cpr.patient_id = auth.uid()
    )
    OR get_my_role() = ANY (ARRAY['admin', 'superadmin'])
  );

-- superadmin only
ALTER POLICY superadmin_can_view_all_adhd_checkins ON public.adhd_zone_checkins
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_assessment_response ON public.assessment_responses
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_assessment_submission ON public.assessment_submissions
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_clinical_note ON public.clinical_notes
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_message ON public.messages
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_notification ON public.notifications
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_view_all_purchases ON public.package_purchases
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_patient_profile ON public.patient_profiles
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_view_all_payments ON public.payments
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_delete_any_profile ON public.profiles
  USING (get_my_role() = 'superadmin' AND id <> auth.uid());
ALTER POLICY superadmin_can_view_all_promo_usage ON public.promo_code_usage
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_manage_promo_codes ON public.promo_codes
  USING (get_my_role() = 'superadmin');
ALTER POLICY only_superadmin_can_access_stripe_config ON public.stripe_configuration
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_manage_stripe_prices ON public.stripe_prices
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_manage_stripe_products ON public.stripe_products
  USING (get_my_role() = 'superadmin');
ALTER POLICY superadmin_can_view_webhook_events ON public.stripe_webhook_events
  USING (get_my_role() = 'superadmin');


-- ══════════════════════════════════════════════════════════
-- Audit: failed admin logins (bad PIN or password) have no signed-in user,
-- so their audit rows were rejected by actor_id NOT NULL and never written.
-- Let those rows carry a NULL actor. The end-user insert rule still requires
-- actor_id = auth.uid(), so only the service role can write a NULL actor.
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.audit_log ALTER COLUMN actor_id DROP NOT NULL;

-- ══════════════════════════════════════════════════════════
-- Safety net: production has had changes "applied directly to remote", so
-- fail the whole migration if any rule still reads a role from profiles
-- without going through get_my_role(), or if the removed write paths are
-- still open. Nothing above is kept unless all of this holds.
-- ══════════════════════════════════════════════════════════
DO $$
DECLARE
  leftovers text;
BEGIN
  SELECT string_agg(format('%I.%I.%I', schemaname, tablename, policyname), ', ')
    INTO leftovers
  FROM pg_policies
  WHERE schemaname IN ('public', 'storage')
    AND regexp_replace(
          coalesce(qual, '') || ' ' || coalesce(with_check, ''),
          'get_my_role\(\)|auth\.role\(\)', '', 'g'
        ) ~ '\mrole\M';
  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'Admin rules that bypass get_my_role() remain: %', leftovers;
  END IF;

  SELECT string_agg(format('%I.%I', tablename, policyname), ', ')
    INTO leftovers
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (tablename IN ('assessment_submissions', 'assessment_responses') AND cmd IN ('INSERT', 'ALL'))
      OR (tablename = 'clinician_verifications' AND cmd <> 'SELECT')
    );
  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'End-user write rules remain on protected tables: %', leftovers;
  END IF;

  IF has_function_privilege('authenticated',
       'public.submit_assessment_atomic(uuid, uuid, integer, text, boolean, boolean, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can still execute submit_assessment_atomic';
  END IF;
END;
$$;
