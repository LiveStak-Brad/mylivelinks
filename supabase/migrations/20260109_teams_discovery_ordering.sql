-- Teams Discovery Ordering
-- Implements strict priority ordering for Teams discovery surfaces
-- Priority: Photo+Members > Photo+NoMembers > NoPhoto+Members > NoPhoto+NoMembers

BEGIN;

-- RPC function to get teams with discovery ordering
CREATE OR REPLACE FUNCTION public.rpc_get_teams_discovery_ordered(
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  team_tag text,
  description text,
  icon_url text,
  banner_url text,
  theme_color text,
  approved_member_count int,
  created_at timestamptz,
  has_photo boolean,
  sort_tier int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.slug,
    t.name,
    t.team_tag,
    t.description,
    t.icon_url,
    t.banner_url,
    t.theme_color,
    t.approved_member_count,
    t.created_at,
    -- has_photo: true if either icon_url or banner_url is present
    (t.icon_url IS NOT NULL OR t.banner_url IS NOT NULL) as has_photo,
    -- sort_tier: lower number = higher priority
    CASE
      -- Tier 1: Teams WITH photo
      WHEN (t.icon_url IS NOT NULL OR t.banner_url IS NOT NULL) AND t.approved_member_count > 0 THEN 1
      WHEN (t.icon_url IS NOT NULL OR t.banner_url IS NOT NULL) AND t.approved_member_count = 0 THEN 2
      -- Tier 2: Teams WITHOUT photo
      WHEN (t.icon_url IS NULL AND t.banner_url IS NULL) AND t.approved_member_count > 0 THEN 3
      WHEN (t.icon_url IS NULL AND t.banner_url IS NULL) AND t.approved_member_count = 0 THEN 4
      ELSE 5
    END as sort_tier
  FROM public.teams t
  ORDER BY
    -- Primary sort: tier (lower = better)
    CASE
      WHEN (t.icon_url IS NOT NULL OR t.banner_url IS NOT NULL) AND t.approved_member_count > 0 THEN 1
      WHEN (t.icon_url IS NOT NULL OR t.banner_url IS NOT NULL) AND t.approved_member_count = 0 THEN 2
      WHEN (t.icon_url IS NULL AND t.banner_url IS NULL) AND t.approved_member_count > 0 THEN 3
      WHEN (t.icon_url IS NULL AND t.banner_url IS NULL) AND t.approved_member_count = 0 THEN 4
      ELSE 5
    END ASC,
    -- Secondary sort: member count descending (within tier)
    t.approved_member_count DESC,
    -- Tertiary sort: created_at descending (newest first for ties)
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.rpc_get_teams_discovery_ordered IS 
'Returns teams ordered by discovery priority: Photo+Members > Photo+NoMembers > NoPhoto+Members > NoPhoto+NoMembers. Within each tier, sorted by member count DESC, then created_at DESC.';

COMMIT;
