# Profile Banner Setup Guide

## Overview

Every profile now has a **clickable banner at the top** that directs users to the live stream. The banner automatically detects images from both `branding/` and `photos/` folders.

---

## How It Works

### 1. Banner Location
- **Top of every profile page** (`/[username]`)
- **Clickable** - clicking navigates to live stream
- **Auto-detects images** from multiple sources

### 2. Image Detection Priority

The system tries images in this order:

1. **User-specific banner** from `photos/banners/`:
   - `/photos/banners/{username}-banner-light.jpg`
   - `/photos/banners/{username}-banner-dark.jpg`
   - `/photos/banners/{username}-banner.jpg` (any theme)

2. **Theme-specific banner** from `branding/`:
   - `/branding/banner/banner-light.jpg`
   - `/branding/banner/banner-dark.jpg`

3. **Generic fallback**:
   - `/branding/banner/banner.jpg`
   - `/photos/banners/default-banner.jpg`

---

## File Structure

```
public/
├── branding/
│   └── banner/
│       ├── banner-light.jpg      ← Used if no user-specific banner
│       ├── banner-dark.jpg
│       └── banner.jpg            ← Fallback
│
└── photos/
    └── banners/
        ├── {username}-banner-light.jpg  ← User-specific (priority)
        ├── {username}-banner-dark.jpg
        ├── {username}-banner.jpg       ← User-specific (any theme)
        └── default-banner.jpg          ← Final fallback
```

---

## Naming Convention

### User-Specific Banners (Recommended)

```
✅ CORRECT:
- photos/banners/john-banner-light.jpg
- photos/banners/john-banner-dark.jpg
- photos/banners/john-banner.jpg

❌ WRONG:
- photos/banners/john.jpg              ← Missing "banner"
- photos/banners/banner-john.jpg      ← Wrong order
```

### Generic Banners (Fallback)

```
✅ CORRECT:
- branding/banner/banner-light.jpg
- branding/banner/banner-dark.jpg
- branding/banner/banner.jpg
```

---

## Banner Behavior

### When User is Live

- Shows **"LIVE NOW"** indicator (red badge)
- Clicking banner → Navigates to `/live?stream={streamId}`
- Shows "Click to watch live stream →" message

### When User is Not Live

- No live indicator
- Clicking banner → Navigates to `/live` (main room)
- Shows "Click to go to live room →" message

---

## Features

✅ **Auto theme detection** - Uses light/dark based on user preference  
✅ **Smart fallbacks** - Tries multiple image sources  
✅ **Clickable** - Directs to live stream  
✅ **Live indicator** - Shows when user is streaming  
✅ **Responsive** - Works on all screen sizes  
✅ **Accessible** - Keyboard navigation supported  

---

## Usage

The banner is automatically included on profile pages:

```tsx
// app/[username]/page.tsx
<ProfileBanner
  profileId={profile.id}
  username={profile.username}
  isLive={profile.is_live}
  liveStreamId={liveStreamId}
  height="300px"
/>
```

---

## Image Requirements

### Recommended Sizes

| Type | Dimensions | Aspect Ratio | Format |
|------|------------|--------------|--------|
| Profile Banner | 1200x300px | 4:1 | JPG or PNG |
| Profile Banner | 1920x400px | 4.8:1 | JPG or PNG |

### Best Practices

- **Width:** 1200-1920px
- **Height:** 300-400px
- **Format:** JPG (for photos), PNG (for graphics with transparency)
- **File size:** < 500KB (optimize for web)
- **Theme variants:** Create both light and dark versions

---

## Setup Steps

### Step 1: Create Folders

```bash
mkdir -p public/photos/banners
mkdir -p public/branding/banner
```

### Step 2: Add Generic Banners

Place default banners in `branding/banner/`:
- `banner-light.jpg`
- `banner-dark.jpg`
- `banner.jpg` (fallback)

### Step 3: Add User-Specific Banners (Optional)

For users who want custom banners, place in `photos/banners/`:
- `{username}-banner-light.jpg`
- `{username}-banner-dark.jpg`
- `{username}-banner.jpg`

### Step 4: Test

1. Visit a profile page
2. Verify banner displays correctly
3. Click banner - should navigate to live room
4. Test light/dark theme switching

---

## Examples

### Example 1: User with Custom Banner

**Files:**
```
public/photos/banners/
├── streamer123-banner-light.jpg
└── streamer123-banner-dark.jpg
```

**Result:** Profile shows user-specific banner

### Example 2: User without Custom Banner

**Files:**
```
public/branding/banner/
├── banner-light.jpg
└── banner-dark.jpg
```

**Result:** Profile shows generic branding banner

### Example 3: Mixed Setup

**Files:**
```
public/photos/banners/
└── vipuser-banner.jpg          ← User-specific (any theme)

public/branding/banner/
├── banner-light.jpg            ← Fallback for other users
└── banner-dark.jpg
```

**Result:** 
- `vipuser` profile → Uses `vipuser-banner.jpg`
- Other profiles → Use `banner-light.jpg` or `banner-dark.jpg`

---

## Customization

### Change Banner Height

```tsx
<ProfileBanner
  height="400px"  // Default: 300px
  ...
/>
```

### Disable Click (if needed)

Modify `ProfileBanner.tsx` to remove `onClick` handler.

### Add Custom Overlay

The component includes a gradient overlay. Modify the overlay div in `ProfileBanner.tsx` to customize.

---

## Troubleshooting

### Banner Not Showing

1. Check file paths match naming convention
2. Verify files are in `public/` folder
3. Check browser console for 404 errors
4. Try fallback images first

### Wrong Image Showing

1. Check filename matches username exactly
2. Verify theme detection is working
3. Clear browser cache

### Click Not Working

1. Verify `isLive` and `liveStreamId` props are correct
2. Check router navigation is working
3. Verify `/live` route exists

---

## Summary

✅ **Banner at top of every profile**  
✅ **Clickable** - directs to live stream  
✅ **Auto-detects** images from `branding/` and `photos/`  
✅ **Theme-aware** - switches light/dark automatically  
✅ **User-specific** - supports custom banners per user  
✅ **Smart fallbacks** - always shows something  

Just add your banner images with the correct naming, and the system handles the rest!












