# 🚀 QUICK START — Mobile Profile v2

## ✅ WHAT WAS FIXED

1. **Background Image** — Now full-screen (not banner-only)
2. **Card System** — All 9 sections are proper cards
3. **Light Mode** — Text now readable (theme tokens)
4. **Dark Mode** — Still works perfectly
5. **Visual Styling** — Shadows, borders, spacing match web

---

## 📱 HOW TO TEST

### Step 1: Open Mobile App
```bash
cd mobile
npm start
```

### Step 2: Navigate to Profile
1. Open app on device/simulator
2. Tap any profile (or your own)

### Step 3: Verify Visual Elements

#### ✅ Full-Screen Background
- [ ] Background image covers entire screen (not just top)
- [ ] Gradient overlay visible (dark at top, fading to transparent)
- [ ] If no background image, see branded gradient (blue → purple → pink)

#### ✅ All Sections Are Cards
Count the white/semi-transparent cards:
1. [ ] Hero (avatar, name, bio, buttons)
2. [ ] Social Counts (followers/following/friends)
3. [ ] Top Supporters (if user has supporters)
4. [ ] Top Streamers (if user has streamers)
5. [ ] Social Media (if user has social links)
6. [ ] Connections (collapsible with tabs)
7. [ ] Links (if user has links)
8. [ ] Profile Stats (streams, gifts, etc.)
9. [ ] Footer (MyLiveLinks branding)

**If any section is flat text on background → FAIL**

#### ✅ Light Mode Test
1. Open Options → Preferences
2. Toggle "Light Mode" ON
3. Check text:
   - [ ] Display name: **Dark text** (readable)
   - [ ] Username: **Gray text** (readable)
   - [ ] Bio: **Mid-dark text** (readable)
   - [ ] Cards: **White background** (solid)

**If any text is white → FAIL**

#### ✅ Dark Mode Test
1. Toggle "Light Mode" OFF
2. Check text:
   - [ ] Display name: **Light text** (readable)
   - [ ] Username: **Light-gray text** (readable)
   - [ ] Bio: **Mid-light text** (readable)
   - [ ] Cards: **Semi-transparent background**

---

## 🐛 TROUBLESHOOTING

### Problem: Background image not showing
**Cause:** User has no `profile_bg_url` set  
**Expected:** Should see branded gradient fallback (blue → purple → pink)  
**Fix:** None needed (working as designed)

### Problem: Cards look flat
**Cause:** Dark mode shadows less visible  
**Expected:** Cards should still have visible borders and slight depth  
**Fix:** None needed (shadows are subtle in dark mode by design)

### Problem: Text unreadable in light mode
**Cause:** Build cache issue  
**Fix:**
```bash
cd mobile
npm run nuclear-restart.bat  # Windows
# OR
rm -rf node_modules && npm install  # Mac/Linux
```

### Problem: Linter errors
**Status:** ✅ No linter errors exist  
**Verification:**
```typescript
// Already verified
No linter errors found.
```

---

## 📋 ACCEPTANCE CRITERIA

Use this checklist to verify completion:

### Visual
- [ ] Background covers full screen
- [ ] 9 distinct cards visible
- [ ] Avatar floats in hero card
- [ ] Badges visible (streak, ranks)
- [ ] Cards have shadows
- [ ] Cards have rounded corners (18px)

### Light Mode
- [ ] All text readable
- [ ] Cards are solid white
- [ ] High contrast maintained

### Dark Mode
- [ ] All text readable
- [ ] Cards are semi-transparent
- [ ] High contrast maintained

### Functional
- [ ] Follow button works
- [ ] Links open
- [ ] Connections tabs switch
- [ ] Scrolling smooth
- [ ] No crashes

---

## 🎯 SUCCESS = ALL CHECKED

If all boxes are checked → **Mobile Profile Parity v2 COMPLETE**

If any box unchecked → Review documentation:
- `MOBILE_PROFILE_PARITY_V2_COMPLETE.md` — Full delivery doc
- `PROFILE_V2_VISUAL_COMPARISON.md` — Visual diagrams
- `MOBILE_PROFILE_PARITY_V2_FILES_CHANGED.md` — Change details

---

## 📞 QUICK LINKS

- **Main File:** `mobile/screens/ProfileScreen.tsx`
- **Theme Context:** `mobile/contexts/ThemeContext.tsx`
- **Web Comparison:** `app/[username]/modern-page.tsx`

---

**Status: ✅ READY FOR TESTING**



