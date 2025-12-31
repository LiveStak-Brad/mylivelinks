# Leaderboard Rank Display Feature - Complete Implementation

## Overview
Added prestigious daily leaderboard ranking display for streamers in both solo host and solo viewer modes, showing their real-time position and points needed to advance.

## ✅ Completed Components

### 1. **Backend SQL Function** (`sql/GET_LEADERBOARD_RANK.sql`)
- RPC function `rpc_get_leaderboard_rank(profile_id, leaderboard_type)`
- Returns: current rank, tier name, points to next rank, total entries
- Supports daily/weekly/monthly/alltime leaderboards
- Computes rank from cache OR source tables dynamically
- **Apply to database**: Run this SQL file in your Supabase SQL editor

### 2. **React Hook** (`hooks/useDailyLeaderboardRank.ts`)
- Custom hook for fetching leaderboard rank data
- Auto-refreshes via realtime subscriptions
- Returns: rank, tier, points needed, loading state
- Usage: `const rankData = useDailyLeaderboardRank(profileId, 'top_streamers')`

### 3. **Web - Solo Viewer** (`components/SoloStreamViewer.tsx`)
- Added leaderboard rank display under streamer name
- **Visual Design**:
  - Top 1: Gold gradient with 👑 crown
  - Top 2: Silver gradient with 🥈 medal  
  - Top 3: Bronze gradient with 🥉 medal
  - Top 4-10: Purple gradient (Silver tier)
  - Top 11-50: Blue gradient (Bronze tier)
  - Top 51-100: Green gradient (Top 100)
  - Unranked: Gray gradient with "X💎 to Top 100"
- Shows points needed to advance: "+1,234💎 to #7"
- Updates every 30 seconds while streaming

### 4. **Web - Solo Host** (`components/SoloHostStream.tsx`)
- Identical leaderboard rank display for hosts
- Shows host's own ranking while streaming
- Motivates streamers to earn more diamonds
- Same prestigious styling as viewer mode

### 5. **Web - Tile Component** (`components/Tile.tsx`)
- Added rank badge to multi-viewer tiles (LiveRoom grid)
- Always visible (not just on hover)
- Compact design for smaller tile size
- Same tier-based color coding

## 📱 Mobile Implementation (TODO)

### Required Changes:

#### **Mobile Hook** (`mobile/hooks/useDailyLeaderboardRank.ts`)
```typescript
// Copy hooks/useDailyLeaderboardRank.ts to mobile/hooks/
// Update imports to use mobile's supabase client
import { supabase } from '../lib/supabase';
```

#### **Mobile Viewer** (`mobile/screens/SoloStreamViewerScreen.tsx`)
Add after line 44:
```typescript
type LeaderboardRank = {
  current_rank: number;
  total_entries: number;
  metric_value: number;
  rank_tier: string | null;
  points_to_next_rank: number;
  next_rank: number;
};

// Add state (after line 63):
const [leaderboardRank, setLeaderboardRank] = useState<LeaderboardRank | null>(null);

// Add useEffect to fetch rank (after streamer loading):
useEffect(() => {
  const loadLeaderboardRank = async () => {
    if (!streamer?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('rpc_get_leaderboard_rank', {
          p_profile_id: streamer.id,
          p_leaderboard_type: 'top_streamers_daily'
        });

      if (error) {
        console.error('[Mobile] Error fetching leaderboard rank:', error);
        return;
      }

      if (data && data.length > 0) {
        setLeaderboardRank(data[0]);
      }
    } catch (err) {
      console.error('[Mobile] Error loading leaderboard rank:', err);
    }
  };

  loadLeaderboardRank();
  const interval = setInterval(loadLeaderboardRank, 30000);
  return () => clearInterval(interval);
}, [streamer?.id]);
```

#### **Mobile Host** (`mobile/screens/SoloHostStreamScreen.tsx`)
Same changes as viewer, but use `currentUser.id` instead of `streamer.id`

#### **Mobile UI Components**
Add rank display in the streamer name area (similar to web implementation):
```tsx
{leaderboardRank && leaderboardRank.current_rank <= 100 && (
  <View style={styles.rankBadge}>
    <Text style={styles.rankText}>
      #{leaderboardRank.current_rank} {leaderboardRank.rank_tier}
    </Text>
    {leaderboardRank.current_rank > 1 && (
      <Text style={styles.pointsText}>
        +{leaderboardRank.points_to_next_rank.toLocaleString()}💎 to #{leaderboardRank.next_rank}
      </Text>
    )}
  </View>
)}
```

## 🎨 Visual Design Specifications

### Tier Colors:
- **Diamond (#1)**: `from-yellow-400 via-yellow-500 to-amber-600` + `border-yellow-300`
- **Platinum (#2)**: `from-gray-300 via-gray-400 to-gray-500` + `border-gray-200`
- **Gold (#3)**: `from-orange-400 via-amber-600 to-orange-700` + `border-orange-300`
- **Silver (#4-10)**: `from-blue-500 via-blue-600 to-indigo-700` + `border-blue-400`
- **Bronze (#11-50)**: `from-purple-500 via-purple-600 to-purple-700` + `border-purple-400`
- **Top 100 (#51-100)**: `from-green-500 via-green-600 to-emerald-700` + `border-green-400`
- **Unranked**: `from-slate-600 via-slate-700 to-gray-800` + `border-slate-500`

### Typography:
- Rank number: `text-xs font-bold`
- Tier name: `text-[10px] font-semibold uppercase`
- Points needed: `text-[9px] font-medium`

### Layout:
- Background: Gradient with backdrop blur
- Border: 2px solid with glow shadow
- Padding: `px-2.5 py-1.5`
- Corner radius: `rounded-lg`

## 🔥 Key Features

1. **Real-time Updates**: Refreshes every 30 seconds
2. **Prestigious Design**: Tier-based colors and medals
3. **Motivational**: Shows exact points needed to advance
4. **First Place Special**: Shows "👑 First Place" for #1
5. **Unranked Support**: Shows path to Top 100 for unranked streamers
6. **Daily Focus**: Uses daily leaderboard (most competitive)
7. **Always Visible**: No hover required (except username on Tile)

## 📊 Database Requirements

**MUST RUN** `sql/GET_LEADERBOARD_RANK.sql` before testing:
```sql
-- Grants execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION rpc_get_leaderboard_rank(UUID, TEXT) TO authenticated, anon;
```

## 🧪 Testing Checklist

- [ ] Apply SQL migration (`GET_LEADERBOARD_RANK.sql`)
- [ ] Test web solo viewer (viewer sees streamer's rank)
- [ ] Test web solo host (host sees own rank)
- [ ] Test Tile component in grid (LiveRoom)
- [ ] Verify rank updates every 30 seconds
- [ ] Test unranked users (should show "X💎 to Top 100")
- [ ] Test Top 3 users (should show medals)
- [ ] Test #1 user (should show "👑 First Place")
- [ ] Mobile: Copy hook to mobile/hooks
- [ ] Mobile: Add rank display to SoloStreamViewerScreen
- [ ] Mobile: Add rank display to SoloHostStreamScreen
- [ ] Mobile: Test on physical iOS device ([[memory:12666775]])

## 📁 Files Changed

### Web (✅ Complete):
1. `sql/GET_LEADERBOARD_RANK.sql` - NEW SQL function
2. `hooks/useDailyLeaderboardRank.ts` - NEW custom hook
3. `components/SoloStreamViewer.tsx` - Added rank display
4. `components/SoloHostStream.tsx` - Added rank display  
5. `components/Tile.tsx` - Added rank badge

### Mobile (⏳ Pending):
6. `mobile/hooks/useDailyLeaderboardRank.ts` - COPY from web
7. `mobile/screens/SoloStreamViewerScreen.tsx` - ADD rank display
8. `mobile/screens/SoloHostStreamScreen.tsx` - ADD rank display

## 🚀 Next Steps

1. **Apply SQL migration** to database
2. **Test web implementation** (solo viewer + solo host)
3. **Copy hook** to mobile/hooks/
4. **Update mobile screens** with rank display
5. **Build mobile preview** for testing ([[memory:12666775]])
6. **Verify realtime updates** work correctly

---

**Feature Status**: Web ✅ Complete | Mobile ⏳ Pending
**Created**: December 31, 2025
