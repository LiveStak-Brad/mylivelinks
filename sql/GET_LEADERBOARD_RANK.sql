-- ============================================================================
-- GET LEADERBOARD RANK AND POINTS FOR A PROFILE
-- Returns the real-time leaderboard position and points needed to advance
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_leaderboard_rank(
  p_profile_id UUID,
  p_leaderboard_type TEXT DEFAULT 'top_streamers_daily'
)
RETURNS TABLE(
  current_rank INT,
  total_entries INT,
  metric_value BIGINT,
  rank_tier TEXT,
  points_to_next_rank BIGINT,
  next_rank INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_rank INT;
  v_total_entries INT;
  v_metric_value BIGINT;
  v_rank_tier TEXT;
  v_points_to_next BIGINT;
  v_next_rank INT;
  v_next_rank_metric BIGINT;
BEGIN
  -- Get user's current rank and metric value from leaderboard cache
  SELECT lc.rank, lc.metric_value
  INTO v_current_rank, v_metric_value
  FROM leaderboard_cache lc
  WHERE lc.profile_id = p_profile_id
    AND lc.leaderboard_type = p_leaderboard_type;

  -- If not in cache, compute from source tables
  IF v_current_rank IS NULL THEN
    -- Determine entry type based on leaderboard type
    DECLARE
      v_entry_type TEXT;
      v_period TIMESTAMPTZ;
    BEGIN
      -- Parse leaderboard type (e.g., "top_streamers_daily")
      IF p_leaderboard_type LIKE '%streamers%' THEN
        v_entry_type := 'diamond_earn';
      ELSE
        v_entry_type := 'coin_spend_gift';
      END IF;

      -- Parse period
      IF p_leaderboard_type LIKE '%daily' THEN
        v_period := now() - interval '24 hours';
      ELSIF p_leaderboard_type LIKE '%weekly' THEN
        v_period := now() - interval '7 days';
      ELSIF p_leaderboard_type LIKE '%monthly' THEN
        v_period := now() - interval '30 days';
      ELSE
        v_period := '1970-01-01'::timestamptz; -- All time
      END IF;

      -- Compute metric value
      SELECT COALESCE(SUM(ABS(le.amount)), 0)
      INTO v_metric_value
      FROM ledger_entries le
      WHERE le.profile_id = p_profile_id
        AND le.entry_type = v_entry_type
        AND le.created_at >= v_period;

      -- Compute rank (count how many have higher metric)
      SELECT COUNT(*) + 1
      INTO v_current_rank
      FROM (
        SELECT le2.profile_id, SUM(ABS(le2.amount)) as total
        FROM ledger_entries le2
        WHERE le2.entry_type = v_entry_type
          AND le2.created_at >= v_period
        GROUP BY le2.profile_id
        HAVING SUM(ABS(le2.amount)) > v_metric_value
      ) sub;
    END;
  END IF;

  -- Get total number of entries
  SELECT COUNT(DISTINCT lc2.profile_id)
  INTO v_total_entries
  FROM leaderboard_cache lc2
  WHERE lc2.leaderboard_type = p_leaderboard_type
    AND lc2.metric_value > 0;

  -- Determine rank tier and label
  IF v_current_rank = 1 THEN
    v_rank_tier := 'Diamond';
  ELSIF v_current_rank = 2 THEN
    v_rank_tier := 'Platinum';
  ELSIF v_current_rank = 3 THEN
    v_rank_tier := 'Gold';
  ELSIF v_current_rank <= 10 THEN
    v_rank_tier := 'Silver';
  ELSIF v_current_rank <= 50 THEN
    v_rank_tier := 'Bronze';
  ELSIF v_current_rank <= 100 THEN
    v_rank_tier := 'Top 100';
  ELSE
    v_rank_tier := NULL;
  END IF;

  -- Calculate points needed to advance to next rank
  IF v_current_rank > 1 THEN
    v_next_rank := v_current_rank - 1;
    
    -- Get metric value of next rank
    SELECT lc3.metric_value
    INTO v_next_rank_metric
    FROM leaderboard_cache lc3
    WHERE lc3.leaderboard_type = p_leaderboard_type
      AND lc3.rank = v_next_rank
    LIMIT 1;

    -- If not in cache, compute it
    IF v_next_rank_metric IS NULL THEN
      DECLARE
        v_entry_type TEXT;
        v_period TIMESTAMPTZ;
      BEGIN
        IF p_leaderboard_type LIKE '%streamers%' THEN
          v_entry_type := 'diamond_earn';
        ELSE
          v_entry_type := 'coin_spend_gift';
        END IF;

        IF p_leaderboard_type LIKE '%daily' THEN
          v_period := now() - interval '24 hours';
        ELSIF p_leaderboard_type LIKE '%weekly' THEN
          v_period := now() - interval '7 days';
        ELSIF p_leaderboard_type LIKE '%monthly' THEN
          v_period := now() - interval '30 days';
        ELSE
          v_period := '1970-01-01'::timestamptz;
        END IF;

        -- Get the Nth highest metric value
        SELECT total
        INTO v_next_rank_metric
        FROM (
          SELECT le3.profile_id, SUM(ABS(le3.amount)) as total
          FROM ledger_entries le3
          WHERE le3.entry_type = v_entry_type
            AND le3.created_at >= v_period
          GROUP BY le3.profile_id
          ORDER BY total DESC
          LIMIT 1 OFFSET (v_next_rank - 1)
        ) sub;
      END;
    END IF;

    v_points_to_next := GREATEST(1, COALESCE(v_next_rank_metric, 0) - COALESCE(v_metric_value, 0) + 1);
  ELSIF v_current_rank = 1 THEN
    -- For rank 1, calculate lead over rank 2
    v_next_rank := 2;
    
    -- Get rank 2's metric value from cache
    SELECT lc.metric_value
    INTO v_next_rank_metric
    FROM leaderboard_cache lc
    WHERE lc.leaderboard_type = p_leaderboard_type
      AND lc.rank = 2
    LIMIT 1;
    
    -- If not in cache, compute it
    IF v_next_rank_metric IS NULL THEN
      DECLARE
        v_entry_type TEXT;
        v_period TIMESTAMPTZ;
      BEGIN
        IF p_leaderboard_type LIKE '%streamers%' THEN
          v_entry_type := 'diamond_earn';
        ELSE
          v_entry_type := 'coin_spend_gift';
        END IF;

        IF p_leaderboard_type LIKE '%daily' THEN
          v_period := now() - interval '24 hours';
        ELSIF p_leaderboard_type LIKE '%weekly' THEN
          v_period := now() - interval '7 days';
        ELSIF p_leaderboard_type LIKE '%monthly' THEN
          v_period := now() - interval '30 days';
        ELSE
          v_period := '1970-01-01'::timestamptz;
        END IF;

        -- Get 2nd place metric value
        SELECT total
        INTO v_next_rank_metric
        FROM (
          SELECT le4.profile_id, SUM(ABS(le4.amount)) as total
          FROM ledger_entries le4
          WHERE le4.entry_type = v_entry_type
            AND le4.created_at >= v_period
          GROUP BY le4.profile_id
          ORDER BY total DESC
          LIMIT 1 OFFSET 1
        ) sub;
      END;
    END IF;
    
    -- Calculate lead (how far ahead of 2nd place)
    v_points_to_next := GREATEST(0, COALESCE(v_metric_value, 0) - COALESCE(v_next_rank_metric, 0));
  ELSE
    -- Not ranked yet, need points to reach top 100
    v_next_rank := 100;
    
    SELECT lc.metric_value
    INTO v_next_rank_metric
    FROM leaderboard_cache lc
    WHERE lc.leaderboard_type = p_leaderboard_type
      AND lc.rank = 100
    LIMIT 1;

    v_points_to_next := GREATEST(1, COALESCE(v_next_rank_metric, 5000) - COALESCE(v_metric_value, 0) + 1);
  END IF;

  RETURN QUERY SELECT 
    v_current_rank,
    v_total_entries,
    COALESCE(v_metric_value, 0),
    v_rank_tier,
    v_points_to_next,
    v_next_rank;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rpc_get_leaderboard_rank(UUID, TEXT) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Leaderboard rank function created successfully!';
  RAISE NOTICE '   Usage: SELECT * FROM rpc_get_leaderboard_rank(''<profile_id>'', ''top_streamers_daily'')';
END $$;
