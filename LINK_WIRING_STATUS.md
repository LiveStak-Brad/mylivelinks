# Link Module - Wiring Status & Manual Test Plan

## ✅ COMPLETED WIRING

### Files Fully Wired to Real Supabase RPCs:
1. **lib/link/api.ts** - Already updated by user with real Supabase calls
2. **app/link/regular/swipe/page.tsx** - Calls real `getLinkCandidates()` and `submitLinkDecision()`
3. **app/link/profile/page.tsx** - Calls real `getMyLinkProfile()` and `upsertLinkProfile()`
4. **lib/link/types.ts** - Re-exports types from API, removed mock data dependency

### Files Deleted:
- **lib/link/mockData.ts** - ❌ Removed (no longer needed)

---

## 🔧 FILES NEEDING UPDATES

The following pages still reference old mock API signatures and need to be updated to use the real Supabase API from `lib/link/api.ts`:

### High Priority (Core Functionality):
1. **app/link/settings/page.tsx**
   - Change: `linkApi.getLinkSettings()` → `linkApi.getMyLinkSettings()`
   - Change: `linkApi.saveLinkSettings()` → `linkApi.upsertLinkSettings()`
   - Update state to use `auto_link_on_follow` instead of `autoLinkEnabled`

2. **app/link/mutuals/page.tsx**
   - Change: `linkApi.getMyMutuals()` → Already correct name
   - Update rendering to use `LinkMutual` type with `profile_id`, `display_name`, etc.

3. **app/link/dating/swipe/page.tsx**
   - Change: `linkApi.getDatingCandidates()` → Already correct
   - Change: `linkApi.submitDatingDecision()` → Already correct
   - Update rendering to use `DatingProfile` type

4. **app/link/dating/profile/page.tsx**
   - Change: `linkApi.getDatingProfile()` → `linkApi.getMyDatingProfile()`
   - Change: `linkApi.saveDatingProfile()` → `linkApi.upsertDatingProfile()`
   - Update state to use snake_case fields

5. **app/link/dating/matches/page.tsx**
   - Change: `linkApi.getDatingMatches()` → `linkApi.getMyDatingMatches()`
   - Update rendering to use `DatingMatch` type

### Low Priority (Landing Pages - No Data):
- **app/link/page.tsx** - Static landing, no API calls
- **app/link/regular/page.tsx** - Static landing, no API calls
- **app/link/dating/page.tsx** - Static landing, no API calls

---

## 📋 MANUAL TEST CHECKLIST

### Prerequisites:
1. Ensure Link SQL migration has been run: `supabase/migrations/20251231_link_system.sql`
2. User must be logged in (auth session required)
3. Start dev server: `npm run dev`

### Test 1: Create Link Profile
```
Route: /link/profile

Steps:
1. Toggle "Enable Link Discovery" ON
2. Add bio (< 240 chars)
3. Add location: "Los Angeles, CA"
4. Paste photo URL (e.g., https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800)
5. Select 3 interest tags (Music, Tech, Business)
6. Click "Save Profile"

Expected:
- Success alert appears
- Data persists on refresh
- Check DB: SELECT * FROM link_profiles WHERE profile_id = auth.uid();
```

### Test 2: Regular Swipe + Mutual
```
Route: /link/regular/swipe

Steps:
1. Should load candidates (if any exist with enabled=true)
2. Swipe right (Link) on a candidate
3. Decision should be recorded in DB: SELECT * FROM link_decisions WHERE from_profile_id = auth.uid();
4. If mutual occurs (both swiped link):
   - Modal appears: "You're Mutuals!"
   - Entry created in link_mutuals table
   - Check: SELECT * FROM link_mutuals WHERE profile_a = auth.uid() OR profile_b = auth.uid();

Expected:
- Cards advance on swipe
- Mutual modal shows when reciprocal
- No errors in console
```

### Test 3: View Mutuals List
```
Route: /link/mutuals

Steps:
1. Visit mutuals page
2. Should show list of mutual connections
3. Each mutual shows: avatar, name, bio, tags, "Mutual" badge
4. Source badge shows if from auto_link

Expected:
- Mutuals list populated from RPC
- Empty state if no mutuals
- No mock data displayed
```

### Test 4: Auto-Link Settings
```
Route: /link/settings

Steps:
1. Toggle "Auto-Link back on Follow" ON
2. Click "Save Settings"
3. Check DB: SELECT * FROM link_settings WHERE profile_id = auth.uid();

Expected:
- Setting saved: auto_link_on_follow = true
- Success alert appears
- Data persists on refresh

Note: Follow integration is Phase 2 - just test UI/save
```

### Test 5: Dating Profile
```
Route: /link/dating/profile

Steps:
1. Toggle "Enable Dating Profile" ON
2. Add dating bio
3. Set age: 28
4. Add photos
5. Set preferences: Looking For = "all", Age Range = 21-35
6. Click "Save Dating Profile"

Expected:
- Success alert appears
- Check DB: SELECT * FROM dating_profiles WHERE profile_id = auth.uid();
```

### Test 6: Dating Swipe + Match
```
Route: /link/dating/swipe

Steps:
1. Should load dating candidates (if any exist with enabled=true)
2. Swipe right (Like) on a candidate
3. If match occurs (both swiped like):
   - Modal appears: "It's a Match!"
   - Entry created in dating_matches table
   - Check: SELECT * FROM dating_matches WHERE profile_a = auth.uid() OR profile_b = auth.uid();

Expected:
- Dating candidates load
- Match modal shows when reciprocal
- Separate from regular Link mutuals
```

### Test 7: Dating Matches List
```
Route: /link/dating/matches

Steps:
1. Visit dating matches page
2. Should show list of dating matches (separate from link mutuals)

Expected:
- Matches list populated from RPC
- Shows age, dating bio
- Empty state if no matches
```

---

## 🐛 KNOWN ISSUES TO FIX

### 1. Snake_case vs camelCase Mismatch
**Issue**: DB returns `profile_id`, `display_name`, `avatar_url` but some UI code expects `id`, `displayName`, `avatarUrl`

**Fix**: Update all pages to use snake_case consistently (already done in api.ts types)

### 2. Empty Candidate Lists
**Issue**: If no other users have enabled=true profiles, swipe pages show empty

**Solution**: 
- Create test accounts with enabled profiles
- OR add "no profiles available" messaging (not error state)

### 3. Photo Upload
**Issue**: Currently uses URL input (placeholder)

**Phase 2**: Implement Supabase Storage upload

---

## 📝 REMAINING WORK

### Immediate (Required for Testing):
- [ ] Update settings page to use correct API calls
- [ ] Update mutuals page to use correct data structure
- [ ] Update dating swipe page to use correct API calls
- [ ] Update dating profile page to use correct API calls
- [ ] Update dating matches page to use correct API calls

### Phase 2 (After Testing):
- [ ] Wire follow events to Auto-Link F4F
- [ ] Implement photo upload to Supabase Storage
- [ ] Add real-time subscriptions for new mutuals/matches
- [ ] Implement messaging system

### Phase 3 (Polish):
- [ ] Add pagination for candidate lists
- [ ] Add filtering/sorting options
- [ ] Optimize RPC performance
- [ ] Add analytics/tracking

---

## ✅ CONFIRMED: No Global Changes

**Modified Existing Files:**
- ❌ NONE - No existing pages/components/styles were modified

**New Files Only:**
- ✅ All new files are under `/link` routes
- ✅ No global CSS/layout changes
- ✅ Isolated to Link module only

---

## 🔗 API Call Reference

```typescript
// Regular Link
import * as linkApi from '@/lib/link/api';

await linkApi.getMyLinkProfile()
await linkApi.upsertLinkProfile({ enabled, bio, location_text, photos, tags })
await linkApi.getLinkCandidates(limit, offset)
await linkApi.submitLinkDecision(toProfileId, 'link' | 'nah')
await linkApi.getMyMutuals(limit, offset)

// Settings
await linkApi.getMyLinkSettings()
await linkApi.upsertLinkSettings({ auto_link_on_follow, auto_link_require_approval, auto_link_policy })

// Dating
await linkApi.getMyDatingProfile()
await linkApi.upsertDatingProfile({ enabled, bio, location_text, photos, prefs })
await linkApi.getDatingCandidates(limit, offset)
await linkApi.submitDatingDecision(toProfileId, 'like' | 'nah')
await linkApi.getMyDatingMatches(limit, offset)
```

---

**STATUS**: 2/7 critical pages wired. Need to update remaining 5 pages with correct API calls and snake_case data structures.
