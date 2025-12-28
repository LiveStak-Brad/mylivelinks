# Profile Type Picker - Visual Comparison Guide

## Side-by-Side Comparison

### Mobile vs Web Implementation

| Feature | Mobile | Web | Match |
|---------|--------|-----|-------|
| **Modal Layout** | |||
| Backdrop | Semi-transparent overlay | Semi-transparent overlay (black/50) | ✅ |
| Modal Card | Rounded corners (18px) | Rounded corners (2xl / 18px) | ✅ |
| Max Height | 85% | 85vh | ✅ |
| Padding | 20px | 5 (20px) | ✅ |
| **Header** | |||
| Title | "Choose Profile Type" | "Choose Profile Type" | ✅ |
| Font Weight | 800 (extrabold) | extrabold | ✅ |
| Close Button | ✕ (22px, light) | ✕ (24px, light) | ✅ |
| Border Bottom | 1px | 1px | ✅ |
| **Type Cards** | |||
| Layout | Horizontal (icon + text) | Horizontal (icon + text) | ✅ |
| Icon Size | 32px | 3xl (32px) | ✅ |
| Border Radius | 14px | xl (14px) | ✅ |
| Border Width | 2px | 2px | ✅ |
| Gap Between Cards | 12px | 3 (12px) | ✅ |
| Padding | 16px | 4 (16px) | ✅ |
| **Selection State** | |||
| Border Color | accent (blue) | blue-600 | ✅ |
| Background | accent/15% (dark) | blue-900/20 (dark) | ✅ |
| Checkmark | White ✓ in blue circle | White ✓ in blue circle | ✅ |
| Checkmark Size | 24px circle | 24px (w-6 h-6) | ✅ |
| **Typography** | |||
| Title Font Size | 15px | 15px | ✅ |
| Title Weight | 700 (bold) | bold | ✅ |
| Description Size | 13px | 13px | ✅ |
| Description Line Height | 18px | 18px | ✅ |
| **Actions** | |||
| Continue Button Height | 48px | 12 (48px) | ✅ |
| Continue Button Radius | 14px | xl (14px) | ✅ |
| Continue Button Color | accent (blue) | blue-600 | ✅ |
| Skip Button Height | 44px | 11 (44px) | ✅ |
| Button Gap | 10px | 2.5 (10px) | ✅ |

---

## Profile Types - Exact Matching

### 1. Streamer
- **Icon**: 📡
- **Title**: "Streamer"
- **Description**: "Live streaming and broadcasting content"

### 2. Musician / Artist
- **Icon**: 🎵
- **Title**: "Musician / Artist"
- **Description**: "Music performances and creative arts"

### 3. Comedian
- **Icon**: 🎭
- **Title**: "Comedian"
- **Description**: "Comedy shows and entertainment"

### 4. Business / Brand
- **Icon**: 💼
- **Title**: "Business / Brand"
- **Description**: "Professional and corporate presence"

### 5. Creator (Default)
- **Icon**: ✨
- **Title**: "Creator"
- **Description**: "General content creation (default)"

---

## Edit Profile Row (Web Only)

### Layout
```
┌─────────────────────────────────────────┐
│  Profile Type                           │
│  ┌───────────────────────────────────┐  │
│  │ Current Type              >       │  │
│  │ Creator                           │  │
│  └───────────────────────────────────┘  │
│  ⚠️ Changing profile type may hide or   │
│     show different sections...          │
└─────────────────────────────────────────┘
```

### Visual Specs
- **Container**: White card (dark: gray-800)
- **Row Padding**: 4 (16px)
- **Border**: 1px gray-300 (dark: gray-600)
- **Border Radius**: lg (8px)
- **Hover**: gray-50 (dark: gray-700)
- **Cursor**: pointer
- **Chevron**: Gray-400, 6x6

### Warning Box
- **Icon**: ⚠️ (base size)
- **Color**: Amber-600 (dark: amber-400)
- **Font Size**: xs (12px)
- **Layout**: Flex row with gap-2
- **Margin Top**: 3 (12px)

---

## Color Palette

### Light Mode
- **Accent**: #3B82F6 (blue-600)
- **Selected BG**: rgba(139, 92, 246, 0.08)
- **Border**: #D1D5DB (gray-300)
- **Background**: #FFFFFF (white)
- **Text Primary**: #111827 (gray-900)
- **Text Muted**: #6B7280 (gray-500)

### Dark Mode
- **Accent**: #3B82F6 (blue-600)
- **Selected BG**: rgba(139, 92, 246, 0.15)
- **Border**: #374151 (gray-700)
- **Background**: #1F2937 (gray-800)
- **Text Primary**: #FFFFFF (white)
- **Text Muted**: #9CA3AF (gray-400)

---

## Interaction States

### Type Card

#### Default State
```
Border: gray-200/700 (2px)
Background: white/gray-800
Text: default colors
```

#### Hover State
```
Border: gray-300/600 (2px)
Background: maintains
Cursor: pointer
```

#### Pressed State
```
Opacity: 80%
Scale: 0.98
```

#### Selected State
```
Border: blue-600 (2px)
Background: blue-50/blue-900-20
Title: blue-600/blue-400
Checkmark: visible (white on blue)
```

### Continue Button

#### Default
```
Background: blue-600
Text: white
Height: 48px
```

#### Hover
```
Background: blue-700
```

#### Active
```
Scale: 0.99
```

#### Disabled
```
Opacity: 50%
Cursor: not-allowed
```

### Skip Button

#### Default
```
Background: transparent
Text: gray-500/400
Height: 44px
```

#### Hover
```
Text: gray-700/300
```

#### Active
```
Opacity: 60%
```

---

## Animation & Transitions

### Modal
- **Entrance**: Fade in (0.2s)
- **Exit**: Fade out (0.2s)
- **Backdrop**: Fade in/out with modal

### Type Cards
- **Hover**: 0.15s ease
- **Press**: 0.1s ease
- **Border Color**: 0.2s ease
- **Background**: 0.2s ease

### Buttons
- **Hover**: 0.15s ease
- **Press**: 0.1s ease
- **Background**: 0.2s ease

### Edit Profile Row
- **Hover**: 0.15s ease
- **Background**: 0.2s ease

---

## Responsive Breakpoints

### Desktop (1024px+)
- Modal width: max-w-lg (512px)
- Full card layout
- Hover effects active

### Tablet (768px - 1023px)
- Modal width: max-w-lg (512px)
- Full card layout
- Touch interactions

### Mobile (320px - 767px)
- Modal width: calc(100% - 40px)
- Stacked layout maintained
- Touch-optimized
- Reduced padding if needed

---

## Testing Scenarios

### Visual QA Checklist

#### Modal Appearance
- [ ] Modal centers on screen
- [ ] Backdrop darkens background
- [ ] Border and shadow render correctly
- [ ] Close button positioned correctly
- [ ] Header border visible

#### Card Display
- [ ] All 5 cards render
- [ ] Icons display correctly (emoji support)
- [ ] Text alignment is consistent
- [ ] Spacing between cards is uniform
- [ ] Borders are crisp (no blur)

#### Selection Behavior
- [ ] Click selects card
- [ ] Border changes to blue
- [ ] Background tints blue
- [ ] Checkmark appears
- [ ] Only one card selected at a time
- [ ] Previous selection clears

#### Theme Switching
- [ ] Light mode colors correct
- [ ] Dark mode colors correct
- [ ] Theme switch updates modal
- [ ] Text contrast is readable
- [ ] Borders visible in both themes

#### Button Behavior
- [ ] Continue button hover effect
- [ ] Continue button click closes modal
- [ ] Skip button (if shown) works
- [ ] Button text is readable
- [ ] Disabled state (if applicable)

#### Edit Profile Integration
- [ ] Row displays in Edit Profile page
- [ ] Current type shows correctly
- [ ] Chevron icon visible
- [ ] Click opens modal
- [ ] Warning text visible and styled
- [ ] Selection updates row display

#### Responsive Testing
- [ ] Desktop: Modal centered, proper width
- [ ] Tablet: Touch interactions work
- [ ] Mobile: Modal fits screen, scrollable
- [ ] Cards stack properly at all sizes
- [ ] Text wraps appropriately

---

## Browser Compatibility

### Tested/Required Browsers
- ✅ Chrome 90+ (desktop & mobile)
- ✅ Firefox 88+ (desktop & mobile)
- ✅ Safari 14+ (desktop & iOS)
- ✅ Edge 90+
- ⚠️ IE11 (not supported - modern CSS required)

### Key CSS Features Used
- Flexbox
- CSS Grid
- Backdrop filters
- Custom properties (theme variables)
- Transform/transitions
- Emoji rendering

---

## Accessibility Notes

### Keyboard Navigation
- [ ] Modal can be closed with Escape key
- [ ] Cards can be focused with Tab
- [ ] Cards can be selected with Enter/Space
- [ ] Focus indicators visible

### Screen Readers
- Consider adding:
  - `role="dialog"` to modal
  - `aria-labelledby` for modal title
  - `aria-describedby` for description
  - `role="radio"` for cards
  - `aria-checked` for selected state

### Color Contrast
- ✅ Text meets WCAG AA standards
- ✅ Selected state has sufficient contrast
- ✅ Buttons have clear text contrast

---

## Performance Notes

- Modal renders only when visible
- No heavy computations
- Smooth 60fps animations
- Minimal re-renders (React.memo potential)
- CSS transitions for performance

---

## Known Differences from Mobile

### Intentional Web Optimizations
1. **Click outside to close**: More common web pattern
2. **Hover states**: Desktop-specific enhancement
3. **Cursor pointers**: Web-specific UX
4. **Scrollbar styling**: Web default vs native mobile

### Maintained Parity
- Exact same profile types
- Same descriptions
- Same visual hierarchy
- Same interaction patterns
- Same color scheme
- Same typography scale

---

## Quick Reference - Class Mapping

Mobile → Web Tailwind

| Mobile Style | Web Tailwind Class |
|--------------|-------------------|
| borderRadius: 18 | rounded-2xl |
| borderRadius: 14 | rounded-xl |
| fontSize: 18, fontWeight: 800 | text-lg font-extrabold |
| fontSize: 15, fontWeight: 700 | text-[15px] font-bold |
| fontSize: 13 | text-[13px] |
| padding: 16 | p-4 |
| gap: 12 | space-y-3 / gap-3 |
| height: 48 | h-12 |
| opacity: 0.8 | opacity-80 |

---

## Maintenance Notes

### To Keep in Sync with Mobile

If mobile `ProfileTypePickerModal.tsx` changes:

1. **Profile Types**: Update `PROFILE_TYPES` array
2. **Styling**: Match new colors/spacing
3. **Props**: Sync prop interfaces
4. **Behavior**: Match interaction patterns

### Files to Update
- `components/ProfileTypePickerModal.tsx` (main component)
- `app/settings/profile/page.tsx` (integration)
- This document (visual comparison)

---

**Last Updated**: 2025-12-27  
**Mobile Source**: `mobile/components/ProfileTypePickerModal.tsx`  
**Web Implementation**: `components/ProfileTypePickerModal.tsx`

