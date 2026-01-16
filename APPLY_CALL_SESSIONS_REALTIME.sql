-- ============================================================================
-- APPLY CALL_SESSIONS TABLE AND REALTIME
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Create the call_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'active', 'ended', 'declined', 'missed', 'cancelled')),
  room_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  
  CONSTRAINT no_self_calls CHECK (caller_id != callee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee ON call_sessions(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_active ON call_sessions(status) WHERE status IN ('pending', 'accepted', 'active');

-- Enable RLS
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own calls" ON call_sessions;
DROP POLICY IF EXISTS "Users can initiate calls" ON call_sessions;
DROP POLICY IF EXISTS "Participants can update calls" ON call_sessions;

-- Create RLS policies
CREATE POLICY "Users can view own calls"
  ON call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can initiate calls"
  ON call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls"
  ON call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime (this is the critical part!)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
    RAISE NOTICE 'Added call_sessions to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'call_sessions already in supabase_realtime publication';
  END IF;
END $$;

-- Verify setup
SELECT 'Table exists' as check_type, 
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_sessions') as result;

SELECT 'Realtime enabled' as check_type,
  EXISTS (SELECT FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'call_sessions') as result;

SELECT 'RLS policies' as check_type, count(*) as result 
FROM pg_policies WHERE tablename = 'call_sessions';
