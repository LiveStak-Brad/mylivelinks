-- =============================================================================
-- Add is_mll_pro column to profiles table
-- =============================================================================
-- Adds boolean flag to control MLL PRO badge visibility across the platform
-- =============================================================================

BEGIN;

-- Add is_mll_pro column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_mll_pro BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_mll_pro 
ON public.profiles(is_mll_pro) 
WHERE is_mll_pro = true;

-- Add comment
COMMENT ON COLUMN public.profiles.is_mll_pro IS 'Whether user has MLL PRO badge enabled';

COMMIT;
