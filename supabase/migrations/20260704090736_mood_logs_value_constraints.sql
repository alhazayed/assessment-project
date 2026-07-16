ALTER TABLE public.mood_logs
  ADD CONSTRAINT mood_logs_sleep_hours_range
  CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24));

ALTER TABLE public.mood_logs
  ADD CONSTRAINT mood_logs_activity_minutes_range
  CHECK (activity_minutes IS NULL OR (activity_minutes >= 0 AND activity_minutes <= 600));

ALTER TABLE public.mood_logs
  ADD CONSTRAINT mood_logs_mood_score_range
  CHECK (mood_score >= 1 AND mood_score <= 10);

ALTER TABLE public.mood_logs
  ADD CONSTRAINT mood_logs_energy_score_range
  CHECK (energy_score >= 1 AND energy_score <= 10);

ALTER TABLE public.mood_logs
  ADD CONSTRAINT mood_logs_anxiety_score_range
  CHECK (anxiety_score >= 1 AND anxiety_score <= 10);