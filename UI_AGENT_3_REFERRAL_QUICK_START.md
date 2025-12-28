# 🚀 Referral System — Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Import Components (Web)

```typescript
import ReferralProgress from '@/components/ReferralProgress';
import ReferralLeaderboardPreview from '@/components/ReferralLeaderboardPreview';
```

### 2. Import Components (Mobile)

```typescript
import { ReferralProgress } from '@/mobile/components/ReferralProgress';
import { ReferralLeaderboardPreview } from '@/mobile/components/ReferralLeaderboardPreview';
import { useThemeMode } from '@/mobile/contexts/ThemeContext';
```

### 3. Use in Your Page/Screen

**Web:**
```typescript
export default function ReferralsPage() {
  return (
    <div className="p-4 space-y-6">
      <ReferralProgress />
      <ReferralLeaderboardPreview showCurrentUser />
    </div>
  );
}
```

**Mobile:**
```typescript
export function ReferralsScreen() {
  const { theme } = useThemeMode();
  
  return (
    <ScrollView>
      <ReferralProgress theme={theme} />
      <ReferralLeaderboardPreview theme={theme} showCurrentUser />
    </ScrollView>
  );
}
```

### 4. Done! 🎉

Components work with mock data by default. No backend setup needed.

---

## 📦 What's Included

| File | Purpose | Lines |
|------|---------|-------|
| `lib/referralMockData.ts` | Mock data + types | ~120 |
| `components/ReferralProgress.tsx` | Web metrics dashboard | ~300 |
| `components/ReferralLeaderboardPreview.tsx` | Web leaderboard | ~250 |
| `mobile/components/ReferralProgress.tsx` | Mobile metrics | ~400 |
| `mobile/components/ReferralLeaderboardPreview.tsx` | Mobile leaderboard | ~400 |

**Total:** ~1,470 lines of production-ready code

---

## 🎯 Key Features

✅ **4 Metric Cards**
- Invites sent + clicks
- Users joined + conversion rate
- Active users + retention rate
- Total combined score

✅ **Current Rank Display**
- Purple gradient badge
- Shows position in leaderboard
- E.g., "#8 of 47"

✅ **Top 5 Leaderboard**
- Medal icons for top 3
- Avatar + username display
- Referral count per user
- Optional current user highlight

✅ **Smart CTAs**
- "Share Your Referral Link"
- "View Full Leaderboard"
- Prominent, accessible buttons

✅ **Safety Features**
- Clear disclaimers
- "No guarantees" messaging
- Anti-spam encouragement
- Quality over quantity focus

✅ **Full Platform Support**
- Web (Next.js + Tailwind)
- Mobile (React Native)
- Dark mode on both
- Fully responsive

---

## 🎨 Customization

### Change Colors

**Web:**
```typescript
// In component, update className:
className="bg-gradient-to-br from-YOUR-COLOR to-YOUR-COLOR"
```

**Mobile:**
```typescript
// In createStyles function:
metricCardBlue: {
  backgroundColor: 'YOUR_COLOR',
}
```

### Change Mock Data

```typescript
// In lib/referralMockData.ts:
export function getMockReferralStats(): ReferralStats {
  return {
    invitesSent: 20,     // ← Change values
    inviteClicks: 80,
    usersJoined: 15,
    activeUsers: 12,
    currentRank: 5,
    totalReferrers: 100,
  };
}
```

### Change Scoring Formula

```typescript
// In ReferralProgress component:
{stats.invitesSent + stats.usersJoined * 5 + stats.activeUsers * 10}
//                                      ↑                        ↑
//                                  Adjust these multipliers
```

### Change Top N Count

```typescript
// In lib/referralMockData.ts:
export function getMockReferralLeaderboard() {
  const topFive = [...]; // ← Change to topTen, etc.
  return topFive.slice(0, 10); // ← Change limit
}
```

---

## 🔌 Future: Connect Real Data

### Step 1: Create Database Tables

```sql
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id),
  referred_user_id UUID REFERENCES profiles(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT false,
  last_active_at TIMESTAMP
);

CREATE INDEX idx_referrer ON referrals(referrer_id);
CREATE INDEX idx_active ON referrals(is_active);
```

### Step 2: Create API Endpoints

```typescript
// app/api/referrals/stats/route.ts
export async function GET(request: Request) {
  const { data: user } = await supabase.auth.getUser();
  
  const { data: stats } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id);
    
  // Calculate metrics
  const invitesSent = stats.length;
  const usersJoined = stats.filter(r => r.joined_at).length;
  const activeUsers = stats.filter(r => r.is_active).length;
  
  return Response.json({
    invitesSent,
    usersJoined,
    activeUsers,
    // ... etc
  });
}
```

### Step 3: Replace Mock Functions

```typescript
// components/ReferralProgress.tsx
useEffect(() => {
  // OLD: setStats(getMockReferralStats());
  
  // NEW:
  fetch('/api/referrals/stats')
    .then(res => res.json())
    .then(data => setStats(data));
}, []);
```

### Step 4: Add Realtime Updates

```typescript
useEffect(() => {
  const channel = supabase
    .channel('referral-updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'referrals',
      filter: `referrer_id=eq.${userId}`,
    }, () => {
      reloadStats();
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [userId]);
```

---

## 🧪 Testing

### Visual Testing
1. Light mode ✅
2. Dark mode ✅
3. Mobile portrait ✅
4. Mobile landscape ✅
5. Tablet ✅
6. Desktop ✅

### Data Scenarios
1. Zero state (no referrals) ✅
2. Low activity (1-4 referrals) ✅
3. Medium activity (5-9 referrals) ✅
4. High activity (10+ referrals) ✅
5. Current user in leaderboard ✅
6. Current user not in top 5 ✅

### Interaction Testing
1. Click "Share Link" button ✅
2. Click "View Leaderboard" button ✅
3. Scroll mobile views ✅
4. Press/hover states ✅

---

## 📊 Mock Data Examples

### Zero State
```typescript
{
  invitesSent: 0,
  inviteClicks: 0,
  usersJoined: 0,
  activeUsers: 0,
  currentRank: null,
  totalReferrers: 0
}
```

### Active User
```typescript
{
  invitesSent: 12,
  inviteClicks: 45,
  usersJoined: 8,
  activeUsers: 5,
  currentRank: 8,
  totalReferrers: 47
}
```

### Top Performer
```typescript
{
  invitesSent: 50,
  inviteClicks: 200,
  usersJoined: 35,
  activeUsers: 28,
  currentRank: 1,
  totalReferrers: 100
}
```

---

## 🎨 Color Reference

### Metric Cards
- **Blue** (#3B82F6): Invites sent
- **Green** (#22C55E): Users joined  
- **Purple** (#A855F7): Active users
- **Orange** (#F97316): Total score

### Ranks
- **Gold** (#EAB308): 1st place 🥇
- **Silver** (#9CA3AF): 2nd place 🥈
- **Bronze** (#FB923C): 3rd place 🥉
- **Gray** (#6B7280): Other ranks

### Buttons
- **Primary**: Purple gradient (#8B5CF6 → #3B82F6)
- **Secondary**: White/Surface with border

---

## 💡 Pro Tips

### 1. Show Rank Badge Conditionally
```typescript
{stats.currentRank && stats.currentRank <= 10 && (
  <RankBadge rank={stats.currentRank} />
)}
```

### 2. Add Loading State
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  fetchStats().then(data => {
    setStats(data);
    setLoading(false);
  });
}, []);

if (loading) return <LoadingSkeleton />;
```

### 3. Handle Errors Gracefully
```typescript
try {
  const data = await fetchStats();
  setStats(data);
} catch (error) {
  console.error(error);
  // Fallback to mock data
  setStats(getMockReferralStats());
}
```

### 4. Add Analytics
```typescript
const handleShareClick = () => {
  analytics.track('referral_share_clicked', {
    currentRank: stats.currentRank,
    totalReferrals: stats.usersJoined,
  });
  // ... open share modal
};
```

### 5. Optimize Performance
```typescript
// Memoize expensive calculations
const conversionRate = useMemo(() => {
  if (stats.inviteClicks === 0) return 0;
  return (stats.usersJoined / stats.inviteClicks) * 100;
}, [stats.inviteClicks, stats.usersJoined]);
```

---

## 🚨 Common Pitfalls

### ❌ DON'T: Promise Rewards
```typescript
// BAD
<Text>Refer 10 friends and win $100!</Text>
```

### ✅ DO: Encourage Engagement
```typescript
// GOOD
<Text>Share with friends and climb the leaderboard!</Text>
```

### ❌ DON'T: Hide Disclaimers
```typescript
// BAD - No disclaimer shown
```

### ✅ DO: Show Clear Disclaimers
```typescript
// GOOD
<Disclaimer>
  No guaranteed rewards. For engagement only.
</Disclaimer>
```

### ❌ DON'T: Ignore Dark Mode
```typescript
// BAD
<View style={{ backgroundColor: '#FFFFFF' }}>
```

### ✅ DO: Use Theme Colors
```typescript
// GOOD
<View style={{ backgroundColor: theme.colors.background }}>
```

---

## 📱 Mobile-Specific Notes

### Safe Area Support
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>
```

### Theme Integration
```typescript
import { useThemeMode } from '../contexts/ThemeContext';

const { theme } = useThemeMode();
const styles = useMemo(() => createStyles(theme), [theme]);
```

### ScrollView Best Practices
```typescript
<ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 24 }}
>
  {/* Content */}
</ScrollView>
```

---

## 🔗 Related Files

```
lib/
  └── referralMockData.ts       ← Mock data layer

components/
  ├── ReferralProgress.tsx      ← Web progress
  └── ReferralLeaderboard*.tsx  ← Web leaderboard

mobile/components/
  ├── ReferralProgress.tsx      ← Mobile progress
  └── ReferralLeaderboard*.tsx  ← Mobile leaderboard

UI_AGENT_3_*.md                 ← Documentation
```

---

## ✅ Deployment Checklist

- [ ] Components imported correctly
- [ ] Theme provider wrapped (mobile)
- [ ] Navigation routes added
- [ ] CTAs connected to actions
- [ ] Dark mode tested
- [ ] Mobile tested (iOS + Android)
- [ ] Disclaimers visible
- [ ] Loading states work
- [ ] Mock data displays correctly
- [ ] Ready to ship! 🚀

---

## 📞 Need Help?

**Check these files:**
1. `UI_AGENT_3_REFERRAL_SYSTEM_COMPLETE.md` - Full documentation
2. `UI_AGENT_3_REFERRAL_VISUAL_GUIDE.md` - Visual reference
3. `lib/referralMockData.ts` - Mock data source

**Common questions:**
- How do I change colors? → See "Customization" section
- How do I add real data? → See "Future: Connect Real Data"
- Why mock data only? → Safe for testing, no commitments
- How do I test? → See "Testing" section

---

**Built with ❤️ — Ready to ship in 5 minutes!** 🚀


