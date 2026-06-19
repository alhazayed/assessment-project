-- Fix: duplicate trigger on auth.users caused "Database error saving new user"
-- Two triggers (on_auth_user_created + trg_on_auth_user_created) both called
-- handle_new_user() on INSERT, causing a duplicate key violation on profiles_pkey.
-- Drop the older trigger and add ON CONFLICT DO NOTHING as a safety net.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  INSERT INTO public.profiles (id, role, full_name_en)
  VALUES (NEW.id, v_role, COALESCE(NEW.raw_user_meta_data->>'full_name_en', ''))
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'patient' THEN
    INSERT INTO public.patient_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
