# Mobile Messaging Web Parity Documentation

## Overview
This document outlines how mobile messaging achieves parity with the web messaging system.

## Web Messaging Endpoints (Source of Truth)

### Conversations/Inbox
- **RPC:** `get_im_conversations(p_user_id)`
  - Returns conversation list with unread counts, last message, timestamps
  - Ordered by most recent activity (DESC)
  - Includes other user profile data (username, avatar, display_name)

### Messages/Thread
- **RPC:** `get_conversation(p_user_id, p_other_user_id, p_limit, p_offset)`
  - Returns messages between two users
  - Returns in DESC order (newest first), mobile reverses to ASC for display
  - Includes sender_id, recipient_id, content, created_at, read_at

### Send Text Message
- **Direct Insert:** `instant_messages` table
  - Fields: sender_id, recipient_id, content, created_at
  - Returns inserted row with ID

### Send Gift
- **Endpoint:** `/api/gifts/send`
  - POST with: toUserId, coinsAmount, giftTypeId, context='dm', requestId
  - Handles wallet deduction and earnings credit
  - After success, insert to `instant_messages` with content: `__gift__:{JSON}`
  - JSON format: `{giftId, giftName, giftCoins, giftIcon}`

### Send Image
- **Endpoint:** `/api/messages/upload-url`
  - POST with: mimeType, otherProfileId
  - Returns: bucket, path, token, publicUrl
  - Upload to Supabase Storage using signed URL
  - After upload, insert to `instant_messages` with content: `__img__:{JSON}`
  - JSON format: `{url, mime, width, height}`

### Real-time
- **Supabase Realtime:** Subscribe to `instant_messages` table INSERT events
  - Filter by sender_id/recipient_id matching current conversation
  - Deduplicate by message ID before adding to state

### Mark as Read
- **RPC:** `mark_messages_read(p_user_id, p_sender_id)`
  - Marks all unread messages from sender as read
  - Fallback: Direct UPDATE on `instant_messages` table

## Mobile Implementation Status

### ✅ Inbox (MessagesScreen.tsx)
- Uses `get_im_conversations` RPC
- Displays conversations ordered by most recent
- Shows unread count badge
- Shows last message preview (text/image/gift)
- Shows relative time labels
- Stable keys: `otherProfileId` (unique per conversation)
- **Deduplication:** Friends list deduplicates by ID

### ✅ Thread (IMThreadScreen.tsx)
- Uses `get_conversation` RPC
- Displays messages in chronological order (ASC)
- Supports message types: text, image, gift
- Real-time updates via Supabase subscription
- Marks messages as read on load
- Stable keys: `message.id` (unique per message)
- **Deduplication:** 
  - Initial load deduplicates by ID
  - Realtime inserts check for existing ID before adding

### ✅ Send Text Message
- Direct insert to `instant_messages`
- Optimistic UI with temp ID
- Replaces temp message with server response
- Loading state prevents double-send

### ✅ Send Image
- Uses `expo-image-picker` for native image selection
- Requests media library permissions
- Uploads via `/api/messages/upload-url` + Supabase Storage
- Encodes as `__img__:{JSON}` format
- Optimistic UI shows local image immediately
- Renders image bubbles with tap-to-view

### ✅ Send Gift
- Gift modal with 6 gift options (Rose, Heart, Star, Diamond, Crown, Fire)
- Calls `/api/gifts/send` endpoint
- Inserts gift message with `__gift__:{JSON}` format
- Renders gift bubbles with emoji + name + coins
- Loading state prevents double-send

### ✅ Message Rendering
- **Text:** Standard bubble (purple for sent, gray for received)
- **Image:** Image bubble with photo, tap to open MediaViewer
- **Gift:** Special gift bubble (yellow background) with emoji, name, and coin amount

## Duplicate Key Bug Fix

### Root Cause
The duplicate key warning occurred because:
1. Messages could be added twice (once optimistically, once from realtime)
2. Temporary IDs could collide if multiple sends happened quickly
3. Friends list could have duplicate IDs from server data

### Solution
1. **Thread Messages:** Deduplicate on load by ID, check for existing ID before adding from realtime
2. **Friends List:** Deduplicate by ID after mapping from server data
3. **Stable Keys:** Always use `String(item.id)` for FlatList keyExtractor

## Parity Checklist

### Inbox
- ✅ Conversation list with avatars
- ✅ Unread count badges
- ✅ Last message preview (text/image/gift)
- ✅ Relative time labels
- ✅ Online/live status indicators
- ✅ Friends strip (horizontal scroll)
- ✅ Search conversations
- ✅ Stable keys (no duplicates)

### Thread
- ✅ Message list (text, image, gift)
- ✅ Send text messages
- ✅ Send images (photo picker)
- ✅ Send gifts (modal)
- ✅ Real-time message updates
- ✅ Mark as read
- ✅ Optimistic UI
- ✅ Loading states
- ✅ Error handling
- ✅ Stable keys (no duplicates)

### Message Types
- ✅ Text: Standard bubbles
- ✅ Image: Photo bubbles with tap-to-view
- ✅ Gift: Special gift bubbles with emoji + details

## Out of Scope (Future Work)
- Voice calls
- Video calls
- Message reactions
- Message deletion
- Typing indicators
- Read receipts (shown in web)
- Message search within thread
- Media gallery view
- Forward messages

## Testing Checklist

### Inbox
- [ ] Open app → inbox loads conversations
- [ ] No duplicate key warnings in console
- [ ] Unread badges show correct counts
- [ ] Last message preview shows correct type
- [ ] Tap conversation → opens thread

### Thread
- [ ] Send text → appears immediately, no flicker
- [ ] Send image → picker opens, uploads, renders
- [ ] Send gift → modal opens, sends, renders gift bubble
- [ ] Background/foreground → thread resumes correctly
- [ ] New message from other user → appears in real-time
- [ ] No duplicate key warnings in console

### Edge Cases
- [ ] Send multiple messages quickly → no duplicate keys
- [ ] Receive message while viewing thread → no duplicate
- [ ] Switch conversations → messages load correctly
- [ ] Network error → shows error, doesn't crash

## Files Changed

### Mobile
- `apps/mobile/screens/IMThreadScreen.tsx` - Thread view with photo/gift support
- `apps/mobile/screens/MessagesScreen.tsx` - Inbox with deduplication
- `apps/mobile/MESSAGING_WEB_PARITY.md` - This documentation

### Dependencies
- `expo-image-picker` - Native image selection (already in package.json)

## Commit Message
```
mobile: messaging parity (inbox/thread), image send, gifting modal, and key stability

- Fix duplicate key warnings by deduplicating messages and friends by ID
- Add photo upload: expo-image-picker → /api/messages/upload-url → storage
- Add gift modal with 6 gifts → /api/gifts/send → instant_messages
- Render gift messages with special bubble (emoji + name + coins)
- Render image messages with photo bubble (tap to view)
- Add loading states and prevent double-send
- Match web endpoints: get_im_conversations, get_conversation, mark_messages_read
- Stable keys throughout: message.id, otherProfileId, friend.id
```
