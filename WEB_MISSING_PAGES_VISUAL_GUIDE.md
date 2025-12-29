# WEB MISSING PAGES — VISUAL GUIDE

**Date:** December 28, 2025  
**Agent:** Web UI + Routing Builder

---

## Overview

This visual guide shows what each new page looks like and how users navigate to them.

---

## 1. `/composer/new` — New Project Page

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Projects                                          │
│                                                             │
│ [🎬] Create New Project                                     │
│      Set up your video project details                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Project Creation Coming Soon                         │ │
│ │ The composer backend is being built...                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Project Type *                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │  🎵     │ │  😂     │ │  📹     │                        │
│ │ Music   │ │ Comedy  │ │  Vlog   │                        │
│ │ Video   │ │ Special │ │         │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│ Project Title *                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ e.g., Summer Tour 2025                                │   │
│ └───────────────────────────────────────────────────────┘   │
│ 0/100 characters                                            │
│                                                             │
│ Project Thumbnail (Optional)                                │
│ ┌───────────────────────────────────────────────────────┐   │
│ │                                                       │   │
│ │            📤 Click to upload thumbnail               │   │
│ │            PNG, JPG up to 5MB                         │   │
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Description (Optional)                                      │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Describe your project...                              │   │
│ │                                                       │   │
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│ 0/500 characters                                            │
│                                                             │
│ [ Cancel ]                 [ Create Project ]               │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
/composer (Projects List)
    │
    ├─ "New Project" button (top right)
    │
    ▼
/composer/new (This page)
    │
    ├─ Fill form
    ├─ Click "Create Project"
    │
    ▼
Alert → Back to /composer
```

### What's Real
✅ All form fields functional  
✅ Type selection visual feedback  
✅ Character counters update live  
✅ Thumbnail preview + remove  
✅ Validation (title + type required)  

### What's Placeholder
⏳ Form submission (shows alert)  
⏳ No database storage yet  

---

## 2. `/referrals` — Referral Dashboard

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [👥] Referral Program                                       │
│      Invite friends and earn rewards                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔗 Your Referral Link                                   │ │
│ │                                                         │ │
│ │ https://www.mylivelinks.com/invite/yourcode             │ │
│ │                                                         │ │
│ │ [ 📋 Copy Link ]              [ ↗️ Share ]              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │   127    │ │    23    │ │  1,450   │ │   #15    │        │
│ │  Clicks  │ │ Signups  │ │  Coins   │ │  Rank    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✨ How It Works                                         │ │
│ │                                                         │ │
│ │ 1️⃣  Share Your Link                                     │ │
│ │     Share your unique referral link with friends        │ │
│ │                                                         │ │
│ │ 2️⃣  Friends Sign Up                                     │ │
│ │     When someone signs up, they become your referral    │ │
│ │                                                         │ │
│ │ 3️⃣  Earn Rewards                                        │ │
│ │     Get coins and climb the leaderboard!                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👑 Compete on the Leaderboard                           │ │
│ │                                                         │ │
│ │ See how you rank against other top referrers            │ │
│ │                                                         │ │
│ │         [ 🏆 View Leaderboard → ]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
Entry Points:
├─ Direct URL: /referrals
├─ ReferralProgressModule → "View Details" button
└─ Profile page referral section → CTA

/referrals (This page)
    │
    ├─ Copy referral link
    ├─ Share via native dialog
    ├─ View stats
    │
    └─ "View Leaderboard" button
        │
        ▼
    /leaderboards
```

### What's Real
✅ API integration (3 endpoints)  
✅ Copy to clipboard  
✅ Native share on mobile  
✅ Stats display (or graceful 0s)  
✅ Loading skeletons  

### What's Placeholder
⚠️ Shows 0s if APIs return errors  
⏳ Rank may be null if no referrals  

---

## 3. `/admin` — Admin Dashboard

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [🛡️] Admin Dashboard                                        │
│      Platform management and moderation                     │
│      🛡️ Administrator                                       │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 🚩   3   │ │ 📋   2   │ │ 👥  247  │ │ 📊   5   │        │
│ │ Pending  │ │ Apps     │ │ Active   │ │ Streams  │        │
│ │ Reports  │ │          │ │ Users    │ │          │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ Admin Sections                                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🚩 Moderation                                           │ │
│ │ Review reports, manage users...      [3 pending]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Applications                                         │ │
│ │ Review broadcaster applications...   [2 pending]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎁 Gifts                                                │ │
│ │ Manage gift catalog, pricing...                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👥 User Management                  [Coming Soon]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Analytics                        [Coming Soon]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚙️  Platform Settings               [Coming Soon]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ Admin Dashboard Status                                   │
│ Backend integration in progress...                          │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
User Menu (Admin Only)
    │
    └─ "Admin" option
        │
        ▼
/admin (This page)
    │
    ├─ Click "Moderation" → /admin/moderation
    ├─ Click "Applications" → /admin/applications
    ├─ Click "Gifts" → /admin/gifts
    │
    └─ Coming Soon sections (non-clickable)
```

### Access Control

```
Non-Admin User:
    │
    ▼
/admin
    │
    ▼
Access Denied Screen
    │
    └─ Redirect to /
```

### What's Real
✅ Admin check (env vars + hardcoded)  
✅ All navigation links  
✅ Access denied screen  
✅ Sub-pages work (verified)  

### What's Placeholder
⏳ Stats show 0s (TODO: real queries)  
ℹ️  Coming Soon sections (greyed out)  

---

## Color Themes (For Each Page)

### `/composer/new`
- **Primary:** Pink/Purple gradient `from-pink-500 to-purple-600`
- **Accent:** Film icon 🎬
- **Matches:** Existing Composer page

### `/referrals`
- **Primary:** Purple/Pink gradient `from-purple-500 to-pink-600`
- **Accent:** Users icon 👥
- **Matches:** Referral system branding

### `/admin`
- **Primary:** Red/Orange gradient `from-red-500 to-orange-600`
- **Accent:** Shield icon 🛡️
- **Matches:** Admin/warning theme

---

## Mobile Responsiveness

All pages tested at:
- **375px** (iPhone SE)
- **768px** (iPad)
- **1920px** (Desktop)

### Mobile Adaptations

**Project Type Selection** (Composer):
```
Desktop: 3 columns side-by-side
Mobile:  1 column stacked
```

**Stats Grid** (Referrals):
```
Desktop: 4 columns (Clicks | Signups | Coins | Rank)
Mobile:  2×2 grid
```

**Admin Cards**:
```
Desktop: 3 columns
Tablet:  2 columns
Mobile:  1 column
```

---

## Empty States

### `/composer/new` — Empty Thumbnail
```
┌────────────────────────────────┐
│                                │
│   📤 Click to upload thumbnail │
│   PNG, JPG up to 5MB           │
│                                │
└────────────────────────────────┘
```

### `/referrals` — No Referrals Yet
```
Stats show 0s:
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│   0  │ │   0  │ │   0  │ │  —   │
│Clicks│ │Signup│ │Coins │ │ Rank │
└──────┘ └──────┘ └──────┘ └──────┘
```

### `/admin` — Access Denied
```
┌────────────────────────────────┐
│                                │
│        🛡️ (large icon)         │
│                                │
│     Access Denied              │
│                                │
│ You don't have permission...   │
│                                │
│     [ ← Go Back ]              │
│                                │
└────────────────────────────────┘
```

---

## Button States

### Primary Buttons
- **Default:** Blue gradient
- **Hover:** Opacity 90%
- **Disabled:** Grey, no pointer
- **Loading:** Spinner + "Creating..." text

### Copy Button (Referrals)
```
Before:  [ 📋 Copy Link ]
After:   [ ✅ Copied! ] (2 second flash)
```

### Admin Cards
```
Default:    White background, grey border
Hover:      Shadow lift, slight translate up
Disabled:   50% opacity, "Coming Soon" badge
```

---

## Animation Timing

All pages use staggered entrance:
1. **Header:** Fade in (0ms delay)
2. **Main content:** Slide up (100ms delay)
3. **Secondary sections:** Slide up (200ms delay)

```css
animate-fade-in          /* Headers */
animate-slide-up         /* Content */
style="animationDelay: '100ms'"  /* Stagger */
```

---

## Key Interactions

### Composer New Project
1. User selects type → Visual highlight
2. User types title → Character counter updates
3. User uploads image → Preview replaces upload area
4. User clicks remove (X) → Preview clears
5. User submits → Validation alert if incomplete
6. Valid form → Success alert + redirect

### Referrals
1. Page loads → API calls fire (3 endpoints)
2. Loading → Skeleton placeholders
3. Data arrives → Stats populate
4. Copy button → Clipboard API → Success state
5. Share button → Native dialog (mobile) or copy fallback

### Admin
1. Page loads → Admin check
2. If not admin → Access denied screen
3. If admin → Stats query (currently 0s)
4. Click card → Navigate to sub-page
5. Coming Soon cards → No interaction (greyed out)

---

## Success Messages

### Composer
```
Alert: "Project creation coming soon! 
This will save your project and take you to the editor."
→ Redirect to /composer
```

### Referrals
```
Copy success:
Button text changes: "Copy Link" → "Copied!"
(Reverts after 2 seconds)
```

### Admin
```
No success messages (navigation only)
Sub-pages have their own alerts (ban/approve/etc)
```

---

## Error Handling

### Composer New
- Empty title → Alert on submit
- No type selected → Alert on submit
- Image too large → Browser file picker validates

### Referrals
- API error → Shows 0s with no alert (graceful)
- Not logged in → Redirect to `/login`
- No username → Shows "loading" as code

### Admin
- Not admin → Access denied screen + redirect to `/`
- Stats fail → Shows 0s (no error alert)

---

✅ All pages follow consistent visual patterns from existing app  
✅ Mobile-first responsive design  
✅ Clear empty states and loading states  
✅ Accessible (keyboard nav, screen readers, ARIA labels)  

---

*End of Visual Guide*

