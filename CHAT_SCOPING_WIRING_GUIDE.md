# Chat Scoping Implementation - Code Changes Required

## Migration Applied: `APPLY_CHAT_SCOPING.sql`

### Database Changes:
✅ Added `room_id TEXT` (for group rooms like 'live_central')  
✅ Added `live_stream_id INTEGER` (for solo streams)  
✅ Added performance indexes on both columns  
✅ Added RLS policies for security  
✅ Legacy NULL messages handled in query fallbacks  

---

## Code Locations Requiring Updates

### 1. **Web - Group Room Chat** (Live Central)
**File**: `components/Chat.tsx`

**Current Query** (lines 107-121):
```typescript
const { data, error } = await supabase
  .from('chat_messages')
  .select(`...`)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Required Change**:
```typescript
const { data, error } = await supabase
  .from('chat_messages')
  .select(`...`)
  .eq('room_id', 'live_central')  // ← ADD THIS
  .order('created_at', { ascending: false })
  .limit(50);
```

**Locations**:
- Line 107: loadMessages() function
- Line 158: fallback query
- Line 446: sendMessage() insert - ADD `room_id: 'live_central'`

**Realtime subscription** (line 95-108):
```typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'chat_messages',
  filter: 'room_id=eq.live_central',  // ← ADD THIS
}, ...)
```

---

### 2. **Web - Solo Stream Chat** (New Implementation Needed)
**File**: `components/SoloStreamViewer.tsx`

Currently has NO chat component. Need to add:

```typescript
// Import Chat component or create SoloStreamChat
import Chat from './Chat';  // or create new component

// Pass live_stream_id prop
<Chat liveStreamId={streamer.live_stream_id} />
```

**Option A**: Update existing `Chat.tsx` to accept optional `roomId` or `liveStreamId` props  
**Option B**: Create `components/SoloStreamChat.tsx` (dedicated for solo streams)

**Recommended**: Option A (reuse Chat.tsx with props)

---

### 3. **Mobile - Chat Hook**
**File**: `mobile/hooks/useChatMessages.ts`

**Current** (lines 26-43):
```typescript
export function useChatMessages() {
  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`...`)
      .order('created_at', { ascending: false })
      .limit(50);
```

**Required Change**:
```typescript
export function useChatMessages(options?: {
  roomId?: string;
  liveStreamId?: number;
}) {
  const loadMessages = useCallback(async () => {
    let query = supabase
      .from('chat_messages')
      .select(`...`);
    
    // Filter by scope
    if (options?.roomId) {
      query = query.eq('room_id', options.roomId);
    } else if (options?.liveStreamId) {
      query = query.eq('live_stream_id', options.liveStreamId);
    }
    // Legacy: if no filter, show NULL messages only
    else {
      query = query.is('room_id', null).is('live_stream_id', null);
    }
    
    const { data, error} = await query
      .order('created_at', { ascending: false })
      .limit(50);
```

**sendMessage** (line 67-89):
```typescript
const { error } = await supabase
  .from('chat_messages')
  .insert({
    profile_id: user.id,
    content,
    message_type: 'user',
    room_id: options?.roomId || null,  // ← ADD
    live_stream_id: options?.liveStreamId || null,  // ← ADD
  });
```

**Realtime subscription** (line 95-108):
```typescript
const channel = supabase
  .channel('chat-messages-mobile')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: options?.roomId 
      ? `room_id=eq.${options.roomId}`
      : options?.liveStreamId
      ? `live_stream_id=eq.${options.liveStreamId}`
      : 'room_id=is.null',  // ← ADD filter
  }, ...)
```

---

### 4. **Mobile - ChatOverlay Component**
**File**: `mobile/overlays/ChatOverlay.tsx`

**Current** (line 33-34):
```typescript
export const ChatOverlay: React.FC<ChatOverlayProps> = ({ visible, onClose }) => {
  const { messages, loading, sendMessage } = useChatMessages();
```

**Required Change**:
```typescript
interface ChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;           // ← ADD
  liveStreamId?: number;     // ← ADD
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  visible, 
  onClose,
  roomId,
  liveStreamId 
}) => {
  const { messages, loading, sendMessage } = useChatMessages({
    roomId,
    liveStreamId,
  });
```

---

### 5. **Mobile - LiveRoomScreen** (Group Room)
**File**: `mobile/screens/LiveRoomScreen.tsx`

**Current** (line 534):
```typescript
<ChatOverlay visible={state.activeOverlay === 'chat'} onClose={handleCloseOverlay} />
```

**Required Change**:
```typescript
<ChatOverlay 
  visible={state.activeOverlay === 'chat'} 
  onClose={handleCloseOverlay}
  roomId="live_central"  // ← ADD THIS
/>
```

---

### 6. **Mobile - SoloHostStreamScreen** (Solo Stream Host)
**File**: `mobile/screens/SoloHostStreamScreen.tsx`

Currently has placeholder chat UI (lines 95-103). Need to:

**Replace** placeholder with real ChatOverlay:
```typescript
// Import
import { ChatOverlay } from '../overlays/ChatOverlay';

// Add state
const [showChat, setShowChat] = useState(false);
const [myLiveStreamId, setMyLiveStreamId] = useState<number | null>(null);

// Fetch live_stream_id when going live
useEffect(() => {
  if (isLive && currentUser) {
    supabase
      .from('live_streams')
      .select('id')
      .eq('profile_id', currentUser.id)
      .single()
      .then(({ data }) => setMyLiveStreamId(data?.id || null));
  }
}, [isLive, currentUser]);

// In render, replace placeholder with:
<ChatOverlay
  visible={showChat}
  onClose={() => setShowChat(false)}
  liveStreamId={myLiveStreamId || undefined}
/>

// Add button to toggle chat
<TouchableOpacity onPress={() => setShowChat(true)}>
  <Ionicons name="chatbubble" size={24} color="#fff" />
</TouchableOpacity>
```

---

### 7. **Mobile - Solo Stream Viewer Screen** (TBD)
**File**: Need to create `mobile/screens/SoloStreamViewerScreen.tsx`

When viewer watches a solo stream:
```typescript
<ChatOverlay
  visible={showChat}
  onClose={() => setShowChat(false)}
  liveStreamId={watchedStreamId}  // ← Pass the streamer's live_stream_id
/>
```

---

## Testing Checklist

### Group Room (Live Central):
- [ ] Messages sent in Live Central only appear in Live Central
- [ ] Legacy NULL messages still appear (if not backfilled)
- [ ] Realtime updates work
- [ ] No errors on insert

### Solo Streams:
- [ ] Messages sent in solo stream A don't appear in solo stream B
- [ ] Streamer sees their own stream's chat
- [ ] Viewers see the streamer's chat
- [ ] Realtime updates work
- [ ] No errors on insert

### Security:
- [ ] Unauthenticated users can READ chat
- [ ] Unauthenticated users CANNOT send messages
- [ ] Users can only delete their own messages
- [ ] Admin/owner can delete any message

### Performance:
- [ ] Queries are fast (indexes working)
- [ ] No N+1 queries
- [ ] Realtime subscriptions don't cause memory leaks

---

## Rollback Plan

If issues occur:
```sql
-- Remove columns
ALTER TABLE chat_messages DROP COLUMN room_id;
ALTER TABLE chat_messages DROP COLUMN live_stream_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_chat_messages_room_id_created;
DROP INDEX IF EXISTS idx_chat_messages_stream_id_created;

-- Drop policies
DROP POLICY IF EXISTS chat_messages_read_room ON chat_messages;
DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_own ON chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_admin ON chat_messages;
```

Then revert all code changes.

