# 🎨 Chat Event Color Coding System - Implementation Guide

**Mission**: Color-code all chat events for streamers to easily identify different types of interactions.

---

## 🎯 Color Scheme (Matching Brand)

| Event Type | Color | Tailwind Class | RGB | Use Case |
|------------|-------|----------------|-----|----------|
| **Global Message** | 🔴 Red | `bg-red-500/10 border-red-500` | #ef4444 | System announcements, broadcasts |
| **Gift Received** | 🟢 Green | `bg-green-500/10 border-green-500` | #22c55e | User sends gift to streamer |
| **User Goes Live** | 🔵 Blue | `bg-blue-500/10 border-blue-500` | #3b82f6 | User joins as streamer (published) |
| **@ Mention** | 🟣 Purple | `bg-purple-500/10 border-purple-500` | #a855f7 | @username tag in message |
| **New Follow** | 🟡 Yellow | `bg-yellow-500/10 border-yellow-500` | #eab308 | User follows streamer |
| **User Joined** | 🔵 Cyan | `bg-cyan-500/10 border-cyan-500` | #06b6d4 | User enters room |
| **User Left** | ⚪ Gray | `bg-gray-500/10 border-gray-500` | #6b7280 | User leaves room |
| **Regular Chat** | Default | (no background) | - | Normal user messages |

---

## 📊 Current Implementation Status

### ✅ **Already Implemented**

1. **`message_type` field** in `chat_messages` table
   - Used to distinguish message types
   - Currently supports: `'text'`, `'system'`

2. **Basic system message styling**
   - Gray italic text centered
   - No background highlight

### ❌ **Not Yet Implemented**

1. **@ Mentions / Tagging**
   - Database: No mention tracking
   - Frontend: No @ autocomplete
   - Backend: No mention notifications

2. **Follow Events in Chat**
   - Not currently shown in chat
   - Follows tracked in `follows` table but not broadcast to chat

3. **User Join/Leave Events**
   - Room presence tracked but not shown in chat
   - No chat messages for presence changes

4. **Gift Events in Chat**
   - Gifts tracked in `transactions` table
   - Not currently shown as chat messages

5. **Go Live Events in Chat**
   - Live status tracked but not broadcast to chat

---

## 🔧 Implementation Plan

### **Phase 1: Database Schema Updates**

#### 1.1 Extend `message_type` Enum
```sql
-- Add new message types to chat_messages table
ALTER TABLE chat_messages 
  ADD CONSTRAINT message_type_check 
  CHECK (message_type IN (
    'text',           -- Regular chat message
    'system',         -- Generic system message
    'global',         -- Red: Global announcement
    'gift',           -- Green: Gift received
    'went_live',      -- Blue: User went live
    'mention',        -- Purple: @ mention
    'follow',         -- Yellow: New follower
    'joined',         -- Cyan: User joined room
    'left'            -- Gray: User left room
  ));
```

#### 1.2 Add Mention Tracking Table
```sql
-- NEW TABLE: Track @ mentions in messages
CREATE TABLE IF NOT EXISTS message_mentions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
  mentioned_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_mentions_profile ON message_mentions(mentioned_profile_id);
CREATE INDEX idx_message_mentions_message ON message_mentions(message_id);
```

#### 1.3 Add Event Metadata Field
```sql
-- Add metadata column for structured event data
ALTER TABLE chat_messages 
  ADD COLUMN event_metadata JSONB DEFAULT NULL;

-- Examples of event_metadata:
-- Gift: { "gift_name": "Rose", "gift_emoji": "🌹", "coin_value": 10 }
-- Follow: { "follower_username": "user123" }
-- Mention: { "mentioned_usernames": ["user1", "user2"] }
-- Went Live: { "stream_title": "My Stream" }
```

---

### **Phase 2: Backend Logic (RPC Functions)**

#### 2.1 Gift Event Generator
```sql
-- RPC: Create gift chat message when gift is sent
CREATE OR REPLACE FUNCTION create_gift_chat_message(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_gift_name TEXT,
  p_gift_emoji TEXT,
  p_coin_value INTEGER
)
RETURNS BIGINT AS $$
DECLARE
  v_sender_username TEXT;
  v_message_id BIGINT;
BEGIN
  -- Get sender username
  SELECT username INTO v_sender_username
  FROM profiles WHERE id = p_sender_id;

  -- Insert gift message
  INSERT INTO chat_messages (
    profile_id,
    message_type,
    content,
    event_metadata
  ) VALUES (
    p_sender_id,
    'gift',
    v_sender_username || ' sent ' || p_gift_emoji || ' ' || p_gift_name,
    jsonb_build_object(
      'gift_name', p_gift_name,
      'gift_emoji', p_gift_emoji,
      'coin_value', p_coin_value,
      'recipient_id', p_recipient_id
    )
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.2 Follow Event Generator
```sql
-- RPC: Create follow chat message when user follows
CREATE OR REPLACE FUNCTION create_follow_chat_message(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_follower_username TEXT;
  v_message_id BIGINT;
BEGIN
  -- Get follower username
  SELECT username INTO v_follower_username
  FROM profiles WHERE id = p_follower_id;

  -- Insert follow message
  INSERT INTO chat_messages (
    profile_id,
    message_type,
    content,
    event_metadata
  ) VALUES (
    p_follower_id,
    'follow',
    v_follower_username || ' started following',
    jsonb_build_object(
      'follower_id', p_follower_id,
      'following_id', p_following_id
    )
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.3 Go Live Event Generator
```sql
-- RPC: Create went_live chat message
CREATE OR REPLACE FUNCTION create_went_live_chat_message(
  p_profile_id UUID,
  p_stream_id BIGINT
)
RETURNS BIGINT AS $$
DECLARE
  v_username TEXT;
  v_message_id BIGINT;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM profiles WHERE id = p_profile_id;

  -- Insert went_live message
  INSERT INTO chat_messages (
    profile_id,
    message_type,
    content,
    event_metadata
  ) VALUES (
    p_profile_id,
    'went_live',
    v_username || ' is now live!',
    jsonb_build_object(
      'stream_id', p_stream_id,
      'streamer_id', p_profile_id
    )
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.4 Mention Parser Function
```sql
-- RPC: Parse @ mentions and create mention records
CREATE OR REPLACE FUNCTION create_mention_chat_message(
  p_sender_id UUID,
  p_message_content TEXT
)
RETURNS BIGINT AS $$
DECLARE
  v_message_id BIGINT;
  v_mentioned_username TEXT;
  v_mentioned_profile_id UUID;
  v_mention_array TEXT[];
BEGIN
  -- Extract @mentions using regex
  v_mention_array := regexp_matches(p_message_content, '@(\w+)', 'g');

  -- Insert message with mention type
  INSERT INTO chat_messages (
    profile_id,
    message_type,
    content,
    event_metadata
  ) VALUES (
    p_sender_id,
    'mention',
    p_message_content,
    jsonb_build_object('mentioned_usernames', v_mention_array)
  )
  RETURNING id INTO v_message_id;

  -- Create mention records for each @username
  FOREACH v_mentioned_username IN ARRAY v_mention_array
  LOOP
    -- Find profile_id for mentioned username
    SELECT id INTO v_mentioned_profile_id
    FROM profiles
    WHERE username = v_mentioned_username;

    IF v_mentioned_profile_id IS NOT NULL THEN
      INSERT INTO message_mentions (message_id, mentioned_profile_id)
      VALUES (v_message_id, v_mentioned_profile_id);
    END IF;
  END LOOP;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Phase 3: Frontend Implementation**

#### 3.1 Web Chat Component (`components/Chat.tsx`)

**Add Color-Coded Message Rendering**:
```tsx
// Helper function to get event styling
const getEventStyles = (messageType: string) => {
  switch (messageType) {
    case 'global':
      return {
        container: 'bg-red-500/10 border-l-4 border-red-500 pl-3 py-2',
        icon: '📢',
        color: 'text-red-600 dark:text-red-400',
      };
    case 'gift':
      return {
        container: 'bg-green-500/10 border-l-4 border-green-500 pl-3 py-2',
        icon: '🎁',
        color: 'text-green-600 dark:text-green-400',
      };
    case 'went_live':
      return {
        container: 'bg-blue-500/10 border-l-4 border-blue-500 pl-3 py-2',
        icon: '🎥',
        color: 'text-blue-600 dark:text-blue-400',
      };
    case 'mention':
      return {
        container: 'bg-purple-500/10 border-l-4 border-purple-500 pl-3 py-2',
        icon: '@',
        color: 'text-purple-600 dark:text-purple-400',
      };
    case 'follow':
      return {
        container: 'bg-yellow-500/10 border-l-4 border-yellow-500 pl-3 py-2',
        icon: '⭐',
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    case 'joined':
      return {
        container: 'bg-cyan-500/10 border-l-4 border-cyan-500 pl-3 py-2',
        icon: '👋',
        color: 'text-cyan-600 dark:text-cyan-400',
      };
    case 'left':
      return {
        container: 'bg-gray-500/10 border-l-4 border-gray-500 pl-3 py-2',
        icon: '👋',
        color: 'text-gray-600 dark:text-gray-400',
      };
    default:
      return null;
  }
};

// Updated message rendering
{messages.map((msg) => {
  const eventStyles = getEventStyles(msg.message_type);
  
  if (eventStyles) {
    // Event message
    return (
      <div
        key={msg.id}
        className={`flex items-center gap-2 rounded-md ${eventStyles.container}`}
      >
        <span className="text-lg">{eventStyles.icon}</span>
        <span className={`text-sm font-semibold ${eventStyles.color}`}>
          {msg.content}
        </span>
      </div>
    );
  }
  
  // Regular message
  return (
    <div key={msg.id} className="flex gap-2">
      {/* existing message rendering */}
    </div>
  );
})}
```

#### 3.2 Mobile Chat Overlay (`mobile/overlays/ChatOverlay.tsx`)

**Add Color-Coded Styles**:
```tsx
const getEventStyles = (messageType: string) => {
  switch (messageType) {
    case 'global':
      return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '📢' };
    case 'gift':
      return { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '🎁' };
    case 'went_live':
      return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '🎥' };
    case 'mention':
      return { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', icon: '@' };
    case 'follow':
      return { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', icon: '⭐' };
    case 'joined':
      return { bg: 'rgba(6, 182, 212, 0.1)', border: '#06b6d4', icon: '👋' };
    case 'left':
      return { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', icon: '👋' };
    default:
      return null;
  }
};

// In message rendering
{messages.map((msg) => {
  const eventStyles = getEventStyles(msg.messageType);
  
  if (eventStyles) {
    return (
      <View
        key={msg.id}
        style={[
          styles.eventMessage,
          { backgroundColor: eventStyles.bg, borderLeftColor: eventStyles.border }
        ]}
      >
        <Text style={styles.eventIcon}>{eventStyles.icon}</Text>
        <Text style={styles.eventText}>{msg.content}</Text>
      </View>
    );
  }
  
  // Regular message
  return <View key={msg.id}>{/* existing */}</View>;
})}

// Styles
const styles = StyleSheet.create({
  eventMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderLeftWidth: 4,
    borderRadius: 6,
    marginVertical: 4,
  },
  eventIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  eventText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
```

---

## 🚀 Integration Points

### **1. Gift Sending** (when gift transaction completes)
```typescript
// In GiftModal or gift sending logic
await supabase.rpc('send_gift_and_notify', {
  sender_id: currentUserId,
  recipient_id: recipientId,
  gift_type_id: giftId,
  slot_index: slotIndex,
});

// Also call:
await supabase.rpc('create_gift_chat_message', {
  p_sender_id: currentUserId,
  p_recipient_id: recipientId,
  p_gift_name: giftName,
  p_gift_emoji: giftEmoji,
  p_coin_value: giftValue,
});
```

### **2. Follow Action** (when user follows)
```typescript
// In follow button handler
await supabase.from('follows').insert({
  follower_id: currentUserId,
  following_id: targetUserId,
});

// Also call:
await supabase.rpc('create_follow_chat_message', {
  p_follower_id: currentUserId,
  p_following_id: targetUserId,
});
```

### **3. Go Live** (when user starts broadcasting)
```typescript
// In GoLiveButton after successful publish
await supabase.rpc('create_went_live_chat_message', {
  p_profile_id: currentUserId,
  p_stream_id: liveStreamId,
});
```

### **4. @ Mentions** (when message contains @)
```typescript
// In sendMessage function
const hasMentions = newMessage.includes('@');

if (hasMentions) {
  await supabase.rpc('create_mention_chat_message', {
    p_sender_id: currentUserId,
    p_message_content: newMessage,
  });
} else {
  // Regular message insert
  await supabase.from('chat_messages').insert({
    profile_id: currentUserId,
    message_type: 'text',
    content: newMessage,
  });
}
```

---

## 📋 Summary for Logic Team

### **Features NOT Currently Implemented (Need Logic Team)**

1. **@ Mention/Tagging System**
   - **What's needed**: 
     - Database trigger to detect @ mentions in messages
     - RPC function to create mention records
     - Notification system for mentioned users
   - **Color**: 🟣 Purple (`bg-purple-500/10 border-purple-500`)

2. **Follow Events in Chat**
   - **What's needed**:
     - Trigger on `follows` table insert
     - Call `create_follow_chat_message()` RPC
   - **Color**: 🟡 Yellow (`bg-yellow-500/10 border-yellow-500`)

3. **User Join/Leave Events**
   - **What's needed**:
     - Trigger on `room_presence` table changes
     - Optional: Debounce to avoid spam (show only if user stays >30s)
   - **Colors**: 
     - Join: 🔵 Cyan (`bg-cyan-500/10 border-cyan-500`)
     - Leave: ⚪ Gray (`bg-gray-500/10 border-gray-500`)

4. **Gift Events in Chat**
   - **What's needed**:
     - Call `create_gift_chat_message()` after successful gift transaction
   - **Color**: 🟢 Green (`bg-green-500/10 border-green-500`)

5. **Go Live Events in Chat**
   - **What's needed**:
     - Call `create_went_live_chat_message()` when user publishes stream
   - **Color**: 🔵 Blue (`bg-blue-500/10 border-blue-500`)

6. **Global Messages** (admin broadcasts)
   - **What's needed**:
     - Admin panel to send global messages
     - RPC with elevated permissions
   - **Color**: 🔴 Red (`bg-red-500/10 border-red-500`)

---

## ✅ Ready to Implement (Frontend Only)

Once Logic Team provides the backend triggers/RPCs, the frontend changes are straightforward:

**Files to Update**:
1. `components/Chat.tsx` - Add `getEventStyles()` helper
2. `mobile/overlays/ChatOverlay.tsx` - Add mobile event styles
3. Both: Update message rendering to check `message_type`

**No Breaking Changes**: Regular chat messages still work as before.

---

**Status**: 📝 **DESIGN COMPLETE** - Awaiting Logic Team Implementation

**Next Step**: Logic Team to implement database triggers and RPC functions for event generation.

