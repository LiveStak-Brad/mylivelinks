-- ============================================================================
-- CHECK IF GIFT FUNCTION HAS BEEN FIXED
-- ============================================================================

-- This shows the current process_gift function to verify if it's correct
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'process_gift'
AND routine_schema = 'public';

-- If the function is fixed, you should see this in the definition:
-- "WHERE id = p_recipient_id" (not p_sender_id) for adding diamonds

-- ============================================================================
-- QUICK FIX: Run this if the function hasn't been fixed yet
-- ============================================================================
-- Just copy and run the entire fix_gift_properly.sql file
-- It will replace the broken function with the correct one

