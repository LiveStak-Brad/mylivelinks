# 📸 SCREENSHOT CHECKLIST

To verify the implementation, please take screenshots of the following screens in **light mode**:

## Required Screenshots

### 1. 🏠 Home Screen
**Show:**
- ✅ Global top bar: [☰] [Logo] [Avatar]
- ✅ Page header: 🏠 Home
- ✅ Hero card below

**Verify:**
- [ ] No duplicate "Home" title
- [ ] Clean visual hierarchy
- [ ] Avatar or initials visible in top bar

---

### 2. 📰 Feed Screen
**Show:**
- ✅ Global top bar: [☰] [Logo] [Avatar]
- ✅ Page header: 📰 Feed
- ✅ Composer card

**Verify:**
- [ ] No duplicate "Feed" title
- [ ] Emblem matches bottom nav
- [ ] Clean layout

---

### 3. 🎥 Rooms Screen
**Show:**
- ✅ Global top bar: [☰] [Logo] [Avatar]
- ✅ Page header: 🎥 Rooms
- ✅ Placeholder card (WITHOUT "🎥 Rooms" title inside)

**Verify:**
- [ ] No duplicate "Rooms" text in card
- [ ] Only one "Rooms" title total
- [ ] Clean structure

---

### 4. 💬 Messys Screen
**Show:**
- ✅ Global top bar: [☰] [Logo] [Avatar]
- ✅ Page header: 💬 Messys
- ✅ Search bar
- ✅ Conversation list (or empty state)

**Verify:**
- [ ] Says "Messys" NOT "Messages"
- [ ] No duplicate headers
- [ ] No subtitle text
- [ ] No emoji toolbar

---

### 5. 🔔 Noties Screen
**Show:**
- ✅ Global top bar: [☰] [Logo] [Avatar]
- ✅ Page header: 🔔 Noties with "Mark all read" button
- ✅ Notifications list

**Verify:**
- [ ] Says "Noties" NOT "Notifications"
- [ ] No duplicate bell icon section
- [ ] No "Stay updated with your activity" subtitle
- [ ] "Mark all read" is in page header, not below
- [ ] Only ONE title total

---

### 6. Bottom Navigation
**Show:**
- ✅ All 5 tabs visible
- ✅ Clear labels

**Verify:**
- [ ] Home (🏠)
- [ ] Feed (📰)
- [ ] Rooms (🎥)
- [ ] Messys (💬) ← NOT "Messages"
- [ ] Noties (🔔)

---

## Screenshot Requirements

- **Mode:** Light mode only
- **Device:** Any iOS/Android device or simulator
- **Format:** PNG or JPG
- **Orientation:** Portrait
- **Full screen:** Top to bottom including status bar and bottom nav

---

## Quick Test Commands

```bash
# Start preview build (from mobile directory)
cd mobile
eas build --profile preview --platform ios --clear-cache

# Or for Android
eas build --profile preview --platform android --clear-cache
```

---

## Self-Verification Checklist

Before taking screenshots, verify:

✅ All screens load without errors  
✅ Top bar is identical on all screens  
✅ No duplicate titles anywhere  
✅ Bottom nav shows "Messys" not "Messages"  
✅ Noties screen says "Noties" not "Notifications"  
✅ Avatar loads correctly (or shows initials)  
✅ Hamburger menu icon (☰) visible  
✅ Logo centered in top bar  
✅ Clean visual hierarchy throughout  

---

**Once screenshots are captured, the delivery is COMPLETE!**


