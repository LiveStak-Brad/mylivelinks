# UI Agent A — Web Full Composer Deliverables

**Status:** ✅ COMPLETE  
**Time:** Completed within timebox  
**Agent:** UI Agent A — Web Full Composer (Next.js)

---

## A) Menu Placement ✅

### Changes Made

**File:** `components/UserMenu.tsx`

- Added "Composer" menu item to the top-right user dropdown menu
- Positioned after "Analytics" and before "Theme Toggle"
- Uses Film icon with pink color (`text-pink-500`)
- Links to `/composer` route
- Visually consistent with existing menu items (Wallet, Analytics, etc.)

**Import added:**
```typescript
import { Film } from 'lucide-react';
```

**Menu item added:**
```typescript
<MenuItem
  href="/composer"
  onClick={closeMenu}
  icon={Film}
  iconColor="text-pink-500"
  label="Composer"
/>
```

---

## B) Web Composer Routes/Pages ✅

### 1. Composer Projects List Page

**File:** `app/composer/page.tsx` (NEW)

**Route:** `/composer`

**Features:**
- Two-tab view: **Drafts** and **Posted**
- Tab switcher with active state styling (opaque `bg-card` surfaces)
- "New Project" button (top-right) → navigates to `/composer/new`
- Empty state placeholders with clear messaging:
  - Drafts: "No drafts yet — Your draft projects will appear here"
  - Posted: "No posted projects — Your published projects will appear here"
- Project cards (for when data exists):
  - Aspect-ratio video thumbnail placeholder
  - Project title
  - Last updated timestamp
  - Clickable → navigates to `/composer/[projectId]`

**Entry Points:**
- From top-right user menu → Composer
- Direct navigation to `/composer`

**UI Notes:**
- Uses design system tokens (bg-card, text-foreground, etc.)
- Fully responsive (mobile + desktop)
- Empty states use dashed borders and icon placeholders
- No fake data — shows clean "No X yet" states

---

### 2. Composer Editor Page

**File:** `app/composer/[projectId]/page.tsx` (NEW)

**Routes:** 
- `/composer/new` — New project
- `/composer/[projectId]` — Edit existing project

**Features:**

#### Top Banner (Web ONLY) ✅
```
🔔 Save more! Coins are cheaper on the Web app than mobile
```
- Gradient background: `from-amber-500 to-orange-500`
- White text with Info icon
- Full-width, sticky positioning
- Clear messaging about Web cost advantage

#### Editor Layout:

**Header Section:**
- Back button → `/composer`
- Editable project title (inline input)
- Save button (placeholder handler)
- Publish button (gradient primary/accent)

**Producer + Actors UI:**
- **Producer** chip:
  - Purple badge with User icon
  - Shows current user's username
  - Format: `@username`
- **Actors** chips:
  - Blue badges with User icon
  - Removable (hover shows X button)
  - Format: `@username`
- **Add Actor** button:
  - Dashed border placeholder
  - UserPlus icon
  - Opens actor search (alert stub for now)

**Main Editor Area (Left Column):**
- Video preview placeholder (16:9 aspect ratio)
- Timeline placeholder (dashed border with "Coming soon" text)

**Tools Sidebar (Right Column):**
- **Advanced Tools** card:
  - Trim & Cut (disabled, shows "Soon")
  - Audio (disabled)
  - Text & Titles (disabled)
  - Filters (disabled)
  - Effects (disabled)
- **Export Settings** card:
  - Quality: 1080p
  - Format: MP4
  - Duration: 0:00

**Entry Points:**
- From Composer list → New Project button
- From Composer list → Click existing project
- From clip completion → "Send to Composer" (navigates to `/composer/new`)

**UI Notes:**
- Responsive grid layout (1 column mobile, 3 columns desktop)
- Tool buttons clearly marked as disabled with "Soon" labels
- All surfaces use opaque `bg-card` backgrounds
- Placeholder handlers with alert() for non-wired features

---

## C) Clip Result Actions UI ✅

### ClipActions Component

**File:** `components/ClipActions.tsx` (NEW)

**Features:**
- Four action buttons:
  1. **Post to Feed** — Primary gradient button
  2. **Save** — Secondary muted button
  3. **Post + Save** — Accent green gradient button
  4. **Send to Composer** — Outline primary button (✅ FUNCTIONAL)

**Variants:**
- `horizontal` — Buttons in a row (default)
- `vertical` — Buttons stacked
- `compact` — Shows only "Post + Save" and "Send to Composer"

**Button States:**
- Hover: opacity/scale animations
- Active: scale down (0.98)
- Disabled: reduced opacity, cursor-not-allowed

**Handlers:**
- All buttons have placeholder handlers (show alerts)
- **"Send to Composer"** navigates to `/composer/new` (fully functional)
- Ready for backend wiring via `onAction` callback

---

### Integration in FeedPostCard

**File:** `components/feed/FeedPostCard.tsx` (MODIFIED)

**Changes:**

**New Props:**
```typescript
isClipCompletion?: boolean;  // If true, show clip actions
clipId?: string;              // Clip ID
onClipAction?: (action: 'post' | 'save' | 'post-save' | 'composer') => void;
```

**Conditional Rendering:**
```typescript
{isClipCompletion ? (
  <div className="px-4 py-4 border-t border-border">
    <ClipActions
      clipId={clipId}
      onAction={onClipAction}
      variant="horizontal"
      compact={false}
    />
  </div>
) : (
  // Standard Like/Comment/Share actions
)}
```

**Usage Example:**
```typescript
<FeedPostCard
  authorName="Creator"
  authorUsername="username"
  content="Check out my clip!"
  media={<video />}
  isClipCompletion={true}
  clipId="clip-123"
  onClipAction={(action) => console.log('Clip action:', action)}
/>
```

---

## D) Global UI Rule — Opaque Surfaces ✅

**File:** `components/ComposerModal.tsx` (NEW)

**Implementation:**
- All modals/popups use **opaque** `bg-card` backgrounds
- Light mode: solid white (`0 0% 100%`)
- Dark mode: solid near-black (`240 12% 9%`)
- Backdrop: translucent `bg-black/50` with blur
- Content surfaces: **NEVER translucent**

**Example Modal:**
```typescript
<ComposerModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add Actor"
>
  {/* Content here */}
</ComposerModal>
```

**Includes:**
- `ComposerModal` — Base modal component
- `ActorSearchModal` — Example implementation for "Add Actor"

**Features:**
- Escape key to close
- Click backdrop to close
- Scroll lock when open
- Scale-in animation
- Fully accessible (ARIA labels, focus management)

---

## Files Changed

### New Files Created (5)

1. **`app/composer/page.tsx`**  
   Composer Projects List page (Drafts/Posted tabs)

2. **`app/composer/[projectId]/page.tsx`**  
   Composer Editor page (with banner, producer/actors UI, tools)

3. **`components/ClipActions.tsx`**  
   Clip completion action buttons component

4. **`components/ComposerModal.tsx`**  
   Opaque theme-aware modal component (with example actor search)

5. **`UI_AGENT_A_WEB_COMPOSER_DELIVERABLES.md`** (this file)  
   Complete deliverables documentation

### Modified Files (2)

6. **`components/UserMenu.tsx`**  
   Added "Composer" menu item with Film icon

7. **`components/feed/FeedPostCard.tsx`**  
   Added clip completion actions integration

---

## Routes Added

| Route | Description | Entry Point |
|-------|-------------|-------------|
| `/composer` | Composer projects list (Drafts/Posted) | User menu → Composer |
| `/composer/new` | New composer project | Projects list → New Project button |
| `/composer/[projectId]` | Edit existing project | Projects list → Click project card |

---

## Navigation Flow

```
Top-right User Menu
  ↓ Click "Composer"
  ↓
Composer Projects List (/composer)
  - Tab: Drafts / Posted
  - Button: "New Project"
  ↓ Click "New Project"
  ↓
Composer Editor (/composer/new)
  - Top banner: "Coins cheaper on Web"
  - Producer + Actors UI
  - Video preview + Timeline
  - Advanced tools (disabled)
  - Save / Publish buttons

Clip Completion Flow (anywhere clips appear)
  ↓ Click "Send to Composer"
  ↓
Composer Editor (/composer/new)
  (Same as above)
```

---

## UI Screenshots / Description

### 1. User Menu with Composer Item
- Location: Top-right dropdown
- Icon: Film (pink)
- Position: After Analytics, before Theme Toggle
- Visual: Matches existing menu items (Wallet, Analytics)

### 2. Composer Projects List
- Header: Gradient icon badge + title + "New Project" button
- Tabs: Drafts / Posted (pill-style switcher)
- Empty state: Dashed card with icon + message
- Projects: Grid of cards (when data exists)

### 3. Composer Editor
- **Top banner:** Orange gradient, white text, info icon
- **Header:** Back button + title input + Save/Publish
- **Producer/Actors:** Purple/blue chips with @usernames
- **Main area:** 16:9 video preview + timeline
- **Sidebar:** Advanced tools (disabled) + export settings

### 4. Clip Actions in Feed
- Four buttons: Post to Feed, Save, Post + Save, Send to Composer
- Horizontal layout with gradient/muted/outline styles
- Clean spacing, accessible labels

---

## Deferred / Not Implemented

### Intentionally Stubbed (UI Only)

1. **Actor Search** — Shows alert, ready for search modal wiring
2. **Save/Publish handlers** — Shows alerts, ready for backend
3. **Post to Feed/Save actions** — Shows alerts, ready for API calls
4. **Advanced tools** — Disabled buttons with "Soon" labels
5. **Video upload/preview** — Placeholder with icon
6. **Timeline editor** — Placeholder with dashed border

### Not Blocked

All UI is complete and functional. The "Send to Composer" button fully works (navigates to `/composer/new`). Everything else is ready for backend wiring with clean placeholder handlers.

---

## Design System Compliance

✅ Uses design tokens from `app/globals.css`:
- `bg-card` / `text-foreground` (opaque surfaces)
- `bg-muted` / `text-muted-foreground`
- `from-primary to-accent` gradients
- `border-border` / `rounded-xl` / `shadow-md`
- All spacing uses Tailwind scale

✅ Theme-aware:
- Light mode: solid white surfaces
- Dark mode: solid near-black surfaces
- Backdrop: translucent with blur

✅ Accessible:
- ARIA labels on all interactive elements
- Keyboard navigation (Escape to close modals)
- Focus states with ring utilities
- Semantic HTML (main, header, nav)

✅ Responsive:
- Mobile-first design
- Adaptive layouts (grid/flex)
- Hidden labels on mobile where needed
- Touch-friendly button sizes

---

## Testing Notes

### Manual Testing Completed

1. ✅ Menu item appears in user dropdown
2. ✅ Clicking "Composer" navigates to `/composer`
3. ✅ Tabs switch between Drafts/Posted
4. ✅ Empty states display correctly
5. ✅ "New Project" button navigates to `/composer/new`
6. ✅ Back button returns to `/composer`
7. ✅ Producer chip displays current user
8. ✅ "Add Actor" shows alert (placeholder)
9. ✅ Tool buttons show disabled state
10. ✅ "Send to Composer" navigates correctly
11. ✅ All modals use opaque backgrounds
12. ✅ Theme switching works (light/dark)

### No Linter Errors
```
✅ components/UserMenu.tsx
✅ app/composer/page.tsx
✅ app/composer/[projectId]/page.tsx
✅ components/ClipActions.tsx
✅ components/feed/FeedPostCard.tsx
✅ components/ComposerModal.tsx
```

---

## Commit Message Suggestion

```
feat(composer): Add Web Full Composer UI with clip actions

- Add "Composer" menu item to user dropdown (Film icon, pink)
- Create Composer Projects List page (/composer) with Drafts/Posted tabs
- Create Composer Editor page (/composer/[projectId]) with:
  - Top banner: "Coins are cheaper on the Web app"
  - Producer + Actors UI (chips with add/remove)
  - Video preview + timeline placeholders
  - Advanced tools sidebar (disabled, marked "Soon")
  - Export settings display
- Create ClipActions component with Post/Save/Composer buttons
- Integrate ClipActions into FeedPostCard (isClipCompletion prop)
- Create ComposerModal with opaque bg-card surfaces (Global UI Rule)
- All surfaces theme-aware (solid white/near-black, no translucency)
- "Send to Composer" fully functional, other actions stubbed
- No backend changes, no LiveKit modifications
- Ready for backend wiring via clean placeholder handlers

Files: 5 new, 2 modified
Routes: /composer, /composer/new, /composer/[projectId]
```

---

## Next Steps (for Backend Agent or Future Work)

1. Wire actor search functionality
2. Implement save/publish API endpoints
3. Add video upload + storage
4. Connect timeline editor tools
5. Wire "Post to Feed" and "Save" actions
6. Add project data persistence
7. Implement project list loading from DB

---

**Delivered by:** UI Agent A  
**Date:** 2025-12-28  
**Hard constraints met:**
- ✅ No LiveKit modifications
- ✅ No backend table/RPC changes
- ✅ Ship-ready UI in <4 hours
- ✅ Opaque surfaces (Global UI Rule)

**Status:** Ready for handoff and backend integration 🚀

