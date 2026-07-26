-- Remove the stray "Wellness Rewards" (loyalty_*) subsystem from the Assessment
-- Platform database.
--
-- Context: the loyalty subsystem was introduced out-of-band by
-- 20260720115320_loyalty_rewards_initial (backfilled into the repo alongside this
-- migration to restore source-of-truth). It belongs to a SEPARATE application and
-- project, not the Assessment Platform. On this project its tables are empty
-- (verified: 0 members, 0 activity rows; only 1 seed reward), and its nine
-- `*_compat` views are defined without security_invoker, so they surface as
-- SECURITY DEFINER views that bypass RLS. They are the sole source of the 9 ERROR
-- `security_definer_view` advisories on this project.
--
-- This migration tears the subsystem down so the Assessment Platform database
-- contains only its own objects and the security advisors return to 0 ERROR.
--
-- Safety: the guard below ABORTS the teardown if any member/activity data is
-- present, so this can never silently destroy real loyalty data (e.g. if it were
-- ever applied against the wrong project). The pgcrypto extension is intentionally
-- left in place — it is shared infrastructure (gen_random_uuid), not loyalty-owned.

DO $$
BEGIN
  IF (to_regclass('public.loyalty_members') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_members))
     OR (to_regclass('public.loyalty_point_transactions') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_point_transactions))
     OR (to_regclass('public.loyalty_redemptions') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_redemptions))
     OR (to_regclass('public.loyalty_sessions') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_sessions))
     OR (to_regclass('public.loyalty_referrals') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_referrals))
     OR (to_regclass('public.loyalty_wallet_passes') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_wallet_passes))
     OR (to_regclass('public.loyalty_blog_engagement_log') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_blog_engagement_log))
     OR (to_regclass('public.loyalty_staff_users') IS NOT NULL AND EXISTS (SELECT 1 FROM loyalty_staff_users))
  THEN
    RAISE EXCEPTION 'Aborting loyalty teardown: member/activity/staff data present. Preserve or migrate this subsystem deliberately instead of dropping it.';
  END IF;
END $$;

-- 1. Compat views (RLS-bypassing SECURITY DEFINER views — the ERROR advisories).
DROP VIEW IF EXISTS loyalty_members_compat;
DROP VIEW IF EXISTS loyalty_rewards_compat;
DROP VIEW IF EXISTS loyalty_sessions_compat;
DROP VIEW IF EXISTS loyalty_point_transactions_compat;
DROP VIEW IF EXISTS loyalty_redemptions_compat;
DROP VIEW IF EXISTS loyalty_referrals_compat;
DROP VIEW IF EXISTS loyalty_wallet_passes_compat;
DROP VIEW IF EXISTS loyalty_blog_engagement_log_compat;
DROP VIEW IF EXISTS loyalty_staff_users_compat;

-- 2. Tables (CASCADE also removes their RLS policies, triggers, indexes, and FKs).
DROP TABLE IF EXISTS loyalty_point_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_redemptions CASCADE;
DROP TABLE IF EXISTS loyalty_referrals CASCADE;
DROP TABLE IF EXISTS loyalty_wallet_passes CASCADE;
DROP TABLE IF EXISTS loyalty_blog_engagement_log CASCADE;
DROP TABLE IF EXISTS loyalty_sessions CASCADE;
DROP TABLE IF EXISTS loyalty_rewards CASCADE;
DROP TABLE IF EXISTS loyalty_members CASCADE;
DROP TABLE IF EXISTS loyalty_staff_users CASCADE;

-- 3. Functions (loyalty-owned helpers + trigger function).
DROP FUNCTION IF EXISTS loyalty_is_staff();
DROP FUNCTION IF EXISTS loyalty_is_member_owner(uuid);
DROP FUNCTION IF EXISTS loyalty_set_updated_at();

-- 4. Enum types (verified used only by the loyalty_* tables above).
DROP TYPE IF EXISTS member_tier;
DROP TYPE IF EXISTS session_type;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS point_action_type;
DROP TYPE IF EXISTS redemption_status;
DROP TYPE IF EXISTS referral_status;
