# Profile Type UI — Quick Start

## 🚀 Quick Reference

For developers who want to quickly understand and use the Profile Type selection UI.

---

## 📍 Where to Find It

**In the App**:
```
Options Menu → Edit Profile → Profile Type (tap)
```

**In Code**:
- Component: `mobile/components/ProfileTypePickerModal.tsx`
- Integration: `mobile/screens/EditProfileScreen.tsx`

---

## 🎯 5-Second Summary

Added a profile type picker to Edit Profile screen. Pure UI, no backend. Ready to integrate.

---

## 💻 How to Use the Component

### Basic Usage

```typescript
import { ProfileTypePickerModal, type ProfileType } from '../components/ProfileTypePickerModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<ProfileType>('creator');

  return (
    <>
      <Button onPress={() => setShowModal(true)}>Choose Type</Button>
      
      <ProfileTypePickerModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        currentType={type}
        onSelect={(newType) => {
          setType(newType);
          // Save to backend here
        }}
      />
    </>
  );
}
```

### With Skip Option

```typescript
<ProfileTypePickerModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  currentType={type}
  onSelect={(newType) => setType(newType)}
  allowSkip={true}  // ← Shows "Skip for now" button
/>
```

---

## 📋 Profile Types

```typescript
type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator';
```

| Value | Label | Icon |
|-------|-------|------|
| `'streamer'` | Streamer | 📡 |
| `'musician'` | Musician / Artist | 🎵 |
| `'comedian'` | Comedian | 🎭 |
| `'business'` | Business / Brand | 💼 |
| `'creator'` | Creator | ✨ |

---

## 🔧 Backend Integration (When Ready)

### Step 1: Add Database Column

```sql
ALTER TABLE profiles 
ADD COLUMN profile_type TEXT DEFAULT 'creator' 
CHECK (profile_type IN ('streamer', 'musician', 'comedian', 'business', 'creator'));
```

### Step 2: Update ProfileRow Type

```typescript
type ProfileRow = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  profile_type?: ProfileType | null;  // ← Add this
};
```

### Step 3: Load Profile Type

```typescript
// In EditProfileScreen.tsx, replace line 66:
setProfileType(row.profile_type ?? 'creator');
```

### Step 4: Save Profile Type

```typescript
// In EditProfileScreen.tsx, update line 96-99:
const { error: e } = await supabase
  .from('profiles')
  .update({
    display_name: displayName.trim() || null,
    bio: bio.trim() || null,
    profile_type: profileType,  // ← Add this
    updated_at: new Date().toISOString(),
  } as any)
  .eq('id', userId);
```

### Step 5: Remove TODO Comments

Search for these in `EditProfileScreen.tsx` and remove:
- Line 65: `// TODO: Load actual profile type from backend when field exists`
- Line 93: `// TODO: Save profileType to backend when field is added`
- Line 191: `// TODO: Save to backend when field is added`

---

## 🎨 Customization

### Change Default Type

```typescript
// In ProfileTypePickerModal.tsx, line 14:
const [selectedType, setSelectedType] = useState<ProfileType>(currentType);

// Pass different default:
<ProfileTypePickerModal currentType="streamer" ... />
```

### Add New Profile Type

1. Update type definition:
```typescript
export type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator' | 'newtype';
```

2. Add to options array:
```typescript
const PROFILE_TYPES: ProfileTypeOption[] = [
  // ... existing types
  {
    id: 'newtype',
    icon: '🎪',
    title: 'New Type',
    description: 'Description here',
  },
];
```

3. Update formatProfileType helper:
```typescript
function formatProfileType(type: ProfileType): string {
  const labels: Record<ProfileType, string> = {
    // ... existing labels
    newtype: 'New Type',
  };
  return labels[type];
}
```

### Change Colors

Modal uses theme colors. To customize:

```typescript
// In ProfileTypePickerModal.tsx, createStyles function:
typeCardSelected: {
  borderColor: '#FF6B6B',  // ← Change accent color
  backgroundColor: 'rgba(255, 107, 107, 0.15)',
},
```

---

## 🐛 Troubleshooting

### Modal Doesn't Open
✅ Check `visible` prop is true  
✅ Check modal state: `console.log(showModal)`

### Selection Doesn't Update
✅ Check `onSelect` handler is called  
✅ Check state updates: `console.log(type)` in `onSelect`

### Styling Looks Wrong
✅ Verify theme context is available  
✅ Check if `ThemeProvider` wraps component tree

### TypeScript Errors
✅ Import `ProfileType` type from component  
✅ Ensure type matches one of 5 valid values

---

## 📱 Testing in App

### Manual Test

1. Start app: `npm start`
2. Navigate to Edit Profile
3. Tap Profile Type row
4. Verify modal opens
5. Tap a profile type
6. Verify selection highlights
7. Tap Continue
8. Verify modal closes
9. Verify row updates

### Test Light/Dark Mode

1. Open Options menu
2. Toggle "Light Mode" switch
3. Open Profile Type picker
4. Verify colors adapt to theme

---

## 📚 Props Reference

### ProfileTypePickerModal

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `visible` | `boolean` | ✅ Yes | - | Show/hide modal |
| `onClose` | `() => void` | ✅ Yes | - | Called when modal closes |
| `currentType` | `ProfileType` | ❌ No | `'creator'` | Currently selected type |
| `onSelect` | `(type: ProfileType) => void` | ❌ No | - | Called when user confirms |
| `allowSkip` | `boolean` | ❌ No | `false` | Show "Skip" button |

---

## 🔍 Key Files

```
mobile/
├── components/
│   └── ProfileTypePickerModal.tsx    ← Main component
├── screens/
│   └── EditProfileScreen.tsx         ← Integration example
└── contexts/
    └── ThemeContext.tsx              ← Theme system
```

---

## ✨ Features

- ✅ 5 profile types with icons
- ✅ Single-select with visual feedback
- ✅ Light/dark theme support
- ✅ Smooth animations
- ✅ Warning text about section changes
- ✅ Placeholder save handlers
- ✅ No backend required

---

## 🎯 Next Steps

1. **Test the UI** — Open Edit Profile and try the picker
2. **Review docs** — Read `PROFILE_TYPE_UI_COMPLETE.md` for details
3. **Plan backend** — Decide when to add database field
4. **Integrate** — Follow steps in "Backend Integration" section above

---

## 📞 Questions?

See full documentation:
- `mobile/PROFILE_TYPE_UI_COMPLETE.md` — Complete feature docs
- `mobile/PROFILE_TYPE_UI_VISUAL.md` — Visual design reference
- `mobile/PROFILE_TYPE_UI_FILES_CHANGED.md` — All changes made

---

**That's it!** You now know everything you need to use and integrate the Profile Type UI.

🎉 Happy coding!

