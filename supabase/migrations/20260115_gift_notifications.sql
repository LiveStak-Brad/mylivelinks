-- ============================================================================
-- GIFT NOTIFICATIONS
-- ============================================================================
-- Creates notifications when users receive gifts on posts, streams, or messages.
-- Ensures gift notifications appear in both Web and Mobile Noties UI.
-- ============================================================================

BEGIN;

-- Step 1: Create trigger function for gift notifications
-- This fires when a gift row is inserted into the gifts table

CREATE OR REPLACE FUNCTION public.notify_gift_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_username text;
  v_sender_display_name text;
  v_diamonds bigint;
  v_post_id uuid;
  v_creator_studio_item_id uuid;
  v_entity_type text;
  v_entity_id text;
  v_message text;
BEGIN
  -- Don't notify if sender = recipient (shouldn't happen, but safety check)
  IF NEW.sender_id = NEW.recipient_id THEN
    RETURN NEW;
  END IF;
  
  -- Get sender info for notification message
  SELECT username, display_name 
  INTO v_sender_username, v_sender_display_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  v_sender_display_name := COALESCE(NULLIF(v_sender_display_name, ''), v_sender_username, 'Someone');
  v_diamonds := COALESCE(NEW.diamonds_awarded, NEW.coin_amount, 0);
  
  -- Check if this gift is associated with a post (via post_gifts)
  -- We need to do this lookup since post_gifts is inserted AFTER the gift
  -- So we'll use a deferred approach - check if gift_id matches
  SELECT pg.post_id INTO v_post_id
  FROM public.post_gifts pg
  WHERE pg.gift_id = NEW.id
  LIMIT 1;
  
  -- Determine entity type and ID for routing
  IF v_post_id IS NOT NULL THEN
    v_entity_type := 'post';
    v_entity_id := v_post_id::text;
    v_message := v_sender_display_name || ' sent you ' || v_diamonds || ' diamonds on your post';
  ELSE
    -- Default: general gift (stream or direct)
    v_entity_type := 'gift';
    v_entity_id := NEW.id::text;
    v_message := v_sender_display_name || ' sent you ' || v_diamonds || ' diamonds';
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message
  ) VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'gift',
    v_entity_type,
    v_entity_id,
    v_message
  );
  
  RETURN NEW;
END;
$$;

-- Step 2: Attach trigger to gifts table
DROP TRIGGER IF EXISTS trg_notify_gift_received ON public.gifts;

CREATE TRIGGER trg_notify_gift_received
  AFTER INSERT ON public.gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_gift_received();

-- Step 3: Create trigger for post_gifts to update notification with post context
-- This handles the case where post_gifts is inserted AFTER the gift

CREATE OR REPLACE FUNCTION public.update_gift_notification_with_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_username text;
  v_sender_display_name text;
  v_diamonds bigint;
  v_gift_recipient_id uuid;
BEGIN
  -- Get gift details
  SELECT g.recipient_id, g.sender_id, COALESCE(g.diamonds_awarded, g.coin_amount, 0)
  INTO v_gift_recipient_id, NEW.sender_id, v_diamonds
  FROM public.gifts g
  WHERE g.id = NEW.gift_id;
  
  IF v_gift_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get sender display name
  SELECT COALESCE(NULLIF(display_name, ''), username, 'Someone')
  INTO v_sender_display_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Update existing notification to include post context
  UPDATE public.notifications
  SET 
    entity_type = 'post',
    entity_id = NEW.post_id::text,
    message = v_sender_display_name || ' sent you ' || v_diamonds || ' diamonds on your post'
  WHERE recipient_id = v_gift_recipient_id
    AND actor_id = NEW.sender_id
    AND type = 'gift'
    AND entity_type = 'gift'
    AND entity_id = NEW.gift_id::text
    AND created_at > now() - interval '1 minute';
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_gift_notification_with_post ON public.post_gifts;

CREATE TRIGGER trg_update_gift_notification_with_post
  AFTER INSERT ON public.post_gifts
  FOR EACH ROW
  WHEN (NEW.gift_id IS NOT NULL)
  EXECUTE FUNCTION public.update_gift_notification_with_post();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_trigger_exists boolean;
BEGIN
  -- Check trigger on gifts table
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'gifts'
      AND t.tgname = 'trg_notify_gift_received'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Gift notification trigger installed on gifts table';
  ELSE
    RAISE NOTICE '❌ Gift notification trigger NOT found on gifts table';
  END IF;
  
  -- Check trigger on post_gifts table
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'post_gifts'
      AND t.tgname = 'trg_update_gift_notification_with_post'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Post gift notification update trigger installed';
  ELSE
    RAISE NOTICE '❌ Post gift notification update trigger NOT found';
  END IF;
  
  RAISE NOTICE '🎉 Gift notification system ready!';
END $$;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

/*

HOW IT WORKS:
1. User sends a gift (via send_gift_v2 or gift_post)
2. Gift INSERT trigger fires → creates notification for recipient
3. If gift is for a post, post_gifts INSERT trigger updates notification with post context
4. Mobile NotiesScreen shows gift notification (reads from notifications table)
5. Web NotiesContext also shows gift notification (reads from both ledger_entries AND notifications)

NOTIFICATION FORMAT:
- Type: 'gift'
- Entity Type: 'post' (for post gifts) or 'gift' (for stream/direct gifts)
- Entity ID: post_id or gift_id
- Message: "[username] sent you X diamonds" or "[username] sent you X diamonds on your post"

ROUTING:
- Post gifts: entity_type='post', entity_id=post_id → routes to post
- Stream gifts: entity_type='gift', entity_id=gift_id → routes to sender profile
- Message gifts: entity_type='gift', entity_id=gift_id → routes to sender profile

*/
