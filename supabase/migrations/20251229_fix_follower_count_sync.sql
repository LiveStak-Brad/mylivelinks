BEGIN;

-- ============================================================================
-- MyLiveLinks: Fix Follower Count Cache Sync
-- ============================================================================
-- Root Cause: follower_count in profiles table can become stale
-- Solution: Backfill all users + add trigger to keep in sync going forward
-- ============================================================================

-- Create/Replace trigger function to keep follower_count synchronized
CREATE OR REPLACE FUNCTION public.update_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.followee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.followee_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop and recreate trigger to ensure clean state
DROP TRIGGER IF EXISTS sync_follower_count ON public.follows;

CREATE TRIGGER sync_follower_count
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.update_follower_count();

-- Backfill all users' follower_count to match actual follows
UPDATE public.profiles p
SET follower_count = (
  SELECT COUNT(*)
  FROM public.follows f
  WHERE f.followee_id = p.id
);

COMMENT ON FUNCTION public.update_follower_count() IS 'Keeps follower_count cache in sync with follows table';

COMMIT;

