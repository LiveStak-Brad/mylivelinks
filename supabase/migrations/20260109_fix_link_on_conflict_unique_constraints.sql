
BEGIN;

WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY LEAST(profile_a, profile_b), GREATEST(profile_a, profile_b)
      ORDER BY created_at ASC
    ) AS rn
  FROM public.link_mutuals
)
DELETE FROM public.link_mutuals lm
USING ranked r
WHERE lm.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_link_mutuals_profile_a_profile_b
  ON public.link_mutuals (profile_a, profile_b);

WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY LEAST(profile_a, profile_b), GREATEST(profile_a, profile_b)
      ORDER BY created_at ASC
    ) AS rn
  FROM public.dating_matches
)
DELETE FROM public.dating_matches dm
USING ranked r
WHERE dm.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dating_matches_profile_a_profile_b
  ON public.dating_matches (profile_a, profile_b);

COMMIT;
