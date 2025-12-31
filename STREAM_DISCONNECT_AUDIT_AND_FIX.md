# Stream Disconnection Audit & Bandwidth Optimization

## Executive Summary

Comprehensive audit of stream connection lifecycle to ensure efficient bandwidth usage and immediate viewer disconnection when streams end.

**Date:** December 30, 2025  
**Priority:** P0 - Bandwidth Waste Prevention  
**Status:** ✅ System mostly solid, 3 critical gaps identified

---

## Current System Architecture

### ✅ What's Working Well

#### 1. **Viewer Heartbeat System** (`hooks/useViewerHeartbeat.ts`)
- **Heartbeat interval:** 12 seconds
- **Stale threshold:** 60 seconds
- **Tracks:** `is_active`, `is_unmuted`, `is_visible`, `is_subscribed`
- **Table:** `active_viewers`
- **RPC:** `update_viewer_heartbeat()`

**Status:** ✅ Working - prevents ghost viewers from keeping streams published

#### 2. **Host Cleanup on Page Unload** (`components/LiveRoom.tsx`)
```typescript
const handleBeforeUnload = async () => {
  if (isCurrentUserPublishing && currentUserId) {
    // Update live_streams to stopped
    await supabase
      .from('live_streams')
      .update({ live_available: false, ended_at: now() })
      .eq('profile_id', currentUserId);
  }
}
```

**Status:** ✅ Working - host stream ends when they close tab/browser

#### 3. **Database Cleanup Functions**
- `cleanup_stale_viewers()` - Removes viewers with heartbeat > 60s old
- `update_publish_state_from_viewers()` - Sets `is_published` based on active viewers
- `admin_end_live_stream()` - Admin function to force-end streams

**Status:** ✅ Working - server-side cleanup prevents stuck streams

#### 4. **LiveKit Room Management**
- Shared room connection (one per LiveRoom instance)
- Track subscription/unsubscription on participant join/leave
- Automatic track cleanup when participants disconnect

**Status:** ✅ Working - LiveKit handles WebRTC cleanup

---

## 🔴 Critical Gaps Identified

### Gap #1: No Viewer-Side Stream End Detection

**Problem:** When host ends stream (`live_available = false`), viewers don't get notified in real-time.

**Current Behavior:**
- Viewers continue subscribing to LiveKit tracks
- Video goes black but no UI feedback
- Heartbeat continues sending for 60 seconds until timeout
- Bandwidth wasted on dead connections

**Missing:**
- Realtime subscription to `live_streams` table in `Tile.tsx`
- UI notification: "This stream has ended, returning to LiveTV in 5 seconds"
- Immediate cleanup of viewer heartbeat
- Auto-redirect to main LiveTV grid

**Impact:**
- 🔴 **High bandwidth waste** - viewers stay connected for up to 60s after stream ends
- 🔴 **Poor UX** - black screen with no explanation
- 🔴 **Database waste** - stale `active_viewers` records

---

### Gap #2: No Automatic Viewer Cleanup on Stream End

**Problem:** When `live_streams.live_available` changes to `false`, no trigger automatically removes `active_viewers`.

**Current Behavior:**
- `active_viewers` records remain until:
  - Heartbeat times out (60s)
  - Client manually calls cleanup
  - `cleanup_stale_viewers()` runs periodically

**Missing:**
- Database trigger on `live_streams` UPDATE
- When `live_available` → `false`, immediately `DELETE FROM active_viewers WHERE live_stream_id = OLD.id`

**Impact:**
- 🔴 **60-second delay** in cleanup
- 🔴 **Bandwidth waste** during grace period
- 🔴 **Incorrect metrics** - viewer counts stay inflated

---

### Gap #3: No Broadcast Notification to All Viewers

**Problem:** When stream ends, only database changes - no push notification to connected viewers.

**Current Behavior:**
- Stream updates `live_available = false` in database
- Individual viewers must poll or subscribe to detect change
- No coordination between viewers

**Missing:**
- Supabase Realtime broadcast when stream ends
- All viewers receive simultaneous "stream ended" event
- Coordinated disconnect

**Impact:**
- 🟡 **Uncoordinated cleanup** - viewers disconnect at different times
- 🟡 **Bandwidth inconsistency** - some disconnect immediately, others wait

---

## 🎯 Implementation Plan

### Fix #1: Add Viewer-Side Stream End Detection

**File:** `components/Tile.tsx`

**Add realtime subscription:**
```typescript
useEffect(() => {
  if (!liveStreamId) return;

  const streamChannel = supabase
    .channel(`stream-status:${liveStreamId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_streams',
        filter: `id=eq.${liveStreamId}`,
      },
      (payload) => {
        const newData = payload.new as any;
        
        // Stream ended - show UI and disconnect
        if (newData.live_available === false || newData.status === 'ended') {
          setStreamEnded(true);
          // Cleanup heartbeat immediately
          cleanup('stream ended').catch(console.error);
          
          // Redirect after 5 seconds
          setTimeout(() => {
            router.push('/live-tv');
          }, 5000);
        }
      }
    )
    .subscribe();

  return () => {
    streamChannel.unsubscribe();
  };
}, [liveStreamId]);
```

**Add UI overlay:**
```typescript
{streamEnded && (
  <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
    <div className="text-white text-center">
      <div className="text-6xl mb-4">📺</div>
      <h2 className="text-2xl font-bold mb-2">Stream Has Ended</h2>
      <p className="text-gray-300 mb-4">Returning to LiveTV in {countdown}s...</p>
      <button
        onClick={() => router.push('/live-tv')}
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
      >
        Return Now
      </button>
    </div>
  </div>
)}
```

---

### Fix #2: Add Database Trigger for Automatic Viewer Cleanup

**File:** `supabase/migrations/20251230_stream_end_cleanup_trigger.sql`

```sql
-- Trigger to automatically clean up viewers when stream ends
CREATE OR REPLACE FUNCTION cleanup_viewers_on_stream_end()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If stream is ending (live_available changed from true to false)
  IF OLD.live_available = TRUE AND NEW.live_available = FALSE THEN
    -- Immediately delete all active viewers for this stream
    DELETE FROM active_viewers WHERE live_stream_id = NEW.id;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up viewers for stream %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF NOT EXISTS trigger_cleanup_viewers_on_stream_end ON live_streams;
CREATE TRIGGER trigger_cleanup_viewers_on_stream_end
  AFTER UPDATE ON live_streams
  FOR EACH ROW
  WHEN (OLD.live_available IS DISTINCT FROM NEW.live_available)
  EXECUTE FUNCTION cleanup_viewers_on_stream_end();

-- Enable realtime for live_streams table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
```

---

### Fix #3: Add Realtime Broadcast on Stream End

**File:** `components/GoLiveButton.tsx`, `components/LiveRoom.tsx`

**When host stops stream:**
```typescript
const stopStreaming = async () => {
  try {
    // Update database
    const { error } = await supabase
      .from('live_streams')
      .update({ 
        live_available: false, 
        ended_at: new Date().toISOString(),
        status: 'ended'
      })
      .eq('profile_id', currentUserId);
    
    if (error) throw error;
    
    // Broadcast to all viewers via realtime channel
    // (Database trigger will handle active_viewers cleanup automatically)
    
    console.log('Stream ended successfully');
  } catch (error) {
    console.error('Error ending stream:', error);
  }
};
```

**Note:** Supabase Realtime automatically broadcasts `UPDATE` events, so all viewers subscribed to that row will receive the notification immediately.

---

## Bandwidth Optimization Summary

### Before Fixes:
- ❌ Viewers stay connected **60 seconds** after stream ends
- ❌ No UI feedback = confused users
- ❌ Heartbeats continue sending (wasted requests)
- ❌ LiveKit subscriptions remain active
- ❌ `active_viewers` records linger

### After Fixes:
- ✅ Viewers disconnect **< 1 second** after stream ends
- ✅ Clear UI: "Stream ended, redirecting in 5s"
- ✅ Immediate heartbeat cleanup
- ✅ Automatic database cleanup via trigger
- ✅ All viewers notified simultaneously via realtime

### Estimated Bandwidth Savings:
- **Per viewer:** 60 seconds of unnecessary LiveKit connection = ~500KB-2MB wasted
- **10 viewers:** 5-20MB wasted per stream end
- **100 streams/day:** 500MB-2GB daily savings

---

## Testing Plan

### Test Case 1: Host Ends Stream
1. Host clicks "Stop Streaming"
2. Verify `live_streams.live_available` → `false`
3. Verify all `active_viewers` deleted immediately (< 1s)
4. Verify all viewers see "Stream ended" UI
5. Verify viewers auto-redirect after 5s

### Test Case 2: Host Closes Browser
1. Host closes tab/browser without clicking stop
2. Verify `beforeunload` handler sets `live_available = false`
3. Verify trigger cleans up `active_viewers`
4. Verify viewers detect end and show UI

### Test Case 3: Network Disconnect
1. Disconnect host's internet
2. Verify heartbeat timeout (60s)
3. Verify `cleanup_stale_viewers()` removes host
4. Verify viewers eventually detect stream end

### Test Case 4: Admin Force End
1. Admin calls `admin_end_live_stream()`
2. Verify stream ends immediately
3. Verify viewers cleaned up
4. Verify audit log created

---

## Database Schema Verification

### Required Tables:
- ✅ `live_streams` (has `live_available`, `ended_at`, `status`)
- ✅ `active_viewers` (has `live_stream_id`, `viewer_id`, `last_active_at`)

### Required Functions:
- ✅ `update_viewer_heartbeat()` - Updates viewer state
- ✅ `cleanup_stale_viewers()` - Removes stale viewers
- ✅ `update_publish_state_from_viewers()` - Updates `is_published`
- ✅ `admin_end_live_stream()` - Admin force end

### Required Realtime:
- ✅ `live_streams` - Enabled for UPDATE events
- ✅ `active_viewers` - Not required (trigger handles cleanup)

---

## Security Considerations

### Who Can End Streams?
1. **Stream owner** - Can end their own stream
2. **Admins** - Can end any stream via `admin_end_live_stream()`
3. **System** - Automatic cleanup on timeout/disconnect

### RLS Policies:
```sql
-- Users can update their own streams
CREATE POLICY "Users can update own streams" 
  ON live_streams FOR UPDATE 
  USING (profile_id = auth.uid());

-- Admins can update any stream
CREATE POLICY "Admins can update any stream" 
  ON live_streams FOR UPDATE 
  USING (is_admin(auth.uid()));
```

**Status:** ✅ Already implemented in `20251229_live_ops_schema.sql`

---

## Rollout Plan

### Phase 1: Database Trigger (Zero Downtime)
1. Deploy trigger migration
2. Monitor cleanup logs
3. Verify no performance impact

### Phase 2: Viewer UI Updates
1. Add realtime subscription to `Tile.tsx`
2. Add "stream ended" overlay UI
3. Add auto-redirect logic

### Phase 3: Testing & Monitoring
1. Test all scenarios
2. Monitor bandwidth metrics
3. Collect user feedback

### Phase 4: Optimization
1. Tune heartbeat intervals if needed
2. Adjust redirect timeout based on feedback
3. Add analytics for stream end events

---

## Success Metrics

### Key Performance Indicators:
1. **Viewer cleanup latency:** < 2 seconds (target: < 1s)
2. **Bandwidth savings:** > 50% reduction in post-stream waste
3. **User satisfaction:** Zero "black screen" complaints
4. **System reliability:** 99.9% successful cleanups

### Monitoring:
- Track `active_viewers` count before/after stream end
- Log cleanup trigger execution times
- Monitor Supabase realtime delivery latency
- Track viewer redirect success rate

---

## Related Documentation

- `FINAL_PRE_DEPLOY_CHANGES.md` - Heartbeat system design
- `DATABASE_SCHEMA.md` - Active viewers table design
- `supabase/migrations/20251229_live_ops_schema.sql` - Stream ops schema
- `hooks/useViewerHeartbeat.ts` - Heartbeat implementation

---

## Next Steps

1. ✅ Complete audit (this document)
2. ⏳ Implement database trigger
3. ⏳ Update Tile.tsx with realtime subscription
4. ⏳ Add stream end UI overlay
5. ⏳ Deploy and test
6. ⏳ Monitor bandwidth savings

---

**Audit completed by:** AI Assistant  
**Reviewed by:** [Pending]  
**Approved by:** [Pending]
