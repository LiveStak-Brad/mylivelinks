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
DECLARE
  v_notification_type text := 'follow';
BEGIN
  -- Safety guard: skip self-follows if they ever slip past application layer.
  IF NEW.follower_id = NEW.followee_id THEN
    RETURN NEW;
  END IF;

  -- Detect follows created as part of Link mutuals or dating matches to surface
  -- a differentiated notification type.
  IF EXISTS (
    SELECT 1
    FROM public.link_mutuals lm
    WHERE (
        (lm.profile_a = NEW.follower_id AND lm.profile_b = NEW.followee_id)
        OR
        (lm.profile_a = NEW.followee_id AND lm.profile_b = NEW.follower_id)
      )
      AND lm.created_at >= (now() - interval '5 minutes')
  ) THEN
    v_notification_type := 'follow_link';
  ELSIF EXISTS (
    SELECT 1
    FROM public.dating_matches dm
    WHERE (
        (dm.profile_a = NEW.follower_id AND dm.profile_b = NEW.followee_id)
        OR
        (dm.profile_a = NEW.followee_id AND dm.profile_b = NEW.follower_id)
      )
      AND dm.created_at >= (now() - interval '5 minutes')
  ) THEN
    v_notification_type := 'follow_link';
  END IF;

  -- Duplicate protection: if an unread notification of this type already exists
  -- from this actor to this recipient in the last 24 hours, skip creating
  -- another to avoid floods.
  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.recipient_id = NEW.followee_id
      AND n.actor_id = NEW.follower_id
      AND n.type = v_notification_type
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
    v_notification_type,
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
