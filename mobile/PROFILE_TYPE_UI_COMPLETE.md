# Profile Type Selection UI — Complete

## 🎯 Overview

UI Agent 1 deliverable: Profile Type Picker & Settings Integration

This is a **UI-only implementation** with no backend dependencies. All profile type selection logic is stubbed out with placeholder handlers and TODO comments for future integration.

---

## ✅ Deliverables

### Components Created

#### 1. `ProfileTypePickerModal.tsx`
- **Location**: `mobile/components/ProfileTypePickerModal.tsx`
- **Purpose**: Modal dialog for selecting profile type
- **Features**:
  - Card-based selection UI with icons and descriptions
  - Single-select with visual feedback
  - "Continue" primary action
  - Optional "Skip for now" secondary action (defaults to Creator)
  - Fully themed (light/dark mode support)
  - Clean, minimal design matching existing app style

#### 2. Profile Type Row in EditProfileScreen
- **Location**: `mobile/screens/EditProfileScreen.tsx` (modified)
- **Features**:
  - New "Profile Type" field in Edit Profile screen
  - Tappable row that opens picker modal
  - Shows current selection
  - Warning text: "Changing type may hide/show sections. Nothing is deleted."
  - Chevron indicator for navigation

---

## 📋 Profile Types

The following profile types are available:

| Type | Icon | Title | Description |
|------|------|-------|-------------|
| `streamer` | 📡 | Streamer | Live streaming and broadcasting content |
| `musician` | 🎵 | Musician / Artist | Music performances and creative arts |
| `comedian` | 🎭 | Comedian | Comedy shows and entertainment |
| `business` | 💼 | Business / Brand | Professional and corporate presence |
| `creator` | ✨ | Creator | General content creation (default) |

---

## 🎨 UI Design

### ProfileTypePickerModal

**Layout**:
- Header with title and close button
- Scrollable list of profile type cards
- Each card shows: icon, title, description
- Selected card has accent border and checkmark
- Footer with action buttons

**Interaction**:
- Tap card to select (single select)
- Tap "Continue" to confirm selection
- Tap "Skip for now" to set Creator as default (if enabled)
- Tap backdrop or close button to dismiss

**Theming**:
- Full light/dark mode support
- Uses app's theme tokens
- Matches existing modal patterns
- Clean, modern card design

### Edit Profile Integration

**Profile Type Row**:
- Label: "Profile Type"
- Current selection displayed in styled row
- Right chevron indicator (›)
- Tappable to open picker
- Warning text below in amber color

---

## 🔧 Technical Implementation

### State Management

```typescript
const [profileType, setProfileType] = useState<ProfileType>('creator');
const [showTypePickerModal, setShowTypePickerModal] = useState(false);
```

### Type Definition

```typescript
export type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator';
```

### Placeholder Handler

The `onSelect` handler in `EditProfileScreen.tsx` currently only updates local state:

```typescript
onSelect={(type) => {
  setProfileType(type);
  // TODO: Save to backend when field is added
}}
```

### TODO Comments

The following TODO comments mark integration points for future backend work:

1. **Line 65-66** in `EditProfileScreen.tsx`:
   ```typescript
   // TODO: Load actual profile type from backend when field exists
   ```

2. **Line 93** in `EditProfileScreen.tsx`:
   ```typescript
   // TODO: Save profileType to backend when field is added
   ```

3. **Line 191** in `EditProfileScreen.tsx`:
   ```typescript
   // TODO: Save to backend when field is added
   ```

---

## 📦 Files Changed

### New Files
- `mobile/components/ProfileTypePickerModal.tsx` (new)

### Modified Files
- `mobile/screens/EditProfileScreen.tsx`
  - Added ProfileType state
  - Added modal visibility state
  - Added Profile Type row in form
  - Added ProfileTypePickerModal component
  - Added formatProfileType helper function
  - Added styles for profile type row and warning text

---

## 🚀 Usage

### Opening the Picker

Navigate to Edit Profile screen and tap the "Profile Type" row:

```
Options Menu → Edit Profile → Profile Type (tap)
```

### Making a Selection

1. Modal opens with 5 profile type cards
2. Tap desired profile type card (highlights with accent color)
3. Tap "Continue" button
4. Modal closes and selection is updated in UI

### Skipping Selection

If `allowSkip` prop is enabled:
1. Tap "Skip for now" button
2. Profile type set to "Creator" (default)
3. Modal closes

---

## 🎯 Component Props

### ProfileTypePickerModal Props

```typescript
type ProfileTypePickerModalProps = {
  visible: boolean;              // Control modal visibility
  onClose: () => void;           // Called when modal should close
  currentType?: ProfileType;     // Currently selected type (default: 'creator')
  onSelect?: (type: ProfileType) => void;  // Called when user confirms selection
  allowSkip?: boolean;           // Show "Skip for now" button (default: false)
};
```

---

## 🔍 No Backend Assumptions

This implementation makes **zero backend assumptions**:

- ❌ Does not read from database
- ❌ Does not write to database
- ❌ Does not call any APIs
- ❌ Does not modify profile schema
- ✅ Pure UI with local state only
- ✅ Ready for backend integration via TODO markers

---

## 🎨 Styling Philosophy

**Matches Existing Patterns**:
- Uses `useThemeMode()` hook for theming
- Follows `createStyles(theme)` pattern
- Uses existing color tokens and elevations
- Consistent with other modals (OptionsMenu, etc.)
- Clean, minimal, modern design

**Design Principles**:
- Clear visual hierarchy
- Obvious selected state
- Smooth press interactions
- Accessible touch targets
- Warning text for user awareness

---

## ✨ Future Integration Points

When backend is ready, integrate at these points:

### 1. Database Schema
Add `profile_type` column to profiles table:
```sql
ALTER TABLE profiles 
ADD COLUMN profile_type TEXT DEFAULT 'creator' 
CHECK (profile_type IN ('streamer', 'musician', 'comedian', 'business', 'creator'));
```

### 2. Load Profile Type
Replace TODO at line 65-66 in `EditProfileScreen.tsx`:
```typescript
const row = data as any as ProfileRow;
setProfile(row);
setDisplayName(String(row.display_name ?? ''));
setBio(String(row.bio ?? ''));
setProfileType(row.profile_type ?? 'creator'); // ← Add this
```

### 3. Save Profile Type
Update the save function at line 93-100:
```typescript
const { error: e } = await supabase
  .from('profiles')
  .update({
    display_name: displayName.trim() || null,
    bio: bio.trim() || null,
    profile_type: profileType, // ← Add this
    updated_at: new Date().toISOString(),
  } as any)
  .eq('id', userId);
```

### 4. Section Rendering Logic
Use `profileType` to conditionally show/hide profile sections in other components (out of scope for this agent).

---

## 🧪 Testing

### Manual Testing Steps

1. **Open Edit Profile**
   - Navigate to Options → Edit Profile
   - Verify Profile Type row appears

2. **Open Picker**
   - Tap Profile Type row
   - Verify modal opens with 5 cards

3. **Select Type**
   - Tap each card, verify selection highlights
   - Verify checkmark appears on selected card
   - Verify accent border on selected card

4. **Confirm Selection**
   - Tap Continue button
   - Verify modal closes
   - Verify Profile Type row updates with new selection

5. **Test Light/Dark Mode**
   - Toggle theme in Preferences
   - Verify picker modal adapts to theme
   - Verify all colors and borders look correct

6. **Test Dismiss**
   - Open picker
   - Tap backdrop → modal closes
   - Tap close button → modal closes

---

## 📝 Notes

### Design Decisions

1. **Single Select Only**: Only one profile type can be selected at a time
2. **Creator as Default**: If user skips or doesn't select, "Creator" is used
3. **Warning Text**: Amber-colored warning informs users about section visibility changes
4. **No Auto-Save**: Selection only saved when user taps main "Save" button
5. **Local State Only**: All changes kept in memory until explicit save

### Scope Boundaries

**In Scope** ✅:
- Profile type picker modal UI
- Profile type row in Edit Profile
- Visual selection state
- Theme support

**Out of Scope** ❌:
- Backend integration
- Database schema changes
- Profile section rendering logic
- API calls
- LiveRoom modifications
- Feed modifications

---

## 🎉 Completion Status

**Status**: ✅ Complete

All requirements from the prompt have been met:
- ✅ Profile Type Picker modal created
- ✅ Profile Type row added to Edit Profile
- ✅ 5 profile types with icons, titles, descriptions
- ✅ Single select with visual feedback
- ✅ "Continue" CTA
- ✅ "Skip for now" option (optional prop)
- ✅ Warning text about section visibility
- ✅ Clean, minimal styling matching existing app
- ✅ No backend assumptions
- ✅ Placeholder handlers only
- ✅ Zero modifications to profile sections, LiveRoom, or feeds

---

## 🔗 Related Files

- `mobile/components/ProfileTypePickerModal.tsx` — Main modal component
- `mobile/screens/EditProfileScreen.tsx` — Integration point
- `mobile/contexts/ThemeContext.tsx` — Theme system
- `mobile/components/ui/Modal.tsx` — Modal pattern reference
- `mobile/components/OptionsMenu.tsx` — Similar menu pattern

---

**Delivered by**: UI Agent 1  
**Date**: 2025-12-27  
**No further action required** — Ready for backend integration when schema is added.

