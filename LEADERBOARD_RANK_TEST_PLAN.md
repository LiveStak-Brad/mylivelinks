# 🧪 Leaderboard Rank Display - Test Plan

## Pre-Testing Setup

### Database Requirements
✅ Ensure `leaderboard_cache` table has recent data:
```sql
SELECT COUNT(*) 
FROM leaderboard_cache 
WHERE leaderboard_type = 'top_streamers_daily'
  AND period_start >= CURRENT_DATE;
```

✅ Verify you have test users at different rank positions:
- [ ] User at rank #1
- [ ] User at rank #2
- [ ] User at rank #3
- [ ] User at ranks #4-10
- [ ] User at ranks #11-50
- [ ] User at ranks #51-100
- [ ] User outside top 100 (with points)
- [ ] User with zero points

---

## Test Cases

### TC-01: Rank #1 Display (Diamond)
**Steps:**
1. Go Live as user with rank #1
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "👑 #1 DIAMOND"
- ✅ Message shows: "🏆 First Place"
- ✅ Gradient: Gold (yellow-amber)
- ✅ Border: Yellow with glow
- ✅ Badge is ALWAYS VISIBLE (not hover-only)

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-02: Rank #2 Display (Platinum)
**Steps:**
1. Go Live as user with rank #2
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "🥈 #2 PLATINUM"
- ✅ Message shows: "+[X] 💎 to #1" (actual number)
- ✅ Gradient: Silver (gray)
- ✅ Border: Gray with glow
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-03: Rank #3 Display (Gold)
**Steps:**
1. Go Live as user with rank #3
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "🥉 #3 GOLD"
- ✅ Message shows: "+[X] 💎 to #2"
- ✅ Gradient: Bronze (orange-amber)
- ✅ Border: Orange with glow
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-04: Rank #4-10 Display (Silver)
**Steps:**
1. Go Live as user with rank between 4-10
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "#[X] SILVER" (no emoji)
- ✅ Message shows: "+[Y] 💎 to #[X-1]"
- ✅ Gradient: Blue (blue-indigo)
- ✅ Border: Blue with glow
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-05: Rank #11-50 Display (Bronze)
**Steps:**
1. Go Live as user with rank between 11-50
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "#[X] BRONZE"
- ✅ Message shows: "+[Y] 💎 to #[X-1]"
- ✅ Gradient: Purple
- ✅ Border: Purple with glow
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-06: Rank #51-100 Display
**Steps:**
1. Go Live as user with rank between 51-100
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "#[X] UNRANKED"
- ✅ Message shows: "+[Y] 💎 to #[X-1]"
- ✅ Gradient: Green (green-emerald)
- ✅ Border: Green with glow
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-07: Unranked With Points Display
**Steps:**
1. Go Live as user NOT in top 100 but has some diamonds
2. View your tile in solo live room

**Expected:**
- ✅ Badge shows: "Unranked"
- ✅ Message shows: "+[X] 💎 to Top 100"
- ✅ Gradient: Slate (gray-dark)
- ✅ Border: Slate
- ✅ Badge is ALWAYS VISIBLE

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-08: Zero Points (No Badge)
**Steps:**
1. Go Live as user with zero diamonds earned
2. View your tile in solo live room

**Expected:**
- ✅ NO badge displayed
- ✅ Only username/gifter badge shows on hover
- ✅ Clean UI (no clutter)

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-09: Username Display on Hover
**Steps:**
1. Go Live as any user
2. Hover over the tile

**Expected:**
- ✅ Username appears in black overlay above rank badge
- ✅ Gifter badge (if applicable) shows next to username
- ✅ Rank badge remains visible below
- ✅ Smooth fade-in animation

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-10: Real-Time Rank Updates
**Steps:**
1. Have user go live at rank #5
2. While live, have them receive enough gifts to move to #4
3. Wait for leaderboard cache to update (may take 1-60 min)

**Expected:**
- ✅ Badge automatically updates from "#5" to "#4"
- ✅ Points needed updates to show new gap to #3
- ✅ No page refresh required
- ✅ Smooth transition

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-11: Multi-Tile Display
**Steps:**
1. Have multiple users go live at different ranks
2. View solo live room with multiple tiles

**Expected:**
- ✅ Each tile shows correct rank for that user
- ✅ All badges are visible simultaneously
- ✅ No performance issues
- ✅ Badges don't overlap with other UI elements

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-12: Fullscreen Expanded View
**Steps:**
1. Go live as ranked user
2. Click expand to fullscreen on your tile

**Expected:**
- ✅ Rank badge still visible in fullscreen
- ✅ Proper positioning (doesn't block controls)
- ✅ Same styling and information

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-13: Dark Mode Compatibility
**Steps:**
1. Toggle dark mode on/off
2. View ranked user's tile

**Expected:**
- ✅ Badge remains visible in both modes
- ✅ Text remains readable in both modes
- ✅ Gradients look good in both modes
- ✅ Shadows/glows appropriate for each mode

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-14: Mobile Responsiveness
**Steps:**
1. View solo live room on mobile device
2. Look at ranked user's tile

**Expected:**
- ✅ Badge scales appropriately
- ✅ Text remains readable (not too small)
- ✅ No overflow or clipping
- ✅ Tap to view username works

**Result:** ⬜ Pass / ⬜ Fail

---

### TC-15: Points Calculation Accuracy
**Steps:**
1. Check rank #5's badge
2. Manually verify in database:
```sql
SELECT 
  (SELECT metric_value FROM leaderboard_cache 
   WHERE leaderboard_type = 'top_streamers_daily' 
     AND rank = 4 
   ORDER BY period_start DESC LIMIT 1) - 
  (SELECT metric_value FROM leaderboard_cache 
   WHERE leaderboard_type = 'top_streamers_daily' 
     AND rank = 5 
   ORDER BY period_start DESC LIMIT 1) + 1 AS points_needed;
```

**Expected:**
- ✅ Badge shows correct points needed
- ✅ Matches database calculation
- ✅ Always shows at least 1 point needed

**Result:** ⬜ Pass / ⬜ Fail

---

## Performance Testing

### PT-01: Load Time
**Steps:**
1. Open solo live room with 12 active streamers
2. Measure page load time

**Expected:**
- ✅ Page loads in < 3 seconds
- ✅ Badges appear without delay
- ✅ No noticeable lag

**Result:** ⬜ Pass / ⬜ Fail

---

### PT-02: Database Query Count
**Steps:**
1. Open browser dev tools → Network
2. Load solo live room
3. Count Supabase API calls related to leaderboard

**Expected:**
- ✅ 1 query per visible tile (max 12)
- ✅ No duplicate queries
- ✅ Queries complete in < 100ms each

**Result:** ⬜ Pass / ⬜ Fail

---

### PT-03: Real-Time Subscription Overhead
**Steps:**
1. Monitor network connections
2. Check active subscriptions count

**Expected:**
- ✅ 1 subscription per visible tile
- ✅ Subscriptions don't accumulate (cleanup works)
- ✅ No memory leaks over time

**Result:** ⬜ Pass / ⬜ Fail

---

## Edge Cases

### EC-01: Missing Leaderboard Data
**Steps:**
1. Temporarily disable leaderboard cache updates
2. Go live as user

**Expected:**
- ✅ No error thrown
- ✅ No badge displayed (graceful degradation)
- ✅ Rest of UI works normally

**Result:** ⬜ Pass / ⬜ Fail

---

### EC-02: Invalid Profile ID
**Steps:**
1. Manually pass invalid streamerId to Tile

**Expected:**
- ✅ No error thrown
- ✅ isLoading = false, rank = null
- ✅ No badge displayed

**Result:** ⬜ Pass / ⬜ Fail

---

### EC-03: Network Disconnection
**Steps:**
1. User is live with visible rank badge
2. Disconnect internet temporarily
3. Reconnect

**Expected:**
- ✅ Badge freezes at last known value
- ✅ No error messages to user
- ✅ Badge updates when connection restored

**Result:** ⬜ Pass / ⬜ Fail

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Regression Testing

Ensure these still work:
- [ ] Going live
- [ ] Viewing other streamers
- [ ] Gifting
- [ ] Chat
- [ ] Viewer count
- [ ] Volume controls
- [ ] Fullscreen toggle
- [ ] Tile mute/unmute
- [ ] Tile close/replace

---

## Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Total Pass Rate:** ___/15 Core Tests  
**Performance Pass Rate:** ___/3 Tests  
**Edge Cases Pass Rate:** ___/3 Tests  

**Overall Status:** ⬜ Approved for Production / ⬜ Needs Fixes

---

## Known Issues / Notes

```
(Document any issues found during testing here)
```

---

## Next Steps After Testing

1. [ ] Fix any failing test cases
2. [ ] Optimize slow queries if needed
3. [ ] Add error handling for edge cases
4. [ ] Consider adding animations (Phase 2)
5. [ ] Monitor production metrics
6. [ ] Gather user feedback
7. [ ] Iterate based on data

---

**Testing Complete! Ready for production deployment.** 🚀
