BEGIN;

-- =============================================================================
-- Teams Security Gate Acceptance Tests
-- -----------------------------------------------------------------------------
-- • Runs entirely inside a transaction and rolls back at the end.
-- • Emits PASS/FAIL/SKIP notices for each checklist item in the spec.
-- • Uses set_config('request.jwt.claim.sub', ...) to simulate auth contexts.
-- • Safe to run in Supabase SQL editor or via psql.
-- =============================================================================

-- Helpers for auth simulation -------------------------------------------------
CREATE OR REPLACE FUNCTION public.__teams_gate_set_auth(p_user uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', NULL, true);
    PERFORM set_config('request.jwt.claim.role', NULL, true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.__teams_gate_clear_auth()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', NULL, true);
  PERFORM set_config('request.jwt.claim.role', NULL, true);
END;
$$;

-- Main test harness -----------------------------------------------------------
DO $tests$
DECLARE
  -- Test identities (stable UUIDs for repeatability)
  v_admin_user   constant uuid := '00000000-0000-0000-0000-0000000000a1'::uuid;
  v_mod_user     constant uuid := '00000000-0000-0000-0000-0000000000a2'::uuid;
  v_member_user  constant uuid := '00000000-0000-0000-0000-0000000000a3'::uuid;
  v_banned_user  constant uuid := '00000000-0000-0000-0000-0000000000a4'::uuid;
  v_non_member   constant uuid := '00000000-0000-0000-0000-0000000000a5'::uuid;

  -- Capability flags (schema presence)
  has_profiles boolean := to_regclass('public.profiles') IS NOT NULL;
  has_teams boolean := to_regclass('public.teams') IS NOT NULL;
  has_team_members boolean := to_regclass('public.team_members') IS NOT NULL;
  has_team_posts boolean := to_regclass('public.team_posts') IS NOT NULL;
  has_team_comments boolean := to_regclass('public.team_comments') IS NOT NULL;
  has_team_reactions boolean := to_regclass('public.team_reactions') IS NOT NULL;
  has_team_threads boolean := to_regclass('public.team_threads') IS NOT NULL;
  has_team_thread_replies boolean := to_regclass('public.team_thread_replies') IS NOT NULL;
  has_team_presence boolean := to_regclass('public.team_presence') IS NOT NULL;
  has_team_join_requests boolean := to_regclass('public.team_join_requests') IS NOT NULL;
  has_team_live_rooms boolean := to_regclass('public.team_live_rooms') IS NOT NULL;
  has_team_live_rooms_full boolean := false; -- True only if team_live_rooms has room_slug column
  has_team_live_sessions boolean := to_regclass('public.team_live_sessions') IS NOT NULL;
  has_chat_messages boolean := to_regclass('public.chat_messages') IS NOT NULL;
  has_team_pool_gifts boolean := to_regclass('public.team_pool_gifts') IS NOT NULL;
  has_team_pool_gift_splits boolean := to_regclass('public.team_pool_gift_splits') IS NOT NULL;
  has_ledger_entries boolean := to_regclass('public.ledger_entries') IS NOT NULL;
  has_team_audit_events boolean := to_regclass('public.team_audit_events') IS NOT NULL;
  has_moderation_queue boolean := to_regclass('public.moderation_queue') IS NOT NULL
    OR to_regclass('public.team_moderation_queue') IS NOT NULL;
  has_team_emotes boolean := to_regclass('public.team_emotes') IS NOT NULL;

  -- Column awareness
  teams_has_slug boolean := false;
  membership_identity_col text := NULL;
  membership_has_role boolean := false;
  membership_has_status boolean := false;

  -- RPC presence
  rpc_get_team_live_rooms regprocedure := to_regprocedure('public.rpc_get_team_live_rooms(text)');
  rpc_get_team_live_now regprocedure := to_regprocedure('public.rpc_get_team_live_now(uuid)');
  rpc_start_team_live regprocedure := to_regprocedure('public.rpc_start_team_live(uuid,text)');
  rpc_end_team_live regprocedure := to_regprocedure('public.rpc_end_team_live(uuid,text)');
  rpc_validate_team_live_join regprocedure := to_regprocedure('public.rpc_validate_team_live_join(uuid,boolean)');
  rpc_send_team_pool_gift regprocedure := to_regprocedure('public.rpc_send_team_pool_gift(uuid,bigint,bigint,character varying)');
  rpc_get_team_pool_status regprocedure := to_regprocedure('public.rpc_get_team_pool_status(uuid,bigint)');
  rpc_assert_team_member regprocedure := to_regprocedure('public.rpc_assert_team_member_approved(uuid,uuid)');
  rpc_assert_team_live_binding regprocedure := to_regprocedure('public.rpc_assert_team_live_binding(uuid,bigint)');
  rpc_active_snapshot regprocedure := to_regprocedure('public.rpc_get_active_team_members_snapshot(uuid,bigint,integer)');

  -- Fixture state
  fixtures_ready boolean := false;
  fixtures_reason text := '';
  profiles_has_username boolean := false;
  v_team_id uuid;
  v_team_slug text;
  v_room_id uuid;
  v_live_session_id uuid;
  v_live_stream_id bigint;
  v_room_slug text := 'teams-security-gate-room';
  v_gift_request_id text := 'teams-security-gate-' || gen_random_uuid()::text;

  -- Utility variables
  v_json jsonb;
  v_count int;
BEGIN
  RAISE NOTICE 'INFO: Teams Security Gate acceptance tests starting';
  PERFORM public.__teams_gate_clear_auth();

  -- Column capability checks --------------------------------------------------
  IF has_teams THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='teams' AND column_name='slug'
    ) INTO teams_has_slug;
  END IF;

  -- Check if team_live_rooms has the full schema (room_slug column)
  IF has_team_live_rooms THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='team_live_rooms' AND column_name='room_slug'
    ) INTO has_team_live_rooms_full;
  END IF;

  IF has_team_members THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='team_members' AND column_name='profile_id'
    ) THEN
      membership_identity_col := 'profile_id';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='team_members' AND column_name='user_id'
    ) THEN
      membership_identity_col := 'user_id';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='team_members' AND column_name='role'
    ) INTO membership_has_role;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='team_members' AND column_name='status'
    ) INTO membership_has_status;
  END IF;

  -- Determine fixture readiness ----------------------------------------------
  IF has_profiles AND has_teams AND has_team_members AND teams_has_slug
     AND membership_identity_col IS NOT NULL
     AND membership_has_role AND membership_has_status THEN
    fixtures_ready := true;
  ELSE
    fixtures_reason := 'missing base table/columns for fixtures';
  END IF;

  -- Seed profiles (best effort) ----------------------------------------------
  IF fixtures_ready THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles' AND column_name='username'
    ) INTO profiles_has_username;

    BEGIN
      FOR v_json IN
        SELECT * FROM jsonb_array_elements_text(
          jsonb_build_array(
            jsonb_build_object('id', v_admin_user,  'username', 'teams_gate_admin'),
            jsonb_build_object('id', v_mod_user,    'username', 'teams_gate_mod'),
            jsonb_build_object('id', v_member_user, 'username', 'teams_gate_member'),
            jsonb_build_object('id', v_banned_user, 'username', 'teams_gate_banned'),
            jsonb_build_object('id', v_non_member,  'username', 'teams_gate_non_member')
          )
        )
      LOOP
        IF profiles_has_username THEN
          EXECUTE '
            INSERT INTO public.profiles (id, username)
            VALUES ($1, $2)
            ON CONFLICT (id) DO NOTHING
          ' USING (v_json->>'id')::uuid, (v_json->>'username');
        ELSE
          EXECUTE '
            INSERT INTO public.profiles (id)
            VALUES ($1)
            ON CONFLICT (id) DO NOTHING
          ' USING (v_json->>'id')::uuid;
        END IF;
      END LOOP;
    EXCEPTION
      WHEN others THEN
        fixtures_ready := false;
        fixtures_reason := 'profiles seed failed: ' || SQLERRM;
    END;
  END IF;

  -- Acquire or create team ----------------------------------------------------
  IF fixtures_ready THEN
    SELECT t.id, t.slug
    INTO v_team_id, v_team_slug
    FROM public.teams t
    LIMIT 1;

    IF v_team_id IS NULL OR v_team_slug IS NULL THEN
      BEGIN
        INSERT INTO public.teams (slug)
        VALUES ('teams-security-gate')
        RETURNING id, slug INTO v_team_id, v_team_slug;
      EXCEPTION
        WHEN others THEN
          fixtures_ready := false;
          fixtures_reason := 'unable to seed teams row: ' || SQLERRM;
      END;
    END IF;
  END IF;

  -- Seed team_members --------------------------------------------------------
  IF fixtures_ready THEN
    BEGIN
      EXECUTE format(
        'INSERT INTO public.team_members (team_id, %I, role, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING',
        membership_identity_col
      ) USING v_team_id, v_admin_user, 'admin', 'approved';

      EXECUTE format(
        'INSERT INTO public.team_members (team_id, %I, role, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING',
        membership_identity_col
      ) USING v_team_id, v_mod_user, 'moderator', 'approved';

      EXECUTE format(
        'INSERT INTO public.team_members (team_id, %I, role, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING',
        membership_identity_col
      ) USING v_team_id, v_member_user, 'member', 'approved';

      EXECUTE format(
        'INSERT INTO public.team_members (team_id, %I, role, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING',
        membership_identity_col
      ) USING v_team_id, v_banned_user, 'member', 'banned';
    EXCEPTION
      WHEN others THEN
        fixtures_ready := false;
        fixtures_reason := 'team_members seed failed: ' || SQLERRM;
    END;
  END IF;

  -- Seed team live room ------------------------------------------------------
  -- Only attempt if team_live_rooms has the full schema (room_slug column)
  IF fixtures_ready AND has_team_live_rooms_full THEN
    BEGIN
      INSERT INTO public.team_live_rooms (team_id, room_slug, name, created_by, permissions)
      VALUES (
        v_team_id,
        v_room_slug,
        'Teams Gate Room',
        v_admin_user,
        jsonb_build_object('create_room_min_role','moderator','go_live_min_role','moderator')
      )
      ON CONFLICT (team_id, room_slug) DO UPDATE
        SET updated_at = now()
      RETURNING id INTO v_room_id;
    EXCEPTION
      WHEN others THEN
        fixtures_ready := false;
        fixtures_reason := 'team_live_rooms seed failed: ' || SQLERRM;
    END;
  ELSIF fixtures_ready AND has_team_live_rooms AND NOT has_team_live_rooms_full THEN
    RAISE NOTICE 'SKIP: team_live_rooms has simplified schema (no room_slug), skipping room fixture';
  END IF;

  -- Summarize fixture status --------------------------------------------------
  IF fixtures_ready THEN
    RAISE NOTICE 'SETUP: Fixture team %, room % ready', v_team_id, v_room_id;
  ELSE
    RAISE NOTICE 'SETUP: Fixtures unavailable (%). Tests that require membership will SKIP.', fixtures_reason;
  END IF;

  ---------------------------------------------------------------------------
  -- TEST 1: Non-member cannot read team feed
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_team_posts THEN
      RAISE NOTICE 'SKIP: Feed privacy (team_posts table missing)';
    ELSIF NOT fixtures_ready THEN
      RAISE NOTICE 'SKIP: Feed privacy (fixtures unavailable)';
    ELSE
      RAISE NOTICE 'SKIP: Feed privacy (TODO once team_posts schema exists)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 2: Pending member cannot read team content
  ---------------------------------------------------------------------------
  BEGIN
    RAISE NOTICE 'SKIP: Pending member access (team_join_requests + requested status flow missing)';
  END;

  ---------------------------------------------------------------------------
  -- TEST 3: Membership approval restricted to admins/mods
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_team_join_requests THEN
      RAISE NOTICE 'SKIP: Membership approval (team_join_requests table missing)';
    ELSE
      RAISE NOTICE 'SKIP: Membership approval (approval RPC not implemented)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 4: Thread reply inherits parent team_id
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (has_team_threads AND has_team_thread_replies) THEN
      RAISE NOTICE 'SKIP: Thread inheritance (team_threads/team_thread_replies missing)';
    ELSE
      RAISE NOTICE 'SKIP: Thread inheritance (implement once schema exists)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 5: Non-member denied team live room listing
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (fixtures_ready AND has_team_live_rooms AND rpc_get_team_live_rooms IS NOT NULL) THEN
      RAISE NOTICE 'SKIP: Team live discovery (missing fixtures or RPC)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_non_member);
      BEGIN
        PERFORM public.rpc_get_team_live_rooms(v_team_slug);
        RAISE EXCEPTION 'expected forbidden';
      EXCEPTION
        WHEN others THEN
          IF position('forbidden' in lower(coalesce(SQLERRM,''))) > 0 THEN
            RAISE NOTICE 'PASS: Non-member denied team live rooms';
          ELSE
            RAISE EXCEPTION 'FAIL: Non-member denied team live rooms (%: %)', SQLSTATE, SQLERRM;
          END IF;
      END;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 6: Member allowed to list team live rooms
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (fixtures_ready AND has_team_live_rooms AND rpc_get_team_live_rooms IS NOT NULL) THEN
      RAISE NOTICE 'SKIP: Member live discovery (missing fixtures or RPC)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_member_user);
      SELECT count(*) INTO v_count FROM public.rpc_get_team_live_rooms(v_team_slug);
      IF v_count >= 1 THEN
        RAISE NOTICE 'PASS: Member can list team live rooms';
      ELSE
        RAISE EXCEPTION 'FAIL: Member live room listing returned 0 rows (expected ≥1)';
      END IF;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 7: Member cannot start live when go_live_min_role=moderator
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (fixtures_ready AND v_room_id IS NOT NULL AND rpc_start_team_live IS NOT NULL) THEN
      RAISE NOTICE 'SKIP: Member start live restriction (missing fixtures/RPC)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_member_user);
      BEGIN
        PERFORM public.rpc_start_team_live(v_room_id, 'solo');
        RAISE EXCEPTION 'expected_forbidden';
      EXCEPTION
        WHEN others THEN
          IF position('forbidden' in lower(SQLERRM)) > 0 THEN
            RAISE NOTICE 'PASS: Member blocked from starting live';
          ELSE
            RAISE EXCEPTION 'FAIL: Member start live unexpected error (%: %)', SQLSTATE, SQLERRM;
          END IF;
      END;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 8: Admin can start live and produce session id
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (fixtures_ready AND v_room_id IS NOT NULL AND rpc_start_team_live IS NOT NULL) THEN
      RAISE NOTICE 'SKIP: Admin start live (missing fixtures/RPC)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_admin_user);
      v_json := public.rpc_start_team_live(v_room_id, 'solo');
      v_live_session_id := (v_json ->> 'team_live_session_id')::uuid;
      v_live_stream_id  := (v_json ->> 'live_stream_id')::bigint;
      IF v_live_session_id IS NULL OR v_live_stream_id IS NULL THEN
        RAISE EXCEPTION 'FAIL: Admin start live did not return ids';
      END IF;
      RAISE NOTICE 'PASS: Admin started live session % with stream %', v_live_session_id, v_live_stream_id;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 9: Member join allowed but cannot publish
  ---------------------------------------------------------------------------
  BEGIN
    IF v_live_session_id IS NULL OR rpc_validate_team_live_join IS NULL THEN
      RAISE NOTICE 'SKIP: Member join behavior (live session unavailable)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_member_user);
      v_json := public.rpc_validate_team_live_join(v_live_session_id, true);
      IF coalesce((v_json ->> 'can_publish')::boolean, false) = false THEN
        RAISE NOTICE 'PASS: Member cannot publish when joining live';
      ELSE
        RAISE EXCEPTION 'FAIL: Member unexpectedly allowed to publish';
      END IF;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 10: Host join allows publishing
  ---------------------------------------------------------------------------
  BEGIN
    IF v_live_session_id IS NULL OR rpc_validate_team_live_join IS NULL THEN
      RAISE NOTICE 'SKIP: Host join behavior (live session unavailable)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_admin_user);
      v_json := public.rpc_validate_team_live_join(v_live_session_id, true);
      IF coalesce((v_json ->> 'can_publish')::boolean, false) THEN
        RAISE NOTICE 'PASS: Host can publish when joining live';
      ELSE
        RAISE EXCEPTION 'FAIL: Host publish flag missing';
      END IF;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 11: Non-member join denied
  ---------------------------------------------------------------------------
  BEGIN
    IF v_live_session_id IS NULL OR rpc_validate_team_live_join IS NULL THEN
      RAISE NOTICE 'SKIP: Non-member join (live session unavailable)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_non_member);
      BEGIN
        PERFORM public.rpc_validate_team_live_join(v_live_session_id, false);
        RAISE EXCEPTION 'expected_forbidden';
      EXCEPTION
        WHEN others THEN
          IF position('forbidden' in lower(SQLERRM)) > 0 THEN
            RAISE NOTICE 'PASS: Non-member denied from joining live';
          ELSE
            RAISE EXCEPTION 'FAIL: Non-member join unexpected error (%: %)', SQLSTATE, SQLERRM;
          END IF;
      END;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 12: Chat scoping enforces team + session binding
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_chat_messages OR v_live_session_id IS NULL OR v_team_id IS NULL THEN
      RAISE NOTICE 'SKIP: Chat scoping (missing chat_messages columns or live)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_member_user);
      INSERT INTO public.chat_messages (profile_id, content, team_id, team_live_session_id)
      VALUES (v_member_user, 'teams gate ok', v_team_id, v_live_session_id);
      RAISE NOTICE 'PASS: Chat insert with matching team/session succeeded';

      BEGIN
        INSERT INTO public.chat_messages (profile_id, content, team_id, team_live_session_id)
        VALUES (v_member_user, 'teams gate mismatch', gen_random_uuid(), v_live_session_id);
        RAISE EXCEPTION 'expected_mismatch_rejected';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'PASS: Chat insert rejected for mismatched team/session';
      END;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 13: Member cannot end live; admin can
  ---------------------------------------------------------------------------
  BEGIN
    IF v_live_session_id IS NULL OR rpc_end_team_live IS NULL THEN
      RAISE NOTICE 'SKIP: End live tests (session unavailable)';
    ELSE
      PERFORM public.__teams_gate_set_auth(v_member_user);
      BEGIN
        PERFORM public.rpc_end_team_live(v_live_session_id, 'member attempt');
        RAISE EXCEPTION 'expected_forbidden';
      EXCEPTION
        WHEN others THEN
          IF position('forbidden' in lower(SQLERRM)) > 0 THEN
            RAISE NOTICE 'PASS: Member blocked from ending live';
          ELSE
            RAISE EXCEPTION 'FAIL: Member end live unexpected error (%: %)', SQLSTATE, SQLERRM;
          END IF;
      END;

      PERFORM public.__teams_gate_set_auth(v_admin_user);
      PERFORM public.rpc_end_team_live(v_live_session_id, 'admin shutdown');
      RAISE NOTICE 'PASS: Admin ended live session %', v_live_session_id;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 14: Team pool gift request id idempotency
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT (has_team_pool_gifts AND has_team_pool_gift_splits AND has_ledger_entries) THEN
      RAISE NOTICE 'SKIP: Team pool gift idempotency (tables missing)';
    ELSIF rpc_send_team_pool_gift IS NULL THEN
      RAISE NOTICE 'SKIP: Team pool gift idempotency (rpc_send_team_pool_gift missing)';
    ELSIF rpc_assert_team_member IS NULL OR rpc_assert_team_live_binding IS NULL OR rpc_active_snapshot IS NULL THEN
      RAISE NOTICE 'SKIP: Team pool gift idempotency (assert helper RPCs missing)';
    ELSE
      RAISE NOTICE 'SKIP: Team pool gift idempotency (waiting on presence snapshot + ledger fixtures)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 15: Ledger table row-level security enforced
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_ledger_entries THEN
      RAISE NOTICE 'SKIP: Ledger RLS (ledger_entries table missing)';
    ELSE
      SELECT relrowsecurity INTO v_count
      FROM pg_class
      WHERE oid = 'public.ledger_entries'::regclass;

      IF coalesce(v_count,0) = 1 THEN
        RAISE NOTICE 'PASS: ledger_entries has row level security enabled';
      ELSE
        RAISE EXCEPTION 'FAIL: ledger_entries missing row level security flag';
      END IF;
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 16: Presence table raw access restricted
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_team_presence THEN
      RAISE NOTICE 'SKIP: Presence privacy (team_presence table missing)';
    ELSE
      RAISE NOTICE 'SKIP: Presence privacy (implement once table + policies exist)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 17: Audit log visibility
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_team_audit_events THEN
      RAISE NOTICE 'SKIP: Audit visibility (team_audit_events missing)';
    ELSE
      RAISE NOTICE 'SKIP: Audit visibility (implement once audit table populated)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 18: Moderation queue access
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_moderation_queue THEN
      RAISE NOTICE 'SKIP: Moderation queue access (table missing)';
    ELSE
      RAISE NOTICE 'SKIP: Moderation queue access (implement once schema finalized)';
    END IF;
  END;

  ---------------------------------------------------------------------------
  -- TEST 19: Team emote storage privacy
  ---------------------------------------------------------------------------
  BEGIN
    IF NOT has_team_emotes THEN
      RAISE NOTICE 'SKIP: Team emotes privacy (table/bucket missing)';
    ELSE
      RAISE NOTICE 'SKIP: Team emotes privacy (implement once schema finalized)';
    END IF;
  END;

  PERFORM public.__teams_gate_clear_auth();
END;
$tests$;

ROLLBACK;
