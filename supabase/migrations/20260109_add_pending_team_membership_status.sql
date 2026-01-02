BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_membership_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'team_membership_status'
        AND e.enumlabel = 'pending'
    ) THEN
      ALTER TYPE public.team_membership_status ADD VALUE 'pending';
    END IF;
  END IF;
END $$;

COMMIT;
