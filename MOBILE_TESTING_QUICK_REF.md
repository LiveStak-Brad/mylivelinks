# Mobile App Testing Quick Reference 🧪

## Quick Build Command
```bash
cd mobile
eas build --profile preview --platform all --clear-cache
```

---

## 🎯 Priority Testing Order

### 1. **AUTH FLOW** (MOST CRITICAL)
**Test:** Login with existing credentials  
**Expected:** Login succeeds and stays logged in (doesn't flash back to login)  
**Files Changed:** `mobile/screens/AuthScreen.tsx`

✅ **PASS:** App navigates to Home and stays logged in  
❌ **FAIL:** App flashes and returns to login screen

---

### 2. **MODALS PRESENTATION**
**Test A - Options Menu:**
1. Tap ⚙️ Options in top right
2. **Expected:** Menu drops DOWN from top (not slides UP from bottom)

**Test B - Leaderboards:**
1. Tap 🏆 Trophy icon in header
2. **Expected:** Leaderboards drop DOWN from top

✅ **PASS:** Both modals animate from top with fade effect  
❌ **FAIL:** Modals slide up from bottom

**Files Changed:** 
- `mobile/components/OptionsMenu.tsx`
- `mobile/components/LeaderboardModal.tsx`

---

### 3. **DUPLICATE NAV BARS**
**Test:** Navigate to Messages tab  
**Expected:** Only ONE bottom nav bar visible (5 tabs: Home/Feed/Rooms/Messages/Noties)  
❌ **FAIL:** Two nav bars stacked, or extra emoji menu bar above bottom nav

**Files Changed:** `mobile/screens/MessagesScreen.tsx`

---

### 4. **BRANDING VISUALS**

**Test A - Login Screen:**
- **Expected:** Splash image as background (faded), dark translucent card
- ❌ **FAIL:** Plain black background, opaque card

**Test B - First Load (Gate Screen):**
- **Expected:** Splash background, 🔗 logo, "MyLiveLinks" text, spinner
- ❌ **FAIL:** Plain dark screen with just spinner

**Test C - Top Header:**
- **Expected:** Logo visible in top left (🔗 MyLiveLinks)
- ❌ **FAIL:** No logo, or generic text

**Files Changed:** 
- `mobile/screens/AuthScreen.tsx`
- `mobile/screens/GateScreen.tsx`
- `mobile/components/ui/GlobalHeader.tsx` (already had logo)

---

### 5. **PROFILE FEATURES**

**Test A - Social Icons:**
1. Navigate to any profile with social links
2. **Expected:** Branded icons (Instagram/Twitter/YouTube colors and logos)
3. ❌ **FAIL:** Emojis (📸🐦📺)

**Test B - Search Avatars:**
1. Use search bar on Home
2. Type username
3. **Expected:** User avatar images display (circular photos)
4. ❌ **FAIL:** Only initials in circles

**Test C - Connections Tab:**
1. Go to any profile
2. Tap "Connections" section to expand
3. Tap "Followers" tab
4. **Expected:** List of follower profiles with avatars and usernames
5. ❌ **FAIL:** "No followers yet" when there should be data

**Test D - Badges:**
1. View profile with streaks/ranks
2. **Expected:** Top-right corner shows:
   - 🔥 X day streak
   - 🏆 #Y Gifter
   - ⭐ #Z Streamer
3. ❌ **FAIL:** No badges visible

**Test E - Stats Section:**
1. View profile stats card
2. **Expected:** Clear labels:
   - "💎 Diamonds Earned (Streaming)"
   - "🪙 Gifts Sent (Coins)"
   - "🎁 Gifts Received (Count)"
3. ❌ **FAIL:** Confusing/duplicate labels

**Files Changed:** 
- `mobile/screens/ProfileScreen.tsx`
- `mobile/screens/HomeDashboardScreen.tsx`

---

## 🐛 Known Issues to Watch

### Issue: Connections API May Not Exist
**Symptom:** Connections tab shows "No followers yet" even when user has followers  
**Cause:** API endpoint `/api/profile/[username]/connections` may not be implemented  
**Next Step:** Need to create backend endpoint if missing

### Issue: Social Links Don't Open
**Symptom:** Tapping social icons does nothing  
**Cause:** Placeholder `console.log()` - needs `Linking.openURL()` implementation  
**Next Step:** Add Linking module to open URLs

### Issue: Profile Banner Not Showing
**Finding:** Profile banners are not in the database schema (only room banners exist)  
**Status:** Not a bug - feature doesn't exist on web either

---

## ✅ Complete Checklist (Print This)

```
[ ] Login persists (doesn't return to auth)
[ ] Options menu drops from top
[ ] Leaderboards drop from top
[ ] Messages has only 1 bottom nav bar
[ ] Feed has only 1 bottom nav bar
[ ] Login screen has splash background
[ ] Login card is translucent
[ ] Gate screen shows logo and brand
[ ] Top header shows logo
[ ] Profile social icons are branded (not emojis)
[ ] Search results show user avatars
[ ] Connections tab loads actual users
[ ] Profile badges show (streak/rank)
[ ] Profile stats have clear labels
```

---

## 🚨 If Something Fails

### Auth Fails:
1. Check `.env` file has Supabase keys
2. Check Supabase dashboard → Auth logs
3. Verify SecureStore permissions

### Modals Still Wrong:
1. Clear cache: `eas build --clear-cache`
2. Check React Native version compatibility
3. Verify Modal component props

### Connections Don't Load:
1. Open network inspector
2. Check for 404 on connections API call
3. May need backend endpoint implementation

### Icons Don't Show:
1. Check `@expo/vector-icons` installed
2. Verify Ionicons font loading
3. May show as boxes if fonts not loaded

---

## 📱 Test Devices

**Recommended:**
- iPhone (iOS 15+)
- Android (API 30+)

**Test Environment:**
- EAS Preview Build (TestFlight for iOS, Direct APK for Android)

**Build Profile:** `preview` (defined in `mobile/eas.json`)

---

## 🎬 Recording Test Results

For each test, record:
1. ✅ or ❌
2. Device model (e.g., "iPhone 13, iOS 16.5")
3. Screenshot if failed
4. Console logs if error

Example:
```
❌ Auth test failed
Device: iPhone 13, iOS 16.5
Issue: Returns to login after 1 second
Console: [AUTH] getSession failed: undefined
```

---

## Summary

**Total Tests:** 14  
**Critical Tests:** 5 (Auth, Modals, Nav, Search, Connections)  
**Visual Tests:** 9 (Branding, Icons, Badges, Stats)

**Estimated Test Time:** 15-20 minutes

Good luck! 🚀


