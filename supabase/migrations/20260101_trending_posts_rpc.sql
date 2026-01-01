BEGIN;

DROP FUNCTION IF EXISTS public.rpc_get_trending_posts(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.rpc_get_trending_posts(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_window_hours integer DEFAULT 24
)
RETURNS TABLE (
  post_id uuid,
  author_id uuid,
  username text,
  display_name text,
  avatar_url text,
  text_content text,
  media_url text,
  created_at timestamptz,
  likes_count_window bigint,
  comments_count_window bigint,
  gifts_coins_window bigint,
  trending_score numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH params AS (
    SELECT
      LEAST(GREATEST(p_limit, 1), 50) AS limit_rows,
      GREATEST(p_offset, 0) AS offset_rows,
      GREATEST(p_window_hours, 1) AS window_hours
  ),
  public_posts AS (
    SELECT
      p.id,
      p.author_id,
      p.text_content,
      p.media_url,
      p.created_at
    FROM public.posts p
    WHERE p.visibility = 'public'
  )
  SELECT
    pp.id AS post_id,
    pp.author_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    pp.text_content,
    pp.media_url,
    pp.created_at,
    COALESCE(lw.likes_count_window, 0) AS likes_count_window,
    COALESCE(cw.comments_count_window, 0) AS comments_count_window,
    COALESCE(gw.gifts_coins_window, 0) AS gifts_coins_window,
    (
      (
        LN(1 + COALESCE(lw.likes_count_window, 0)) * 0.7
        + LN(1 + COALESCE(cw.comments_count_window, 0)) * 1.2
        + LN(1 + COALESCE(gw.gifts_coins_window, 0)) * 3.0
      )
      * (
        1.0 / POWER(
          GREATEST(1, EXTRACT(EPOCH FROM (now() - pp.created_at)) / 60.0),
          0.6
        )
      )
    ) AS trending_score
  FROM public_posts pp
  CROSS JOIN params cfg
  JOIN public.profiles pr ON pr.id = pp.author_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS likes_count_window
    FROM public.post_likes pl
    WHERE pl.post_id = pp.id
      AND pl.created_at >= now() - (cfg.window_hours * INTERVAL '1 hour')
  ) lw ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS comments_count_window
    FROM public.post_comments pc
    WHERE pc.post_id = pp.id
      AND pc.created_at >= now() - (cfg.window_hours * INTERVAL '1 hour')
  ) cw ON true
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(gg.coin_amount, pg.coins)), 0)::bigint AS gifts_coins_window
    FROM public.post_gifts pg
    LEFT JOIN public.gifts gg ON gg.id = pg.gift_id
    WHERE pg.post_id = pp.id
      AND pg.created_at >= now() - (cfg.window_hours * INTERVAL '1 hour')
  ) gw ON true
  ORDER BY trending_score DESC, pp.created_at DESC, pp.id DESC
  LIMIT (SELECT limit_rows FROM params)
  OFFSET (SELECT offset_rows FROM params);
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_trending_posts(integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_trending_posts(integer, integer, integer) TO authenticated;

COMMIT;
