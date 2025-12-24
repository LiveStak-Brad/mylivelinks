-- Enable realtime for balance updates
-- Run this in Supabase SQL Editor

-- Enable realtime replication for profiles table
-- This allows clients to subscribe to profile changes (coin_balance, earnings_balance, etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verify it's enabled
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- You should see 'profiles' in the list along with other tables like:
-- - chat_messages
-- - gifts
-- - live_streams
-- - room_presence
-- - active_viewers

