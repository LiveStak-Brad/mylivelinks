-- ============================================================================
-- MyLiveLinks: Enable Realtime for Chat, Leaderboard, Viewers, and Supporters
-- ============================================================================
-- Run this SQL to enable realtime subscriptions
-- ============================================================================

-- Enable realtime for chat_messages (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

-- Enable realtime for profiles (for leaderboard updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;
END $$;

-- Enable realtime for leaderboard_cache (if using cache)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'leaderboard_cache'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_cache;
    END IF;
END $$;

-- Enable realtime for gifts (to update leaderboard when gifts are sent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE gifts;
    END IF;
END $$;

-- Enable realtime for active_viewers (for viewer list updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'active_viewers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE active_viewers;
    END IF;
END $$;

-- Enable realtime for live_streams (for live status updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_streams'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
    END IF;
END $$;

-- Verify realtime is enabled:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

