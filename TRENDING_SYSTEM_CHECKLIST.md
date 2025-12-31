# ✅ TRENDING SYSTEM — IMPLEMENTATION CHECKLIST

## 📋 Pre-Implementation

- [ ] Read `TRENDING_SYSTEM_DELIVERABLE.md` for full understanding
- [ ] Read `TRENDING_INTEGRATION_GUIDE.md` for integration steps
- [ ] Review `TRENDING_SYSTEM_QUICK_REF.md` for visual reference
- [ ] Backup database before applying migration
- [ ] Verify you have Supabase access (SQL Editor or psql)

---

## 🗄️ Step 1: Database Migration

### Apply SQL Migration

- [ ] Open `sql/TRENDING_SYSTEM_MIGRATION.sql`
- [ ] Copy entire file contents
- [ ] Paste into Supabase SQL Editor (or run via psql)
- [ ] Click "Run" and verify success message

### Verify Migration

- [ ] Check new columns exist:
  ```sql
  SELECT views_count, likes_count, comments_count, gifts_value, trending_score 
  FROM live_streams LIMIT 1;
  ```

- [ ] Check new tables exist:
  ```sql
  SELECT * FROM live_stream_likes LIMIT 1;
  SELECT * FROM live_stream_comments LIMIT 1;
  SELECT * FROM live_stream_view_sessions LIMIT 1;
  ```

- [ ] Check RPC functions exist:
  ```sql
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_name LIKE 'rpc_live%';
  ```
  Expected: 7 functions (view_join, view_leave, like_toggle, comment_add, gift_add, get_trending_live_streams, get_stream_trending_stats)

- [ ] Check indexes exist:
  ```sql
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename = 'live_streams' 
    AND indexname LIKE '%trending%';
  ```
  Expected: At least `idx_live_streams_trending_active`

- [ ] Check RLS enabled:
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename IN ('live_stream_likes', 'live_stream_comments', 'live_stream_view_sessions');
  ```
  Expected: All should have `rowsecurity = true`

---

## 📦 Step 2: Frontend Files

### Copy Files

- [ ] Verify `lib/trending-hooks.ts` exists
- [ ] Verify `app/trending/page.tsx` exists (Trending page component)

### Install Dependencies (if needed)

- [ ] Check if `lucide-react` is installed (used in Trending page)
  ```bash
  npm list lucide-react
  ```
- [ ] If not installed:
  ```bash
  npm install lucide-react
  ```

---

## 🔌 Step 3: Integration (Choose Your Integration Points)

### A. Solo Viewer Page (Required for view tracking)

- [ ] Open `app/live/[username]/page.tsx` (or your solo viewer component)
- [ ] Add import:
  ```typescript
  import { useLiveViewTracking } from '@/lib/trending-hooks';
  ```
- [ ] Add hook call after `liveStreamId` is loaded:
  ```typescript
  useLiveViewTracking({
    streamId: liveStreamId,
    profileId: user?.id,
    enabled: isLive && liveStreamId != null
  });
  ```

### B. Like Button (Required for like tracking)

- [ ] Open `components/Tile.tsx` (or your video player component)
- [ ] Add import:
  ```typescript
  import { useLiveLike } from '@/lib/trending-hooks';
  ```
- [ ] Add hook call:
  ```typescript
  const { isLiked, likesCount, toggleLike } = useLiveLike({
    streamId: liveStreamId,
    profileId: user?.id,
    enabled: !!user && !!liveStreamId
  });
  ```
- [ ] Add like button to UI:
  ```typescript
  <button onClick={toggleLike} disabled={!user}>
    {isLiked ? '❤️' : '🤍'} {likesCount}
  </button>
  ```

### C. Chat Comments (Required for comment tracking)

- [ ] Open `components/Chat.tsx` (or your chat component)
- [ ] Add import:
  ```typescript
  import { trackLiveComment } from '@/lib/trending-hooks';
  ```
- [ ] In existing message submit handler, add AFTER successful chat insert:
  ```typescript
  if (liveStreamId && user?.id) {
    await trackLiveComment({
      streamId: liveStreamId,
      profileId: user.id,
      body: message
    }).catch(err => console.warn('[Trending] Comment tracking failed:', err));
  }
  ```

### D. Gift Tracking (Required for gift value tracking)

**Option 1: Client-side (in GiftModal.tsx)**

- [ ] Open `components/GiftModal.tsx`
- [ ] Add import:
  ```typescript
  import { trackLiveGift } from '@/lib/trending-hooks';
  ```
- [ ] In existing gift send handler, add AFTER successful gift processing:
  ```typescript
  if (liveStreamId) {
    await trackLiveGift({
      streamId: liveStreamId,
      amountValue: selectedGift.coin_cost
    }).catch(err => console.warn('[Trending] Gift tracking failed:', err));
  }
  ```

**Option 2: Server-side (RECOMMENDED - in existing process_gift RPC)**

- [ ] Open Supabase SQL Editor
- [ ] Find your existing `process_gift()` RPC function
- [ ] Add this line at the END of the function (before RETURN):
  ```sql
  -- Track gift for trending
  PERFORM rpc_live_gift_add(p_live_stream_id, p_coin_amount);
  ```

### E. Navigation Link (Optional but recommended)

- [ ] Open your main navigation component (e.g., `components/Nav.tsx`)
- [ ] Add link to trending page:
  ```typescript
  <Link href="/trending">
    🔥 Trending
  </Link>
  ```

---

## 🧪 Step 4: Testing

### Database Functions Test

- [ ] Test view join:
  ```sql
  SELECT * FROM rpc_live_view_join(
    'YOUR_STREAM_ID'::uuid, 
    'YOUR_PROFILE_ID'::uuid, 
    NULL
  );
  ```
  Expected: Returns session_id and views_count

- [ ] Test like toggle:
  ```sql
  SELECT * FROM rpc_live_like_toggle(
    'YOUR_STREAM_ID'::uuid, 
    'YOUR_PROFILE_ID'::uuid
  );
  ```
  Expected: Returns is_liked=true and likes_count=1

- [ ] Test like toggle again:
  ```sql
  SELECT * FROM rpc_live_like_toggle(
    'YOUR_STREAM_ID'::uuid, 
    'YOUR_PROFILE_ID'::uuid
  );
  ```
  Expected: Returns is_liked=false and likes_count=0

- [ ] Test trending query:
  ```sql
  SELECT * FROM rpc_get_trending_live_streams(20, 0);
  ```
  Expected: Returns list of live streams ordered by trending_score

### Frontend Integration Test

- [ ] Start a live stream (set `live_available = true`)
- [ ] Open stream as viewer → verify `views_count` increments in DB
- [ ] Click like button → verify `likes_count` increments in DB
- [ ] Unlike → verify `likes_count` decrements in DB
- [ ] Send chat message → verify `comments_count` increments in DB
- [ ] Send gift → verify `gifts_value` increments in DB
- [ ] Open `/trending` page → verify stream appears in list
- [ ] End stream → verify stream disappears from trending list

### Deduplication Test

- [ ] Open stream in 2 tabs as same user
- [ ] Verify `views_count` only incremented once
- [ ] Like stream twice
- [ ] Verify `likes_count` toggles (not double increment)
- [ ] Close one tab
- [ ] Verify `left_at` is set in `live_stream_view_sessions`

### Security Test

- [ ] Log out
- [ ] Try to like a stream
- [ ] Verify graceful failure (not allowed)
- [ ] Join stream as anonymous
- [ ] Verify view is tracked with `anon_id`
- [ ] Try to call `rpc_live_gift_add` from browser console
- [ ] Verify permission denied error

---

## 📊 Step 5: Performance Verification

### Check Query Performance

- [ ] Run EXPLAIN ANALYZE on trending query:
  ```sql
  EXPLAIN ANALYZE 
  SELECT * FROM rpc_get_trending_live_streams(20, 0);
  ```
  Expected: Should use `idx_live_streams_trending_active` index

- [ ] Verify query time in Supabase logs
  Expected: <50ms for 20 streams

### Check Index Usage

- [ ] In Supabase Dashboard → Database → Performance Insights
- [ ] Verify `idx_live_streams_trending_active` is being used
- [ ] Check for any slow queries related to trending

---

## 🐛 Step 6: Troubleshooting (If Issues)

### Issue: Functions not found

**Symptoms:** "function rpc_live_view_join does not exist"

**Fix:**
- [ ] Re-run `sql/TRENDING_SYSTEM_MIGRATION.sql`
- [ ] Check you're connected to the correct database
- [ ] Verify function grants were applied

### Issue: Views not incrementing

**Symptoms:** `views_count` stays at 0

**Fix:**
- [ ] Verify `streamId` is the correct UUID from `live_streams.id`
- [ ] Check stream has `live_available = true`
- [ ] Check for errors in browser console
- [ ] Verify `useLiveViewTracking()` hook is being called

### Issue: Likes not working

**Symptoms:** Like button doesn't toggle

**Fix:**
- [ ] Verify user is authenticated
- [ ] Check RLS policies are enabled correctly
- [ ] Check browser console for errors
- [ ] Verify `profile_id` matches `auth.uid()`

### Issue: Trending list empty

**Symptoms:** No streams on `/trending` page

**Fix:**
- [ ] Verify at least one stream has `live_available = true`
- [ ] Check stream has `trending_score > 0` (run `recompute_live_trending()`)
- [ ] Verify stream has some engagement (views/likes/comments/gifts)
- [ ] Check for errors in browser console

### Issue: Gifts not updating

**Symptoms:** `gifts_value` not incrementing

**Fix:**
- [ ] Verify `rpc_live_gift_add()` is being called
- [ ] Check it's being called with service_role permissions
- [ ] Verify `live_stream_id` is being passed correctly
- [ ] Check Supabase logs for errors

---

## 🎯 Step 7: Production Readiness

### Performance

- [ ] Load test with 100+ concurrent viewers
- [ ] Verify trending page loads in <1 second
- [ ] Monitor database CPU/memory during high traffic
- [ ] Check for any slow queries in Supabase logs

### Monitoring

- [ ] Set up alerts for slow queries (>100ms)
- [ ] Monitor trending_score distribution (check for anomalies)
- [ ] Track API error rates for trending RPCs
- [ ] Monitor database connection pool usage

### Documentation

- [ ] Add trending system to internal docs
- [ ] Document algorithm weights for future tuning
- [ ] Create runbook for common issues
- [ ] Train team on how trending works

---

## 🚀 Step 8: Launch

### Pre-Launch

- [ ] Run full test suite
- [ ] Verify all integrations working
- [ ] Check performance under load
- [ ] Backup database
- [ ] Prepare rollback plan

### Launch

- [ ] Deploy frontend changes
- [ ] Announce trending feature to users
- [ ] Monitor error rates
- [ ] Monitor user engagement with trending

### Post-Launch

- [ ] Monitor for first 24 hours
- [ ] Collect user feedback
- [ ] Analyze trending patterns
- [ ] Adjust algorithm if needed (see tuning guide in deliverable)

---

## 📈 Step 9: Analytics & Optimization (Week 1+)

### Metrics to Track

- [ ] Number of views via trending page
- [ ] Click-through rate on trending streams
- [ ] Average time spent on trending page
- [ ] Conversion: trending view → stream join
- [ ] Distribution of trending_score (identify outliers)

### Optimization Opportunities

- [ ] Adjust weights based on user behavior
- [ ] Add category-based trending
- [ ] Implement personalized trending
- [ ] Add real-time WebSocket updates
- [ ] Add rate limiting for abuse prevention

---

## ✅ Completion Checklist

- [ ] Database migration applied successfully
- [ ] All 7 RPC functions working
- [ ] Indexes created and being used
- [ ] RLS policies configured correctly
- [ ] View tracking integrated
- [ ] Like functionality integrated
- [ ] Comment tracking integrated
- [ ] Gift tracking integrated
- [ ] Trending page deployed and working
- [ ] Navigation link added
- [ ] All tests passing
- [ ] Performance verified (<100ms queries)
- [ ] Security verified (RLS working)
- [ ] No errors in production logs
- [ ] Team trained on system
- [ ] Documentation complete

---

## 🎉 SUCCESS CRITERIA

You'll know the system is working correctly when:

✅ Views increment when users join streams  
✅ Likes toggle correctly (heart icon fills/unfills)  
✅ Comments increment the counter  
✅ Gifts increase the trending score  
✅ Trending page shows streams sorted correctly  
✅ Newer streams with good engagement beat older streams  
✅ Ended streams disappear from trending immediately  
✅ Anonymous viewers can join but not like  
✅ Queries are fast (<100ms)  
✅ No duplicate view counts  
✅ No errors in console or logs  

---

## 📞 Support

If you encounter issues not covered in this checklist:

1. Review `TRENDING_SYSTEM_DELIVERABLE.md` troubleshooting section
2. Check Supabase logs for error messages
3. Run EXPLAIN ANALYZE on slow queries
4. Verify indexes are being used
5. Test RPCs directly in SQL editor to isolate frontend vs backend issues

---

**ESTIMATED TIME TO COMPLETE:**
- Database migration: 5 minutes
- Frontend integration: 30-60 minutes
- Testing: 30 minutes
- **Total: ~2 hours**

**READY TO START:** Begin with Step 1 (Database Migration) 🚀
