# Solo vs Group Streaming Mode Fix

## Problem Statement

When a user went live on **Solo Live** (`/live/host`), they were also appearing in **Group Live** (`/live`). This was a critical flaw because:
- Solo live streams are **1:1 streams** (Twitch-style) - a single streamer broadcasting to their own viewers
- Group live streams are **multi-user grid rooms** (Stickam-style) - multiple streamers in a 12-box grid

These two modes should be **completely independent** - a solo streamer should NOT appear in the group grid, and vice versa.

## Root Cause

The `live_streams` table had **no field to track streaming mode**. When creating a new stream record, both solo and group mode used identical SQL:

```sql
INSERT INTO live_streams (profile_id, live_available, started_at, ended_at)
VALUES (user_id, true, now(), null);
```

This meant:
1. Solo live streams and group live streams were indistinguishable in the database
2. Queries for "all live streamers" would return BOTH solo and group streamers
3. A user could accidentally broadcast to both modes simultaneously

## Solution

### 1. Database Migration

Added `streaming_mode` column to `live_streams` table:

**File:** `supabase/migrations/20251231_add_streaming_mode_to_live_streams.sql`

```sql
ALTER TABLE public.live_streams 
ADD COLUMN streaming_mode text NOT NULL DEFAULT 'group' 
CHECK (streaming_mode IN ('solo', 'group'));

CREATE INDEX idx_live_streams_mode ON public.live_streams(streaming_mode);
CREATE INDEX idx_live_streams_mode_status ON public.live_streams(streaming_mode, status, started_at DESC);
```

- Default is `'group'` for backward compatibility
- Indexed for efficient filtering
- CHECK constraint ensures only valid values

### 2. Code Changes

#### A. GoLiveButton Component
**File:** `components/GoLiveButton.tsx`

- Added `mode?: 'solo' | 'group'` parameter (defaults to `'group'`)
- Updated INSERT statement to include `streaming_mode: mode`

```typescript
interface GoLiveButtonProps {
  // ... other props
  mode?: 'solo' | 'group'; // Streaming mode: 'solo' for 1:1 streams, 'group' for multi-user grid
}

// In handleStartLive:
const { data, error } = await supabase
  .from('live_streams')
  .insert({
    profile_id: user.id,
    live_available: true,
    streaming_mode: mode, // 'solo' or 'group' - prevents cross-contamination
    started_at: new Date().toISOString(),
    ended_at: null,
  })
```

#### B. SoloHostStream Component
**File:** `components/SoloHostStream.tsx`

- Passes `mode="solo"` to `GoLiveButton`
- Filters queries to only fetch solo mode streams

```typescript
<GoLiveButton 
  sharedRoom={roomRef.current}
  isRoomConnected={isRoomConnected}
  publishAllowed={true}
  mode="solo"  // ← CRITICAL: Solo mode
  onPublishingChange={(publishing) => {
    setIsPublishing(publishing);
  }}
/>

// Query filtering:
const { data: liveStream } = await supabase
  .from('live_streams')
  .select('id, live_available, started_at')
  .eq('profile_id', profile.id)
  .eq('streaming_mode', 'solo') // ← Only solo mode streams
```

#### C. LiveRoom Component (Group Live)
**File:** `components/LiveRoom.tsx`

- Passes `streamingMode="group"` to `MobileWebWatchLayout`
- Filters all live stream queries to only fetch group mode streams

```typescript
// In loadLiveStreamers:
const directResult = await supabase
  .from('live_streams')
  .select('id, profile_id, live_available')
  .eq('live_available', true)
  .eq('streaming_mode', 'group') // ← Only group live streams

// Waiting streamers:
const { data: waitingStreams } = await supabase
  .from('live_streams')
  .select('id, profile_id, live_available')
  .eq('live_available', true)
  .eq('streaming_mode', 'group') // ← Only group live streams

// User live check:
const { data: userLiveStreams } = await supabase
  .from('live_streams')
  .select('id, live_available')
  .eq('profile_id', currentUserId)
  .eq('live_available', true)
  .eq('streaming_mode', 'group') // ← Only check group mode streams
```

#### D. SoloStreamViewer Component
**File:** `components/SoloStreamViewer.tsx`

- Filters to only show solo mode streams
- Recommended streams only show other solo streamers

```typescript
// Fetch solo stream:
const { data: liveStreams } = await supabase
  .from('live_streams')
  .select('id, live_available')
  .eq('profile_id', profile.id)
  .eq('streaming_mode', 'solo') // ← Only solo mode streams

// Recommended streams:
const { data: liveStreams } = await supabase
  .from('live_streams')
  .select(...)
  .eq('live_available', true)
  .eq('streaming_mode', 'solo') // ← Only solo mode streams
```

#### E. MobileWebWatchLayout Component
**File:** `components/mobile/MobileWebWatchLayout.tsx`

- Added `streamingMode?: 'solo' | 'group'` prop
- Passes mode to `GoLiveButton`

```typescript
interface MobileWebWatchLayoutProps {
  // ... other props
  streamingMode?: 'solo' | 'group'; // Streaming mode for database
}

<GoLiveButton
  sharedRoom={sharedRoom}
  isRoomConnected={isRoomConnected}
  onGoLive={onGoLive}
  onPublishingChange={onPublishingChange}
  publishAllowed={publishAllowed}
  mode={streamingMode}  // ← Pass through mode
/>
```

## Files Changed

1. ✅ `supabase/migrations/20251231_add_streaming_mode_to_live_streams.sql` - Database migration
2. ✅ `components/GoLiveButton.tsx` - Accept mode parameter, use in INSERT
3. ✅ `components/SoloHostStream.tsx` - Pass `mode="solo"`, filter queries
4. ✅ `components/SoloStreamViewer.tsx` - Filter to only solo streams
5. ✅ `components/LiveRoom.tsx` - Pass `streamingMode="group"`, filter queries
6. ✅ `components/mobile/MobileWebWatchLayout.tsx` - Add mode prop, pass to GoLiveButton

## Deployment Steps

### 1. Apply Database Migration

```bash
# Connect to Supabase
psql -h [your-supabase-host] -U postgres -d postgres

# Run migration
\i supabase/migrations/20251231_add_streaming_mode_to_live_streams.sql
```

Or via Supabase Dashboard:
1. Go to **SQL Editor**
2. Copy contents of migration file
3. Run migration
4. Verify:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'live_streams' 
   AND column_name = 'streaming_mode';
   ```

### 2. Deploy Code

```bash
# Build and deploy
npm run build
# Deploy to your hosting platform (Vercel, etc.)
```

### 3. Verify Fix

#### Solo Live Test:
1. Go to `/live/host`
2. Click "Go Live"
3. Start streaming
4. ✅ Should **NOT** appear in `/live` (group grid)
5. Check database:
   ```sql
   SELECT id, profile_id, streaming_mode, live_available 
   FROM live_streams 
   WHERE profile_id = 'your-user-id' 
   ORDER BY started_at DESC LIMIT 1;
   ```
   → Should show `streaming_mode = 'solo'`

#### Group Live Test:
1. Go to `/live` (group live page)
2. Click "Go Live"
3. Start streaming
4. ✅ Should appear in the 12-box grid
5. ✅ Should **NOT** appear in solo live recommendations
6. Check database:
   ```sql
   SELECT id, profile_id, streaming_mode, live_available 
   FROM live_streams 
   WHERE profile_id = 'your-user-id' 
   ORDER BY started_at DESC LIMIT 1;
   ```
   → Should show `streaming_mode = 'group'`

## Backward Compatibility

- All existing `live_streams` records default to `streaming_mode = 'group'`
- Migration includes: `UPDATE public.live_streams SET streaming_mode = 'group' WHERE streaming_mode IS NULL;`
- No breaking changes to existing functionality

## Summary

This fix ensures **complete isolation** between solo and group streaming modes:

| Aspect | Before Fix | After Fix |
|--------|-----------|-----------|
| Database | No mode tracking | `streaming_mode` column ('solo' or 'group') |
| Solo Live | Could appear in group grid ❌ | Only in solo mode ✅ |
| Group Live | Could appear in solo feeds ❌ | Only in group grid ✅ |
| Cross-contamination | Possible ❌ | Impossible ✅ |
| User experience | Confusing ❌ | Clear separation ✅ |

**Result:** Solo live and group live are now completely independent systems that cannot interfere with each other.
