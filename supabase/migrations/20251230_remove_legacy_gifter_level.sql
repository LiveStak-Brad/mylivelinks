-- Remove Legacy gifter_level Column
-- The gifter_level column in profiles was part of the old single-level system.
-- We now use the proper tier-based system with gifter_tiers and gifter_status.
-- This migration completely removes the legacy column.

-- Drop the gifter_level column from profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS gifter_level;

-- Note: The proper gifter system uses:
-- 1. gifter_tiers table - defines tier thresholds and metadata
-- 2. profiles.total_spent - tracks lifetime coins spent
-- 3. /api/gifter-status/* endpoints - compute tier/level dynamically
-- 4. GifterStatus type in TypeScript - tier_key, level_in_tier, etc.
