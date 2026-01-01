-- ============================================================================
-- LINK SYSTEM: Regular Link or Nah + Auto-Link F4F + Link Dating
-- ============================================================================
-- Three modes:
--   1) Regular Link or Nah (manual swipe decisions)
--   2) Auto-Link F4F (on-follow auto mutual behavior; settings-driven)
--   3) Link Dating (separate dating decisions + matches)
-- ============================================================================

-- ============================================================================
-- A) link_profiles (shared for Regular + Auto-Link)
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_profiles (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  bio text,
  location_text text,
  photos jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints: max 5 photos, reasonable bio/tags limits
  CONSTRAINT link_profiles_photos_max_5 CHECK (
    jsonb_array_length(photos) <= 5
  ),
  CONSTRAINT link_profiles_bio_length CHECK (
    bio IS NULL OR length(bio) <= 500
  ),
  CONSTRAINT link_profiles_tags_max_20 CHECK (
    jsonb_array_length(tags) <= 20
  )
);

CREATE INDEX idx_link_profiles_enabled ON link_profiles(enabled) WHERE enabled = true;
CREATE INDEX idx_link_profiles_created_at ON link_profiles(created_at DESC);

-- ============================================================================
-- B) link_settings (Auto-Link behavior)
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_settings (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  auto_link_on_follow boolean NOT NULL DEFAULT false,
  auto_link_require_approval boolean NOT NULL DEFAULT false, -- future
  auto_link_policy text NOT NULL DEFAULT 'everyone', -- future placeholder
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_link_settings_auto_enabled ON link_settings(auto_link_on_follow) 
  WHERE auto_link_on_follow = true;

-- ============================================================================
-- C) link_decisions (Regular manual swipe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_decisions (
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('link', 'nah')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (from_profile_id, to_profile_id),
  
  -- Can't decide on yourself
  CONSTRAINT link_decisions_no_self CHECK (from_profile_id != to_profile_id)
);

CREATE INDEX idx_link_decisions_from ON link_decisions(from_profile_id, created_at DESC);
CREATE INDEX idx_link_decisions_to ON link_decisions(to_profile_id, decision);

-- ============================================================================
-- D) link_mutuals (shared output for Regular + Auto-Link)
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_mutuals (
  profile_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_follow'))
  
  -- Note: Uniqueness enforced by unique index using LEAST/GREATEST
  -- No ordered CHECK needed - RPCs handle ordering, index prevents duplicates
);

CREATE UNIQUE INDEX idx_link_mutuals_pair ON link_mutuals(
  LEAST(profile_a, profile_b),
  GREATEST(profile_a, profile_b)
);

CREATE INDEX idx_link_mutuals_profile_a ON link_mutuals(profile_a, created_at DESC);
CREATE INDEX idx_link_mutuals_profile_b ON link_mutuals(profile_b, created_at DESC);
CREATE INDEX idx_link_mutuals_source ON link_mutuals(source);

-- ============================================================================
-- E) dating_profiles (separate)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dating_profiles (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  bio text,
  location_text text,
  photos jsonb DEFAULT '[]'::jsonb,
  prefs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints: max 5 photos, reasonable bio limit
  CONSTRAINT dating_profiles_photos_max_5 CHECK (
    jsonb_array_length(photos) <= 5
  ),
  CONSTRAINT dating_profiles_bio_length CHECK (
    bio IS NULL OR length(bio) <= 500
  )
);

CREATE INDEX idx_dating_profiles_enabled ON dating_profiles(enabled) WHERE enabled = true;
CREATE INDEX idx_dating_profiles_created_at ON dating_profiles(created_at DESC);

-- ============================================================================
-- F) dating_decisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS dating_decisions (
  from_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('like', 'nah')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (from_profile_id, to_profile_id),
  
  -- Can't decide on yourself
  CONSTRAINT dating_decisions_no_self CHECK (from_profile_id != to_profile_id)
);

CREATE INDEX idx_dating_decisions_from ON dating_decisions(from_profile_id, created_at DESC);
CREATE INDEX idx_dating_decisions_to ON dating_decisions(to_profile_id, decision);

-- ============================================================================
-- G) dating_matches
-- ============================================================================
CREATE TABLE IF NOT EXISTS dating_matches (
  profile_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
  
  -- Note: Uniqueness enforced by unique index using LEAST/GREATEST
  -- No ordered CHECK needed - RPCs handle ordering, index prevents duplicates
);

CREATE UNIQUE INDEX idx_dating_matches_pair ON dating_matches(
  LEAST(profile_a, profile_b),
  GREATEST(profile_a, profile_b)
);

CREATE INDEX idx_dating_matches_profile_a ON dating_matches(profile_a, created_at DESC);
CREATE INDEX idx_dating_matches_profile_b ON dating_matches(profile_b, created_at DESC);

-- ============================================================================
-- H) link_events (for notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'link_mutual_created',
    'dating_match_created',
    'auto_link_created'
  )),
  actor_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_link_events_target ON link_events(target_profile_id, created_at DESC);
CREATE INDEX idx_link_events_type ON link_events(event_type);
CREATE INDEX idx_link_events_created ON link_events(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- link_profiles
ALTER TABLE link_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_profiles_owner_all" ON link_profiles;

CREATE POLICY "link_profiles_owner_select" ON link_profiles
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "link_profiles_owner_insert" ON link_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "link_profiles_owner_update" ON link_profiles
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "link_profiles_select_enabled" ON link_profiles
  FOR SELECT USING (enabled = true);

-- link_settings
ALTER TABLE link_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_settings_owner_select" ON link_settings
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "link_settings_owner_update" ON link_settings
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "link_settings_owner_insert" ON link_settings
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- link_decisions
ALTER TABLE link_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_decisions_owner_insert" ON link_decisions
  FOR INSERT WITH CHECK (from_profile_id = auth.uid());

CREATE POLICY "link_decisions_owner_select" ON link_decisions
  FOR SELECT USING (from_profile_id = auth.uid());

-- link_mutuals (select only by participants; inserts via SECURITY DEFINER RPC)
ALTER TABLE link_mutuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_mutuals_participant_select" ON link_mutuals
  FOR SELECT USING (
    auth.uid() IN (profile_a, profile_b)
  );

-- dating_profiles
ALTER TABLE dating_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dating_profiles_owner_all" ON dating_profiles;

CREATE POLICY "dating_profiles_owner_select" ON dating_profiles
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "dating_profiles_owner_insert" ON dating_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "dating_profiles_owner_update" ON dating_profiles
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "dating_profiles_select_enabled" ON dating_profiles
  FOR SELECT USING (enabled = true);

-- dating_decisions
ALTER TABLE dating_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dating_decisions_owner_insert" ON dating_decisions
  FOR INSERT WITH CHECK (from_profile_id = auth.uid());

CREATE POLICY "dating_decisions_owner_select" ON dating_decisions
  FOR SELECT USING (from_profile_id = auth.uid());

-- dating_matches (select only by participants; inserts via SECURITY DEFINER RPC)
ALTER TABLE dating_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dating_matches_participant_select" ON dating_matches
  FOR SELECT USING (
    auth.uid() IN (profile_a, profile_b)
  );

-- link_events (selectable by target only)
ALTER TABLE link_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_events_target_select" ON link_events
  FOR SELECT USING (target_profile_id = auth.uid());

-- ============================================================================
-- RPC 1: rpc_upsert_link_profile
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_upsert_link_profile(
  p_enabled boolean,
  p_bio text DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb,
  p_tags jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate photos array length
  IF jsonb_array_length(p_photos) > 5 THEN
    RAISE EXCEPTION 'Maximum 5 photos allowed';
  END IF;
  
  INSERT INTO link_profiles (
    profile_id,
    enabled,
    bio,
    location_text,
    photos,
    tags,
    updated_at
  )
  VALUES (
    v_profile_id,
    p_enabled,
    p_bio,
    p_location_text,
    p_photos,
    p_tags,
    now()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    bio = EXCLUDED.bio,
    location_text = EXCLUDED.location_text,
    photos = EXCLUDED.photos,
    tags = EXCLUDED.tags,
    updated_at = now()
  RETURNING to_jsonb(link_profiles.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC 2: rpc_upsert_link_settings
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_upsert_link_settings(
  p_auto_link_on_follow boolean DEFAULT false,
  p_auto_link_require_approval boolean DEFAULT false,
  p_auto_link_policy text DEFAULT 'everyone'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO link_settings (
    profile_id,
    auto_link_on_follow,
    auto_link_require_approval,
    auto_link_policy,
    updated_at
  )
  VALUES (
    v_profile_id,
    p_auto_link_on_follow,
    p_auto_link_require_approval,
    p_auto_link_policy,
    now()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    auto_link_on_follow = EXCLUDED.auto_link_on_follow,
    auto_link_require_approval = EXCLUDED.auto_link_require_approval,
    auto_link_policy = EXCLUDED.auto_link_policy,
    updated_at = now()
  RETURNING to_jsonb(link_settings.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC 3: rpc_get_link_candidates
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_link_candidates(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get enabled link profiles, exclude self, already decided, and already mutual
  SELECT jsonb_agg(candidate_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', lp.profile_id,
      'enabled', lp.enabled,
      'bio', lp.bio,
      'location_text', lp.location_text,
      'photos', lp.photos,
      'tags', lp.tags,
      'created_at', lp.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) as candidate_data
    FROM link_profiles lp
    JOIN profiles p ON p.id = lp.profile_id
    WHERE lp.enabled = true
      AND lp.profile_id != v_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM link_decisions ld
        WHERE ld.from_profile_id = v_profile_id
          AND ld.to_profile_id = lp.profile_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM link_mutuals lm
        WHERE (lm.profile_a = LEAST(v_profile_id, lp.profile_id)
           AND lm.profile_b = GREATEST(v_profile_id, lp.profile_id))
      )
    ORDER BY lp.updated_at DESC, lp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- RPC 4: rpc_submit_link_decision
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_submit_link_decision(
  p_to_profile_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_profile_id uuid;
  v_is_mutual boolean := false;
  v_reverse_decision text;
  v_mutual_id_a uuid;
  v_mutual_id_b uuid;
BEGIN
  v_from_profile_id := auth.uid();
  
  IF v_from_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_from_profile_id = p_to_profile_id THEN
    RAISE EXCEPTION 'Cannot decide on yourself';
  END IF;
  
  IF p_decision NOT IN ('link', 'nah') THEN
    RAISE EXCEPTION 'Invalid decision. Must be "link" or "nah"';
  END IF;
  
  -- Insert decision (idempotent)
  INSERT INTO link_decisions (
    from_profile_id,
    to_profile_id,
    decision
  )
  VALUES (
    v_from_profile_id,
    p_to_profile_id,
    p_decision
  )
  ON CONFLICT (from_profile_id, to_profile_id) 
  DO UPDATE SET
    decision = EXCLUDED.decision,
    created_at = now();
  
  -- Check if both decided 'link'
  IF p_decision = 'link' THEN
    SELECT decision INTO v_reverse_decision
    FROM link_decisions
    WHERE from_profile_id = p_to_profile_id
      AND to_profile_id = v_from_profile_id;
    
    IF v_reverse_decision = 'link' THEN
      -- Create mutual (ensure ordered pair)
      v_mutual_id_a := LEAST(v_from_profile_id, p_to_profile_id);
      v_mutual_id_b := GREATEST(v_from_profile_id, p_to_profile_id);
      
      INSERT INTO link_mutuals (
        profile_a,
        profile_b,
        source
      )
      VALUES (
        v_mutual_id_a,
        v_mutual_id_b,
        'manual'
      )
      ON CONFLICT DO NOTHING;
      
      -- Create event for notification
      INSERT INTO link_events (
        event_type,
        actor_profile_id,
        target_profile_id,
        metadata
      )
      VALUES 
        ('link_mutual_created', v_from_profile_id, p_to_profile_id, '{}'::jsonb),
        ('link_mutual_created', p_to_profile_id, v_from_profile_id, '{}'::jsonb);
      
      v_is_mutual := true;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'mutual', v_is_mutual,
    'decision', p_decision
  );
END;
$$;

-- ============================================================================
-- RPC 5: rpc_get_my_mutuals
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_my_mutuals(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT jsonb_agg(mutual_data ORDER BY created_at DESC)
  INTO v_result
  FROM (
    SELECT 
      lm.created_at,
      lm.source,
      jsonb_build_object(
        'profile_id', other_profile.id,
        'username', other_profile.username,
        'display_name', other_profile.display_name,
        'avatar_url', other_profile.avatar_url,
        'bio', lp.bio,
        'location_text', lp.location_text,
        'photos', lp.photos,
        'tags', lp.tags,
        'created_at', lm.created_at,
        'source', lm.source
      ) as mutual_data
    FROM link_mutuals lm
    JOIN profiles other_profile
      ON other_profile.id = CASE
        WHEN lm.profile_a = v_profile_id THEN lm.profile_b
        ELSE lm.profile_a
      END
    LEFT JOIN link_profiles lp ON lp.profile_id = other_profile.id
    WHERE v_profile_id IN (lm.profile_a, lm.profile_b)
    ORDER BY lm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) mutuals;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- RPC 6: rpc_upsert_dating_profile
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_upsert_dating_profile(
  p_enabled boolean,
  p_bio text DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb,
  p_prefs jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate photos array length
  IF jsonb_array_length(p_photos) > 5 THEN
    RAISE EXCEPTION 'Maximum 5 photos allowed';
  END IF;
  
  INSERT INTO dating_profiles (
    profile_id,
    enabled,
    bio,
    location_text,
    photos,
    prefs,
    updated_at
  )
  VALUES (
    v_profile_id,
    p_enabled,
    p_bio,
    p_location_text,
    p_photos,
    p_prefs,
    now()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    bio = EXCLUDED.bio,
    location_text = EXCLUDED.location_text,
    photos = EXCLUDED.photos,
    prefs = EXCLUDED.prefs,
    updated_at = now()
  RETURNING to_jsonb(dating_profiles.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC 7: rpc_get_dating_candidates
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_dating_candidates(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get enabled dating profiles, exclude self, already decided, and already matched
  SELECT jsonb_agg(candidate_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', dp.profile_id,
      'enabled', dp.enabled,
      'bio', dp.bio,
      'location_text', dp.location_text,
      'photos', dp.photos,
      'prefs', dp.prefs,
      'created_at', dp.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) as candidate_data
    FROM dating_profiles dp
    JOIN profiles p ON p.id = dp.profile_id
    WHERE dp.enabled = true
      AND dp.profile_id != v_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM dating_decisions dd
        WHERE dd.from_profile_id = v_profile_id
          AND dd.to_profile_id = dp.profile_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM dating_matches dm
        WHERE (dm.profile_a = LEAST(v_profile_id, dp.profile_id)
           AND dm.profile_b = GREATEST(v_profile_id, dp.profile_id))
      )
    ORDER BY dp.updated_at DESC, dp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- RPC 8: rpc_submit_dating_decision
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_submit_dating_decision(
  p_to_profile_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_profile_id uuid;
  v_is_match boolean := false;
  v_reverse_decision text;
  v_match_id_a uuid;
  v_match_id_b uuid;
BEGIN
  v_from_profile_id := auth.uid();
  
  IF v_from_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_from_profile_id = p_to_profile_id THEN
    RAISE EXCEPTION 'Cannot decide on yourself';
  END IF;
  
  IF p_decision NOT IN ('like', 'nah') THEN
    RAISE EXCEPTION 'Invalid decision. Must be "like" or "nah"';
  END IF;
  
  -- Insert decision (idempotent)
  INSERT INTO dating_decisions (
    from_profile_id,
    to_profile_id,
    decision
  )
  VALUES (
    v_from_profile_id,
    p_to_profile_id,
    p_decision
  )
  ON CONFLICT (from_profile_id, to_profile_id) 
  DO UPDATE SET
    decision = EXCLUDED.decision,
    created_at = now();
  
  -- Check if both decided 'like'
  IF p_decision = 'like' THEN
    SELECT decision INTO v_reverse_decision
    FROM dating_decisions
    WHERE from_profile_id = p_to_profile_id
      AND to_profile_id = v_from_profile_id;
    
    IF v_reverse_decision = 'like' THEN
      -- Create match (ensure ordered pair)
      v_match_id_a := LEAST(v_from_profile_id, p_to_profile_id);
      v_match_id_b := GREATEST(v_from_profile_id, p_to_profile_id);
      
      INSERT INTO dating_matches (
        profile_a,
        profile_b
      )
      VALUES (
        v_match_id_a,
        v_match_id_b
      )
      ON CONFLICT DO NOTHING;
      
      -- Create event for notification
      INSERT INTO link_events (
        event_type,
        actor_profile_id,
        target_profile_id,
        metadata
      )
      VALUES 
        ('dating_match_created', v_from_profile_id, p_to_profile_id, '{}'::jsonb),
        ('dating_match_created', p_to_profile_id, v_from_profile_id, '{}'::jsonb);
      
      v_is_match := true;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'match', v_is_match,
    'decision', p_decision
  );
END;
$$;

-- ============================================================================
-- RPC 9: rpc_get_my_dating_matches
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_my_dating_matches(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT jsonb_agg(match_data ORDER BY created_at DESC)
  INTO v_result
  FROM (
    SELECT 
      dm.created_at,
      jsonb_build_object(
        'profile_id', other_profile.id,
        'username', other_profile.username,
        'display_name', other_profile.display_name,
        'avatar_url', other_profile.avatar_url,
        'bio', dp.bio,
        'location_text', dp.location_text,
        'photos', dp.photos,
        'prefs', dp.prefs,
        'created_at', dm.created_at
      ) as match_data
    FROM dating_matches dm
    JOIN profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.profile_a = v_profile_id THEN dm.profile_b
        ELSE dm.profile_a
      END
    LEFT JOIN dating_profiles dp ON dp.profile_id = other_profile.id
    WHERE v_profile_id IN (dm.profile_a, dm.profile_b)
    ORDER BY dm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) matches;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- RPC 10: rpc_handle_follow_event (Placeholder for Auto-Link)
-- ============================================================================
-- PHASE 1 SCAFFOLD: Do NOT implement trigger until follow schema provided
-- This RPC will be called from app-layer follow handler or DB trigger (TBD)
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_handle_follow_event(
  p_follower_id uuid,
  p_followed_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_followed_auto_link boolean := false;
  v_follower_enabled boolean := false;
  v_followed_enabled boolean := false;
  v_mutual_created boolean := false;
  v_mutual_id_a uuid;
  v_mutual_id_b uuid;
BEGIN
  -- Check if followed user has auto_link_on_follow enabled
  SELECT auto_link_on_follow INTO v_followed_auto_link
  FROM link_settings
  WHERE profile_id = p_followed_id;
  
  IF NOT COALESCE(v_followed_auto_link, false) THEN
    RETURN jsonb_build_object('created', false, 'reason', 'auto_link_disabled');
  END IF;
  
  -- Check if both users have link_profiles enabled
  SELECT enabled INTO v_follower_enabled
  FROM link_profiles
  WHERE profile_id = p_follower_id;
  
  SELECT enabled INTO v_followed_enabled
  FROM link_profiles
  WHERE profile_id = p_followed_id;
  
  IF NOT (COALESCE(v_follower_enabled, false) AND COALESCE(v_followed_enabled, false)) THEN
    RETURN jsonb_build_object('created', false, 'reason', 'link_profiles_not_enabled');
  END IF;
  
  -- Create mutual link (idempotent, ensure ordered pair)
  v_mutual_id_a := LEAST(p_follower_id, p_followed_id);
  v_mutual_id_b := GREATEST(p_follower_id, p_followed_id);
  
  INSERT INTO link_mutuals (
    profile_a,
    profile_b,
    source
  )
  VALUES (
    v_mutual_id_a,
    v_mutual_id_b,
    'auto_follow'
  )
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_mutual_created;
  
  -- Create event if mutual was created
  IF v_mutual_created THEN
    INSERT INTO link_events (
      event_type,
      actor_profile_id,
      target_profile_id,
      metadata
    )
    VALUES 
      ('auto_link_created', p_follower_id, p_followed_id, jsonb_build_object('via', 'follow')),
      ('auto_link_created', p_followed_id, p_follower_id, jsonb_build_object('via', 'follow'));
  END IF;
  
  RETURN jsonb_build_object(
    'created', COALESCE(v_mutual_created, false),
    'reason', CASE WHEN v_mutual_created THEN 'auto_link_created' ELSE 'already_exists' END
  );
END;
$$;

-- ============================================================================
-- HELPER: Check if two profiles are link mutuals
-- ============================================================================
CREATE OR REPLACE FUNCTION is_link_mutual(
  p_profile_id_1 uuid,
  p_profile_id_2 uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM link_mutuals
    WHERE (profile_a = LEAST(p_profile_id_1, p_profile_id_2)
       AND profile_b = GREATEST(p_profile_id_1, p_profile_id_2))
  );
$$;

-- ============================================================================
-- HELPER: Check if two profiles are dating matches
-- ============================================================================
CREATE OR REPLACE FUNCTION is_dating_match(
  p_profile_id_1 uuid,
  p_profile_id_2 uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dating_matches
    WHERE (profile_a = LEAST(p_profile_id_1, p_profile_id_2)
       AND profile_b = GREATEST(p_profile_id_1, p_profile_id_2))
  );
$$;

-- ============================================================================
-- RPC PERMISSIONS: Lockdown grants per role
-- Rule: anon = discovery only | authenticated = mutations + private | service_role = internal
-- ============================================================================

-- STEP 1: REVOKE ALL from PUBLIC (includes anon + authenticated)
REVOKE ALL ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_link_candidates(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_submit_link_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_my_mutuals(int, int) FROM PUBLIC;

REVOKE ALL ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_dating_candidates(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_submit_dating_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_my_dating_matches(int, int) FROM PUBLIC;

REVOKE ALL ON FUNCTION rpc_handle_follow_event(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_link_mutual(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_dating_match(uuid, uuid) FROM PUBLIC;

-- STEP 2: Grant A - anon + authenticated (READ-ONLY discovery)
GRANT EXECUTE ON FUNCTION rpc_get_link_candidates(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_dating_candidates(int, int) TO anon, authenticated;

-- STEP 3: Grant B - authenticated ONLY (mutations + private reads)
GRANT EXECUTE ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION rpc_submit_link_decision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_submit_dating_decision(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION rpc_get_my_mutuals(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_my_dating_matches(int, int) TO authenticated;

GRANT EXECUTE ON FUNCTION is_link_mutual(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_dating_match(uuid, uuid) TO authenticated;

-- STEP 4: Grant C - service_role ONLY (internal/follow glue)
GRANT EXECUTE ON FUNCTION rpc_handle_follow_event(uuid, uuid) TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
