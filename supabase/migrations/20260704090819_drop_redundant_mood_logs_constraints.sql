ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_sleep_hours_range;
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_activity_minutes_range;
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_mood_score_range;
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_energy_score_range;
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_anxiety_score_range;