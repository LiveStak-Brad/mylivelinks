# Spacing & Opacity Parity Instructions

## Summary for Manager

This document provides the exact location of the opacity setting and spacing rules that ALL agents must follow when working on profile type sections, web, and mobile.

---

## ✅ Answer to Question #4: Where the Opacity Setting Lives

**Supabase field: `profiles.card_opacity`**

- **Type**: `DECIMAL(3, 2)` (value between 0-1)
- **Default**: `0.95`
- **Schema location**: `profile_system_schema.sql` line 34-35
- **UI control**: `app/settings/profile/page.tsx` → ProfileCustomization component
  - Lines 233-250: Slider from 30% to 100%
  - Stored directly to Supabase `profiles` table
- **How it's applied**: `app/[username]/modern-page.tsx` lines 382-385

```typescript
const cardStyle = {
  backgroundColor: profile.card_color || '#FFFFFF',
  opacity: profile.card_opacity || 0.95
};
```

**This `cardStyle` object is passed to ALL profile type section components.**

---

## 🚨 Current Problem: Inconsistent Glass Styling

### What's Wrong

**Profile type sections** (MusicShowcase, Portfolio, BusinessInfo, etc.) use:
```tsx
className="backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
style={cardStyle}
```

**But:**
1. `ModernLinksSection` does NOT use `backdrop-blur-sm` 
2. Some sections have different padding/spacing
3. The glass effect is inconsistent across sections

### What's Correct (from profile type sections)

All profile type sections in `components/profile/sections/` correctly use:
- ✅ `backdrop-blur-sm` for glass effect
- ✅ `cardStyle` prop with user's opacity setting
- ✅ Consistent border styling
- ✅ Consistent padding

**Example from `MusicShowcase.tsx` (lines 39-40, 72-73):**
```tsx
<div 
  className="backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
  style={cardStyle}
>
```

---

## 📐 Locked Spacing Rules (Section 3)

### Global Container Width
**One global page container** already exists in `modern-page.tsx` line 450:
```tsx
<div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20">
```

**Rule**: All sections must respect this container. No custom widths.

### Vertical Rhythm

#### Section-to-Section Gap
**Standard gap**: `mb-6` (24px / 1.5rem)

Used in `modern-page.tsx`:
- Line 46: `className="...mb-6"` for links section container
- All profile type sections should follow same pattern

#### Card Internal Padding
**Standard padding**: `p-6` (24px all sides)

All profile type sections use: `p-6` (lines 39, 72 in all section components)

#### Header Spacing Above Tabs
**Standard spacing**: `mb-4` (16px)

Example from profile type sections:
```tsx
<h2 className="...mb-4">
```

### Quick Actions Row
Uses same gap as other button rows (current implementation is correct)

### Sections Stack
Uses same `mb-6` gap as other pages' stacked cards

---

## 🔧 What Agents Must Do

### 1. Fix `ModernLinksSection` Glass Effect

**File**: `components/profile/ModernLinksSection.tsx`

**Current (line 46)**:
```tsx
<div className={`${borderRadiusClass} shadow-lg overflow-hidden mb-6`} style={cardStyle}>
```

**Should be**:
```tsx
<div 
  className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`} 
  style={cardStyle}
>
```

**Note**: Remove the nested `<div className="p-6">` on line 47 since padding is now on outer div.

---

### 2. Fix `AdultLinksSection` Glass Effect

**File**: `components/adult/AdultLinksSection.tsx`

Search for the container div and apply same pattern as above.

---

### 3. Verify All Profile Type Sections

Check that ALL section components have:
- ✅ `backdrop-blur-sm`
- ✅ `style={cardStyle}` prop
- ✅ Consistent `p-6` padding
- ✅ Consistent border classes

**Files to verify**:
- `components/profile/sections/MusicShowcase.tsx` ✅ (already correct)
- `components/profile/sections/Portfolio.tsx` ✅ (already correct)
- `components/profile/sections/BusinessInfo.tsx` ✅ (already correct)
- `components/profile/sections/Merchandise.tsx` ✅ (already correct)
- `components/profile/sections/UpcomingEvents.tsx` ✅ (already correct)

---

### 4. Mobile Parity

**Mobile equivalent files** (in `mobile/components/` and `mobile/screens/`):
- Must use same spacing tokens
- Must respect user opacity setting from Supabase
- Must use consistent glass styling

**Search for**: Profile section components in mobile folder
**Apply**: Same `backdrop-blur-sm` and spacing rules

---

## 🎯 Standard Glass Panel Class (Copy-Paste Ready)

Use this exact className for ALL profile sections (web and mobile):

```tsx
<div 
  className="backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6"
  style={cardStyle}
>
  {/* Section content */}
</div>
```

Where `cardStyle` comes from parent component (modern-page.tsx lines 382-385).

---

## ✅ Manager Acceptance Checklist

When this is complete, verify:

1. **Opacity Test**:
   - [ ] Go to `/settings/profile`
   - [ ] Change card opacity slider (e.g., 50%)
   - [ ] Save and refresh profile page
   - [ ] ALL sections match the same opacity:
     - Links section
     - Adult links section (if visible)
     - Music showcase
     - Portfolio
     - Business info
     - Merchandise
     - Upcoming events
     - Posts/photos tabs

2. **Glass Effect Test**:
   - [ ] All sections have frosted glass look (`backdrop-blur-sm`)
   - [ ] Background shows through consistently
   - [ ] No solid opaque sections

3. **Spacing Test**:
   - [ ] All sections have same vertical gap (`mb-6`)
   - [ ] All cards have same internal padding (`p-6`)
   - [ ] No sections have awkward dead space
   - [ ] All sections align to same container width

4. **Mobile Test**:
   - [ ] Mobile profile sections match web spacing
   - [ ] Mobile profile sections use same opacity setting
   - [ ] Mobile profile sections have same glass effect

---

## 🔍 Quick Search Commands for Agents

**Find all backdrop-blur usage**:
```bash
grep -r "backdrop-blur" components/profile app/[username]
```

**Find sections missing cardStyle**:
```bash
grep -r "Section" components/profile | grep -v "style={cardStyle}"
```

**Find inconsistent padding**:
```bash
grep -r "className.*p-[0-9]" components/profile/sections
```

---

## 📊 Data Flow Summary

1. **User sets opacity**: `/settings/profile` → ProfileCustomization component
2. **Saved to Supabase**: `profiles.card_opacity` field (0-1)
3. **Fetched on profile load**: `modern-page.tsx` → `profileData.profile.card_opacity`
4. **Converted to style object**: Lines 382-385 → `cardStyle`
5. **Passed to all sections**: Each section receives `cardStyle` prop
6. **Applied with glass effect**: `style={cardStyle}` + `backdrop-blur-sm`

---

## 🎨 Visual Reference

**Correct appearance**:
- Frosted glass effect on all cards
- Background visible through cards
- Consistent opacity across all sections
- Consistent spacing between sections

**Incorrect appearance**:
- Some cards solid, some see-through
- Inconsistent blur effects
- Different spacing between sections
- Cards don't align to same width

---

## End of Instructions

**Agent directive**: Fix ModernLinksSection and AdultLinksSection first, then verify all other sections follow the standard. Test with different opacity values (30%, 50%, 100%) to ensure consistency.

