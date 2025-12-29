# 🖼️ Media Sizing Rules - Critical Specification

## Overview

This document defines the **exact media sizing behavior** for photos and videos across different contexts in the application.

---

## 🎯 Two Distinct Modes

### Mode 1: Feed/Posts (Auto-Size, No Bars)
**Context:** Posts in the feed, individual post views, comments with media

**Behavior:**
- Container auto-sizes to match media's native aspect ratio
- NO fixed heights
- NO black bars (letterboxing)
- NO `object-fit: contain`
- Image/video determines container dimensions

**CSS Implementation:**
```css
.feed-media {
  width: 100%;
  height: auto; /* Auto-sizes to content */
  display: block;
}

.feed-media img,
.feed-media video {
  width: 100%;
  height: auto; /* Preserves aspect ratio */
  display: block;
  /* NO object-fit property */
}
```

**Examples:**
```
Portrait photo (3:4):
┌────────────┐
│            │
│            │
│   Photo    │
│            │
│            │
│            │
└────────────┘
Container height: auto (matches photo)

Landscape photo (16:9):
┌──────────────────────┐
│                      │
│       Photo          │
│                      │
└──────────────────────┘
Container height: auto (matches photo)

Square photo (1:1):
┌────────────┐
│            │
│   Photo    │
│            │
└────────────┘
Container height: auto (matches photo)
```

---

### Mode 2: Grid/Photos Tab (1:1 Crop)
**Context:** Photos/Videos tab grid, Instagram-style gallery

**Behavior:**
- Container ALWAYS 1:1 square (aspect-ratio: 1/1)
- Images cropped to fit square with `object-fit: cover`
- Center crop (important content in middle)
- NO aspect ratio preservation
- Grid determines dimensions, not content

**CSS Implementation:**
```css
.grid-tile {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  position: relative;
}

.grid-tile img,
.grid-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Crop to fill */
  object-position: center; /* Center crop */
}
```

**Examples:**
```
Portrait photo (3:4) in grid:
┌────────────┐
│  [CROP]    │  ← Top cropped
│            │
│   Visible  │
│            │
│  [CROP]    │  ← Bottom cropped
└────────────┘
Square container, image cropped top/bottom

Landscape photo (16:9) in grid:
┌────────────┐
│[C] Photo[C]│  ← Sides cropped
│[R] Visible│  
│[O] Content│  
│[P]      [P]│
└────────────┘
Square container, image cropped left/right

Square photo (1:1) in grid:
┌────────────┐
│            │
│   Photo    │  ← Perfect fit
│   Visible  │
│            │
└────────────┘
No cropping needed
```

---

## 🚫 What NOT to Do

### Feed/Posts - FORBIDDEN Patterns

**❌ BAD - Fixed Height Container:**
```jsx
<div className="max-h-[600px]"> {/* NO! */}
  <img className="object-contain" /> {/* NO! */}
</div>
```
This creates black bars if image doesn't match container.

**❌ BAD - Object-fit Contain:**
```jsx
<img className="w-full h-[600px] object-contain" />
```
This adds letterboxing.

**✅ GOOD - Auto-Size Container:**
```jsx
<img className="w-full h-auto" />
```
Container matches image dimensions.

---

### Grid - FORBIDDEN Patterns

**❌ BAD - Preserving Aspect Ratio:**
```jsx
<div className="aspect-auto"> {/* NO! */}
  <img className="object-contain" /> {/* NO! */}
</div>
```
This breaks the grid layout.

**❌ BAD - Auto Height:**
```jsx
<div className="h-auto">
  <img className="w-full h-auto" />
</div>
```
Grid becomes jagged, not uniform.

**✅ GOOD - Force Square Crop:**
```jsx
<div className="aspect-square overflow-hidden">
  <img className="w-full h-full object-cover" />
</div>
```
Perfect Instagram-style grid.

---

## 📐 Shared PostMedia Component

**File:** `components/feed/PostMedia.tsx`

```typescript
interface PostMediaProps {
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  mode: 'feed' | 'grid';
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function PostMedia({
  mediaUrl,
  mediaType,
  mode,
  alt,
  className = '',
  onClick
}: PostMediaProps) {
  const isVideo = mediaType === 'video';
  
  if (mode === 'grid') {
    // Mode 2: 1:1 square crop
    return (
      <div 
        className={`aspect-square overflow-hidden relative ${className}`}
        onClick={onClick}
      >
        {isVideo ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={alt || 'Media'}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    );
  }
  
  // Mode 1: Auto-size to aspect ratio (feed)
  return (
    <div className={`w-full ${className}`} onClick={onClick}>
      {isVideo ? (
        <video
          src={mediaUrl}
          controls
          className="w-full h-auto"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={alt || 'Post media'}
          className="w-full h-auto"
        />
      )}
    </div>
  );
}
```

---

## 📱 Responsive Behavior

### Feed (Auto-Size)
```
Mobile:    Full width, height auto
Tablet:    Full width (max 600px), height auto
Desktop:   Full width (max 680px), height auto
```

All breakpoints maintain aspect ratio, no bars.

### Grid (1:1 Crop)
```
Mobile:    33.33% width (3 cols), square
Tablet:    33.33% width (3 cols), square
Desktop:   33.33% width (3 cols), square
```

All breakpoints maintain 1:1 square, cropped.

---

## 🎬 Video-Specific Rules

### Feed Mode
```jsx
<video
  src={videoUrl}
  controls
  className="w-full h-auto"
  style={{ aspectRatio: 'auto' }}
/>
```
- Native controls visible
- Auto-sizes to video dimensions
- No fixed height

### Grid Mode
```jsx
<video
  src={videoUrl}
  className="w-full h-full object-cover"
  preload="metadata"
/>
```
- No controls (thumbnail only)
- Cropped to 1:1 square
- Play icon overlay

---

## ✅ Acceptance Tests

### Feed Mode Tests

**Test 1: Portrait Photo**
```
Given: Portrait photo (1080x1350, 4:5 ratio)
When: Displayed in feed
Then: 
  - Container width: 100% (680px desktop)
  - Container height: auto (850px)
  - No black bars visible
  - Full image visible
```

**Test 2: Landscape Photo**
```
Given: Landscape photo (1920x1080, 16:9 ratio)
When: Displayed in feed
Then:
  - Container width: 100% (680px desktop)
  - Container height: auto (382.5px)
  - No black bars visible
  - Full image visible
```

**Test 3: Square Photo**
```
Given: Square photo (1080x1080, 1:1 ratio)
When: Displayed in feed
Then:
  - Container width: 100% (680px desktop)
  - Container height: auto (680px)
  - No black bars visible
  - Full image visible
```

### Grid Mode Tests

**Test 1: Portrait Photo in Grid**
```
Given: Portrait photo (1080x1350, 4:5 ratio)
When: Displayed in grid
Then:
  - Tile: 1:1 square (227px × 227px on 680px container)
  - Top/bottom cropped
  - Horizontal center visible
  - No black bars
```

**Test 2: Landscape Photo in Grid**
```
Given: Landscape photo (1920x1080, 16:9 ratio)
When: Displayed in grid
Then:
  - Tile: 1:1 square (227px × 227px)
  - Left/right cropped
  - Vertical center visible
  - No black bars
```

**Test 3: Square Photo in Grid**
```
Given: Square photo (1080x1080, 1:1 ratio)
When: Displayed in grid
Then:
  - Tile: 1:1 square (227px × 227px)
  - No cropping
  - Full image visible (scaled)
  - No black bars
```

---

## 🔍 Debugging Checklist

If you see black bars in feed:
- [ ] Check for `max-height` on container
- [ ] Check for `object-fit: contain`
- [ ] Check for fixed `height` value
- [ ] Ensure `height: auto` on image

If grid isn't square:
- [ ] Check for `aspect-ratio: 1/1`
- [ ] Check for `object-fit: cover`
- [ ] Check container has `overflow: hidden`
- [ ] Ensure no `h-auto` on tiles

---

## 📊 Visual Comparison

### Feed (Auto-Size)
```
Portrait:          Landscape:         Square:
┌──────────┐      ┌──────────────┐   ┌──────────┐
│          │      │              │   │          │
│          │      │   Content    │   │ Content  │
│ Content  │      │              │   │          │
│          │      └──────────────┘   └──────────┘
│          │      Short container    Medium container
└──────────┘      
Tall container
```

### Grid (1:1 Crop)
```
All Same Size:
┌─────┐ ┌─────┐ ┌─────┐
│     │ │     │ │     │
│  ▢  │ │  ▢  │ │  ▢  │
│     │ │     │ │     │
└─────┘ └─────┘ └─────┘
Portrait  Land.  Square
(cropped) (cropped) (fit)
```

---

## 🎯 Key Takeaways

1. **Feed = Flexible** (container follows content)
2. **Grid = Fixed** (content follows container)
3. **Never mix** the two modes
4. **Use PostMedia component** with correct mode
5. **Test with various aspect ratios** (portrait, landscape, square)

---

**Last Updated:** December 27, 2025  
**Version:** 1.0  
**Critical:** Follow these rules exactly to match FB/IG behavior

