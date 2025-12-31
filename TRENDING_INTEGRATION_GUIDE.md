# TRENDING SYSTEM INTEGRATION GUIDE

## Quick Start

This document shows **exactly where** to add trending system hooks to existing code. These are **minimal, surgical additions** — no refactoring or redesigning.

---

## 1. SOLO VIEWER: Track Views (Join/Leave)

### File: `app/live/[username]/page.tsx` or Solo Viewer Component

**Where to add:** After `liveStreamId` is loaded and stream is confirmed live.

```typescript
import { useLiveViewTracking } from '@/lib/trending-hooks';

// Inside your component:
export default function SoloLiveViewer({ params }: { params: { username: string } }) {
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const { data: { user } } = await supabase.auth.getUser();

  // ... existing stream loading logic ...

  // ✅ ADD THIS: Track view join/leave
  useLiveViewTracking({
    streamId: liveStreamId,
    profileId: user?.id,
    enabled: isLive && liveStreamId != null
  });

  // ... rest of component ...
}
```

---

## 2. LIVE ROOM: Track Views for Multi-Viewer Grid

### File: `components/LiveRoom.tsx`

**Where to add:** In the main `LiveRoom` component, track views for each active slot.

**Option A: Track all active slots** (if you want to count grid views):

```typescript
import { useLiveViewTracking } from '@/lib/trending-hooks';

export default function LiveRoom({ mode = 'solo', layoutStyle = 'twitch-viewer' }: LiveRoomProps = {}) {
  // ... existing state ...
  const { data: { user } } = await supabase.auth.getUser();

  // ✅ ADD THIS: Track view for each active non-empty slot
  gridSlots.forEach((slot) => {
    if (!slot.isEmpty && slot.streamer?.live_available) {
      useLiveViewTracking({
        streamId: slot.streamer.id, // Assuming this is the live_stream.id
        profileId: user?.id,
        enabled: true
      });
    }
  });

  // ... rest of component ...
}
```

**Option B: Track only focused/unmuted streams** (recommended for accurate "active viewing"):

```typescript
// Track only the actively watched stream (unmuted, visible)
const focusedSlot = gridSlots.find(s => !s.isMuted && !s.isEmpty);

useLiveViewTracking({
  streamId: focusedSlot?.streamer?.id || null,
  profileId: user?.id,
  enabled: focusedSlot != null && focusedSlot.streamer?.live_available === true
});
```

---

## 3. TAP-TO-LIKE: Add Like Button to Video Overlay

### File: `components/Tile.tsx` or Solo Viewer Overlay

**Where to add:** In the video overlay controls (near mute, fullscreen, etc).

```typescript
import { useLiveLike } from '@/lib/trending-hooks';

export default function Tile({ streamerId, liveStreamId, ... }: TileProps) {
  const { data: { user } } = await supabase.auth.getUser();

  // ✅ ADD THIS: Like toggle hook
  const { isLiked, likesCount, toggleLike, isLoading } = useLiveLike({
    streamId: liveStreamId || null,
    profileId: user?.id,
    enabled: user != null && liveStreamId != null
  });

  return (
    <div className="relative">
      {/* Existing video */}
      <video ref={videoRef} ... />

      {/* Existing overlay controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
        
        {/* ✅ ADD THIS: Like button */}
        <button
          onClick={toggleLike}
          disabled={isLoading || !user}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/50 hover:bg-black/70 transition"
        >
          <span className="text-xl">{isLiked ? '❤️' : '🤍'}</span>
          <span className="text-white text-sm font-medium">{likesCount}</span>
        </button>

        {/* Existing controls (mute, fullscreen, etc) */}
      </div>
    </div>
  );
}
```

**Alternative: Double-tap to like** (TikTok-style):

```typescript
const handleDoubleTap = useCallback(() => {
  if (!isLiked) {
    toggleLike();
    // Optional: show heart animation
  }
}, [isLiked, toggleLike]);

// On video element:
<video
  ref={videoRef}
  onDoubleClick={handleDoubleTap}
  ...
/>
```

---

## 4. CHAT COMMENTS: Track Comments for Trending

### File: `components/Chat.tsx`

**Where to add:** In the existing chat message submit handler.

```typescript
import { trackLiveComment } from '@/lib/trending-hooks';

export default function Chat() {
  const [message, setMessage] = useState('');
  const { data: { user } } = await supabase.auth.getUser();
  const liveStreamId = useLiveStreamContext(); // However you access current stream ID

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      // ✅ EXISTING LOGIC: Insert into chat_messages table
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user?.id,
          body: message,
          // ... other fields
        });

      if (chatError) throw chatError;

      // ✅ ADD THIS: Track comment for trending (fire-and-forget)
      if (liveStreamId && user?.id) {
        trackLiveComment({
          streamId: liveStreamId,
          profileId: user.id,
          body: message
        }).catch(err => {
          // Don't block chat if trending fails
          console.warn('[Trending] Comment tracking failed:', err);
        });
      }

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // ... rest of component ...
}
```

---

## 5. GIFTS: Track Gift Value for Trending

### File: `components/GiftModal.tsx` (or existing gift processing API route)

**Where to add:** After gift is successfully processed and confirmed.

```typescript
import { trackLiveGift } from '@/lib/trending-hooks';

export default function GiftModal({ liveStreamId, recipientId, ... }: GiftModalProps) {
  
  const handleSendGift = async () => {
    if (!selectedGift) return;

    try {
      // ✅ EXISTING LOGIC: Process gift via RPC
      const { data, error } = await supabase.rpc('process_gift', {
        sender_id: user?.id,
        recipient_id: recipientId,
        gift_type_id: selectedGift.id,
        coin_amount: selectedGift.coin_cost,
        box_position: slotIndex,
        live_stream_id: liveStreamId,
      });

      if (error) throw error;

      // ✅ ADD THIS: Track gift for trending (after successful processing)
      if (liveStreamId) {
        await trackLiveGift({
          streamId: liveStreamId,
          amountValue: selectedGift.coin_cost
        }).catch(err => {
          console.warn('[Trending] Gift tracking failed:', err);
        });
      }

      // Show success, close modal, etc.
      onGiftSent?.();
      onClose();

    } catch (error) {
      console.error('Failed to send gift:', error);
      setError('Failed to send gift');
    }
  };

  // ... rest of component ...
}
```

**Important:** The `rpc_live_gift_add` function requires `service_role` permissions. If your `process_gift()` RPC already runs with elevated permissions, you can add the trending update **inside that RPC function** instead:

```sql
-- Inside your existing process_gift() function (in Supabase):

-- ... existing gift logic ...

-- Add trending tracking at the end:
PERFORM rpc_live_gift_add(p_live_stream_id, p_coin_amount);
```

---

## 6. TRENDING PAGE: Display Top Streams

### File: `app/trending/page.tsx` (NEW) or add to existing discovery page

**Create a new Trending page:**

```typescript
'use client';

import { useTrendingStreams } from '@/lib/trending-hooks';
import Link from 'next/link';
import Image from 'next/image';

export default function TrendingPage() {
  const { streams, isLoading, refresh } = useTrendingStreams({
    limit: 20,
    refreshInterval: 10000 // Refresh every 10 seconds
  });

  if (isLoading) {
    return <div className="p-4">Loading trending streams...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🔥 Trending Live</h1>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {streams.map((stream, index) => (
          <Link
            key={stream.stream_id}
            href={`/live/${stream.username}`}
            className="group"
          >
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {/* Thumbnail or live indicator */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              
              {/* Rank badge */}
              <div className="absolute top-2 left-2 bg-yellow-500 text-black font-bold px-2 py-1 rounded">
                #{index + 1}
              </div>

              {/* Live indicator */}
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>

              {/* Stream info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src={stream.avatar_url || '/no-profile-pic.png'}
                    alt={stream.username}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {stream.display_name || stream.username}
                    </div>
                    <div className="text-xs text-gray-300">
                      @{stream.username}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-white">
                  <span>👁️ {stream.viewer_count}</span>
                  <span>❤️ {stream.likes_count}</span>
                  <span>💬 {stream.comments_count}</span>
                  <span>🎁 {stream.gifts_value}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {streams.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No trending streams right now. Be the first to go live!
        </div>
      )}
    </div>
  );
}
```

---

## 7. NAVIGATION: Add Trending Link

### File: `components/Nav.tsx` or main navigation

**Add a Trending link to your main nav:**

```typescript
<nav>
  <Link href="/">Home</Link>
  <Link href="/live">Live</Link>
  <Link href="/trending">🔥 Trending</Link> {/* ✅ ADD THIS */}
  <Link href="/profile">Profile</Link>
  {/* ... other links ... */}
</nav>
```

---

## VERIFICATION CHECKLIST

After implementing the above integrations, verify:

### ✅ Trending Score Calculation
1. Start a live stream
2. Join as a viewer → check `views_count` increments
3. Like the stream → check `likes_count` increments
4. Send a chat message → check `comments_count` increments
5. Send a gift → check `gifts_value` increments
6. Query `rpc_get_trending_live_streams()` → verify stream appears with correct `trending_score`

### ✅ Deduplication
1. Like a stream twice → should toggle (not increment twice)
2. Join same stream in multiple tabs → should only count once per profile/anon_id
3. Send multiple gifts → should accumulate correctly

### ✅ Live Filtering
1. End a stream (set `live_available = false`)
2. Query trending → ended stream should NOT appear
3. Restart stream → should reappear with fresh counts

### ✅ Security
1. Try to like without authentication → should fail gracefully
2. Try to call `rpc_live_gift_add` from client → should fail (service_role only)
3. Try to spam comments → should work (rate limiting TBD in future)

### ✅ Performance
1. Load trending page with 20 streams → should be fast (<100ms)
2. Check Supabase logs → verify indexes are being used
3. Monitor DB load during high traffic

---

## TROUBLESHOOTING

### "Function not found" error
- Run the migration: `psql -f sql/TRENDING_SYSTEM_MIGRATION.sql`
- Check function grants in Supabase dashboard

### Views not incrementing
- Check that `streamId` is the `live_streams.id` (UUID), not `profile_id`
- Verify stream has `live_available = true`

### Likes not persisting
- Ensure user is authenticated (`profile_id` must exist)
- Check RLS policies are enabled correctly

### Gifts not updating trending
- Verify `rpc_live_gift_add` is being called with `service_role` client
- Check that `live_stream_id` is being passed to gift processing

---

## FORMULA REFERENCE (v1)

```
age_minutes = max(1, minutes_since_stream_started)
time_decay = 1 / age_minutes^0.6

view_points = LN(1 + views_count)
like_points = LN(1 + likes_count)
comment_points = LN(1 + comments_count)
gift_points = LN(1 + gifts_value)

base_score = (view_points * 1.0) + (like_points * 0.7) + (comment_points * 1.2) + (gift_points * 3.0)

trending_score = base_score * time_decay
```

**Sort:** `ORDER BY trending_score DESC`

**Weights:**
- Views: 1.0 (baseline engagement)
- Likes: 0.7 (moderate signal)
- Comments: 1.2 (high engagement signal)
- Gifts: 3.0 (highest value signal)

**Logarithmic scaling prevents gaming:**
- 1 gift = ~1 point
- 10 gifts = ~2.4 points
- 100 gifts = ~4.6 points
- 1000 gifts = ~6.9 points

**Time decay favors newer streams but still rewards popular established streams.**

---

## NEXT STEPS (FUTURE ENHANCEMENTS)

Not required now, but consider:
1. **Rate limiting:** Prevent comment/like spam (1 like per 5s, 10 comments per minute)
2. **Bot detection:** Filter out bot views/likes
3. **Category trending:** Trending per genre/category
4. **Personalized trending:** Factor in user preferences
5. **Real-time updates:** WebSocket updates for live trending changes
6. **Analytics dashboard:** Show trending history, peak times, etc.

---

## FILES CREATED

1. `sql/TRENDING_SYSTEM_MIGRATION.sql` - Complete database migration
2. `lib/trending-hooks.ts` - Frontend React hooks
3. `TRENDING_INTEGRATION_GUIDE.md` - This file (integration instructions)

---

**End of Integration Guide**
