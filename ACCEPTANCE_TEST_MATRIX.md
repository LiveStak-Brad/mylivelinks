# ✅ Acceptance Test Matrix - Feed & Photos Redesign

## Overview

This document provides a comprehensive test matrix to verify the implementation meets all requirements. All tests must pass before deployment.

---

## 🖼️ Media Sizing Tests

### Feed Mode (Auto-Size, No Bars)

#### Test 1.1: Portrait Photo in Feed
```
Input: Portrait photo (1080 × 1350px, 4:5 aspect ratio)
Context: Feed post card
Expected:
  ✓ Container width: 100% of card (680px on desktop)
  ✓ Container height: Auto-calculated (850px)
  ✓ Full image visible (no cropping)
  ✓ NO black bars (top, bottom, sides)
  ✓ Image aspect ratio preserved exactly (4:5)
```

#### Test 1.2: Landscape Photo in Feed
```
Input: Landscape photo (1920 × 1080px, 16:9 aspect ratio)
Context: Feed post card
Expected:
  ✓ Container width: 100% of card (680px on desktop)
  ✓ Container height: Auto-calculated (~382px)
  ✓ Full image visible (no cropping)
  ✓ NO black bars (top, bottom, sides)
  ✓ Image aspect ratio preserved exactly (16:9)
```

#### Test 1.3: Square Photo in Feed
```
Input: Square photo (1080 × 1080px, 1:1 aspect ratio)
Context: Feed post card
Expected:
  ✓ Container width: 100% of card (680px on desktop)
  ✓ Container height: Auto-calculated (680px)
  ✓ Full image visible (no cropping)
  ✓ NO black bars (top, bottom, sides)
  ✓ Image aspect ratio preserved exactly (1:1)
```

#### Test 1.4: Video in Feed (Portrait)
```
Input: Portrait video (1080 × 1920px, 9:16 aspect ratio)
Context: Feed post card
Expected:
  ✓ Container width: 100% of card (680px on desktop)
  ✓ Container height: Auto-calculated (~1207px)
  ✓ Full video visible (no cropping)
  ✓ NO black bars
  ✓ Native controls visible
  ✓ Video plays inline
```

#### Test 1.5: Video in Feed (Landscape)
```
Input: Landscape video (1920 × 1080px, 16:9 aspect ratio)
Context: Feed post card
Expected:
  ✓ Container width: 100% of card (680px on desktop)
  ✓ Container height: Auto-calculated (~382px)
  ✓ Full video visible (no cropping)
  ✓ NO black bars
  ✓ Native controls visible
  ✓ Video plays inline
```

---

### Grid Mode (1:1 Square Crop)

#### Test 2.1: Portrait Photo in Grid
```
Input: Portrait photo (1080 × 1350px, 4:5 aspect ratio)
Context: Photos/Videos tab grid
Expected:
  ✓ Tile dimensions: Square (227px × 227px on 680px container)
  ✓ Aspect ratio: 1:1 (exactly square)
  ✓ Crop behavior: Top and bottom cropped, center visible
  ✓ NO black bars
  ✓ object-fit: cover applied
  ✓ object-position: center
```

#### Test 2.2: Landscape Photo in Grid
```
Input: Landscape photo (1920 × 1080px, 16:9 aspect ratio)
Context: Photos/Videos tab grid
Expected:
  ✓ Tile dimensions: Square (227px × 227px)
  ✓ Aspect ratio: 1:1 (exactly square)
  ✓ Crop behavior: Left and right cropped, center visible
  ✓ NO black bars
  ✓ object-fit: cover applied
  ✓ object-position: center
```

#### Test 2.3: Square Photo in Grid
```
Input: Square photo (1080 × 1080px, 1:1 aspect ratio)
Context: Photos/Videos tab grid
Expected:
  ✓ Tile dimensions: Square (227px × 227px)
  ✓ Aspect ratio: 1:1 (exactly square)
  ✓ Crop behavior: No cropping needed (perfect fit)
  ✓ NO black bars
  ✓ Full image visible (scaled down)
```

#### Test 2.4: Video in Grid
```
Input: Landscape video (1920 × 1080px, 16:9 aspect ratio)
Context: Photos/Videos tab grid
Expected:
  ✓ Tile dimensions: Square (227px × 227px)
  ✓ Aspect ratio: 1:1 (exactly square)
  ✓ Crop behavior: Sides cropped to square
  ✓ NO black bars
  ✓ Play icon overlay visible (▶️)
  ✓ No controls (thumbnail only)
```

---

## 📱 Responsive Behavior Tests

### Feed Responsive Tests

#### Test 3.1: Feed on Mobile (< 640px)
```
Context: Feed post on iPhone (375px width)
Expected:
  ✓ Portrait photo: Full width (375px), auto height (~469px)
  ✓ Landscape photo: Full width (375px), auto height (~211px)
  ✓ Square photo: Full width (375px), auto height (375px)
  ✓ NO black bars on any aspect ratio
  ✓ All images readable and clear
```

#### Test 3.2: Feed on Tablet (768px)
```
Context: Feed post on iPad (768px width)
Expected:
  ✓ Container max-width: 600px (centered)
  ✓ Portrait photo: 600px wide, auto height (~750px)
  ✓ Landscape photo: 600px wide, auto height (~337px)
  ✓ NO black bars on any aspect ratio
```

#### Test 3.3: Feed on Desktop (1440px)
```
Context: Feed post on desktop (1440px width)
Expected:
  ✓ Container max-width: 680px (centered)
  ✓ Portrait photo: 680px wide, auto height (~850px)
  ✓ Landscape photo: 680px wide, auto height (~382px)
  ✓ NO black bars on any aspect ratio
```

---

### Grid Responsive Tests

#### Test 4.1: Grid on Mobile (375px)
```
Context: Photos tab on iPhone
Expected:
  ✓ Layout: 3 columns
  ✓ Gap between tiles: 4px
  ✓ Tile size: ~123px × 123px (square)
  ✓ All tiles exactly same size
  ✓ Grid perfectly aligned
  ✓ No jagged edges
```

#### Test 4.2: Grid on Tablet (768px)
```
Context: Photos tab on iPad
Expected:
  ✓ Layout: 3 columns
  ✓ Gap between tiles: 8px
  ✓ Tile size: ~251px × 251px (square)
  ✓ All tiles exactly same size
  ✓ Grid perfectly aligned
```

#### Test 4.3: Grid on Desktop (1440px)
```
Context: Photos tab on desktop
Expected:
  ✓ Layout: 3 columns
  ✓ Gap between tiles: 12px
  ✓ Tile size: ~304px × 304px (square, within 935px max)
  ✓ Container max-width: 935px (Instagram standard)
  ✓ All tiles exactly same size
```

---

## 🎨 UI/UX Tests

### Tab Navigation Tests

#### Test 5.1: Single Tab Bar Only
```
Context: Profile page
Expected:
  ✓ ONE tab bar visible (Info | Feed | Photos)
  ✓ NO nested/stacked tab bars
  ✓ Tab selection works
  ✓ Active tab highlighted
  ✓ Smooth transitions between tabs
```

#### Test 5.2: Tab State Persistence
```
Context: Navigating between tabs
Expected:
  ✓ Selected tab remains active
  ✓ Content loads correctly for each tab
  ✓ Scroll position resets on tab change
  ✓ No content flash/flicker
```

---

### Component Tests

#### Test 6.1: PostMedia Component (Feed Mode)
```
Props: { mode: 'feed', mediaType: 'photo', mediaUrl: 'portrait.jpg' }
Expected:
  ✓ Renders <img> with w-full h-auto
  ✓ NO fixed height applied
  ✓ NO object-fit: contain
  ✓ Container auto-sizes to image
  ✓ NO wrapper with max-height
```

#### Test 6.2: PostMedia Component (Grid Mode)
```
Props: { mode: 'grid', mediaType: 'photo', mediaUrl: 'landscape.jpg' }
Expected:
  ✓ Renders wrapper with aspect-square
  ✓ Image has object-fit: cover
  ✓ Image has object-position: center
  ✓ Container is exactly square
  ✓ Overflow hidden applied
```

#### Test 6.3: PostMedia Component (Video - Feed)
```
Props: { mode: 'feed', mediaType: 'video', mediaUrl: 'video.mp4' }
Expected:
  ✓ Renders <video> with controls
  ✓ Video has w-full h-auto
  ✓ NO fixed height
  ✓ Plays inline
  ✓ Native controls visible
```

#### Test 6.4: PostMedia Component (Video - Grid)
```
Props: { mode: 'grid', mediaType: 'video', mediaUrl: 'video.mp4' }
Expected:
  ✓ Renders square video thumbnail
  ✓ NO controls visible
  ✓ Play icon overlay (▶️) visible
  ✓ Preload metadata only
  ✓ object-fit: cover applied
```

---

## 🎯 Instagram Grid Tests

### Layout Tests

#### Test 7.1: Grid Uniformity
```
Context: 9 photos of mixed aspect ratios
Expected:
  ✓ All tiles exactly same dimensions
  ✓ Perfect 3×3 grid (no gaps in layout)
  ✓ All tiles are perfect squares
  ✓ Consistent gaps between tiles
  ✓ No layout shift when scrolling
```

#### Test 7.2: Grid Hover States (Desktop)
```
Context: Hovering over grid tile
Expected:
  ✓ Dark overlay appears (rgba(0,0,0,0.3))
  ✓ Like count visible (top-left)
  ✓ Comment count visible (top-right)
  ✓ View icon visible (center, 👁️ or ▶️)
  ✓ Gift total visible (bottom-right)
  ✓ Smooth transition (150ms)
```

#### Test 7.3: Grid Touch Behavior (Mobile)
```
Context: Tapping grid tile on mobile
Expected:
  ✓ NO hover overlay (mobile doesn't hover)
  ✓ Tap opens lightbox immediately
  ✓ No intermediate state
  ✓ Smooth animation
```

#### Test 7.4: Video Indicators
```
Context: Video in grid
Expected:
  ✓ Play icon (▶️) visible in bottom-left
  ✓ Icon has dark background (bg-black/60)
  ✓ Icon always visible (not only on hover)
  ✓ Icon size: 16px (w-4 h-4)
```

---

## 📰 Facebook Feed Tests

### Feed Card Tests

#### Test 8.1: Feed Card Structure
```
Context: Single post in feed
Expected:
  ✓ Header: Avatar (40px) + Name + Time + Menu
  ✓ Content: Text with proper line-height (1.4)
  ✓ Media: Auto-sized, no bars
  ✓ Engagement bar: Likes, comments, gifts
  ✓ Action buttons: Like, Comment, Gift
  ✓ All elements properly aligned
```

#### Test 8.2: Feed Card Spacing
```
Context: Multiple posts in feed
Expected:
  ✓ Card padding: 16px (desktop), 12px (mobile)
  ✓ Gap between posts: 16px
  ✓ Border radius: 12px
  ✓ Border: 1px solid (gray-200 light, gray-700 dark)
  ✓ Consistent spacing throughout
```

#### Test 8.3: Feed Post Actions
```
Context: Interacting with post
Expected:
  ✓ Like button toggles state
  ✓ Heart fills with color when liked
  ✓ Like count updates immediately (optimistic)
  ✓ Comment button expands comments section
  ✓ Gift button opens gift modal
  ✓ All buttons 44px height (touch-friendly)
```

---

## 🌗 Dark Mode Tests

#### Test 9.1: Feed in Dark Mode
```
Context: Feed with dark mode enabled
Expected:
  ✓ Background: #18191A
  ✓ Card background: #242526
  ✓ Border: #3E4042
  ✓ Text primary: #E4E6EB
  ✓ Text secondary: #B0B3B8
  ✓ No white flashes
  ✓ Smooth transition when toggling
```

#### Test 9.2: Grid in Dark Mode
```
Context: Photos tab with dark mode enabled
Expected:
  ✓ Background: #18191A
  ✓ Tile hover overlay: rgba(0,0,0,0.4)
  ✓ Text on overlay: white
  ✓ Play icons: white
  ✓ Loading skeletons: #3A3B3C
```

---

## ⚡ Performance Tests

#### Test 10.1: Image Loading
```
Context: Feed with 10 posts, each with image
Expected:
  ✓ Images lazy load (IntersectionObserver)
  ✓ Thumbnails load first (< 300ms each)
  ✓ Full images load on demand
  ✓ No layout shift during load
  ✓ Loading placeholders visible
```

#### Test 10.2: Grid Performance
```
Context: Grid with 50 photos
Expected:
  ✓ Initial render: < 500ms
  ✓ Scroll performance: 60fps
  ✓ Images lazy load (2 screens ahead)
  ✓ No janky scrolling
  ✓ Memory usage reasonable
```

#### Test 10.3: Feed Scroll Performance
```
Context: Scrolling through 20 posts
Expected:
  ✓ Smooth 60fps scrolling
  ✓ No layout thrashing
  ✓ Videos pause when off-screen
  ✓ Images lazy load ahead
  ✓ No memory leaks
```

---

## 🎁 Gift System Tests

#### Test 11.1: Gift from Post
```
Context: Clicking Gift button on post
Expected:
  ✓ Gift modal opens
  ✓ Recipient name correct
  ✓ Coin balance visible
  ✓ Gift grid displayed
  ✓ Can select and send gift
  ✓ Modal closes after send
  ✓ Gift count updates on post
```

#### Test 11.2: Gift from Comment
```
Context: Clicking Gift button on comment
Expected:
  ✓ Gift modal opens
  ✓ Comment author is recipient
  ✓ Same modal UI as post gifts
  ✓ Coin deduction works
  ✓ Modal closes after send
```

#### Test 11.3: Gift Modal Consistency
```
Context: Opening gift modal from different contexts
Expected:
  ✓ Live stream gift modal: Identical UI
  ✓ Message gift modal: Identical UI
  ✓ Post gift modal: Identical UI
  ✓ Comment gift modal: Identical UI
  ✓ All use same component
```

---

## 🔍 Edge Cases

#### Test 12.1: Very Tall Portrait Photo
```
Input: Ultra-portrait photo (1080 × 5400px, 1:5 ratio)
Context: Feed post
Expected:
  ✓ Full image visible in feed
  ✓ Container height: auto (very tall)
  ✓ NO max-height restriction
  ✓ NO cropping
  ✓ Readable on mobile (scrolls)
```

#### Test 12.2: Very Wide Landscape Photo
```
Input: Ultra-wide photo (5400 × 1080px, 5:1 ratio)
Context: Feed post
Expected:
  ✓ Full image visible in feed
  ✓ Container height: auto (very short)
  ✓ NO letterboxing
  ✓ Full width used
```

#### Test 12.3: Tiny Image
```
Input: Small photo (300 × 300px)
Context: Feed post
Expected:
  ✓ Image scales to container width
  ✓ Maintains aspect ratio
  ✓ May appear pixelated (expected)
  ✓ NO black bars
```

#### Test 12.4: Corrupted Media
```
Input: Broken image URL
Context: Feed post
Expected:
  ✓ Error state shown
  ✓ Alt text displayed
  ✓ No broken image icon
  ✓ Graceful degradation
```

---

## ♿ Accessibility Tests

#### Test 13.1: Keyboard Navigation
```
Context: Using keyboard only
Expected:
  ✓ Tab through all interactive elements
  ✓ Focus indicators visible
  ✓ Like button: Space/Enter toggles
  ✓ Gift button: Space/Enter opens modal
  ✓ Escape closes modal
  ✓ No keyboard traps
```

#### Test 13.2: Screen Reader
```
Context: Using screen reader
Expected:
  ✓ Images have descriptive alt text
  ✓ Buttons have aria-labels
  ✓ Like state announced ("Liked" / "Not liked")
  ✓ Post structure navigable
  ✓ Gift modal accessible
```

#### Test 13.3: Color Contrast
```
Context: WCAG AA compliance
Expected:
  ✓ Text contrast: > 4.5:1
  ✓ Interactive elements: > 3:1
  ✓ Focus indicators: visible and high contrast
  ✓ Dark mode: equally accessible
```

---

## 📊 Acceptance Criteria Summary

### Critical (Must Pass Before Deploy)
- [ ] All feed media auto-sizes (NO bars)
- [ ] All grid tiles are 1:1 square (cropped)
- [ ] Single tab bar only (no nested tabs)
- [ ] PostMedia component works in both modes
- [ ] Responsive on mobile, tablet, desktop
- [ ] Dark mode works perfectly
- [ ] Gift system unified across contexts

### High Priority (Should Pass)
- [ ] Hover states smooth (desktop)
- [ ] Loading states professional
- [ ] Performance: 60fps scroll
- [ ] Accessibility: WCAG AA
- [ ] Edge cases handled gracefully

### Nice to Have (Can be deferred)
- [ ] Advanced animations
- [ ] Video autoplay
- [ ] Infinite scroll
- [ ] Advanced gestures

---

## 🧪 Testing Procedure

### Manual Testing
1. Test feed with 5 different aspect ratios
2. Test grid with 9 mixed images
3. Test on iPhone, iPad, Desktop
4. Test dark mode toggle
5. Test all interactions (like, comment, gift)
6. Test video playback
7. Test hover states
8. Test keyboard navigation

### Automated Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Visual regression
npm run test:visual

# Accessibility
npm run test:a11y
```

### Browser Testing
- [ ] Chrome (desktop + mobile)
- [ ] Safari (desktop + mobile)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

---

## ✅ Sign-off Checklist

Before marking complete:
- [ ] All critical tests pass
- [ ] High priority tests pass
- [ ] Manual testing complete
- [ ] Automated tests pass
- [ ] Cross-browser tested
- [ ] Performance verified (Lighthouse > 90)
- [ ] Accessibility verified (WCAG AA)
- [ ] Dark mode tested
- [ ] Mobile tested on real devices
- [ ] Product owner approval

---

**Version:** 1.0  
**Last Updated:** December 27, 2025  
**Status:** Ready for Testing

