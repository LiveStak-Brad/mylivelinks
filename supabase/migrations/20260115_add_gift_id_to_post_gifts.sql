-- ============================================================================
-- ADD gift_id COLUMN TO post_gifts TABLE
-- ============================================================================
-- Fixes: "column pg.gift_id does not exist" error when sending gifts in messages
-- The post_gifts table needs a gift_id column to link to the gifts table
-- ============================================================================

BEGIN;

-- Add gift_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_gifts'
      AND column_name = 'gift_id'
  ) THEN
    ALTER TABLE public.post_gifts ADD COLUMN gift_id bigint;
    RAISE NOTICE '✅ Added gift_id column to post_gifts table';
  ELSE
    RAISE NOTICE '✅ gift_id column already exists on post_gifts table';
  END IF;
END $$;

-- Add foreign key constraint if gifts table exists and constraint doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gifts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'post_gifts'
        AND c.conname = 'post_gifts_gift_id_fkey'
    ) THEN
      ALTER TABLE public.post_gifts
        ADD CONSTRAINT post_gifts_gift_id_fkey
        FOREIGN KEY (gift_id) REFERENCES public.gifts(id)
        ON DELETE SET NULL;
      RAISE NOTICE '✅ Added foreign key constraint post_gifts_gift_id_fkey';
    ELSE
      RAISE NOTICE '✅ Foreign key constraint post_gifts_gift_id_fkey already exists';
    END IF;
  END IF;
END $$;

-- Create index on gift_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_gifts_gift_id ON public.post_gifts(gift_id);

COMMIT;

-- Verification
DO $$
DECLARE
  v_column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_gifts'
      AND column_name = 'gift_id'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE NOTICE '🎉 post_gifts.gift_id column is ready!';
  ELSE
    RAISE NOTICE '❌ post_gifts.gift_id column is MISSING - migration failed!';
  END IF;
END $$;
