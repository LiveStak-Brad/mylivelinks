-- ============================================================================
-- Add simple indexes required for Supabase Realtime filters
-- Realtime subscriptions with filters require non-partial indexes on filter columns
-- ============================================================================

-- Index for room_presence realtime filter on room_id
CREATE INDEX IF NOT EXISTS idx_room_presence_room_id 
ON public.room_presence(room_id);

-- Index for chat_messages realtime filter on room_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id 
ON public.chat_messages(room_id);

-- Index for chat_messages realtime filter on live_stream_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_live_stream_id 
ON public.chat_messages(live_stream_id);
