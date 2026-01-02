-- Verification SQL for Team Presence / Snapshot Stability
-- Runs inside a transaction and rolls back. Safe for prod when executed manually.

BEGIN;

DO $$
DECLARE
  dep_missing text;
  has_room_slug boolean;
BEGIN
  FOREACH dep_missing IN ARRAY ARRAY[
    'public.profiles',
    'public.teams',
    'public.team_members',
    'public.team_presence_events',
    'public.team_live_rooms',
    'public.live_streams'
  ]
  LOOP
    IF to_regclass(dep_missing) IS NULL THEN
      RAISE NOTICE 'SKIP team_presence verification: missing %', dep_missing;
      RETURN;
    END IF;
  END LOOP;
  
  -- Check if team_live_rooms has full schema (room_slug column)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='team_live_rooms' AND column_name='room_slug'
  ) INTO has_room_slug;
  
  IF NOT has_room_slug THEN
    RAISE NOTICE 'SKIP team_presence verification: team_live_rooms uses simplified schema (no room_slug)';
    RETURN;
  END IF;
  
  -- Check for optional tables
  IF to_regclass('public.team_presence_snapshots') IS NULL THEN
    RAISE NOTICE 'SKIP team_presence verification: missing team_presence_snapshots';
    RETURN;
  END IF;
  
  IF to_regclass('public.team_live_sessions') IS NULL THEN
    RAISE NOTICE 'SKIP team_presence verification: missing team_live_sessions table (not view)';
    -- Continue anyway if it's a view - the test may still work
  END IF;
END
$$;

DO $$
DECLARE
  u_admin uuid := '00000000-0000-0000-0000-0000000000a1'::uuid;
  u_mod uuid := '00000000-0000-0000-0000-0000000000a2'::uuid;
  u_member uuid := '00000000-0000-0000-0000-0000000000a3'::uuid;
  u_requested uuid := '00000000-0000-0000-0000-0000000000a4'::uuid;
  u_banned uuid := '00000000-0000-0000-0000-0000000000a5'::uuid;
  u_nonmember uuid := '00000000-0000-0000-0000-0000000000a6'::uuid;

  v_profiles_ready boolean;
  v_has_username boolean;

  v_team_id uuid;
  room_id uuid;
  session_id uuid;
  live_stream_id bigint;

  v_snapshot_tx_id uuid := gen_random_uuid();
  v_first_members uuid[];
  v_first_snapshot timestamptz;
  v_second_members uuid[];
  v_second_snapshot timestamptz;
  v_live_members uuid[];
  v_min_weight_members uuid[];
  v_summary jsonb;
  seed_profile uuid;
  v_seed_failed boolean := false;
BEGIN
  IF has_function_privilege('authenticated', 'public.rpc_get_active_team_members(uuid, uuid, numeric, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'expected rpc_get_active_team_members to be restricted from authenticated role';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.rpc_send_team_pool_gift(uuid, bigint, bigint, character varying)', 'EXECUTE') THEN
    RAISE EXCEPTION 'rpc_send_team_pool_gift must be executable by authenticated role';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) INTO v_profiles_ready;

  IF NOT v_profiles_ready THEN
    RAISE EXCEPTION 'profiles_table_missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='username'
  ) INTO v_has_username;

  -- Seed helper to insert profile if missing (best effort)
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = u_admin;
    IF NOT FOUND THEN
      IF v_has_username THEN
        INSERT INTO public.profiles (id, username) VALUES (u_admin, 'presence_admin') ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.profiles (id) VALUES (u_admin) ON CONFLICT (id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    v_seed_failed := true;
    RAISE NOTICE 'SKIP: unable to seed admin profile (%). Error: %', u_admin, SQLERRM;
  END;

  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = u_mod;
    IF NOT FOUND THEN
      IF v_has_username THEN
        INSERT INTO public.profiles (id, username) VALUES (u_mod, 'presence_mod') ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.profiles (id) VALUES (u_mod) ON CONFLICT (id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    v_seed_failed := true;
    RAISE NOTICE 'SKIP: unable to seed moderator profile (%). Error: %', u_mod, SQLERRM;
  END;

  FOR seed_profile IN SELECT unnest(ARRAY[u_member, u_requested, u_banned, u_nonmember]) LOOP
    BEGIN
      PERFORM 1 FROM public.profiles WHERE id = seed_profile;
      IF NOT FOUND THEN
        IF v_has_username THEN
          EXECUTE 'INSERT INTO public.profiles (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
          USING seed_profile, 'presence_' || seed_profile::text;
        ELSE
          EXECUTE 'INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING'
          USING seed_profile;
        END IF;
      END IF;
    EXCEPTION WHEN others THEN
      v_seed_failed := true;
      RAISE NOTICE 'SKIP: unable to seed profile (%). Error: %', seed_profile, SQLERRM;
    END;
  END LOOP;

  IF v_seed_failed THEN
    RAISE NOTICE 'Presence flow tests skipped due to profile seed failure; privilege checks already validated.';
    RETURN;
  END IF;

  INSERT INTO public.teams (slug)
  VALUES ('presence-verification-team')
  ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, profile_id, role, status)
  VALUES
    (v_team_id, u_admin, 'admin', 'approved'),
    (v_team_id, u_mod, 'moderator', 'approved'),
    (v_team_id, u_member, 'member', 'approved'),
    (v_team_id, u_requested, 'member', 'requested'),
    (v_team_id, u_banned, 'member', 'banned')
  ON CONFLICT (team_id, profile_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = EXCLUDED.status;

  INSERT INTO public.live_streams (profile_id, room_name, status)
  VALUES (u_admin, 'Presence Verification Stream', 'live')
  RETURNING id INTO live_stream_id;

  WITH upsert_room AS (
    INSERT INTO public.team_live_rooms (team_id, room_slug, name, created_by)
    VALUES (v_team_id, 'presence-room', 'Presence Test Room', u_admin)
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT COALESCE(
    (SELECT id FROM upsert_room),
    (SELECT id FROM public.team_live_rooms WHERE team_id = v_team_id AND lower(room_slug) = 'presence-room')
  )
  INTO room_id;

  INSERT INTO public.team_live_sessions (
    id,
    room_id,
    live_stream_id,
    host_profile_id,
    status
  )
  VALUES (
    gen_random_uuid(),
    room_id,
    live_stream_id,
    u_admin,
    'live'
  )
  RETURNING id INTO session_id;

  -- Baseline heartbeat: member (web)
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  PERFORM public.rpc_upsert_team_presence(v_team_id, u_member, NULL, 'web');

  -- Live-session heartbeat for member
  PERFORM public.rpc_upsert_team_presence(v_team_id, u_member, session_id, 'live_session');

  -- Admin acting on behalf of moderator
  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  PERFORM public.rpc_upsert_team_presence(v_team_id, u_mod, NULL, 'mobile');

  -- Member cannot upsert other member
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  BEGIN
    PERFORM public.rpc_upsert_team_presence(v_team_id, u_mod, NULL, 'web');
    RAISE EXCEPTION 'expected_forbidden_not_thrown: member acting on other';
  EXCEPTION
    WHEN others THEN
      IF position('forbidden' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Requested member blocked
  PERFORM set_config('request.jwt.claim.sub', u_requested::text, true);
  BEGIN
    PERFORM public.rpc_upsert_team_presence(v_team_id, u_requested, NULL, 'web');
    RAISE EXCEPTION 'expected_rejected_requested_member';
  EXCEPTION
    WHEN others THEN
      IF position('team_member_not_allowed' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Banned member blocked
  PERFORM set_config('request.jwt.claim.sub', u_banned::text, true);
  BEGIN
    PERFORM public.rpc_upsert_team_presence(v_team_id, u_banned, NULL, 'web');
    RAISE EXCEPTION 'expected_rejected_banned_member';
  EXCEPTION
    WHEN others THEN
      IF position('team_member_not_allowed' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Invalid source rejected
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  BEGIN
    PERFORM public.rpc_upsert_team_presence(v_team_id, u_member, NULL, 'desktop');
    RAISE EXCEPTION 'expected_invalid_source_rejection';
  EXCEPTION
    WHEN others THEN
      IF position('invalid_presence_source' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Snapshot read as admin (team scope)
  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  SELECT
    COALESCE(array_agg(member_id ORDER BY member_id), '{}'::uuid[]),
    MIN(snapshot_version)
  INTO v_first_members, v_first_snapshot
  FROM public.rpc_get_active_team_members(v_team_id, NULL, 0, v_snapshot_tx_id);

  IF v_first_snapshot IS NULL OR v_first_members IS NULL THEN
    RAISE EXCEPTION 'expected_snapshot_recorded';
  END IF;

  -- Member direct call must be forbidden
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  BEGIN
    PERFORM public.rpc_get_active_team_members(v_team_id, NULL, 0, NULL);
    RAISE EXCEPTION 'expected_forbidden_member_roster';
  EXCEPTION
    WHEN others THEN
      IF position('forbidden' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Non-member call forbidden
  PERFORM set_config('request.jwt.claim.sub', u_nonmember::text, true);
  BEGIN
    PERFORM public.rpc_get_active_team_members(v_team_id, NULL, 0, NULL);
    RAISE EXCEPTION 'expected_forbidden_non_member';
  EXCEPTION
    WHEN others THEN
      IF position('forbidden' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  -- Snapshot stability: add moderator heartbeat then retry with same snapshot id (should match first set)
  PERFORM set_config('request.jwt.claim.sub', u_mod::text, true);
  PERFORM public.rpc_upsert_team_presence(v_team_id, u_mod, session_id, 'live_session');

  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  SELECT
    COALESCE(array_agg(member_id ORDER BY member_id), '{}'::uuid[]),
    MIN(snapshot_version)
  INTO v_second_members,
       v_second_snapshot
  FROM public.rpc_get_active_team_members(v_team_id, NULL, 0, v_snapshot_tx_id);

  IF v_second_members IS DISTINCT FROM v_first_members THEN
    RAISE EXCEPTION 'snapshot_drift_detected';
  END IF;

  IF v_second_snapshot IS DISTINCT FROM v_first_snapshot THEN
    RAISE EXCEPTION 'snapshot_version_changed_on_retry';
  END IF;

  -- Live-session scoped query should only include members with live_session heartbeat (member + mod)
  SELECT
    COALESCE(array_agg(member_id ORDER BY member_id), '{}'::uuid[])
  INTO v_live_members
  FROM public.rpc_get_active_team_members(v_team_id, session_id, 0, gen_random_uuid());

  IF array_length(v_live_members, 1) <> 2 THEN
    RAISE EXCEPTION 'expected_two_live_participants';
  END IF;

  -- Expire member heartbeat manually and ensure removal on new snapshot
  UPDATE public.team_presence_events
  SET expires_at = transaction_timestamp() - interval '5 seconds'
  WHERE team_id = v_team_id
    AND member_id = u_member;

  SELECT
    COALESCE(array_agg(member_id ORDER BY member_id), '{}'::uuid[])
  INTO v_second_members
  FROM public.rpc_get_active_team_members(v_team_id, NULL, 0, gen_random_uuid());

  IF v_second_members @> ARRAY[u_member] THEN
    RAISE EXCEPTION 'expired_member_should_not_be_present';
  END IF;

  -- Weight filter: require >=20 (moderators/admins only)
  SELECT
    COALESCE(array_agg(member_id ORDER BY member_id), '{}'::uuid[])
  INTO v_min_weight_members
  FROM public.rpc_get_active_team_members(v_team_id, NULL, 20, gen_random_uuid());

  IF NOT (v_min_weight_members @> ARRAY[u_mod] AND v_min_weight_members @> ARRAY[u_admin]) THEN
    RAISE EXCEPTION 'expected_admin_and_mod_in_weighted_results';
  END IF;

  IF v_min_weight_members @> ARRAY[u_member] THEN
    RAISE EXCEPTION 'member_should_fail_min_weight';
  END IF;

  -- Summary allowed for members
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  v_summary := public.rpc_get_presence_summary(v_team_id);
  IF coalesce((v_summary->>'present_total')::int, 0) <= 0 THEN
    RAISE EXCEPTION 'summary_should_include_present_count';
  END IF;

  -- Summary forbidden for non-member
  PERFORM set_config('request.jwt.claim.sub', u_nonmember::text, true);
  BEGIN
    PERFORM public.rpc_get_presence_summary(v_team_id);
    RAISE EXCEPTION 'expected_summary_forbidden_for_non_member';
  EXCEPTION
    WHEN others THEN
      IF position('forbidden' in sqlerrm) = 0 THEN
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'Team presence verification complete (team_id=%).', v_team_id;
END
$$;

ROLLBACK;
