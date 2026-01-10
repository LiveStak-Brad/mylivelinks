-- ============================================================================
-- Re-backfill follower_count to fix stale cached values
-- ============================================================================
-- The follower_count column had stale data from a previous migration.
-- This re-calculates all follower counts from the actual follows table.
-- ============================================================================

BEGIN;

-- Re-backfill all users' follower_count to match actual follows
UPDATE public.profiles p
SET follower_count = (
    SELECT COUNT(*)
    FROM public.follows f
    WHERE f.followee_id = p.id
);

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- Re-calculated all follower_count values from the follows table
-- This fixes any stale cached values that were incorrect
-- ============================================================================
