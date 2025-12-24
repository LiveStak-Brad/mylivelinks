# Launch Readiness Checklist - MyLiveLinks

## Pre-Launch Verification

### ✅ Visual Integration & Brand Consistency

- [ ] **Logo Integration**
  - [ ] Logo displays correctly in header (`/live`)
  - [ ] Logo displays correctly in profile pages
  - [ ] Logo switches light/dark mode automatically
  - [ ] Logo fallback works if images missing
  - [ ] Transparent logo versions work on colored backgrounds

- [ ] **Banner Integration**
  - [ ] "Join Group Live" banner displays on `/live`
  - [ ] "Go Live!" banner displays on profile (if applicable)
  - [ ] Profile banners clickable and navigate correctly
  - [ ] Banners switch light/dark mode automatically
  - [ ] User-specific banners work (`photos/banners/{username}-banner.jpg`)

- [ ] **Modal Branding**
  - [ ] Gift modal includes logo/branding
  - [ ] Diamond conversion modal includes logo/branding
  - [ ] Loading states show branded spinner/placeholder
  - [ ] Empty states show branded messages

### ✅ Live Grid & Tiles UX

- [ ] **12-Tile Grid**
  - [ ] Grid displays exactly 12 tiles (6×2)
  - [ ] Drag-and-drop works smoothly
  - [ ] Visual feedback during drag (opacity, scale)
  - [ ] Drop zones clearly indicated
  - [ ] Grid layout persists across sessions

- [ ] **Tile States**
  - [ ] **Preview mode** clearly indicated (yellow border, "PREVIEW" badge)
  - [ ] **Live mode** clearly indicated (red border, "LIVE" badge, pulse animation)
  - [ ] **Muted state** visually distinct (grayscale, muted icon)
  - [ ] **Empty slots** clearly marked (dashed border, "Empty Slot" text)
  - [ ] **Closed tiles** remain empty (no auto-refill)

- [ ] **Tile Overlays**
  - [ ] Username displays on hover
  - [ ] Gifter badge displays correctly
  - [ ] Live indicator (red pulse) visible
  - [ ] Gift button appears on hover
  - [ ] Viewer count displays (if > 0)
  - [ ] Mute/close controls appear on hover

- [ ] **Tile Interactions**
  - [ ] Close tile removes streamer (stays empty)
  - [ ] Mute tile grays out video
  - [ ] Pin tile (if implemented) persists position
  - [ ] Randomize button fills all 12 slots
  - [ ] Drag-and-drop reorders tiles

### ✅ Real-Time Correctness

- [ ] **Viewer Management**
  - [ ] Viewer leaves page → heartbeat stops immediately
  - [ ] Last viewer leaves → streamer unpublishes
  - [ ] Multiple viewers → no duplicate publish sessions
  - [ ] Rapid add/remove → no token leaks
  - [ ] Streamer closes tab → removed from grids cleanly

- [ ] **Cleanup Verification**
  - [ ] No "ghost viewers" in database
  - [ ] No stuck publishing states
  - [ ] Stale viewers cleaned up (60-second TTL)
  - [ ] Publish state updates correctly (every 15 seconds)

- [ ] **Edge Cases**
  - [ ] Network interruption → graceful handling
  - [ ] Page refresh → state restored correctly
  - [ ] Multiple tabs → only one active viewer per stream
  - [ ] Browser back/forward → cleanup on navigation

### ✅ Leaderboards

- [ ] **Tabs Functionality**
  - [ ] Today / Week / All-time tabs work
  - [ ] Switching tabs updates leaderboard
  - [ ] Cache loads correctly (if available)
  - [ ] Live computation works (if cache empty)

- [ ] **Two Leaderboards**
  - [ ] Top Streamers (diamonds earned) displays correctly
  - [ ] Top Gifters (coins spent) displays correctly
  - [ ] Switching between leaderboards works

- [ ] **Display Elements**
  - [ ] Gifter badges show correctly
  - [ ] Rankings display (1, 2, 3, ...)
  - [ ] Subtle animations on rank changes
  - [ ] Avatar/username display correctly
  - [ ] Metric values formatted (K, M suffixes)

- [ ] **Refresh Cadence**
  - [ ] Daily leaderboards refresh hourly
  - [ ] Weekly leaderboards refresh every 6 hours
  - [ ] All-time leaderboards refresh daily

### ✅ Profile Pages

- [ ] **Required Elements**
  - [ ] Banner displays (clickable to `/live`)
  - [ ] Avatar displays (or default)
  - [ ] Stats display correctly:
    - [ ] Followers count
    - [ ] Gifter level
    - [ ] Diamonds earned
    - [ ] Coins sent

- [ ] **Links List**
  - [ ] User links display correctly
  - [ ] Links are clickable (open in new tab)
  - [ ] Display order respected
  - [ ] Inactive links hidden

- [ ] **Action Buttons**
  - [ ] **Watch Live** button (if live)
  - [ ] **Go Live** button (always visible)
  - [ ] **Follow** button (if not own profile)
  - [ ] **Message** button (if not own profile)
  - [ ] All buttons work correctly

- [ ] **Behavior**
  - [ ] Watch Live places user in viewer's grid
  - [ ] Go Live starts live-available state
  - [ ] Non-owners can see Go Live button
  - [ ] Follow/unfollow works
  - [ ] Message button (placeholder if not implemented)

### ✅ Monetization UX Clarity

- [ ] **Tooltips**
  - [ ] Coins tooltip explains "purchase-only"
  - [ ] Diamonds tooltip explains "earned from gifts"
  - [ ] Conversion tooltip explains "30% fee"
  - [ ] Gift tooltip explains "1:1 coins→diamonds"

- [ ] **Conversion Preview**
  - [ ] Always shows diamonds in
  - [ ] Always shows coins out
  - [ ] Always shows fee amount
  - [ ] Minimum threshold clearly stated (3 diamonds)

- [ ] **Gifting Feedback**
  - [ ] Immediate chat message on gift
  - [ ] Tile animation (if implemented)
  - [ ] Balance updates immediately
  - [ ] No artificial friction

### ✅ Performance

- [ ] **Re-renders**
  - [ ] Components memoized where appropriate
  - [ ] No unnecessary re-renders in grid
  - [ ] Chat messages don't re-render entire list
  - [ ] Leaderboard entries memoized

- [ ] **Subscriptions**
  - [ ] Selective subscriptions (not listening to everything)
  - [ ] Subscriptions cleaned up on unmount
  - [ ] No duplicate subscriptions
  - [ ] Batch subscriptions where possible

- [ ] **Queries**
  - [ ] No N+1 queries
  - [ ] Queries use proper indexes
  - [ ] Large payloads paginated
  - [ ] Real-time events optimized

- [ ] **Lazy Loading**
  - [ ] Leaderboards lazy loaded
  - [ ] IMs lazy loaded (if implemented)
  - [ ] Non-critical panels lazy loaded

### ✅ Admin & Moderation

- [ ] **Admin Tools**
  - [ ] Global mute works
  - [ ] Timeout works (with duration)
  - [ ] Ban works (permanent)
  - [ ] User disappears from grids
  - [ ] User disappears from chat
  - [ ] User disappears from IMs
  - [ ] Audit logs visible (if implemented)

- [ ] **RLS Verification**
  - [ ] No RLS leaks (users can't see admin data)
  - [ ] Admin can access moderation tools
  - [ ] Regular users can't access admin tools
  - [ ] Banned users properly restricted

### ✅ Browser Compatibility

- [ ] **Chrome**
  - [ ] All features work
  - [ ] Banners/logos render correctly
  - [ ] Light/dark mode works
  - [ ] No console errors

- [ ] **Safari**
  - [ ] All features work
  - [ ] Banners/logos render correctly
  - [ ] Light/dark mode works
  - [ ] No console errors

- [ ] **Firefox**
  - [ ] All features work
  - [ ] Banners/logos render correctly
  - [ ] Light/dark mode works
  - [ ] No console errors

- [ ] **Mobile Browsers**
  - [ ] Responsive layout works
  - [ ] Touch interactions work
  - [ ] Grid displays correctly (may need adjustment)
  - [ ] Chat works on mobile

### ✅ Testing Plan Verification

- [ ] **Gift Flow**
  - [ ] Send gift (coins → diamonds 1:1) ✅
  - [ ] Insufficient coins error ✅
  - [ ] Multiple gifts work ✅

- [ ] **Conversion Flow**
  - [ ] Convert diamonds (30% fee) ✅
  - [ ] Minimum threshold (3 diamonds) ✅
  - [ ] Partial conversion ✅
  - [ ] Edge case: exactly 3 diamonds ✅

- [ ] **Gifter Levels**
  - [ ] Level progression ✅
  - [ ] Badge display ✅
  - [ ] Level config update ✅

- [ ] **Publish/Unpublish**
  - [ ] Demand-based publishing ✅
  - [ ] Heartbeat timeout ✅

- [ ] **Concurrent Transactions**
  - [ ] Concurrent gifts ✅
  - [ ] Concurrent conversions ✅

- [ ] **Edge Cases**
  - [ ] Zero balances ✅
  - [ ] Large values (whale testing) ✅

## Performance Metrics

### Target Metrics

- [ ] Page load time: < 2 seconds
- [ ] Grid render time: < 500ms
- [ ] Chat message latency: < 100ms
- [ ] Heartbeat overhead: < 50ms per call
- [ ] Leaderboard load: < 1 second

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring (Vercel Analytics, etc.)
- [ ] Real-time subscription monitoring
- [ ] Database query monitoring

## Security Checklist

- [ ] RLS policies verified
- [ ] RPC functions use SECURITY DEFINER
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection (React auto-escapes)
- [ ] CSRF protection (if applicable)
- [ ] Rate limiting on critical endpoints
- [ ] Input validation on all user inputs

## Documentation

- [ ] README.md updated
- [ ] API documentation (if applicable)
- [ ] Deployment guide updated
- [ ] Troubleshooting guide created

## Final Sign-Off

- [ ] All critical items checked ✅
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Browser compatibility confirmed
- [ ] Testing plan passed
- [ ] Ready for production launch

---

**Launch Date:** ___________  
**Verified By:** ___________  
**Status:** ⏳ Pending / ✅ Ready








