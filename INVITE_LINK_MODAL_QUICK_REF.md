# 🎯 Invite Link Modal — Quick Reference Card

**One-Page Developer Cheat Sheet**

---

## 📦 Import

### Web
```tsx
import InviteLinkModal from '@/components/InviteLinkModal';
```

### Mobile
```tsx
import { InviteLinkModal } from '../components/InviteLinkModal';
```

---

## 🚀 Basic Usage

### Web
```tsx
const [showInvite, setShowInvite] = useState(false);

<button onClick={() => setShowInvite(true)}>
  Get My Invite Link
</button>

<InviteLinkModal
  isOpen={showInvite}
  onClose={() => setShowInvite(false)}
/>
```

### Mobile
```tsx
const [showInvite, setShowInvite] = useState(false);

<Button
  title="Get My Invite Link"
  onPress={() => setShowInvite(true)}
/>

<InviteLinkModal
  visible={showInvite}
  onClose={() => setShowInvite(false)}
/>
```

---

## 🎨 Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` / `visible` | `boolean` | Controls modal visibility |
| `onClose` | `() => void` | Called when modal closes |

---

## 🔗 Generated Link Format

```
https://mylivelinks.com/join?ref={referral_code}
```

**Referral Code Priority:**
1. User's `username` (from profiles table)
2. First 8 chars of user `id`
3. `'demo-invite'` (fallback)

---

## ✨ Features

- ✅ One-tap copy to clipboard
- ✅ System share sheet (mobile)
- ✅ Loading states
- ✅ Dark mode support
- ✅ Error handling
- ✅ Responsive design

---

## 🎨 Visual Elements

```
Header:     🔗 Your Invite Link
Explainer:  📈 Grow Your Network
Link:       https://mylivelinks.com/join?ref=...
Buttons:    📋 Copy Link | 📤 Share
Note:       💎 Quality matters...
Footer:     Build your network. 🚀
```

---

## 🎯 Recommended Placements

1. **Options Menu** - Under "Account" section
2. **Profile Settings** - Quick actions area
3. **User Menu** - Header dropdown

---

## 🔧 Customization

### Change Join URL
**Web:** `components/InviteLinkModal.tsx` line ~45
```tsx
const inviteUrl = `${window.location.origin}/signup?ref=${referralCode}`;
```

**Mobile:** `mobile/components/InviteLinkModal.tsx` line ~87
```tsx
const inviteUrl = `https://mylivelinks.com/signup?ref=${referralCode}`;
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Shows "demo-invite" | User not logged in or no username |
| Copy doesn't work | Check HTTPS (required for Clipboard API) |
| Share button missing | Expected on desktop (only mobile browsers) |

---

## 📱 Platform Support

- ✅ Web (desktop + mobile browsers)
- ✅ iOS (React Native)
- ✅ Android (React Native)
- ✅ Dark/Light modes
- ✅ Safe area insets

---

## 📚 Full Documentation

- **Implementation:** `INVITE_LINK_MODAL_COMPLETE.md`
- **Design Specs:** `INVITE_LINK_MODAL_VISUAL_GUIDE.md`
- **Integration:** `INVITE_LINK_MODAL_INTEGRATION_GUIDE.md`
- **Files Changed:** `INVITE_LINK_MODAL_FILES_CHANGED.md`

---

## ⚡ Quick Integration (Options Menu)

```tsx
// 1. Import
import InviteLinkModal from './InviteLinkModal';

// 2. State
const [showInvite, setShowInvite] = useState(false);

// 3. Menu Item
<MenuItem
  label="Get My Invite Link"
  onPress={() => setShowInvite(true)}
/>

// 4. Modal
<InviteLinkModal
  visible={showInvite}
  onClose={() => setShowInvite(false)}
/>
```

---

**That's it!** 🎉  
Simple, clean, and production-ready.

---

*Quick Reference v1.0 — UI Agent 2*


