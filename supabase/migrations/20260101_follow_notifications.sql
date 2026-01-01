BEGIN;

-- ============================================================================
-- FOLLOW NOTIFICATIONS
-- ============================================================================
-- When a new row is inserted into public.follows, ensure we insert a matching
-- notification row for the followee. This keeps notifications aligned with the
-- canonical follows table and guarantees one notification per follow action.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_follow_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Safety guard: skip self-follows if they ever slip past application layer.
  IF NEW.follower_id = NEW.followee_id THEN
    RETURN NEW;
  END IF;

  -- Duplicate protection: if an unread follow notification already exists from
  -- this actor to this recipient in the last 24 hours, skip creating another.
  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.recipient_id = NEW.followee_id
      AND n.actor_id = NEW.follower_id
      AND n.type = 'follow'
      AND n.read = FALSE
      AND n.created_at >= (now() - interval '24 hours')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message,
    read,
    created_at
  ) VALUES (
    NEW.followee_id,
    NEW.follower_id,
    'follow',
    'profile',
    NEW.follower_id::text,
    NULL,
    FALSE,
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_follow_created() IS 'Creates follow notification rows after inserts into public.follows.';

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;

CREATE TRIGGER trg_notify_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_follow_created();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- The block below proves trigger behavior without leaving residual state. It
-- locates two distinct profiles, clears any existing follow + notification
-- pairs for them, performs a follow insert, and validates notification counts.
-- ============================================================================

DO $$
DECLARE
  v_follower uuid;
  v_followee uuid;
  v_trigger_exists boolean;
  v_before_follow_count integer;
  v_after_follow_count integer;
  v_before_notif_count integer;
  v_after_notif_count integer;
BEGIN
  -- Confirm trigger attachment
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'follows'
      AND t.tgname = 'trg_notify_follow'
  ) INTO v_trigger_exists;

  RAISE NOTICE 'Trigger trg_notify_follow present on public.follows: %', v_trigger_exists;

  -- Pick two distinct profiles for the verification flow.
  SELECT p1.id, p2.id
  INTO v_follower, v_followee
  FROM public.profiles p1
  CROSS JOIN LATERAL (
    SELECT p.id
    FROM public.profiles p
    WHERE p.id <> p1.id
    LIMIT 1
  ) AS p2
  LIMIT 1;

  IF v_follower IS NULL OR v_followee IS NULL THEN
    RAISE NOTICE 'Verification skipped: need at least two profiles.';
    RETURN;
  END IF;

  -- Reset state for this pair.
  DELETE FROM public.follows
  WHERE follower_id = v_follower
    AND followee_id = v_followee;

  DELETE FROM public.notifications
  WHERE recipient_id = v_followee
    AND actor_id = v_follower
    AND type = 'follow';

  -- Snapshot counts before insert.
  SELECT COUNT(*) INTO v_before_follow_count
  FROM public.follows
  WHERE follower_id = v_follower
    AND followee_id = v_followee;

  SELECT COUNT(*) INTO v_before_notif_count
  FROM public.notifications
  WHERE recipient_id = v_followee
    AND actor_id = v_follower
    AND type = 'follow';

  RAISE NOTICE 'Before insert -> follows: %, notifications: %',
    v_before_follow_count, v_before_notif_count;

  -- Perform follow insert (should fire trigger).
  INSERT INTO public.follows (follower_id, followee_id)
  VALUES (v_follower, v_followee)
  ON CONFLICT DO NOTHING;

  -- Capture counts after insert.
  SELECT COUNT(*) INTO v_after_follow_count
  FROM public.follows
  WHERE follower_id = v_follower
    AND followee_id = v_followee;

  SELECT COUNT(*) INTO v_after_notif_count
  FROM public.notifications
  WHERE recipient_id = v_followee
    AND actor_id = v_follower
    AND type = 'follow';

  RAISE NOTICE 'After insert -> follows: %, notifications: %',
    v_after_follow_count, v_after_notif_count;

  -- Attempt duplicate (should not create extra notification thanks to UNIQUE/guard).
  INSERT INTO public.follows (follower_id, followee_id)
  VALUES (v_follower, v_followee)
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_after_notif_count
  FROM public.notifications
  WHERE recipient_id = v_followee
    AND actor_id = v_follower
    AND type = 'follow';

  RAISE NOTICE 'After duplicate attempt -> notifications: %', v_after_notif_count;

  -- Cleanup verification follow + notification to avoid polluting real data.
  DELETE FROM public.follows
  WHERE follower_id = v_follower
    AND followee_id = v_followee;

  DELETE FROM public.notifications
  WHERE recipient_id = v_followee
    AND actor_id = v_follower
    AND type = 'follow';
END;
$$;

COMMIT;
