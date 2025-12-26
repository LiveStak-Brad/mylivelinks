-- Set the 1-coin gift to be "Poo" with poo emoji 💩
-- Run this in Supabase SQL Editor

-- Update any gift with cost 1 to be the Poo gift
UPDATE gift_types 
SET 
  name = 'Poo',
  emoji = '💩',
  coin_cost = 1,
  is_active = true,
  display_order = 1
WHERE coin_cost = 1;

-- If no 1-coin gift exists, insert it
INSERT INTO gift_types (name, emoji, coin_cost, tier, display_order, is_active)
SELECT 'Poo', '💩', 1, 1, 1, true
WHERE NOT EXISTS (SELECT 1 FROM gift_types WHERE coin_cost = 1);

-- Verify the gift was set
SELECT * FROM gift_types WHERE name = 'Poo';

