-- Push notification device token storage
-- Stores Expo push tokens per user/device for server-initiated notifications.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users own their own tokens
CREATE POLICY "push_tokens_owner_all"
  ON public.push_tokens
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins/superadmins can read all tokens for broadcast notifications
CREATE POLICY "push_tokens_admin_read"
  ON public.push_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);
