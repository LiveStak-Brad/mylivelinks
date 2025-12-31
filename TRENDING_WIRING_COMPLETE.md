# ✅ TRENDING WIRING COMPLETE — VERIFICATION GUIDE

## Files Changed

### 1. `components/Tile.tsx`
**Line ~1:** Added `useLiveViewTracking` import  
**Line ~94:** Added view tracking hook

```typescript
// View tracking for trending (tracks unique views)
useLiveViewTracking({
  streamId: liveStreamId || null,
  profileId: user?.id,
  enabled: !!liveStreamId && isLive && !isCurrentUser
});
```

**Triggers:** When viewer loads tile with live stream  
**Condition:** `liveStreamId` exists, stream is live, viewer is not the streamer  

---

### 2. `components/Chat.tsx`
**Line ~10:** Added `trackLiveComment` import  
**Line ~637:** Added comment tracking after successful insert

```typescript
// Track comment for trending (fire-and-forget, don't block chat)
if (liveStreamId && currentUserId) {
  trackLiveComment({
    streamId: liveStreamId,
    profileId: currentUserId,
    body: messageToSend
  }).catch(err => {
    console.warn('[Trending] Comment tracking failed:', err);
  });
}
```

**Triggers:** After chat message successfully inserted to DB  
**Condition:** Solo stream (`liveStreamId` exists), user authenticated  
**Safe:** Fire-and-forget, won't break chat if trending fails  

---

### 3. `components/GiftModal.tsx`
**Line ~4:** Added `trackLiveGift` import  
**Line ~200:** Added gift tracking after successful send

```typescript
// Track gift for trending (after successful send, fire-and-forget)
if (liveStreamId) {
  trackLiveGift({
    streamId: liveStreamId,
    amountValue: selectedGift.coin_cost
  }).catch(err => {
    console.warn('[Trending] Gift tracking failed:', err);
  });
}
```

**Triggers:** After gift API call succeeds and balance updated  
**Condition:** Stream has `liveStreamId`  
**Safe:** Fire-and-forget, won't break gifting if trending fails  

---

## Verification Queries

### Test Setup
```sql
-- Start a live stream (use your actual stream ID)
UPDATE live_streams SET live_available = true WHERE id = YOUR_STREAM_ID;
```

### 1. Verify Views Increment
```sql
-- Before: Check initial count
SELECT id, views_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- Result: views_count = 0 (or existing count)

-- Action: Open stream as viewer (in Tile or solo view)

-- After: Check count increased
SELECT id, views_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: views_count = 1 (or +1 from before)

-- Verify session recorded
SELECT * FROM live_stream_view_sessions 
WHERE stream_id = YOUR_STREAM_ID 
ORDER BY joined_at DESC LIMIT 1;
-- ✅ Expected: 1 row with your profile_id, left_at = NULL
```

### 2. Verify Comments Increment
```sql
-- Before: Check initial count
SELECT id, comments_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- Result: comments_count = 0 (or existing count)

-- Action: Send a chat message "test message"

-- After: Check count increased
SELECT id, comments_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: comments_count = 1 (or +1 from before)

-- Verify comment recorded
SELECT * FROM live_stream_comments 
WHERE stream_id = YOUR_STREAM_ID 
ORDER BY created_at DESC LIMIT 1;
-- ✅ Expected: 1 row with body = "test message"
```

### 3. Verify Gifts Increment
```sql
-- Before: Check initial value
SELECT id, gifts_value FROM live_streams WHERE id = YOUR_STREAM_ID;
-- Result: gifts_value = 0 (or existing value)

-- Action: Send a gift (e.g., 100 coins)

-- After: Check value increased
SELECT id, gifts_value FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: gifts_value = 100 (or +100 from before)
```

### 4. Verify Trending Score Updates
```sql
-- Check trending score changed
SELECT id, views_count, likes_count, comments_count, gifts_value, trending_score, last_score_at
FROM live_streams 
WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: 
--   - trending_score > 0
--   - last_score_at = recent timestamp (within last minute)
```

### 5. Full Integration Test
```sql
-- Complete engagement sequence
SELECT 
  id,
  views_count,      -- Should increment on view join
  likes_count,      -- Should increment on like tap
  comments_count,   -- Should increment on chat message
  gifts_value,      -- Should increment on gift send
  trending_score,   -- Should recalculate after each action
  last_score_at     -- Should update after each action
FROM live_streams 
WHERE id = YOUR_STREAM_ID;

-- Expected progression:
-- 1. View join: views_count=1, score=X
-- 2. Like: likes_count=1, score=Y (Y > X)
-- 3. Comment: comments_count=1, score=Z (Z > Y)
-- 4. Gift: gifts_value=100, score=W (W > Z, significant jump due to 3.0 weight)
```

---

## Deduplication Tests

### Views (Should Not Spam)
```sql
-- Action: Refresh page multiple times

SELECT COUNT(*) as session_count
FROM live_stream_view_sessions
WHERE stream_id = YOUR_STREAM_ID AND profile_id = 'YOUR_USER_ID';
-- ✅ Expected: 1 active session (left_at = NULL)

SELECT views_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: Only increments once per unique viewer session
```

### Comments (Should All Count)
```sql
-- Action: Send 3 messages

SELECT comments_count FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: comments_count = 3

SELECT COUNT(*) FROM live_stream_comments WHERE stream_id = YOUR_STREAM_ID;
-- ✅ Expected: 3 rows
```

### Gifts (Should Accumulate)
```sql
-- Action: Send 3 gifts of 100 coins each

SELECT gifts_value FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: gifts_value = 300 (cumulative)
```

---

## Error Handling Tests

### Chat Tracking Failure
```sql
-- Simulate: Stop Supabase or break trending RPC
-- Action: Send chat message
-- ✅ Expected: Chat message still appears (tracking fails silently)
-- Check console: "[Trending] Comment tracking failed: ..."
```

### Gift Tracking Failure
```sql
-- Simulate: Break trending RPC
-- Action: Send gift
-- ✅ Expected: Gift still sends successfully (tracking fails silently)
-- Check console: "[Trending] Gift tracking failed: ..."
```

---

## Performance Checks

### No N+1 Queries
```bash
# Open Supabase logs during test
# Action: Send 10 chat messages rapidly
# ✅ Expected: 10 chat inserts + 10 trending updates (not 100 queries)
```

### No Blocking
```bash
# Action: Send chat message with trending RPC slow/failing
# ✅ Expected: Chat message appears immediately (not waiting for trending)
```

---

## Live Filtering Test

### Ended Streams Don't Appear
```sql
-- End stream
UPDATE live_streams SET live_available = false WHERE id = YOUR_STREAM_ID;

-- Query trending
SELECT * FROM rpc_get_trending_live_streams(20, 0);
-- ✅ Expected: YOUR_STREAM_ID not in results

-- Check score reset
SELECT trending_score FROM live_streams WHERE id = YOUR_STREAM_ID;
-- ✅ Expected: trending_score = 0
```

---

## Summary of Changes

| Integration Point | File | Line | Trigger | Counter Updated |
|-------------------|------|------|---------|-----------------|
| View Tracking | `Tile.tsx` | ~94 | Viewer joins stream | `views_count` |
| Like Button | `Tile.tsx` | ~90 | User taps heart | `likes_count` |
| Comment Tracking | `Chat.tsx` | ~637 | Message sent | `comments_count` |
| Gift Tracking | `GiftModal.tsx` | ~200 | Gift successful | `gifts_value` |

**All integrations:**
- ✅ Minimal diff (3-10 lines per file)
- ✅ Fire-and-forget (won't break existing features)
- ✅ Only track when conditions met (live stream, authenticated user)
- ✅ Automatic trending_score recalculation

---

## Next Steps

1. **Apply SQL update** (if not done):
   ```sql
   -- Run the like-only SQL from previous message
   ```

2. **Test each integration:**
   - [ ] View join increments `views_count`
   - [ ] Like tap increments `likes_count`
   - [ ] Chat message increments `comments_count`
   - [ ] Gift send increments `gifts_value`
   - [ ] All actions update `trending_score`

3. **Verify LiveTV shows trending:**
   - [ ] Check LiveTV component uses trending query
   - [ ] Verify streams sorted by `trending_score DESC`
   - [ ] Confirm your stream appears when you engage

---

**Status:** ✅ ALL WIRING COMPLETE  
**Date:** 2025-12-31  
**Files Changed:** 3 (Tile.tsx, Chat.tsx, GiftModal.tsx)  
**Lines Added:** ~30 total  
**SQL Changes:** None (already in migration)

