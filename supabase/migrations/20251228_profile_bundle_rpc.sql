BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type varchar(20) DEFAULT 'default';

DROP FUNCTION IF EXISTS public.get_profile_bundle(text, uuid, text);

CREATE OR REPLACE FUNCTION public.get_profile_bundle(
  p_username text,
  p_viewer_id uuid DEFAULT NULL,
  p_platform text DEFAULT 'web'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_profile record;
  v_featured_links json;
  v_blocks json;
  v_blocks_jsonb jsonb;
  v_profile_blocks_jsonb jsonb;
BEGIN
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.is_live,
    COALESCE(p.profile_type, 'default') AS profile_type,

    p.profile_bg_url,
    p.profile_bg_overlay,
    p.card_color,
    p.card_opacity,
    p.card_border_radius,
    p.font_preset,
    p.accent_color,
    p.links_section_title,

    p.hide_streaming_stats,

    p.social_instagram,
    p.social_twitter,
    p.social_youtube,
    p.social_tiktok,
    p.social_facebook,
    p.social_twitch,
    p.social_discord,
    p.social_snapchat,
    p.social_linkedin,
    p.social_github,
    p.social_spotify,
    p.social_onlyfans,

    CASE WHEN p_viewer_id = p.id THEN p.coin_balance ELSE NULL END AS coin_balance,
    CASE WHEN p_viewer_id = p.id THEN p.earnings_balance ELSE NULL END AS earnings_balance
  INTO v_profile
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', ul.id,
        'title', ul.title,
        'url', ul.url,
        'icon', ul.icon,
        'click_count', ul.click_count,
        'display_order', ul.display_order
      )
      ORDER BY ul.display_order, ul.id
    ),
    '[]'::json
  )
  INTO v_featured_links
  FROM public.user_links ul
  WHERE ul.profile_id = v_profile.id
    AND ul.is_active = TRUE
    AND COALESCE(ul.is_adult, FALSE) = FALSE;

  v_blocks := json_build_object(
    'schedule_items', '[]'::json,
    'clips', '[]'::json,
    'tracks', '[]'::json,
    'shows', '[]'::json,
    'merch', '[]'::json,
    'presskit_links', '[]'::json,
    'services', '[]'::json,
    'products', '[]'::json,
    'booking_link', NULL,
    'featured_links', v_featured_links,
    'posts', '[]'::json
  );

  v_blocks_jsonb := to_jsonb(v_blocks);

  -- If a future profile_blocks table exists, merge its grouped blocks into v_blocks.
  BEGIN
    PERFORM 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profile_blocks';

    IF FOUND THEN
      EXECUTE $q$
        WITH rows AS (
          SELECT
            pb.block_type,
            jsonb_build_object(
              'id', pb.id,
              'block_type', pb.block_type,
              'data', pb.data,
              'sort_order', pb.sort_order,
              'created_at', pb.created_at
            ) AS item,
            pb.sort_order,
            pb.created_at
          FROM public.profile_blocks pb
          WHERE pb.profile_id = $1
        ),
        grouped AS (
          SELECT
            block_type,
            jsonb_agg(item ORDER BY sort_order NULLS LAST, created_at NULLS LAST) AS arr
          FROM rows
          GROUP BY block_type
        )
        SELECT COALESCE(jsonb_object_agg(block_type, arr), '{}'::jsonb) FROM grouped
      $q$
      INTO v_profile_blocks_jsonb
      USING v_profile.id;

      v_blocks_jsonb := v_blocks_jsonb || COALESCE(v_profile_blocks_jsonb, '{}'::jsonb);
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- ignore
      NULL;
  END;

  RETURN json_build_object(
    'profile', row_to_json(v_profile),
    'blocks', v_blocks_jsonb::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_bundle(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_bundle(text, uuid, text) TO authenticated;

COMMIT;
