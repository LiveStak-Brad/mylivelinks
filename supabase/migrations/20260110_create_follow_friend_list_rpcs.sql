-- ============================================================================
-- MyLiveLinks: Create Missing Follow/Friend List RPCs
-- ============================================================================
-- Creates paginated list functions for followers, following, and friends
-- that were missing from production migrations.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. GET FOLLOWERS LIST (people who follow the target user)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_followers_list(
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
            'followers', COALESCE(json_agg(follower_data), '[]'::json),
            'total', (SELECT COUNT(*) FROM follows WHERE followee_id = p_profile_id)
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                f.followed_at
            FROM follows f
            JOIN profiles p ON p.id = f.follower_id
            WHERE f.followee_id = p_profile_id
            ORDER BY f.followed_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS follower_data
    );
END;
$$;

COMMENT ON FUNCTION public.get_followers_list IS 'Returns paginated list of users who follow the target profile';

-- ============================================================================
-- 2. GET FOLLOWING LIST (people the target user follows)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_following_list(
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
            'following', COALESCE(json_agg(following_data), '[]'::json),
            'total', (SELECT COUNT(*) FROM follows WHERE follower_id = p_profile_id)
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                f.followed_at
            FROM follows f
            JOIN profiles p ON p.id = f.followee_id
            WHERE f.follower_id = p_profile_id
            ORDER BY f.followed_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS following_data
    );
END;
$$;

COMMENT ON FUNCTION public.get_following_list IS 'Returns paginated list of users that the target profile follows';

-- ============================================================================
-- 3. GET FRIENDS LIST (mutual follows)
-- ============================================================================

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
                SELECT COUNT(*) FROM friends 
                WHERE user_id_1 = p_profile_id OR user_id_2 = p_profile_id
            )
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                fr.created_at AS friends_since
            FROM friends fr
            JOIN profiles p ON (
                CASE 
                    WHEN fr.user_id_1 = p_profile_id THEN p.id = fr.user_id_2
                    ELSE p.id = fr.user_id_1
                END
            )
            WHERE fr.user_id_1 = p_profile_id OR fr.user_id_2 = p_profile_id
            ORDER BY fr.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS friend_data
    );
END;
$$;

COMMENT ON FUNCTION public.get_friends_list IS 'Returns paginated list of mutual friends (from friends table)';

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_followers_list(UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_following_list(UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_list(UUID, INTEGER, INTEGER) TO authenticated, anon;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- What was added:
-- ✅ get_followers_list() - Paginated followers with profile data
-- ✅ get_following_list() - Paginated following with profile data
-- ✅ get_friends_list() - Paginated friends with profile data
-- ✅ All functions use SECURITY DEFINER for consistent access
-- ✅ Returns JSON with array + total count for pagination
-- ============================================================================
