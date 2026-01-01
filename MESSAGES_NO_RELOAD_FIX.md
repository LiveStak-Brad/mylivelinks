# Messages - No Reload on Conversation Switch Fix

## Problem

When clicking between conversations in the Messages page, the messages would:
- Flash/blink and reload from the database every time
- Cause a jarring user experience
- Make unnecessary network requests

## Root Cause

In `MessagesContext.tsx`, the `loadMessages` function was being called every time `activeConversationId` changed (line 959-966), fetching from the database each time without any caching mechanism.

## Solution

Implemented **message caching** using a `useRef` Map to store messages per conversation:

### 1. Added Message Cache

```typescript
const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
```

### 2. Updated `loadMessages` Function

- Added `forceRefresh` parameter (default: `false`)
- Checks cache first before making database call
- Only fetches from database if:
  - Cache miss, OR
  - Force refresh requested (e.g., new message from other user)

```typescript
const loadMessages = useCallback(
  async (conversationId: string, forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh && messagesCacheRef.current.has(conversationId)) {
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) {
        setMessages(cached);
        return;
      }
    }
    
    // ... fetch from database ...
    
    // Cache the messages
    messagesCacheRef.current.set(conversationId, mapped);
    setMessages(mapped);
  },
  [currentUserId, supabase]
);
```

### 3. Updated Cache on Send

When sending messages, immediately update the cache:

```typescript
setMessages((prev) => {
  const updated = [...prev, newMessage];
  // Update cache immediately for active conversation
  if (recipientId === activeConversationId) {
    messagesCacheRef.current.set(recipientId, updated);
  }
  return updated;
});
```

### 4. Force Refresh on Realtime Updates

When receiving new messages from another user via realtime subscription:

```typescript
if (senderId === otherId || recipientId === otherId) {
  // Force refresh when new message arrives from other user
  void loadMessages(activeConversationId, true);
}
```

## Benefits

✅ **Instant conversation switching** - No loading, no flash
✅ **Smooth UX** - Messages appear immediately from cache
✅ **Reduced network calls** - Only fetch when necessary
✅ **Real-time updates still work** - Force refresh on new incoming messages
✅ **Optimistic updates** - Sent messages update cache immediately

## User Experience

**Before:**
1. Click conversation → Screen flashes → Messages load → Show content

**After:**
1. Click conversation → Messages appear instantly from cache

## Files Modified

- `components/messages/MessagesContext.tsx` - Added caching layer

## Testing

Test these scenarios:
1. ✅ Switch between conversations - should be instant, no flash
2. ✅ Send a message - should appear immediately
3. ✅ Receive a message - should update via realtime
4. ✅ Refresh page - conversations reload correctly

---

**Status**: ✅ Complete - Messages now cache and switch instantly
