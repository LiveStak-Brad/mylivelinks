BEGIN;

CREATE OR REPLACE FUNCTION public.support_bridge_on_instant_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_app_id uuid := '0b47a2d7-43fb-4d38-b321-2d5d0619aabf';
  v_ticket_id uuid;
BEGIN
  -- Only treat inbound messages to the support system account as support intake.
  IF NEW.recipient_id IS NULL OR NEW.recipient_id <> v_support_app_id THEN
    RETURN NEW;
  END IF;

  -- Find an existing active ticket for this user.
  SELECT t.id
  INTO v_ticket_id
  FROM public.support_tickets t
  WHERE t.reporter_profile_id = NEW.sender_id
    AND t.source = 'support'
    AND t.status IN ('open', 'in_progress', 'escalated')
  ORDER BY t.updated_at DESC
  LIMIT 1;

  IF v_ticket_id IS NULL THEN
    INSERT INTO public.support_tickets (
      reporter_profile_id,
      assigned_to,
      message,
      context,
      status,
      source
    )
    VALUES (
      NEW.sender_id,
      NULL,
      COALESCE(NEW.content, ''),
      jsonb_build_object(
        'channel', 'messenger',
        'instant_message_id', NEW.id::text
      ),
      'open',
      'support'
    )
    RETURNING id INTO v_ticket_id;
  END IF;

  -- Deduplicate if the same IM somehow replays.
  IF EXISTS (
    SELECT 1
    FROM public.support_messages sm
    WHERE sm.ticket_id = v_ticket_id
      AND sm.metadata->>'instant_message_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.support_messages (
    ticket_id,
    sender_profile_id,
    role,
    message,
    metadata
  )
  VALUES (
    v_ticket_id,
    NEW.sender_id,
    'user',
    COALESCE(NEW.content, ''),
    jsonb_build_object(
      'channel', 'messenger',
      'instant_message_id', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'instant_messages'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_support_bridge_on_instant_message ON public.instant_messages';
    EXECUTE 'CREATE TRIGGER trg_support_bridge_on_instant_message AFTER INSERT ON public.instant_messages FOR EACH ROW EXECUTE FUNCTION public.support_bridge_on_instant_message()';
  END IF;
END;
$$;

COMMIT;
