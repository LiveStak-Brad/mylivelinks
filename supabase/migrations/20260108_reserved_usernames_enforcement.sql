BEGIN;

-- Server-side reserved keyword enforcement for usernames.
-- This is enforced at the database write path via trigger on public.profiles
-- and covers: signup, username change, and admin edits.

CREATE OR REPLACE FUNCTION public.enforce_reserved_usernames()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowlist uuid[] := ARRAY[
    '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid,
    '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'::uuid
  ];
  v_u text;
BEGIN
  v_u := lower(coalesce(NEW.username, ''));

  -- If username isn't being set/changed, no-op.
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- Allowlist bypass (exact profile IDs)
  IF NEW.id = ANY(v_allowlist) THEN
    RETURN NEW;
  END IF;

  -- Reserved keyword enforcement
  IF v_u LIKE '%mylivelinks%' THEN
    RAISE EXCEPTION 'reserved_username:mylivelinks';
  END IF;

  IF v_u LIKE '%canna%' THEN
    RAISE EXCEPTION 'reserved_username:canna';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reserved_usernames ON public.profiles;
CREATE TRIGGER trg_enforce_reserved_usernames
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_reserved_usernames();

COMMIT;
