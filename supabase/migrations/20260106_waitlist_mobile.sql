BEGIN;

-- Mobile App Waitlist (Email capture)
-- Stores product update opt-in for the mobile app launch.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.waitlist_mobile (
  email citext PRIMARY KEY,
  unsubscribe_token uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'waitlist_mobile'
      AND c.conname = 'waitlist_mobile_unsubscribe_token_unique'
  ) THEN
    ALTER TABLE public.waitlist_mobile
      ADD CONSTRAINT waitlist_mobile_unsubscribe_token_unique UNIQUE (unsubscribe_token);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_waitlist_mobile_created_at_desc
  ON public.waitlist_mobile (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_mobile_unsubscribed_at
  ON public.waitlist_mobile (unsubscribed_at);

ALTER TABLE public.waitlist_mobile ENABLE ROW LEVEL SECURITY;

-- We write via service role in API routes (bypasses RLS). This policy is optional but safe:
-- allow read for authenticated users only if you later want it. For now, no public policies.

COMMIT;

