-- Remove is_published column - no longer needed
-- Publishing happens immediately when user clicks Go Live

ALTER TABLE live_streams DROP COLUMN IF EXISTS is_published;

-- The system now works as:
-- 1. User clicks Go Live → live_available = true
-- 2. Immediately requests token and starts publishing
-- 3. That's it! No demand-based logic, no is_published checks

