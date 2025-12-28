# MOBILE TOP BAR - VISUAL REFERENCE GUIDE

## Overview
This document shows the visual structure of the mobile top bar and how it matches web parity.

---

## WEB HEADER (Reference)

```
╔════════════════════════════════════════════════════════════════════════╗
║                        WEB GlobalHeader                                ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  [🔗 MyLiveLinks] [🏆]  Home  Feed  Rooms    [💬¹] [🔔²] [👑] [👤▼]   ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
         │          │      │     │     │       │    │    │    │
         │          │      └─────┴─────┴───────┴────┴────┘    │
         │          │         Nav Links (desktop)             │
         │          │                                          │
         │          └─ Trophy → Leaderboards Modal            │
         │                                                     │
         └─ Logo → Home                                       └─ UserMenu
```

### When Avatar Clicked (Logged In):
```
                                                          ┌──────────────────┐
                                                          │ [@username]      │
                                                          │ Display Name     │
                                                          ├──────────────────┤
                                                          │ 👤 View Profile  │
                                                          │ ⚙️ Edit Profile  │
                                                          ├──────────────────┤
                                                          │ 💰 Wallet        │
                                                          │ 📊 Analytics     │
                                                          ├──────────────────┤
                                                          │ 🌙 Theme Toggle  │
                                                          ├──────────────────┤
                                                          │ 🚪 Logout        │
                                                          └──────────────────┘
```

---

## MOBILE HEADER (Implementation)

```
╔════════════════════════════════════════════════════════════════════════╗
║                      MOBILE GlobalHeader                               ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  [🔗 MyLiveLinks] [🏆]              [💬¹] [🔔²] [👤▼] [⚙️ Options]    ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
         │          │                    │    │    │          │
         │          │                    │    │    │          └─ OptionsMenu
         │          │                    │    │    └─ UserMenu (Avatar Dropdown)
         │          │                    │    └─ Noties (with badge)
         │          │                    └─ Messages (with badge)
         │          │
         │          └─ Trophy → Leaderboards Modal
         │
         └─ Logo → Home
```

### Layout Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│ LEFT SECTION                    RIGHT SECTION                    │
│ ═════════                       ═════════════                    │
│ [Logo] [Trophy]                 [💬] [🔔] [Avatar] [Options]    │
│   │      │                        │    │      │         │       │
│   │      │                        │    │      │         │       │
│   │      │                        │    │      │         │       │
│   │      └─ Opens Leaderboard     │    │      │         │       │
│   │         Modal (slide up)      │    │      │         │       │
│   │                               │    │      │         │       │
│   └─ Clickable → Navigate Home   │    │      │         │       │
│                                   │    │      │         │       │
│                                   │    │      │         └─ Bottom sheet
│                                   │    │      │            with all
│                                   │    │      │            settings
│                                   │    │      │
│                                   │    │      └─ User dropdown
│                                   │    │         (see below)
│                                   │    │
│                                   │    └─ Noties modal
│                                   │       (future: wire badge count)
│                                   │
│                                   └─ Messages modal
│                                      (future: wire badge count)
└──────────────────────────────────────────────────────────────────┘
```

---

## DROPDOWN MODALS

### 1. UserMenu Dropdown (Avatar)

**LOGGED IN STATE:**
```
                                                  ┌─────────────────────┐
                                                  │ ╔═══════════════╗   │
                                                  │ ║ [👤] Username ║   │
                                                  │ ║    @username  ║   │
                                                  │ ╚═══════════════╝   │
                                                  ├─────────────────────┤
                                                  │ 👤 View Profile     │
                                                  │ ⚙️ Edit Profile     │
                                                  ├─────────────────────┤
                                                  │ 💰 Wallet           │
                                                  │ 📊 Analytics        │
                                                  ├─────────────────────┤
                                                  │ 🌙 Dark Mode        │
                                                  ├─────────────────────┤
                                                  │ 🚪 Logout           │
                                                  └─────────────────────┘
```

**LOGGED OUT STATE:**
```
                                                  ┌──────────────┐
                                                  │   LOGIN      │
                                                  └──────────────┘
                                                    (Button)
```

### 2. OptionsMenu (Gear Icon)

```
╔═══════════════════════════════════════════════════════════════╗
║                         OPTIONS                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ACCOUNT                                                      ║
║  ───────                                                      ║
║    My Profile                                                 ║
║    Edit Profile                                               ║
║    Wallet                                                     ║
║    My Gifts / Transactions                                    ║
║                                                               ║
║  ─────────────────────────────────────────────────────────    ║
║                                                               ║
║  ROOM / LIVE                                                  ║
║  ────────────                                                 ║
║    Apply for a Room                                           ║
║    Room Rules                                                 ║
║    Help / FAQ                                                 ║
║                                                               ║
║  ─────────────────────────────────────────────────────────    ║
║                                                               ║
║  PREFERENCES                                                  ║
║  ────────────                                                 ║
║    Mute All Tiles                              [Toggle: OFF] ║
║    Autoplay Tiles                              [Toggle: ON]  ║
║    Show Preview Mode Labels                    [Toggle: ON]  ║
║                                                               ║
║  ─────────────────────────────────────────────────────────    ║
║                                                               ║
║  SAFETY                                                       ║
║  ──────                                                       ║
║    Report a User                                              ║
║    Blocked Users                                              ║
║                                                               ║
║  ─────────────────────────────────────────────────────────    ║
║                                                               ║
║  ADMIN (Owner only)                                           ║
║  ──────                                                       ║
║    👑 Owner Panel                                             ║
║    Moderation Panel                                           ║
║    Approve Room Applications                                  ║
║    Manage Gift Types / Coin Packs                             ║
║    End ALL streams                                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 3. Leaderboards Modal (Trophy Icon)

```
╔═══════════════════════════════════════════════════════════════╗
║  🏆  LEADERBOARDS                                        ✕    ║
║      Top performers                                           ║
║                                                               ║
║  ┌──────────────────┬──────────────────┐                     ║
║  │ Top Streamers ◄─ │  Top Gifters     │                     ║
║  └──────────────────┴──────────────────┘                     ║
║                                                               ║
║  ┌──────┬──────┬────────┬─────────┐                          ║
║  │Daily◄│Weekly│Monthly │All Time │                          ║
║  └──────┴──────┴────────┴─────────┘                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🥇  [👤] @username1            1.2M 💎 diamonds             ║
║  🥈  [👤] @username2            850K 💎 diamonds             ║
║  🥉  [👤] @username3            720K 💎 diamonds             ║
║  #4  [👤] @username4            540K 💎 diamonds             ║
║  #5  [👤] @username5            380K 💎 diamonds             ║
║  #6  [👤] @username6            250K 💎 diamonds             ║
║  ...                                                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
                    (Scrollable)
```

---

## COMPONENT HIERARCHY

```
GlobalHeader
├── BrandLogo
│   └── Pressable → onNavigateHome
├── Trophy Button (Pressable)
│   └── Opens LeaderboardModal
├── Messages Icon (if logged in)
│   └── Badge (count > 0)
├── Noties Icon (if logged in)
│   └── Badge (count > 0)
├── UserMenu
│   ├── Trigger (Avatar or Login Button)
│   └── Modal
│       ├── User Info Header (if logged in)
│       └── Menu Items
│           ├── View Profile
│           ├── Edit Profile
│           ├── Wallet
│           ├── Analytics
│           ├── Theme Toggle
│           └── Logout
└── OptionsMenu
    ├── Trigger (Gear Icon Button)
    └── Modal (Bottom Sheet)
        ├── Account Section
        ├── Room/Live Section
        ├── Preferences Section
        ├── Safety Section
        └── Admin Section (conditional)

LeaderboardModal (separate)
├── Header
│   ├── Trophy Icon
│   ├── Title
│   └── Close Button
├── Type Tabs
│   ├── Top Streamers
│   └── Top Gifters
├── Period Tabs
│   ├── Daily
│   ├── Weekly
│   ├── Monthly
│   └── All Time
└── Content
    ├── Loading State (skeletons)
    ├── Empty State
    └── Entries List
        └── Entry Item (Pressable)
            ├── Rank
            ├── Avatar
            ├── Username
            └── Metric
```

---

## STATE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    APP LAUNCH                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Check Auth Status  │
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    LOGGED IN         LOGGED OUT
         │                 │
         │                 │
    ┌────▼─────────┐  ┌────▼─────────┐
    │ Show Avatar  │  │ Show Login   │
    │ + Chevron    │  │ Button       │
    ├──────────────┤  └──────────────┘
    │ Show 💬 icon │
    │ Show 🔔 icon │
    └──────────────┘
         │
         │
    ┌────▼─────────────────────────────┐
    │ User clicks:                     │
    │                                  │
    │ Avatar    → UserMenu Modal       │
    │ 💬        → Messages Modal       │
    │ 🔔        → Noties Modal         │
    │ ⚙️ Options → OptionsMenu Modal   │
    │ 🏆 Trophy  → Leaderboards Modal  │
    │ Logo       → Navigate Home       │
    └──────────────────────────────────┘
```

---

## INTERACTION FLOWS

### Flow 1: Viewing Leaderboards

```
User taps Trophy 🏆
   │
   ▼
Leaderboard Modal opens (slide up animation)
   │
   ▼
Default: Top Streamers, Daily
   │
   ├─ User taps "Top Gifters" → Switch to gifters data
   ├─ User taps "Weekly" → Load weekly data
   ├─ User taps entry → Close modal, navigate to profile
   └─ User taps close ✕ → Close modal
```

### Flow 2: Accessing Profile

```
User taps Avatar 👤
   │
   ▼
UserMenu Modal opens (fade + slide down)
   │
   ▼
User sees:
   - User info (avatar, name, @username)
   - View Profile
   - Edit Profile
   - Wallet
   - Analytics
   - Theme Toggle
   - Logout
   │
   ├─ User taps "View Profile" → Close modal, navigate to profile
   ├─ User taps "Wallet" → Close modal, navigate to wallet
   ├─ User taps "Logout" → Sign out, navigate to Gate
   └─ User taps backdrop → Close modal
```

### Flow 3: Accessing Settings

```
User taps ⚙️ Options
   │
   ▼
OptionsMenu Modal opens (bottom sheet slide up)
   │
   ▼
User sees all sections:
   - Account
   - Room/Live
   - Preferences (with toggles)
   - Safety
   - Admin (if owner)
   │
   ├─ User taps "Edit Profile" → Navigate to settings
   ├─ User taps "Wallet" → Navigate to wallet
   ├─ User taps toggle → Update preference state
   ├─ User taps "Apply for Room" → Navigate to apply
   └─ User taps backdrop → Close modal
```

---

## RESPONSIVE BEHAVIOR

### Portrait Mode (Default)
- Logo: 100px width
- Trophy: 24px icon
- Icons: 20px (Messages, Noties)
- Avatar: 32px diameter
- Options button: Compact with icon + text

### Landscape Mode
- Same structure, more horizontal space
- No layout changes needed
- Modals remain centered/anchored

### Small Screens (<350px width)
- Logo size reduces slightly
- Icons remain same size for tap target
- Text labels may truncate

---

## COLOR REFERENCE

```
┌─────────────────────────────────────────┐
│ PRIMARY COLORS                          │
├─────────────────────────────────────────┤
│ Purple (Primary):    #8b5cf6            │
│ Amber (Trophy):      #f59e0b            │
│ Red (Badge):         #ef4444            │
│ Blue (Messages):     #00a8ff            │
├─────────────────────────────────────────┤
│ BACKGROUNDS                             │
├─────────────────────────────────────────┤
│ Header:              #000               │
│ Modal:               #1a1a1a            │
│ Card/Item:           rgba(255,255,255,0.05) │
├─────────────────────────────────────────┤
│ TEXT                                    │
├─────────────────────────────────────────┤
│ Primary:             #fff               │
│ Secondary:           #9aa0a6            │
│ Muted:               #6b7280            │
└─────────────────────────────────────────┘
```

---

## ACCESSIBILITY

- ✅ All touch targets minimum 44x44pt
- ✅ Badges have aria-label with count
- ✅ Modals dismiss on backdrop tap
- ✅ Modals support swipe-to-dismiss (planned)
- ✅ Text meets minimum contrast ratios
- ✅ Icons have semantic labels
- ✅ Focus states for keyboard navigation (web)

---

## TESTING CHECKLIST (Visual)

### Desktop/Web Comparison
- [ ] Open web app on desktop
- [ ] Open mobile app on phone
- [ ] Compare header layout side-by-side
- [ ] Verify all icons present
- [ ] Verify spacing matches proportionally

### Modal Testing
- [ ] Open each modal (UserMenu, Options, Leaderboards)
- [ ] Verify animations are smooth
- [ ] Verify content matches web exactly
- [ ] Test backdrop dismiss
- [ ] Test close button dismiss

### State Testing
- [ ] Log out and verify Login button appears
- [ ] Log in and verify avatar appears
- [ ] Verify Messages/Noties icons show when logged in
- [ ] Verify admin section shows for owner

---

## IMPLEMENTATION NOTES

### Why Bottom Sheets for Mobile?
- Native mobile UX pattern
- Easier one-handed use
- No z-index conflicts with bottom nav
- Smooth slide-up animation
- Natural swipe-to-dismiss gesture

### Why Emoji Icons?
- Cross-platform consistency
- No additional image assets needed
- Instant recognition
- Smaller bundle size
- Easy to update/change

### Why Separate from PageShell?
- Decouples header from page content
- Allows header to persist across navigation
- Easier to test in isolation
- Can be conditionally rendered
- Cleaner prop drilling

---

This visual guide ensures pixel-perfect parity with web while maintaining native mobile UX patterns.


