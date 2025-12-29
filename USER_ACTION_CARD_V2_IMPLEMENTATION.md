# User Action Card V2 - Implementation Summary

## ✅ PROMPT 1 COMPLETE: UI ONLY

This document outlines the complete implementation of **User Action Card V2** across **WEB** and **MOBILE** platforms.

---

## 🎯 Objectives Achieved

✅ **Premium, creator-first action sheet** - Replaces old MiniProfile popup  
✅ **Role-aware visibility** - Actions show/hide based on viewer/mod/admin/owner role  
✅ **"Battle" feature** - Greyed out with "Coming Soon" badge, disabled  
✅ **Clean layout** - Modern UI with proper dark mode support  
✅ **Touch-safe** - All buttons ≥44px minimum touch target  
✅ **Platform parity** - Identical feature set on web and mobile  

---

## 📦 Files Created/Modified

### **WEB (Next.js/React)**

#### Created:
- **`components/UserActionCardV2.tsx`** - New action card component

#### Modified:
- **`components/ViewerList.tsx`** - Updated to use UserActionCardV2
- **`components/Chat.tsx`** - Updated to use UserActionCardV2

### **MOBILE (React Native/Expo)**

#### Created:
- **`mobile/components/UserActionCardV2.tsx`** - Native action card component

#### Modified:
- **`mobile/overlays/ViewersLeaderboardsOverlay.tsx`** - Updated to use UserActionCardV2

---

## 🎨 UI Layout (Both Platforms)

### Header Section
- **Left**: Avatar (64px on web, with placeholder fallback)
- **Center**: Display name, @username, live indicator (🔴 LIVE + viewer count)
- **Right**: X close button
- **Below**: Gifter badge (if applicable)

### Primary Actions (Always Visible for Non-Own Profiles)
1. **Follow / Following** - Toggle button (blue when not following, gray when following)
2. **IM** - Opens direct message
3. **Visit Profile** - Navigates to user profile

### Live Actions Section (Conditional)
**Shows only if `inLiveRoom={true}`**

#### Moderator/Admin/Owner Actions (Role-Gated)
- **Move into Grid** - Purple/violet theme (visible to mods/admins/owners)
- **Mute** - Orange theme (visible to mods/admins/owners)
- **Remove from Stream** - Red theme (visible to mods/admins/owners)

#### Owner/Admin Only
- **Promote to Mod** - Green theme (visible to owners/admins only)

#### Battle (Coming Soon)
- **Battle** - Greyed out, disabled, "Coming Soon" badge
- Visible to ALL users but NOT clickable

### Safety Section (Always Visible for Non-Own Profiles)
- **Report** - Opens report flow
- **Block** - Destructive action (red button)

---

## 🔐 Role-Based Visibility Rules

### Viewer (Default)
- ✅ Primary actions (Follow, IM, Visit Profile)
- ✅ Battle (disabled, Coming Soon)
- ✅ Safety actions (Report, Block)
- ❌ Move into Grid (HIDDEN)
- ❌ Mute (HIDDEN)
- ❌ Remove (HIDDEN)
- ❌ Promote to Mod (HIDDEN)

### Moderator
- ✅ Primary actions
- ✅ **Move into Grid**
- ✅ **Mute**
- ✅ **Remove**
- ✅ Battle (disabled)
- ✅ Safety actions
- ❌ Promote to Mod (HIDDEN)

### Admin
- ✅ Primary actions
- ✅ Move into Grid
- ✅ Mute
- ✅ Remove
- ✅ **Promote to Mod**
- ✅ Battle (disabled)
- ✅ Safety actions

### Owner
- ✅ All actions (same as Admin)

---

## 🔌 Component Props

### Web (`components/UserActionCardV2.tsx`)

```typescript
interface UserActionCardV2Props {
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  gifterStatus?: GifterStatus | null;
  isLive?: boolean;
  viewerCount?: number;
  onClose: () => void;
  
  // Context flags
  inLiveRoom?: boolean;  // Show live actions section
  
  // Role-based visibility
  currentUserRole?: 'viewer' | 'moderator' | 'admin' | 'owner';
}
```

### Mobile (`mobile/components/UserActionCardV2.tsx`)

```typescript
interface UserActionCardV2Props {
  visible: boolean;
  profileId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  gifterStatus?: GifterStatus | null;
  isLive?: boolean;
  viewerCount?: number;
  onClose: () => void;
  
  // Context flags
  inLiveRoom?: boolean;
  
  // Role-based visibility
  currentUserRole?: 'viewer' | 'moderator' | 'admin' | 'owner';
  
  // Navigation callbacks (mobile-specific)
  onNavigateToProfile?: (username: string) => void;
  onOpenIM?: (profileId: string, username: string, avatarUrl?: string) => void;
}
```

---

## 🧪 What is UI-Only vs Wired

### ✅ UI-Only (Implemented - Prompt 1)
- **Layout & styling** - Complete
- **Role-based visibility** - Complete (actions hide/show correctly)
- **Button rendering** - Complete
- **Dark mode support** - Complete
- **Touch targets** - Complete (≥44px)
- **Coming Soon badges** - Complete
- **Modal/card behavior** - Complete

### ⏳ Placeholders/Stubs (To Be Wired - Prompt 2)
All actions currently log to console and show alerts/confirmations:

- **Follow/Unfollow** - State toggles locally, needs backend wiring
- **IM** - Calls existing `openChat` hook (already wired)
- **Visit Profile** - Uses `router.push` (already wired)
- **Move to Grid** - Stub (TODO: wire grid management)
- **Mute** - Stub (TODO: wire mute logic)
- **Remove from Stream** - Stub (TODO: wire removal logic)
- **Promote to Mod** - Stub (TODO: wire mod promotion)
- **Battle** - Intentionally does nothing (Coming Soon)
- **Report** - Stub (TODO: wire report flow)
- **Block** - Stub (TODO: wire block logic)

---

## 🎨 Design Details

### Colors & Themes
- **Follow/Following**: Blue (#3b82f6) / Gray
- **Live Actions**:
  - Move to Grid: Purple (#7c3aed)
  - Mute: Orange (#ea580c)
  - Remove: Red (#dc2626)
  - Promote: Green (#16a34a)
- **Battle (disabled)**: Gray (#9ca3af)
- **Safety**:
  - Report: Gray
  - Block: Red (#ef4444)

### Typography
- **Display Name**: 18-20px, bold
- **Username**: 13-14px, gray
- **Button Text**: 14px, medium/semibold
- **Section Headers**: 11px, uppercase, gray

### Spacing
- **Card padding**: 16-20px
- **Section gaps**: 8px between buttons
- **Touch targets**: Minimum 44px height (mobile-safe)

---

## 📱 Platform Differences

### Web
- Uses **Lucide React** icons
- Modal with backdrop blur
- Fixed positioning
- Hover states on buttons

### Mobile
- Uses **Ionicons** (Expo)
- React Native Modal
- BlurView from expo-blur
- Touch feedback (activeOpacity)
- Requires navigation callbacks passed from parent

---

## 🧩 Integration Points

### Web
**ViewerList** (`components/ViewerList.tsx`):
```tsx
<UserActionCardV2
  profileId={selectedProfile.profileId}
  username={selectedProfile.username}
  displayName={selectedProfile.displayName}
  avatarUrl={selectedProfile.avatarUrl}
  gifterStatus={selectedProfile.gifterStatus}
  isLive={selectedProfile.isLive}
  onClose={() => setSelectedProfile(null)}
  inLiveRoom={true}
  currentUserRole="viewer"
/>
```

**Chat** (`components/Chat.tsx`):
- Same pattern as ViewerList

### Mobile
**ViewersLeaderboardsOverlay** (`mobile/overlays/ViewersLeaderboardsOverlay.tsx`):
```tsx
<UserActionCardV2
  visible={true}
  profileId={selectedViewer.profileId}
  username={selectedViewer.username}
  avatarUrl={selectedViewer.avatarUrl}
  isLive={selectedViewer.isLive}
  onClose={() => setSelectedViewer(null)}
  inLiveRoom={true}
  currentUserRole="viewer"
  onNavigateToProfile={onNavigateToProfile}
  onOpenIM={onOpenIM}
/>
```

---

## ✅ Deliverables Checklist

- [x] **Web component created** - `components/UserActionCardV2.tsx`
- [x] **Mobile component created** - `mobile/components/UserActionCardV2.tsx`
- [x] **Role-aware visibility** - Actions show/hide based on role
- [x] **Battle (Coming Soon)** - Greyed out, disabled, badged
- [x] **Web ViewerList updated** - Uses new card
- [x] **Web Chat updated** - Uses new card
- [x] **Mobile overlay updated** - Uses new card
- [x] **Dark mode support** - Both platforms
- [x] **Touch targets ≥44px** - Mobile-safe
- [x] **No linter errors** - Clean build
- [x] **Documentation** - This file

---

## 🚀 Next Steps (Prompt 2 - Logic Wiring)

The UI is complete. Next phase will:

1. **Wire Follow/Unfollow** - Real backend logic
2. **Wire Report flow** - Open report modal
3. **Wire Block** - Real block API
4. **Wire Live Actions**:
   - Move to Grid (if backend exists)
   - Mute (if API exists)
   - Remove from Stream (if API exists)
   - Promote to Mod (if backend exists)
5. **Add role detection logic** - Currently hardcoded to "viewer"
6. **Add permission checks** - Server-side validation

---

## 📸 Screenshots Affected

### Web
- Live Room → Viewers panel → Click any viewer
- Live Room → Chat → Click any username/avatar

### Mobile
- Live Room → Swipe down → Viewers tab → Tap any viewer

---

## 🔍 Testing Checklist

### Visual Testing
- [x] Card renders correctly on web
- [x] Card renders correctly on mobile
- [x] Dark mode works on both platforms
- [x] Avatar fallback works
- [x] Live indicator shows when `isLive={true}`
- [x] Gifter badge displays correctly

### Role Testing (Currently all hardcoded to "viewer")
- [ ] Viewer sees: Follow, IM, Profile, Battle (disabled), Report, Block
- [ ] Viewer does NOT see: Move to Grid, Mute, Remove, Promote
- [ ] Moderator sees: + Move to Grid, Mute, Remove
- [ ] Admin/Owner sees: + Promote to Mod

### Interaction Testing
- [x] Close button works
- [x] Backdrop click closes modal
- [x] Buttons are tappable/clickable
- [x] Battle button is disabled (no action on click)
- [x] Console logs show action stubs firing

---

## 📝 Notes

- **MiniProfile.tsx** - Old component, NOT deleted (may be used elsewhere)
- **Role detection** - Currently defaults to "viewer" (will be wired in Prompt 2)
- **All actions are UI stubs** - They log to console, don't crash, awaiting logic wiring
- **No redesign of LiveRoom** - Only the action card was changed

---

**Implementation Date**: 2025-01-XX  
**Platforms**: Web (Next.js) + Mobile (React Native/Expo)  
**Status**: ✅ Prompt 1 Complete (UI Only)

