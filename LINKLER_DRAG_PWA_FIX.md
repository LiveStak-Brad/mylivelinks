# Linkler Drag + PWA Bottom-Nav Safe Zone Fix

## Summary
Fixed Linkler floating widget to be draggable on mobile PWA without scrolling the page, and ensured it never overlaps the bottom navigation bar.

## Files Changed

### 1. `components/linkler/LinklerWidget.tsx`
**Changes:**
- Added `BOTTOM_NAV_HEIGHT_FALLBACK = 80` constant
- Added `getBottomNavHeight()` function to measure actual bottom nav height from DOM
- Modified `getVisualViewportInsets()` to include bottom nav height + safe area insets in bottom margin calculation
- Added `bottomNavHeight` state to track nav height dynamically
- Added 100ms delay timer in viewport update effect to ensure DOM is ready
- Added `touchAction: 'none'` styles to draggable container and button
- Added `event.preventDefault()` in `handlePointerMove` to prevent page scroll
- Added `document.body.classList.add('dragging-linkler')` when drag starts
- Added `document.body.classList.remove('dragging-linkler')` when drag ends/cancels
- Fixed reopen button positioning to calculate `bottom` dynamically: `bottomNavHeight + safeAreaInset + 16px`

### 2. `styles/linkler.css` (NEW FILE)
**Purpose:** Prevent page scroll and overscroll during Linkler drag
```css
body.dragging-linkler {
  overscroll-behavior: none;
  overflow: hidden;
  -webkit-overflow-scrolling: auto;
}

:root {
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}
```

### 3. `app/layout.tsx`
**Changes:**
- Added `import '@/styles/linkler.css';` to load drag prevention styles globally

## How Bottom Nav Height is Measured

**Primary Method:**
```typescript
const bottomNav = document.querySelector('.bottom-nav');
if (bottomNav) {
  const rect = bottomNav.getBoundingClientRect();
  return rect.height;
}
```

**Fallback Value:** `80px` (if bottom nav element not found)

**Update Triggers:**
- Window resize
- Orientation change
- Visual viewport resize/scroll
- Initial mount (with 100ms delay to ensure DOM ready)

## Technical Implementation

### Safe Area Bounds Calculation
```typescript
// Bottom inset includes:
// 1. Visual viewport bottom offset
// 2. Bottom nav height (measured from DOM)
// 3. Safe area inset (from CSS env variable)
bottom = Math.max(bottom, bottomNavHeight + safeAreaBottom);
```

### Drag Behavior
1. **Pointer Down:** Capture pointer, store initial position
2. **Pointer Move:** 
   - Call `preventDefault()` to stop page scroll
   - Add `dragging-linkler` class to body (disables overflow)
   - Clamp position to safe bounds
3. **Pointer Up/Cancel:**
   - Remove `dragging-linkler` class (re-enables scroll)
   - Snap to nearest edge
   - Save placement to localStorage

### Reopen Button Position
```typescript
const reopenBottom = bottomNavHeight + safeAreaInset + 16;
// Positioned at: bottom: `${reopenBottom}px`
```

## Testing Checklist

### Mobile PWA (Android Chrome + iOS Safari PWA)
- [x] Linkler drags smoothly without scrolling page
- [x] No browser swipe-back gesture triggers during drag
- [x] Widget stops above bottom nav (never overlaps)
- [x] Widget snaps back if dragged too low
- [x] Reopen button always visible above bottom nav
- [x] Screen rotation maintains bounds
- [x] Safe area insets respected on iOS

### Desktop
- [x] Drag still works normally
- [x] No layout regressions
- [x] Bottom nav hidden on desktop (no impact)

## Key Features
✅ Draggable without page scroll  
✅ Respects bottom nav height (measured from DOM)  
✅ Respects iOS safe area insets  
✅ Snaps to edges after drag  
✅ Reopen button positioned above nav  
✅ Works on orientation change  
✅ Fallback values if DOM not ready
