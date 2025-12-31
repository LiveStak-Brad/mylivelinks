-- 1) Check if you have any live streams
SELECT id, profile_id, live_available, views_count, likes_count, comments_count, trending_score
FROM live_streams
WHERE live_available = TRUE;

-- 2) If you have likes/comments/views, manually trigger score calculation
DO $$
DECLARE
  v_stream_id BIGINT;
BEGIN
  SELECT id INTO v_stream_id FROM live_streams WHERE live_available = TRUE LIMIT 1;
  IF v_stream_id IS NOT NULL THEN
    PERFORM recompute_live_trending(v_stream_id);
    RAISE NOTICE 'Recomputed trending score for stream %', v_stream_id;
  END IF;
END $$;

-- 3) Now test the RPC
SELECT * FROM rpc_get_trending_live_streams(10, 0);
