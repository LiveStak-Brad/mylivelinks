BEGIN;

-- =============================================================================
-- Fix: Allow updating status in creator_studio_items
-- =============================================================================
-- The update_creator_studio_item RPC was missing the ability to set status.
-- This caused videos to remain in 'draft' status after upload, making them
-- invisible in the replay player which requires status='ready'.
-- =============================================================================

-- Drop and recreate with status parameter
DROP FUNCTION IF EXISTS public.update_creator_studio_item(uuid, text, text, text, text, text, int);

CREATE OR REPLACE FUNCTION public.update_creator_studio_item(
  p_item_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_thumb_url text DEFAULT NULL,
  p_duration_seconds int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  UPDATE public.creator_studio_items
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    visibility = COALESCE(p_visibility::creator_studio_visibility, visibility),
    status = COALESCE(p_status::creator_studio_status, status),
    media_url = COALESCE(p_media_url, media_url),
    thumb_url = COALESCE(p_thumb_url, thumb_url),
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
    -- Set published_at when making public and ready
    published_at = CASE 
      WHEN p_visibility = 'public' AND p_status = 'ready' AND published_at IS NULL 
      THEN now() 
      ELSE published_at 
    END,
    updated_at = now()
  WHERE id = p_item_id
    AND owner_profile_id = v_user_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_creator_studio_item(uuid, text, text, text, text, text, text, int) TO authenticated;

-- =============================================================================
-- RPC: publish_creator_studio_item
-- One-click publish: sets status='ready' and visibility='public'
-- =============================================================================
CREATE OR REPLACE FUNCTION public.publish_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_updated int;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  UPDATE public.creator_studio_items
  SET
    status = 'ready',
    visibility = 'public',
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE id = p_item_id
    AND owner_profile_id = v_user_id
    AND rights_attested = true;  -- Only allow publishing if rights attested
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_creator_studio_item(uuid) TO authenticated;

COMMIT;
