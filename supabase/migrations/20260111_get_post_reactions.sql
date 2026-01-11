-- Migration: Add RPC to get post reactions with user info
-- Returns list of users who liked/reacted to a post

BEGIN;

-- First ensure post_likes has reaction_type column
ALTER TABLE public.post_likes 
  ADD COLUMN IF NOT EXISTS reaction_type text DEFAULT 'love';

-- RPC to get reactions for a post
DROP FUNCTION IF EXISTS public.rpc_get_post_reactions(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.rpc_get_post_reactions(
  p_post_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  reaction_type text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT 
    pl.profile_id,
    pr.username::text,
    COALESCE(pr.display_name, pr.username)::text AS display_name,
    pr.avatar_url::text,
    COALESCE(pl.reaction_type, 'love')::text AS reaction_type,
    pl.created_at
  FROM public.post_likes pl
  JOIN public.profiles pr ON pr.id = pl.profile_id
  WHERE pl.post_id = p_post_id
  ORDER BY pl.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 100)
  OFFSET COALESCE(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.rpc_get_post_reactions(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_post_reactions(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_post_reactions(uuid, integer, integer) TO anon;

COMMIT;
