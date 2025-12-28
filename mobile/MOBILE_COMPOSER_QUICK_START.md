# 🚀 MOBILE COMPOSER - QUICK START

**One-page reference for using the Mobile Composer**

---

## 📍 ACCESSING COMPOSER

**From anywhere in the app:**
1. Tap **avatar** (top-right corner)
2. Tap **"Composer"** in dropdown menu
3. Composer opens → Drafts list

---

## 🎬 SCREENS

### 1️⃣ ComposerList (Drafts)
- Shows all saved draft projects
- Empty state if no drafts
- **Tap "+"** → Create new project
- **Tap draft card** → Open in editor

### 2️⃣ ComposerEditor (Base Editor)
Features:
- ✍️ **Caption** (500 chars)
- 📝 **Text Overlays** (max 2)
- 👤 **Producer** (you)
- 🎭 **Actors** (add collaborators)
- 💾 **Save** draft
- ✈️ **Post** to feed
- ✅ **Post + Save** both
- 📤 **Send to Composer** (web)

### 3️⃣ ClipCompletionActions
Use after video recording/editing:
- **Post to Feed**
- **Save**
- **Post + Save**
- **Send to Composer**

---

## 🔌 INTEGRATION

### Add to any clip completion screen:

```tsx
import { ClipCompletionActions } from '../components/ClipCompletionActions';

<ClipCompletionActions
  clipId="clip_123"
  clipData={{ videoUrl, thumbnailUrl, duration }}
  onPostToFeed={handlePost}
  onSave={handleSave}
  onPostAndSave={handlePostAndSave}
  onSendToComposer={handleSendToComposer}
/>
```

**Default behavior**: All handlers optional, placeholders provided.

---

## 🎨 UI RULES

✅ **All surfaces OPAQUE**
- Light mode: White surfaces
- Dark mode: Dark surfaces
- Backdrop: Translucent (correct)

✅ **Brand Colors**
- Purple: `#8b5cf6` (primary)
- Pink: `#ec4899` (save)
- Indigo: `#6366f1` (post+save)
- Amber: `#f59e0b` (composer)

✅ **Icons**: Ionicons throughout

---

## 🧪 TESTING FLOW

```
1. Open app
2. Tap avatar (top-right)
3. Tap "Composer"
   → ComposerList opens ✅
4. Tap "+"
   → ComposerEditor opens ✅
5. Type caption
   → Text appears ✅
6. Tap "Add Text Overlay"
   → Modal opens ✅
7. Enter text, tap "Add"
   → Overlay added ✅
8. Tap "Save"
   → Shows alert ✅
9. Tap "Send to Composer"
   → Shows Web Composer info ✅
10. Tap "Copy Link"
    → Shows copied alert ✅
```

---

## 📦 FILES TO KNOW

| File | Purpose |
|------|---------|
| `screens/ComposerListScreen.tsx` | Drafts list |
| `screens/ComposerEditorScreen.tsx` | Main editor |
| `components/ClipCompletionActions.tsx` | Action buttons |
| `components/UserMenu.tsx` | Menu entry point |
| `types/composer.ts` | TypeScript types |

---

## ⚡ QUICK COMMANDS

```bash
# Run mobile app
cd mobile && npm start

# Check for errors
cd mobile && npm run lint

# Build iOS preview (if needed)
cd mobile && eas build --profile preview --platform ios
```

---

## 🐛 TROUBLESHOOTING

**"ComposerList not found"**
→ Check `mobile/App.tsx` - routes registered?

**"Cannot navigate to ComposerEditor"**
→ Check `mobile/types/navigation.ts` - types added?

**Menu item not visible**
→ Check `mobile/components/UserMenu.tsx` - line ~302

**TypeScript errors**
→ Check `mobile/types/composer.ts` - all types defined?

---

## 🎯 WHAT'S PLACEHOLDER

These show alerts but don't actually work yet:
- ❌ Fetching drafts from API
- ❌ Saving drafts to API
- ❌ Posting to feed
- ❌ Adding actors (needs picker UI)
- ❌ Copying Web Composer link
- ❌ Generating QR code

**Everything else works!** UI, navigation, state management, theming.

---

## 🚢 PRODUCTION READY?

✅ **UI Complete**
✅ **Navigation Complete**
✅ **Theme Integration Complete**
✅ **State Management Complete**
✅ **TypeScript Types Complete**

⏳ **Needs Backend:**
- Draft persistence API
- Post to feed API
- Actor search API
- Link generation
- QR code library

---

## 📞 NEED HELP?

See full docs:
- **`MOBILE_COMPOSER_DELIVERABLE.md`** - Complete guide
- **`MOBILE_COMPOSER_FILES_CHANGED.md`** - File changes
- **`ClipCompletionActionsExample.tsx`** - Integration examples

---

**Commit**: `c7c249d054dc667056949996b51892753fc3c119`  
**Status**: ✅ Ready to Use (UI Complete, Backend Integration Needed)

