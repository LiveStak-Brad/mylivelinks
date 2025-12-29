BEGIN;

DROP FUNCTION IF EXISTS public.claim_referral_by_inviter_username(text);
CREATE OR REPLACE FUNCTION public.claim_referral_by_inviter_username(
  p_inviter_username text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_referred_id uuid;
  v_existing_id uuid;
  v_inviter_username text;
  v_inviter_id uuid;
  v_code text;
  v_referral_id uuid;
BEGIN
  v_referred_id := auth.uid();
  IF v_referred_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_inviter_username := lower(trim(COALESCE(p_inviter_username, '')));
  v_inviter_username := regexp_replace(v_inviter_username, '^@', '');
  IF v_inviter_username = '' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('claim_referral:' || v_referred_id::text)::bigint);

  SELECT r.id
  INTO v_existing_id
  FROM public.referrals r
  WHERE r.referred_profile_id = v_referred_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT p.id
  INTO v_inviter_id
  FROM public.profiles p
  WHERE lower(trim(COALESCE(p.username, ''))) = v_inviter_username
  LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'inviter_not_found';
  END IF;

  IF v_inviter_id = v_referred_id THEN
    RAISE EXCEPTION 'self_referral_not_allowed';
  END IF;

  SELECT rc.code::text
  INTO v_code
  FROM public.referral_codes rc
  WHERE rc.profile_id = v_inviter_id;

  IF v_code IS NULL THEN
    LOOP
      v_code := public.generate_referral_code(8);

      BEGIN
        INSERT INTO public.referral_codes(profile_id, code)
        VALUES (v_inviter_id, v_code)
        ON CONFLICT (profile_id) DO NOTHING;

        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;

    SELECT rc.code::text
    INTO v_code
    FROM public.referral_codes rc
    WHERE rc.profile_id = v_inviter_id;
  END IF;

  v_referral_id := public.claim_referral(v_code, NULL, NULL);

  RETURN v_referral_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_by_inviter_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_by_inviter_username(text) TO authenticated;

COMMIT;
