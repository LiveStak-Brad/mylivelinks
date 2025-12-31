# ⚡ TRENDING SYSTEM — 5-MINUTE QUICK START

**Want to get trending working ASAP? Follow these 5 steps.**

---

## 1️⃣ Apply Database Migration (2 minutes)

```bash
# Copy this file into Supabase SQL Editor and run:
sql/TRENDING_SYSTEM_MIGRATION.sql
```

**Verify it worked:**
```sql
SELECT * FROM rpc_get_trending_live_streams(5, 0);
```
Should return empty array (no errors).

---

## 2️⃣ Add View Tracking (1 minute)

**In your solo viewer page** (`app/live/[username]/page.tsx`):

```typescript
import { useLiveViewTracking } from '@/lib/trending-hooks';

// Inside component, after liveStreamId is loaded:
useLiveViewTracking({
  streamId: liveStreamId,
  profileId: user?.id,
  enabled: isLive && liveStreamId != null
});
```

---

## 3️⃣ Add Like Button (1 minute)

**In your video tile** (`components/Tile.tsx`):

```typescript
import { useLiveLike } from '@/lib/trending-hooks';

// Inside component:
const { isLiked, likesCount, toggleLike } = useLiveLike({
  streamId: liveStreamId,
  profileId: user?.id,
  enabled: !!user && !!liveStreamId
});

// In JSX (add to your video overlay):
<button onClick={toggleLike}>
  {isLiked ? '❤️' : '🤍'} {likesCount}
</button>
```

---

## 4️⃣ Track Comments & Gifts (1 minute)

**In your chat handler** (`components/Chat.tsx`):

```typescript
import { trackLiveComment } from '@/lib/trending-hooks';

// After successful chat insert:
if (liveStreamId && user?.id) {
  trackLiveComment({ streamId: liveStreamId, profileId: user.id, body: message });
}
```

**In your gift handler** (`components/GiftModal.tsx`):

```typescript
import { trackLiveGift } from '@/lib/trending-hooks';

// After successful gift processing:
if (liveStreamId) {
  trackLiveGift({ streamId: liveStreamId, amountValue: giftType.coin_cost });
}
```

---

## 5️⃣ Test It (5 minutes)

1. **Start a live stream**
   ```sql
   -- Manually set a stream live in Supabase:
   UPDATE live_streams SET live_available = true WHERE profile_id = 'YOUR_PROFILE_ID';
   ```

2. **Join as viewer** → Check DB:
   ```sql
   SELECT views_count FROM live_streams WHERE id = 'YOUR_STREAM_ID';
   -- Should be 1
   ```

3. **Click like button** → Check DB:
   ```sql
   SELECT likes_count FROM live_streams WHERE id = 'YOUR_STREAM_ID';
   -- Should be 1
   ```

4. **View trending** → Go to `/trending`
   ```
   Your stream should appear at the top!
   ```

---

## ✅ Success Criteria

You're done when:
- [ ] Views increment when you join a stream
- [ ] Like button toggles ❤️/🤍
- [ ] `/trending` page shows your stream
- [ ] No errors in console

---

## 🐛 Quick Fixes

**"Function does not exist"**  
→ Re-run the SQL migration

**"Views not incrementing"**  
→ Check `streamId` is the UUID from `live_streams.id`

**"Like button not working"**  
→ Make sure you're logged in (auth required for likes)

**"Trending page empty"**  
→ Make sure stream has `live_available = true` and some engagement

---

## 📚 Full Documentation

- **Step-by-step:** `TRENDING_INTEGRATION_GUIDE.md`
- **Complete docs:** `TRENDING_SYSTEM_DELIVERABLE.md`
- **Visual reference:** `TRENDING_SYSTEM_QUICK_REF.md`
- **Checklist:** `TRENDING_SYSTEM_CHECKLIST.md`
- **Summary:** `TRENDING_SYSTEM_SUMMARY.md`

---

## 🚀 Bonus: Deploy Trending Page

The trending page is already built! Just navigate to `/trending` or add a nav link:

```typescript
<Link href="/trending">🔥 Trending</Link>
```

Component is in `app/trending/page.tsx` (ready to use).

---

**That's it! You now have a working trending system. 🎉**

**Total time: ~5-10 minutes**

For production deployment, follow the full checklist in `TRENDING_SYSTEM_CHECKLIST.md`.
