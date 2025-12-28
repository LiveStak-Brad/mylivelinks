# 🚀 Invite Link Modal — Integration Guide

**Quick Start Guide for Developers**

---

## 📦 Components Available

### Web Component
```typescript
// components/InviteLinkModal.tsx
import InviteLinkModal from '@/components/InviteLinkModal';
```

### Mobile Component
```typescript
// mobile/components/InviteLinkModal.tsx
import { InviteLinkModal } from '../components/InviteLinkModal';
```

---

## 🔧 Integration Examples

### 1. Add to Options Menu (Web)

**File:** `components/OptionsMenu.tsx`

```tsx
import InviteLinkModal from './InviteLinkModal';

export default function OptionsMenu() {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
      {/* In your menu items */}
      <button onClick={() => setShowInviteModal(true)}>
        Get My Invite Link
      </button>

      {/* Add modal */}
      <InviteLinkModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
```

---

### 2. Add to Options Menu (Mobile)

**File:** `mobile/components/OptionsMenu.tsx`

```tsx
import { InviteLinkModal } from './InviteLinkModal';

export function OptionsMenu({ visible, onClose }: OptionsMenuProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
      <Modal visible={visible} onRequestClose={onClose}>
        {/* In your menu items */}
        <MenuItem
          label="Get My Invite Link"
          onPress={() => {
            setShowInviteModal(true);
            onClose(); // Close options menu first
          }}
        />
      </Modal>

      {/* Add invite modal */}
      <InviteLinkModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
```

---

### 3. Add to Profile Page (Web)

**File:** `app/[username]/page.tsx` or Profile component

```tsx
import InviteLinkModal from '@/components/InviteLinkModal';

export default function ProfilePage() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div>
      {/* In profile actions */}
      <button 
        onClick={() => setShowInvite(true)}
        className="btn-secondary"
      >
        📤 Share My Link
      </button>

      <InviteLinkModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}
```

---

### 4. Add to Profile Screen (Mobile)

**File:** `mobile/screens/ProfileScreen.tsx`

```tsx
import { InviteLinkModal } from '../components/InviteLinkModal';

export function ProfileScreen() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <View>
      {/* In profile actions */}
      <Button
        title="Share My Link"
        onPress={() => setShowInvite(true)}
      />

      <InviteLinkModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </View>
  );
}
```

---

## 🎯 Recommended Placement Locations

### High Priority
1. ✅ **Options Menu** - Under "Account" section
2. ✅ **Profile Settings** - In quick actions or sharing section
3. ✅ **User Menu** - Dropdown menu in header

### Medium Priority
4. **Dashboard/Home** - As a promotional card
5. **Wallet Section** - Near earnings/monetization
6. **After First Stream** - Onboarding encouragement

### Low Priority
7. **Footer Links** - Global access point
8. **Help/FAQ Section** - "How do I invite friends?"

---

## 📋 Suggested Menu Structure

### Options Menu Addition

**Before:**
```
Account
  - My Profile
  - Edit Profile
  - Wallet
  - My Gifts / Transactions
```

**After:**
```
Account
  - My Profile
  - Edit Profile
  - Wallet
  - My Gifts / Transactions
  - Get My Invite Link        ← NEW
```

---

## 🎨 Button Styles (Recommended)

### Web Buttons

**Primary Style (Gradient):**
```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
>
  🔗 Get My Invite Link
</button>
```

**Secondary Style (Outlined):**
```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="px-4 py-2 border-2 border-purple-500 text-purple-500 font-semibold rounded-lg hover:bg-purple-50 transition"
>
  📤 Share Link
</button>
```

**Text Style (Minimal):**
```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="text-purple-500 hover:text-purple-600 font-medium underline"
>
  Get invite link
</button>
```

### Mobile Buttons (React Native)

**Primary Style:**
```tsx
<Pressable
  onPress={() => setShowInvite(true)}
  style={{
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
  }}
>
  <Text style={{ color: '#fff', fontWeight: '600' }}>
    🔗 Get My Invite Link
  </Text>
</Pressable>
```

**Secondary Style:**
```tsx
<Pressable
  onPress={() => setShowInvite(true)}
  style={{
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 12,
  }}
>
  <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
    📤 Share Link
  </Text>
</Pressable>
```

---

## 🔐 Props & Configuration

### Web Component Props

```typescript
interface InviteLinkModalProps {
  isOpen: boolean;      // Controls modal visibility
  onClose: () => void;  // Callback when modal closes
}
```

### Mobile Component Props

```typescript
interface InviteLinkModalProps {
  visible: boolean;     // Controls modal visibility
  onClose: () => void;  // Callback when modal closes
}
```

---

## ⚙️ Configuration Options

### Referral Link Format

The component automatically generates links in this format:
```
https://mylivelinks.com/join?ref={referral_code}
```

**Referral Code Priority:**
1. User's `username` from profile (preferred)
2. First 8 characters of user `id` (fallback)
3. `'demo-invite'` (demo mode)

### Customizing the Join URL

If you need to change the join page URL:

**Web:** `components/InviteLinkModal.tsx` line ~45
```tsx
const inviteUrl = referralCode 
  ? `${window.location.origin}/signup?ref=${referralCode}`  // ← Change here
  : `${window.location.origin}/signup`;
```

**Mobile:** `mobile/components/InviteLinkModal.tsx` line ~87
```tsx
const inviteUrl = referralCode 
  ? `https://mylivelinks.com/signup?ref=${referralCode}`    // ← Change here
  : 'https://mylivelinks.com/signup';
```

---

## 🗄️ Database Setup (Optional)

If you want to track referral analytics, add this table:

```sql
-- Referral tracking table (optional)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  referred_id UUID REFERENCES profiles(id),
  referral_code TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
```

Then create a join page that captures the `ref` parameter:

```typescript
// app/join/page.tsx
export default async function JoinPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const referralCode = searchParams.ref;
  
  // Store in session/cookie for post-signup tracking
  if (referralCode) {
    cookies().set('referral_code', referralCode, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  
  // Redirect to signup
  redirect('/signup');
}
```

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Modal opens when trigger button clicked
- [ ] Modal closes when X button clicked
- [ ] Modal closes when backdrop clicked
- [ ] Copy button copies link to clipboard
- [ ] "Link Copied!" feedback shows for 2.5s
- [ ] Share button opens system share sheet (mobile)
- [ ] Referral code loads from profile
- [ ] Loading state shows while fetching
- [ ] Demo mode works when not authenticated

### Visual Testing
- [ ] Dark mode colors correct
- [ ] Light mode colors correct
- [ ] Typography sizes match design
- [ ] Spacing/padding consistent
- [ ] Border radius correct
- [ ] Gradient displays properly
- [ ] Icons render correctly
- [ ] Animations smooth

### Platform Testing
- [ ] Web desktop (Chrome, Firefox, Safari)
- [ ] Web mobile (iOS Safari, Android Chrome)
- [ ] iOS app (React Native)
- [ ] Android app (React Native)
- [ ] Tablet/iPad layouts
- [ ] Safe area insets respected (notches)

---

## 🐛 Troubleshooting

### Issue: Referral code shows as "demo-invite"

**Cause:** User not authenticated or profile has no username  
**Fix:** Ensure user is logged in and has completed profile setup

---

### Issue: Copy button doesn't work on web

**Cause:** Clipboard API not available (HTTP or old browser)  
**Fix:** 
1. Ensure site is served over HTTPS
2. Check browser compatibility
3. Add fallback for older browsers

```tsx
const handleCopyLink = async () => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(inviteUrl);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = inviteUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
  setCopied(true);
};
```

---

### Issue: Share button doesn't appear on web

**Cause:** `navigator.share` not supported in browser  
**Fix:** This is expected behavior. Share button only shows when supported (mainly mobile browsers)

---

### Issue: Modal doesn't close on backdrop click (mobile)

**Cause:** Touch event not propagating  
**Fix:** Ensure `Pressable` on backdrop has `onPress={onClose}` and no `stopPropagation()` calls

---

## 📚 Related Documentation

- [INVITE_LINK_MODAL_COMPLETE.md](./INVITE_LINK_MODAL_COMPLETE.md) - Full implementation details
- [INVITE_LINK_MODAL_VISUAL_GUIDE.md](./INVITE_LINK_MODAL_VISUAL_GUIDE.md) - Design specifications
- [ShareProfileModal.tsx](./components/ShareProfileModal.tsx) - Similar pattern reference

---

## 🎯 Next Steps

1. **Add to Options Menu** (both web & mobile)
2. **Test copy functionality** on various devices
3. **Track analytics** (optional, requires backend)
4. **Add to onboarding flow** (optional, after first stream)
5. **Monitor usage metrics** (click rate, conversion rate)

---

**Questions?** Check the implementation files or visual guide for detailed specifications.

*Integration Guide Complete* ✅

