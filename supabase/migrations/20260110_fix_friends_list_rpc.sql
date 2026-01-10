-- ============================================================================
-- Fix get_friends_list RPC to use mutual follows instead of friends table
-- ============================================================================
-- The friends_count is based on mutual follows, so the list RPC must match
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_friends_list(
    p_profile_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'friends', COALESCE(json_agg(friend_data), '[]'::json),
            'total', (
                -- Count mutual follows (friends)
                SELECT COUNT(*)
                FROM public.follows f1
                WHERE f1.follower_id = p_profile_id
                AND EXISTS (
                    SELECT 1 FROM public.follows f2
                    WHERE f2.follower_id = f1.followee_id
                    AND f2.followee_id = p_profile_id
                )
            )
        )
        FROM (
            -- Get mutual follows (people who follow each other)
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                f1.followed_at AS friends_since
            FROM public.follows f1
            JOIN public.profiles p ON p.id = f1.followee_id
            WHERE f1.follower_id = p_profile_id
            AND EXISTS (
                -- Check for mutual follow
                SELECT 1 FROM public.follows f2
                WHERE f2.follower_id = f1.followee_id
                AND f2.followee_id = p_profile_id
            )
            ORDER BY f1.followed_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS friend_data
    );
END;
$$;

COMMENT ON FUNCTION public.get_friends_list IS 'Returns paginated list of mutual friends (based on mutual follows)';

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- Fixed get_friends_list() to query mutual follows instead of friends table
-- Now matches the friends_count logic from 20260110_add_following_friends_counts
-- ============================================================================
