-- ============================================================================
-- CLEANUP CUSTOM/TEST GIFTS
-- Run this in Supabase SQL Editor to remove test gifts
-- ============================================================================

-- First, let's see what gifts exist
SELECT id, name, emoji, coin_cost, is_active, display_order 
FROM gift_types 
ORDER BY display_order;

-- Delete gifts that are:
-- 1. Named "custom" or "Custom"
-- 2. Cost only 1 coin (likely test gifts)
-- 3. Have no proper name

DELETE FROM gift_types 
WHERE 
  LOWER(name) LIKE '%custom%'
  OR coin_cost <= 1
  OR name IS NULL
  OR name = '';

-- Verify cleanup - show remaining gifts
SELECT id, name, emoji, coin_cost, is_active, display_order 
FROM gift_types 
WHERE is_active = true
ORDER BY display_order;

-- If you want to ensure proper gifts exist, here's a reset to default gifts:
-- (Uncomment and run if needed)

/*
-- First delete all existing gifts
DELETE FROM gift_types;

-- Insert standard gift set
INSERT INTO gift_types (name, emoji, coin_cost, tier, display_order, is_active) VALUES
  ('Rose', '🌹', 10, 1, 1, true),
  ('Heart', '❤️', 25, 1, 2, true),
  ('Star', '⭐', 50, 2, 3, true),
  ('Fire', '🔥', 100, 2, 4, true),
  ('Diamond', '💎', 250, 3, 5, true),
  ('Crown', '👑', 500, 3, 6, true),
  ('Rocket', '🚀', 1000, 4, 7, true),
  ('Unicorn', '🦄', 2500, 4, 8, true),
  ('Trophy', '🏆', 5000, 5, 9, true),
  ('Legendary', '👑', 10000, 5, 10, true);
*/



