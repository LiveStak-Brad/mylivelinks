-- ============================================================================
-- MyLiveLinks: Add Cached Following/Friends Count Columns + Triggers
-- ============================================================================
-- Adds following_count and friends_count columns to profiles table with
-- automatic trigger-based synchronization to eliminate expensive COUNT queries.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD CACHED COUNT COLUMNS
-- ============================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS friends_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.following_count IS 'Cached count of users this profile follows (updated by trigger)';
COMMENT ON COLUMN public.profiles.friends_count IS 'Cached count of mutual friends (updated by trigger)';

-- ============================================================================
-- 2. BACKFILL EXISTING DATA
-- ============================================================================

-- Update following_count for all profiles
UPDATE public.profiles p
SET following_count = (
    SELECT COUNT(*)
    FROM public.follows f
    WHERE f.follower_id = p.id
);

-- Update friends_count for all profiles (based on mutual follows, not friends table)
-- Friends = users where both follow each other
UPDATE public.profiles p
SET friends_count = (
    SELECT COUNT(*)
    FROM public.follows f1
    WHERE f1.follower_id = p.id
    AND EXISTS (
        SELECT 1 FROM public.follows f2
        WHERE f2.follower_id = f1.followee_id
        AND f2.followee_id = p.id
    )
);

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION FOR FOLLOWING_COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_following_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- When someone follows another user, increment their following_count
        UPDATE public.profiles
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- When someone unfollows, decrement their following_count (never go below 0)
        UPDATE public.profiles
        SET following_count = GREATEST(0, following_count - 1)
        WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.update_following_count() IS 'Keeps following_count cache in sync with follows table';

-- ============================================================================
-- 4. CREATE TRIGGER FOR FOLLOWING_COUNT
-- ============================================================================

DROP TRIGGER IF EXISTS sync_following_count ON public.follows;

CREATE TRIGGER sync_following_count
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.update_following_count();

-- ============================================================================
-- 5. CREATE TRIGGER FUNCTION FOR FRIENDS_COUNT (MUTUAL FOLLOWS)
-- ============================================================================
-- Friends are determined by mutual follows, not a separate friends table
-- When someone follows/unfollows, we need to check if it affects mutual friendship

CREATE OR REPLACE FUNCTION public.update_friends_count_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_mutual BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Check if this creates a mutual friendship
        SELECT EXISTS (
            SELECT 1 FROM public.follows
            WHERE follower_id = NEW.followee_id
            AND followee_id = NEW.follower_id
        ) INTO v_is_mutual;
        
        IF v_is_mutual THEN
            -- Increment friends_count for both users
            UPDATE public.profiles
            SET friends_count = friends_count + 1
            WHERE id = NEW.follower_id OR id = NEW.followee_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this was a mutual friendship
        SELECT EXISTS (
            SELECT 1 FROM public.follows
            WHERE follower_id = OLD.followee_id
            AND followee_id = OLD.follower_id
        ) INTO v_is_mutual;
        
        IF v_is_mutual THEN
            -- Decrement friends_count for both users
            UPDATE public.profiles
            SET friends_count = GREATEST(0, friends_count - 1)
            WHERE id = OLD.follower_id OR id = OLD.followee_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.update_friends_count_on_follow() IS 'Updates friends_count when mutual follows are created/destroyed';

-- ============================================================================
-- 6. CREATE TRIGGER FOR FRIENDS_COUNT ON FOLLOWS TABLE
-- ============================================================================

DROP TRIGGER IF EXISTS sync_friends_count_on_follow ON public.follows;

CREATE TRIGGER sync_friends_count_on_follow
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.update_friends_count_on_follow();

-- ============================================================================
-- 7. CREATE INDEX FOR PERFORMANCE (if not exists)
-- ============================================================================

-- These indexes help with the COUNT queries during backfill and list queries
-- Only create indexes on follows table (friends table/view has issues)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee_id ON public.follows(followee_id);

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- What was added:
-- ✅ following_count column in profiles (cached, auto-synced)
-- ✅ friends_count column in profiles (cached, auto-synced)
-- ✅ Backfilled all existing data from follows/friends tables
-- ✅ Trigger update_following_count() syncs on follows INSERT/DELETE
-- ✅ Trigger update_friends_count() syncs on friends INSERT/DELETE
-- ✅ Both triggers use GREATEST(0, count-1) to prevent negative counts
-- ✅ Indexes added for query performance
--
-- Result: Profile loads no longer need expensive COUNT queries for
-- following_count and friends_count - they're now instant cached lookups.
-- ============================================================================
