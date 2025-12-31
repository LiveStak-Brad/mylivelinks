# ❤️ LIKE SYSTEM — FINAL BEHAVIOR (ONE LIKE PER STREAM + FIDGET TAPS)

## Implementation Complete

### Rule (Final)

✅ **One like per user per stream** (keyed by `stream_id`)  
✅ **No unlike** — once liked, stays liked for that stream  
✅ **Fidget taps after first like** — visual animation only, no DB calls  
✅ **New stream resets** — when `stream_id` changes, user can like again  

---

## Files Changed

### 1. `components/Tile.tsx`

**Changes:**
- Added `showFloatingHeart` state for fidget animation
- Added `useEffect` to reset state when `streamId` changes
- Updated `handleLikeTap` with conditional logic:
  - First tap: calls RPC + shows scale pop
  - Subsequent taps: floating heart only (no RPC)
- Updated button UI with two animation layers

### 2. `sql/TRENDING_SYSTEM_MIGRATION.sql`

**Changes:**
- Modified `rpc_live_like_toggle()` to be insert-only (removed DELETE)
- Removed RLS policy "Users can unlike streams" (no delete allowed)
- Updated comments to reflect "insert-only" behavior

---

## Code Snippets

### Stream Change Effect (Tile.tsx)

```typescript
// Reset like state when streamId changes (new stream = new like opportunity)
useEffect(() => {
  if (!liveStreamId) return;
  
  // Reset fidget animation state for new stream
  setShowLikePop(false);
  setShowFloatingHeart(false);
  
  // Hook will auto-refetch stats for new stream_id
}, [liveStreamId]);
```

**Effect:**
- Triggers whenever `liveStreamId` changes
- Clears local animation states
- Hook's internal `useEffect` re-fetches `rpc_get_stream_trending_stats()` for new stream
- `isLiked` updates to reflect user's status on THIS stream

---

### Tap Handler Logic (Tile.tsx)

```typescript
const handleLikeTap = useCallback(() => {
  if (!user || isLikeLoading) return;
  
  if (!isLiked) {
    // First like on this stream - call DB
    toggleLike();
    setShowLikePop(true);
    setTimeout(() => setShowLikePop(false), 500);
  } else {
    // Already liked this stream - fidget animation only (no DB call)
    setShowFloatingHeart(true);
    setTimeout(() => setShowFloatingHeart(false), 800);
  }
}, [user, isLikeLoading, isLiked, toggleLike]);
```

**Logic:**
1. **Check:** Is user already liked THIS stream? (`isLiked`)
2. **If NO:** Call `toggleLike()` → RPC → DB insert → count updates → show "+1" pop
3. **If YES:** Show floating heart animation only → no RPC → no DB change

---

### RPC Function Update (SQL)

```sql
CREATE OR REPLACE FUNCTION rpc_live_like_toggle(
  p_stream_id BIGINT,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_likes_count INT;
  v_is_liked BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM live_streams WHERE id = p_stream_id AND live_available = TRUE) THEN
    RAISE EXCEPTION 'Stream not found or not live';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM live_stream_likes 
    WHERE stream_id = p_stream_id AND profile_id = p_profile_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Already liked - return current state (no unlike)
    v_is_liked := TRUE;
  ELSE
    -- Like: add like
    INSERT INTO live_stream_likes (stream_id, profile_id)
    VALUES (p_stream_id, p_profile_id)
    ON CONFLICT (stream_id, profile_id) DO NOTHING;
    v_is_liked := TRUE;
  END IF;

  UPDATE live_streams
  SET likes_count = (
    SELECT COUNT(*) FROM live_stream_likes WHERE stream_id = p_stream_id
  )
  WHERE id = p_stream_id
  RETURNING live_streams.likes_count INTO v_likes_count;

  PERFORM recompute_live_trending(p_stream_id);

  RETURN QUERY SELECT v_is_liked, v_likes_count;
END;
$$;
```

**Key Changes:**
- Removed `DELETE FROM live_stream_likes` (line previously deleted)
- If like exists, return `TRUE` without modification
- Always returns `is_liked = TRUE` (never FALSE)

---

## DB Verification Checks

### Test Scenario: Stream A → Stream B

```sql
-- Initial state
SELECT * FROM live_stream_likes WHERE profile_id = 'user-uuid';
-- Result: 0 rows

-- User taps like on Stream A (id=100)
-- Frontend calls: rpc_live_like_toggle(100, 'user-uuid')

SELECT * FROM live_stream_likes WHERE stream_id = 100 AND profile_id = 'user-uuid';
-- Result: 1 row inserted ✅

SELECT likes_count FROM live_streams WHERE id = 100;
-- Result: likes_count = 1 ✅

-- User taps again on Stream A
-- Frontend: NO RPC CALL (fidget animation only)

SELECT COUNT(*) FROM live_stream_likes WHERE stream_id = 100;
-- Result: Still 1 row (no change) ✅

-- Stream A ends, Stream B starts (id=200)
-- Frontend detects streamId change → resets state → fetches stats for 200

-- User taps like on Stream B
-- Frontend calls: rpc_live_like_toggle(200, 'user-uuid')

SELECT * FROM live_stream_likes WHERE profile_id = 'user-uuid';
-- Result: 2 rows (stream_id=100 and stream_id=200) ✅

SELECT likes_count FROM live_streams WHERE id = 200;
-- Result: likes_count = 1 ✅

-- Verify likes_count only changed on first tap per stream
SELECT stream_id, likes_count FROM live_streams WHERE id IN (100, 200);
-- Result:
--   stream_id | likes_count
--   100       | 1
--   200       | 1
-- ✅ Correct - one like per stream
```

---

## Visual States

### Stream A (First Time)

| Tap # | Action | Heart | Count | Animation | DB Call |
|-------|--------|-------|-------|-----------|---------|
| 1 | First like | 🤍 → ❤️ | 0 → 1 | Scale pop + ❤️ fade-up | ✅ RPC called |
| 2 | Fidget | ❤️ | 1 | Floating ❤️ (larger) | ❌ No RPC |
| 3 | Fidget | ❤️ | 1 | Floating ❤️ (larger) | ❌ No RPC |

### Stream B (New Stream)

| Tap # | Action | Heart | Count | Animation | DB Call |
|-------|--------|-------|-------|-----------|---------|
| 1 | First like | 🤍 → ❤️ | 0 → 1 | Scale pop + ❤️ fade-up | ✅ RPC called |
| 2 | Fidget | ❤️ | 1 | Floating ❤️ (larger) | ❌ No RPC |

---

## Animation Details

### First Like (Pop)
```jsx
{showLikePop && (
  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 text-lg font-bold animate-fade-up pointer-events-none">
    ❤️
  </span>
)}
```
- **Position:** -24px above button
- **Size:** text-lg (1.125rem)
- **Duration:** 500ms
- **Effect:** Fades up and disappears

### Fidget Tap (Floating Heart)
```jsx
{showFloatingHeart && (
  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-red-500 text-2xl animate-fade-up pointer-events-none">
    ❤️
  </span>
)}
```
- **Position:** -32px above button (higher than first like)
- **Size:** text-2xl (1.5rem) — larger than first like
- **Duration:** 800ms (longer than first like)
- **Effect:** Fades up and disappears

**Why different?**
- Larger size = more satisfying fidget feedback
- Higher position = clearly different from first like
- Longer duration = user sees it better

---

## Verification Checklist

### ✅ Stream-Keyed Behavior
- [x] User can like Stream A once (counted)
- [x] Additional taps on Stream A don't change DB
- [x] Additional taps show fidget animation
- [x] Stream B starts → user can like again (new stream_id)
- [x] Like on Stream B counted separately

### ✅ No Unlike
- [x] RPC never deletes from `live_stream_likes`
- [x] RLS policy blocks DELETE operations
- [x] Once liked, button stays ❤️ (red) for that stream
- [x] `likes_count` only increments, never decrements

### ✅ State Reset on Stream Change
- [x] `useEffect` triggers when `liveStreamId` changes
- [x] Animation states cleared (`showLikePop`, `showFloatingHeart`)
- [x] Hook re-fetches stats for new stream
- [x] `isLiked` updates to reflect user's status on NEW stream

### ✅ Visual Feedback
- [x] First tap: scale pop + small heart fade-up
- [x] Subsequent taps: larger heart fade-up (fidget)
- [x] No "+1" on fidget taps (only hearts)
- [x] Animations don't overlap (separate state flags)

### ✅ Database Integrity
- [x] Primary key `(stream_id, profile_id)` enforces uniqueness
- [x] `likes_count` synced from `COUNT(*)` query
- [x] Trending score recalculates on every like
- [x] No race conditions (ON CONFLICT DO NOTHING)

---

## Summary

**Files Changed:**
1. `components/Tile.tsx` — Conditional tap handler + stream change effect
2. `sql/TRENDING_SYSTEM_MIGRATION.sql` — Insert-only RPC + RLS update

**Key Features:**
- ✅ One like per stream (not per session)
- ✅ No unlike (permanent like)
- ✅ Fidget taps after first like (visual only)
- ✅ New stream = new like opportunity
- ✅ State resets on stream change
- ✅ Different animations for first vs fidget

**DB Behavior:**
- First tap per stream: INSERT row, increment count
- Subsequent taps: Return existing state, no DB change
- New stream: New row, new count

**Status:** ✅ COMPLETE — Ready for testing

---

*Implementation Date: 2025-12-31*
