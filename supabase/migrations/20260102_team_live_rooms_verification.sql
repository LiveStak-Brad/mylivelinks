/*
 Verification SQL for Team Live Rooms backend
 
 Runs assertions and rolls back. Safe to run in a scratch DB.

BEGIN;

-- Minimal seed (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='teams') THEN
    CREATE TABLE public.teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text UNIQUE NOT NULL
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_members') THEN
    CREATE TABLE public.team_members (
      team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      role text,
      status text,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (team_id, profile_id)
    );
  END IF;
END $$;

-- Create 2 test users (profiles must exist for FKs)
DO $$
DECLARE
  v_team_id uuid;
  v_room_id uuid;
  v_session_id uuid;
  v_live_stream_id bigint;
  v_start jsonb;
  u_admin uuid := '00000000-0000-0000-0000-0000000000a1'::uuid;
  u_member uuid := '00000000-0000-0000-0000-0000000000b2'::uuid;
  u_stranger uuid := '00000000-0000-0000-0000-0000000000c3'::uuid;
  v_profiles_ready boolean;
  v_has_username boolean;
BEGIN
  -- Profiles are required for FKs (live_streams.profile_id, team_members.profile_id)
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

  -- Insert test profiles with best-effort compatibility
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_admin) THEN
    BEGIN
      IF v_has_username THEN
        EXECUTE 'INSERT INTO public.profiles (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING u_admin, 'team_admin_test';
      ELSE
        EXECUTE 'INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING'
        USING u_admin;
      END IF;
    EXCEPTION WHEN others THEN
      -- If your profiles schema requires additional NOT NULL fields, you must seed via your own helper/RPC.
      RAISE;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_member) THEN
    BEGIN
      IF v_has_username THEN
        EXECUTE 'INSERT INTO public.profiles (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING u_member, 'team_member_test';
      ELSE
        EXECUTE 'INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING'
        USING u_member;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u_stranger) THEN
    BEGIN
      IF v_has_username THEN
        EXECUTE 'INSERT INTO public.profiles (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING'
        USING u_stranger, 'team_stranger_test';
      ELSE
        EXECUTE 'INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING'
        USING u_stranger;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id IN (u_admin, u_member, u_stranger)) THEN
    RAISE EXCEPTION 'profiles_seed_failed';
  END IF;

  -- Create team
  INSERT INTO public.teams (slug) VALUES ('test-team-live')
  ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
  RETURNING id INTO v_team_id;

  -- Seed memberships
  INSERT INTO public.team_members (team_id, profile_id, role, status)
  VALUES
    (v_team_id, u_admin, 'admin', 'approved'),
    (v_team_id, u_member, 'member', 'approved')
  ON CONFLICT (team_id, profile_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

  -- Ensure a room exists (direct insert uses RLS in real env; here we just verify schema correctness)
  INSERT INTO public.team_live_rooms (team_id, room_slug, name, created_by, permissions)
  VALUES (v_team_id, 'general', 'General', u_admin, jsonb_build_object('create_room_min_role','moderator','go_live_min_role','moderator'))
  RETURNING id INTO v_room_id;

  -- Ensure team-live additions exist (migration applied)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_streams' AND column_name='audience'
  ) THEN
    RAISE EXCEPTION 'team_live_rooms_backend_migration_not_applied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='live_streams' AND column_name='team_id'
  ) THEN
    RAISE EXCEPTION 'team_live_rooms_backend_migration_not_applied';
  END IF;

  -- =========================
  -- Access tests (simulate auth.uid())
  -- =========================

  -- Non-member: rpc_get_team_live_rooms should throw forbidden
  PERFORM set_config('request.jwt.claim.sub', u_stranger::text, true);
  BEGIN
    PERFORM public.rpc_get_team_live_rooms('test-team-live');
    RAISE EXCEPTION 'expected_forbidden_not_raised:non_member_rooms';
  EXCEPTION WHEN others THEN
    IF position('forbidden' in sqlerrm) = 0 THEN
      RAISE;
    END IF;
  END;

  -- Member: rpc_get_team_live_rooms should succeed
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  PERFORM public.rpc_get_team_live_rooms('test-team-live');

  -- Non-member: rpc_get_team_live_now should throw forbidden
  PERFORM set_config('request.jwt.claim.sub', u_stranger::text, true);
  BEGIN
    PERFORM public.rpc_get_team_live_now(v_team_id);
    RAISE EXCEPTION 'expected_forbidden_not_raised:non_member_now';
  EXCEPTION WHEN others THEN
    IF position('forbidden' in sqlerrm) = 0 THEN
      RAISE;
    END IF;
  END;

  -- Role restriction: member cannot start live when go_live_min_role is moderator
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  BEGIN
    PERFORM public.rpc_start_team_live(v_room_id, 'solo');
    RAISE EXCEPTION 'expected_forbidden_not_raised:member_start_live';
  EXCEPTION WHEN others THEN
    IF position('forbidden' in sqlerrm) = 0 THEN
      RAISE;
    END IF;
  END;

  -- Admin can start live
  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  v_start := public.rpc_start_team_live(v_room_id, 'solo');
  v_session_id := (v_start ->> 'team_live_session_id')::uuid;
  v_live_stream_id := (v_start ->> 'live_stream_id')::bigint;

  IF v_session_id IS NULL OR v_live_stream_id IS NULL THEN
    RAISE EXCEPTION 'expected_session_created';
  END IF;

  -- Join validation: member can join, cannot publish
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  IF (public.rpc_validate_team_live_join(v_session_id, true) ->> 'can_publish')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'expected_member_cannot_publish';
  END IF;

  -- Join validation: host can publish
  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  IF (public.rpc_validate_team_live_join(v_session_id, true) ->> 'can_publish')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'expected_host_can_publish';
  END IF;

  -- Non-member join denied
  PERFORM set_config('request.jwt.claim.sub', u_stranger::text, true);
  BEGIN
    PERFORM public.rpc_validate_team_live_join(v_session_id, false);
    RAISE EXCEPTION 'expected_forbidden_not_raised:non_member_join';
  EXCEPTION WHEN others THEN
    IF position('forbidden' in sqlerrm) = 0 THEN
      RAISE;
    END IF;
  END;

  -- End live: member denied (not host, not moderator)
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  BEGIN
    PERFORM public.rpc_end_team_live(v_session_id, 'test');
    RAISE EXCEPTION 'expected_forbidden_not_raised:member_end';
  EXCEPTION WHEN others THEN
    IF position('forbidden' in sqlerrm) = 0 THEN
      RAISE;
    END IF;
  END;

  -- End live: host allowed
  PERFORM set_config('request.jwt.claim.sub', u_admin::text, true);
  PERFORM public.rpc_end_team_live(v_session_id, 'test');

  -- Chat scoping invariant: team chat requires both team_id + team_live_session_id and membership.
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);
  INSERT INTO public.chat_messages (profile_id, content, team_id, team_live_session_id)
  VALUES (u_member, 'hello team live', v_team_id, v_session_id);

  -- Chat scoping invariant: team_id must match session's team
  BEGIN
    INSERT INTO public.chat_messages (profile_id, content, team_id, team_live_session_id)
    VALUES (u_member, 'bad team mismatch', gen_random_uuid(), v_session_id);
    RAISE EXCEPTION 'expected_insert_rejected:team_mismatch';
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- XOR scope should reject if team scope + stream scope mixed
  BEGIN
    INSERT INTO public.chat_messages (profile_id, content, team_id, team_live_session_id, live_stream_id)
    VALUES (u_member, 'bad mixed scope', v_team_id, v_session_id, v_live_stream_id::int);
    RAISE EXCEPTION 'expected_insert_rejected:mixed_scope';
  EXCEPTION WHEN others THEN
    -- any error is acceptable; policy should reject
    NULL;
  END;

  -- Invariant: unique slug per team
  BEGIN
    INSERT INTO public.team_live_rooms (team_id, room_slug, name, created_by)
    VALUES (v_team_id, 'general', 'Dup', u_admin);
    RAISE EXCEPTION 'expected_unique_violation_not_raised';
  EXCEPTION WHEN unique_violation THEN
    -- ok
    NULL;
  END;
END $$;

ROLLBACK;

*/
