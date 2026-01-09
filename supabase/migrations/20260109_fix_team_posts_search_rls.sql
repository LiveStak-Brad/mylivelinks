-- Fix team_feed_posts RLS to allow search
-- Current policy requires team membership, blocking global search
-- Solution: Allow SELECT for all team posts (teams are public by design)

BEGIN;

-- Drop existing restrictive policy
DROP POLICY IF EXISTS team_feed_posts_select ON public.team_feed_posts;

-- New policy: Allow viewing all team posts
-- Teams are public by design - anyone can discover and search team content
-- Membership is required for posting/commenting, not viewing
CREATE POLICY team_feed_posts_select
ON public.team_feed_posts FOR SELECT
USING (true);

COMMENT ON POLICY team_feed_posts_select ON public.team_feed_posts IS
  'Allow viewing all team posts for search and discovery. Teams are public by design.';

COMMIT;
