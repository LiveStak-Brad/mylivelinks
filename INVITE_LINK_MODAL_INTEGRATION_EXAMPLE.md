# 🎯 Invite Link Modal — Integration Example

**Step-by-Step Guide with Exact Code**

---

## 🌐 Web Integration (Options Menu)

### File: `components/OptionsMenu.tsx`

```tsx
'use client';

import { useState } from 'react';
import InviteLinkModal from './InviteLinkModal'; // ← ADD THIS IMPORT

export default function OptionsMenu() {
  const [showInviteModal, setShowInviteModal] = useState(false); // ← ADD THIS STATE
  
  // ... existing code ...

  return (
    <>
      <div className="options-menu">
        {/* Account Section */}
        <div className="section">
          <h3>Account</h3>
          
          <button onClick={() => navigateToProfile()}>
            My Profile
          </button>
          
          <button onClick={() => navigateToSettings()}>
            Edit Profile
          </button>
          
          <button onClick={() => navigateToWallet()}>
            Wallet
          </button>
          
          <button onClick={() => navigateToTransactions()}>
            My Gifts / Transactions
          </button>
          
          {/* ✨ ADD THIS NEW BUTTON */}
          <button 
            onClick={() => setShowInviteModal(true)}
            className="menu-item"
          >
            🔗 Get My Invite Link
          </button>
          
        </div>
        
        {/* ... rest of menu ... */}
      </div>

      {/* ✨ ADD THIS MODAL */}
      <InviteLinkModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
```

---

## 📱 Mobile Integration (Options Menu)

### File: `mobile/components/OptionsMenu.tsx`

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { InviteLinkModal } from './InviteLinkModal'; // ← ADD THIS IMPORT

export function OptionsMenu({ visible, onClose }: OptionsMenuProps) {
  const [showInviteModal, setShowInviteModal] = useState(false); // ← ADD THIS STATE
  
  // ... existing code ...

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.menuContainer}>
            <ScrollView>
              {/* Account Section */}
              <SectionHeader title="Account" styles={styles} />
              
              <MenuItem
                styles={styles}
                label="My Profile"
                onPress={() => navigateToProfile()}
              />
              
              <MenuItem
                styles={styles}
                label="Edit Profile"
                onPress={() => navigateToSettings()}
              />
              
              <MenuItem
                styles={styles}
                label="Wallet"
                onPress={() => navigateToWallet()}
              />
              
              <MenuItem
                styles={styles}
                label="My Gifts / Transactions"
                onPress={() => navigateToTransactions()}
              />
              
              {/* ✨ ADD THIS NEW MENU ITEM */}
              <MenuItem
                styles={styles}
                label="Get My Invite Link"
                onPress={() => {
                  onClose(); // Close options menu first
                  setShowInviteModal(true);
                }}
              />
              
              {/* ... rest of menu ... */}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ✨ ADD THIS MODAL */}
      <InviteLinkModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
```

---

## 🎨 Alternative Placement - Profile Page

### Web: `app/[username]/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import InviteLinkModal from '@/components/InviteLinkModal';

export default function ProfilePage() {
  const [showInvite, setShowInvite] = useState(false);
  
  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <img src={avatarUrl} alt={username} />
        <h1>{displayName}</h1>
        <p>@{username}</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="btn-primary">Follow</button>
        <button className="btn-secondary">Message</button>
        
        {/* ✨ ADD SHARE BUTTON */}
        <button 
          className="btn-secondary"
          onClick={() => setShowInvite(true)}
        >
          📤 Share My Link
        </button>
      </div>

      {/* ... rest of profile ... */}

      {/* ✨ ADD MODAL */}
      <InviteLinkModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}
```

### Mobile: `mobile/screens/ProfileScreen.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { InviteLinkModal } from '../components/InviteLinkModal';

export function ProfileScreen() {
  const [showInvite, setShowInvite] = useState(false);
  
  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.btnPrimary}>
          <Text>Follow</Text>
        </Pressable>
        
        <Pressable style={styles.btnSecondary}>
          <Text>Message</Text>
        </Pressable>
        
        {/* ✨ ADD SHARE BUTTON */}
        <Pressable 
          style={styles.btnSecondary}
          onPress={() => setShowInvite(true)}
        >
          <Text>📤 Share My Link</Text>
        </Pressable>
      </View>

      {/* ... rest of profile ... */}

      {/* ✨ ADD MODAL */}
      <InviteLinkModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </View>
  );
}
```

---

## 🎯 Minimal Integration (5 Lines)

### Web Minimal Example

```tsx
import InviteLinkModal from '@/components/InviteLinkModal'; // 1

const [showInvite, setShowInvite] = useState(false); // 2

<button onClick={() => setShowInvite(true)}>Get Link</button> // 3

<InviteLinkModal // 4
  isOpen={showInvite} onClose={() => setShowInvite(false)} // 5
/>
```

### Mobile Minimal Example

```tsx
import { InviteLinkModal } from '../components/InviteLinkModal'; // 1

const [showInvite, setShowInvite] = useState(false); // 2

<Button title="Get Link" onPress={() => setShowInvite(true)} /> // 3

<InviteLinkModal // 4
  visible={showInvite} onClose={() => setShowInvite(false)} // 5
/>
```

---

## 🎨 Styled Button Examples

### Web - Gradient Button

```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
>
  🔗 Get My Invite Link
</button>
```

### Web - Outlined Button

```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="px-4 py-2 border-2 border-purple-500 text-purple-500 dark:text-purple-400 font-semibold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
>
  📤 Share Link
</button>
```

### Web - Text Link

```tsx
<button 
  onClick={() => setShowInvite(true)}
  className="text-purple-500 hover:text-purple-600 font-medium underline"
>
  Get invite link
</button>
```

### Mobile - Primary Button

```tsx
<Pressable
  onPress={() => setShowInvite(true)}
  style={{
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }}
>
  <Text style={{ fontSize: 16 }}>🔗</Text>
  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
    Get My Invite Link
  </Text>
</Pressable>
```

### Mobile - Outlined Button

```tsx
<Pressable
  onPress={() => setShowInvite(true)}
  style={{
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }}
>
  <Text style={{ fontSize: 16 }}>📤</Text>
  <Text style={{ color: '#8B5CF6', fontWeight: '600', fontSize: 15 }}>
    Share Link
  </Text>
</Pressable>
```

---

## 🔍 Testing Your Integration

### 1. Import Check
```bash
# Make sure the import works
npm run build
# or
npm run type-check
```

### 2. Visual Check
- Open the page where you added the button
- Button should be visible
- Click/tap the button
- Modal should appear

### 3. Functionality Check
- Modal displays referral link
- Copy button works
- Share button works (mobile)
- Modal closes on X or backdrop click

---

## 🐛 Common Issues & Fixes

### Issue: Import error

**Error:** `Cannot find module './InviteLinkModal'`

**Fix:**
```tsx
// Web - use absolute import
import InviteLinkModal from '@/components/InviteLinkModal';

// Mobile - use relative import
import { InviteLinkModal } from '../components/InviteLinkModal';
```

---

### Issue: Modal doesn't open

**Cause:** State not updating

**Fix:**
```tsx
// Make sure you have both pieces:
const [showInvite, setShowInvite] = useState(false); // State
<button onClick={() => setShowInvite(true)}>...</button> // Setter
<InviteLinkModal isOpen={showInvite} ... /> // Reader
```

---

### Issue: Multiple modals stack

**Cause:** Not closing previous modal

**Fix (Mobile):**
```tsx
<MenuItem
  label="Get My Invite Link"
  onPress={() => {
    onClose(); // ← Close options menu FIRST
    setTimeout(() => setShowInviteModal(true), 300); // Then show invite modal
  }}
/>
```

---

## ✅ Integration Checklist

- [ ] Imported component correctly
- [ ] Added state hook
- [ ] Added trigger button/menu item
- [ ] Added modal component
- [ ] Tested modal opens
- [ ] Tested copy functionality
- [ ] Tested share functionality (mobile)
- [ ] Tested modal closes
- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] No console errors
- [ ] No TypeScript errors

---

## 🚀 You're Done!

That's all you need. **5 lines of code** to add invite link sharing to any screen.

---

*Integration Example Complete* ✅



