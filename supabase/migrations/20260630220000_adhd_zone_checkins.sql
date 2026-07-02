-- Migration: ADHD Zone Check-in history
-- Date: 2026-06-30
-- Purpose: Persist ADHD regulation zone check-ins so users can track their
--          regulation patterns over time (green/yellow/red/black).

CREATE TABLE IF NOT EXISTS public.adhd_zone_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone text NOT NULL CHECK (zone IN ('green', 'yellow', 'red', 'black')),
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adhd_checkins_user_id
  ON public.adhd_zone_checkins(user_id);

CREATE INDEX IF NOT EXISTS idx_adhd_checkins_created_at
  ON public.adhd_zone_checkins(user_id, created_at DESC);

ALTER TABLE public.adhd_zone_checkins ENABLE ROW LEVEL SECURITY;

-- Users can insert their own check-ins.
CREATE POLICY "users_can_insert_own_adhd_checkins"
  ON public.adhd_zone_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own check-in history.
CREATE POLICY "users_can_view_own_adhd_checkins"
  ON public.adhd_zone_checkins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own check-ins.
CREATE POLICY "users_can_delete_own_adhd_checkins"
  ON public.adhd_zone_checkins
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Superadmin can view all check-ins (analytics / support).
CREATE POLICY "superadmin_can_view_all_adhd_checkins"
  ON public.adhd_zone_checkins
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );
