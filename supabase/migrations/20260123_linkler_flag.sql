-- Linkler kill switch seed
BEGIN;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('linkler_enabled', true, 'Kill switch for Linkler assistant experiences')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

COMMIT;
