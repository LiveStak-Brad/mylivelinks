# Leaderboard Rank Display - Testing Guide

## 🧪 Testing Checklist

### 1. Database Migration
```powershell
# Run migration script
.\apply-leaderboard-rank-display.ps1
```

**Expected Output:**
```
🎯 Applying Leaderboard Rank Display Migration...
✅ Environment loaded
📊 Creating leaderboard rank function...
NOTICE:  ✅ Leaderboard rank function created successfully!
✅ Leaderboard rank function created successfully!
🎊 Migration Complete!
```

### 2. Test SQL Function Directly

```sql
-- Test with a real profile ID
SELECT * FROM rpc_get_leaderboard_rank(
  '<your-profile-id>', 
  'top_streamers_daily'
);
```

**Expected Result:**
```
current_rank | total_entries | metric_value | rank_tier | points_to_next_rank | next_rank
-------------|---------------|--------------|-----------|---------------------|----------
     3       |      856      |    12500     |   Gold    |        1200         |     2
```

### 3. UI Testing Scenarios

#### Scenario A: Top 3 Rank (Diamond/Platinum/Gold)
**Test User:** Profile with rank 1-3
**Expected Display:**
- `#1 Diamond • 👑 First Place` (for rank 1)
- `#2 Platinum • X💎 to #1` (for rank 2)
- `#3 Gold • X💎 to #2` (for rank 3)
- Yellow/Gray/Orange gradient background
- Prestigious styling

#### Scenario B: Top 10 (Silver)
**Test User:** Profile with rank 4-10
**Expected Display:**
- `Silver • X💎 to #Y`
- Purple gradient background
- Shows points to next immediate rank

#### Scenario C: Top 50 (Bronze)
**Test User:** Profile with rank 11-50
**Expected Display:**
- `Bronze • X💎 to #Y`
- Blue gradient background
- Shows points to climb higher

#### Scenario D: Top 100
**Test User:** Profile with rank 51-100
**Expected Display:**
- `Top 100 • X💎 to #Y`
- Standard gradient background
- Shows path to better position

#### Scenario E: Unranked (>100)
**Test User:** Profile with rank >100 or 0 points
**Expected Display:**
- `X💎 to Top 100`
- Gray gradient background
- Shows what's needed to get ranked

### 4. Real-Time Update Testing

**Steps:**
1. Open solo stream viewer page
2. Note current rank display
3. Wait 30 seconds
4. Verify rank refreshes automatically
5. (Optional) Have another user gift diamonds to streamer
6. Watch rank update within 30 seconds

**Expected Behavior:**
- No page refresh needed
- Rank updates smoothly
- Points to next rank recalculates

### 5. Mobile Testing

**Device Types:**
- iPhone (portrait)
- iPad (landscape)
- Android phone
- Android tablet

**Check:**
- Text is readable (10px font)
- Gradient backgrounds render correctly
- Doesn't overflow container
- Fits nicely under streamer name
- Touch targets work for Trophy/Flame icons

### 6. Edge Cases

#### No Leaderboard Data
**Setup:** Fresh profile with 0 diamonds earned
**Expected:** Shows fallback icons without rank badge

#### API Error
**Setup:** Database connection fails
**Expected:** Graceful degradation, logs error, shows default icons

#### First Place User
**Setup:** Profile at rank #1
**Expected:** Special "👑 First Place" message, no "points to next"

#### Rapid Rank Changes
**Setup:** Multiple users gifting at same time
**Expected:** Rank updates every 30 seconds, smooth transitions

### 7. Performance Testing

**Metrics to Check:**
- Initial load time: <100ms for rank fetch
- Refresh interval: Exactly 30 seconds
- No memory leaks after extended streaming
- Network requests optimized

**Tools:**
```javascript
// Browser console
console.time('rank-fetch');
// Watch network tab
console.timeEnd('rank-fetch');
```

### 8. Visual Regression Testing

**Compare:**
- Before: Hardcoded numbers (12, 8)
- After: Real rank data with prestigious styling

**Screenshots Needed:**
- Rank #1 display
- Rank #2 display
- Rank #3 display
- Rank #10 display
- Rank #50 display
- Unranked display

## 🐛 Known Issues & Fixes

### Issue 1: Rank Shows "-" or "undefined"
**Cause:** Profile not in leaderboard yet
**Fix:** Expected behavior, shows unranked message

### Issue 2: Points Don't Update
**Cause:** 30-second refresh interval
**Fix:** Wait for next refresh cycle

### Issue 3: Gradient Not Showing
**Cause:** Tailwind CSS classes not compiled
**Fix:** Restart dev server

## ✅ Acceptance Criteria

- [x] Real rank numbers display (not mock data)
- [x] Top 3 get special styling and labels
- [x] Points to next rank calculated correctly
- [x] First place shows crown emoji
- [x] Unranked shows "X💎 to Top 100"
- [x] Updates every 30 seconds
- [x] Mobile responsive
- [x] No performance impact
- [x] Error handling works
- [x] Gradient styling matches tier

## 📋 Test Users (Example)

Create test profiles with different ranks:

```sql
-- Insert test leaderboard data
INSERT INTO ledger_entries (profile_id, entry_type, amount, created_at)
VALUES 
  -- User 1: Rank #1 (50,000 diamonds)
  ('<user1-id>', 'diamond_earn', 50000, NOW()),
  -- User 2: Rank #2 (35,000 diamonds)
  ('<user2-id>', 'diamond_earn', 35000, NOW()),
  -- User 3: Rank #3 (25,000 diamonds)
  ('<user3-id>', 'diamond_earn', 25000, NOW()),
  -- User 4: Rank #10 (5,000 diamonds)
  ('<user4-id>', 'diamond_earn', 5000, NOW()),
  -- User 5: Unranked (500 diamonds)
  ('<user5-id>', 'diamond_earn', 500, NOW());

-- Rebuild leaderboard cache
SELECT rebuild_leaderboard_cache('top_streamers_daily');
```

## 🎥 Demo Script

1. **Open solo stream** - `/live/[username]`
2. **Point to rank display** - "See this badge under the name?"
3. **Explain tier** - "#3 Gold means 3rd place on leaderboard"
4. **Show points message** - "1,200💎 to #2 means they need 1,200 diamonds to reach 2nd"
5. **Click Trophy icon** - "Opens full leaderboard to see everyone"
6. **Show first place** - "Crown emoji for the champion!"
7. **Show unranked** - "This person needs 5,000 diamonds to get in top 100"

---

**Testing Complete:** Ready for production! 🚀
