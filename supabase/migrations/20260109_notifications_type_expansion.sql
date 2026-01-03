-- ============================================================================
-- Expand notifications type constraint to cover team invite flows
-- ============================================================================
-- Fixes runtime errors when rpc_send_team_invite inserts the new notification
-- types introduced in 20260104_team_invites.sql.
-- ============================================================================

BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'like_post',
      'like_comment',
      'comment',
      'follow',
      'follow_link',
      'gift',
      'system',
      'team_invite',
      'team_invite_accepted'
    )
  );

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
-- Inserts covering the new values must succeed.
DO $$
DECLARE
  v_profile uuid;
BEGIN
  SELECT id INTO v_profile FROM public.profiles LIMIT 1;

  IF v_profile IS NULL THEN
    RAISE NOTICE 'Skipping verification - no profiles found';
    RETURN;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message)
  VALUES
    (v_profile, v_profile, 'team_invite', 'test invite'),
    (v_profile, v_profile, 'team_invite_accepted', 'test invite accepted'),
    (v_profile, v_profile, 'follow_link', 'test follow link');

  DELETE FROM public.notifications
  WHERE message LIKE 'test invite%';
END $$;

