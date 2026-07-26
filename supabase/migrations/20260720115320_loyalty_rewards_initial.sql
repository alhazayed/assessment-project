-- Vwelfare Wellness Rewards schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE member_tier AS ENUM ('seed', 'growth', 'resilience', 'wellness_ambassador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_type AS ENUM ('psychiatry_first', 'psychiatry_review', 'psychotherapy', 'group', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE point_action_type AS ENUM ('session_completed', 'on_time_arrival', 'group_session', 'referral_completed', 'blog_engagement', 'redemption', 'manual_adjustment', 'tier_bonus');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'applied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'invalid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS loyalty_staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  tier member_tier NOT NULL DEFAULT 'seed',
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0),
  successful_referrals INTEGER NOT NULL DEFAULT 0 CHECK (successful_referrals >= 0),
  locale TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('en', 'ar')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  jod_value NUMERIC(10, 2) NOT NULL CHECK (jod_value > 0),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES loyalty_members(id) ON DELETE SET NULL,
  external_id TEXT UNIQUE,
  provider_name TEXT,
  session_type session_type NOT NULL DEFAULT 'other',
  status session_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  referral_code_used TEXT,
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  action_type point_action_type NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  jod_value NUMERIC(10, 2) NOT NULL,
  status redemption_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  referee_member_id UUID REFERENCES loyalty_members(id) ON DELETE SET NULL,
  referee_phone TEXT,
  referral_code TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_wallet_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES loyalty_members(id) ON DELETE CASCADE,
  passkit_member_id TEXT,
  apple_pass_url TEXT,
  google_pass_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_blog_engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  articles_read INTEGER NOT NULL DEFAULT 0,
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_members_phone ON loyalty_members(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_referral_code ON loyalty_members(referral_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_sessions_member_id ON loyalty_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_sessions_external_id ON loyalty_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_point_transactions_member_id ON loyalty_point_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_member_id ON loyalty_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_status ON loyalty_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_referrals_referrer_id ON loyalty_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_referrals_code ON loyalty_referrals(referral_code);

CREATE OR REPLACE FUNCTION loyalty_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_members_updated_at ON loyalty_members;
CREATE TRIGGER loyalty_members_updated_at
  BEFORE UPDATE ON loyalty_members
  FOR EACH ROW EXECUTE FUNCTION loyalty_set_updated_at();

DROP TRIGGER IF EXISTS loyalty_redemptions_updated_at ON loyalty_redemptions;
CREATE TRIGGER loyalty_redemptions_updated_at
  BEFORE UPDATE ON loyalty_redemptions
  FOR EACH ROW EXECUTE FUNCTION loyalty_set_updated_at();

INSERT INTO loyalty_rewards (slug, points_cost, jod_value, title_en, title_ar, description_en, description_ar)
VALUES (
  'session-credit-10jod', 500, 10.00,
  '10 JOD Session Credit', 'رصيد جلسة 10 د.أ',
  'Applies to psychotherapy and group sessions only.',
  'ينطبق على جلسات المعالجة والجلسات الجماعية فقط.'
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE loyalty_staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_wallet_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_blog_engagement_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION loyalty_is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM loyalty_staff_users WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION loyalty_is_member_owner(member_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM loyalty_members WHERE id = member_uuid AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_staff_users ON loyalty_staff_users FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_members ON loyalty_members FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_sessions ON loyalty_sessions FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_point_transactions ON loyalty_point_transactions FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_redemptions ON loyalty_redemptions FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_referrals ON loyalty_referrals FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_wallet_passes ON loyalty_wallet_passes FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_staff_all_blog_engagement ON loyalty_blog_engagement_log FOR ALL TO authenticated
    USING (loyalty_is_staff()) WITH CHECK (loyalty_is_staff());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_self ON loyalty_members FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_update_self ON loyalty_members FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_own_transactions ON loyalty_point_transactions FOR SELECT TO authenticated
    USING (loyalty_is_member_owner(member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_own_redemptions ON loyalty_redemptions FOR SELECT TO authenticated
    USING (loyalty_is_member_owner(member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_insert_redemptions ON loyalty_redemptions FOR INSERT TO authenticated
    WITH CHECK (loyalty_is_member_owner(member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_own_referrals ON loyalty_referrals FOR SELECT TO authenticated
    USING (loyalty_is_member_owner(referrer_id) OR loyalty_is_member_owner(referee_member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_own_wallet ON loyalty_wallet_passes FOR SELECT TO authenticated
    USING (loyalty_is_member_owner(member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_member_read_own_sessions ON loyalty_sessions FOR SELECT TO authenticated
    USING (loyalty_is_member_owner(member_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY loyalty_public_read_rewards ON loyalty_rewards FOR SELECT TO anon, authenticated
    USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE VIEW loyalty_members_compat AS SELECT * FROM loyalty_members;
CREATE OR REPLACE VIEW loyalty_rewards_compat AS SELECT * FROM loyalty_rewards;
CREATE OR REPLACE VIEW loyalty_sessions_compat AS SELECT * FROM loyalty_sessions;
CREATE OR REPLACE VIEW loyalty_point_transactions_compat AS SELECT * FROM loyalty_point_transactions;
CREATE OR REPLACE VIEW loyalty_redemptions_compat AS SELECT * FROM loyalty_redemptions;
CREATE OR REPLACE VIEW loyalty_referrals_compat AS SELECT * FROM loyalty_referrals;
CREATE OR REPLACE VIEW loyalty_wallet_passes_compat AS SELECT * FROM loyalty_wallet_passes;
CREATE OR REPLACE VIEW loyalty_blog_engagement_log_compat AS SELECT * FROM loyalty_blog_engagement_log;
CREATE OR REPLACE VIEW loyalty_staff_users_compat AS SELECT * FROM loyalty_staff_users;
