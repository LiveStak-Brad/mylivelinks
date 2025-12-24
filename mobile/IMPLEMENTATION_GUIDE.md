# MyLiveLinks Mobile - Implementation Guide

## Overview

This is a complete React Native (Expo) mobile app scaffolding for MyLiveLinks, featuring a locked 12-tile grid experience with swipe-based overlay navigation.

## Architecture Decisions

### 1. State Model: Single Source of Truth

**File**: `state/liveRoomUI.ts`

We use a simple hook-based state manager (`useLiveRoomUI`) that ensures:
- Only ONE overlay can be open at a time
- Grid never unmounts during overlay transitions
- Predictable state transitions
- No conflicting gestures

```typescript
const { state, openOverlay, closeOverlay, setConnected, updateBalance } = useLiveRoomUI();
```

**Why this approach?**
- Prevents UI thrashing from multiple overlays competing
- Simple to understand and debug
- Minimal re-renders
- Easy to extend with additional state

### 2. Gesture Handling

**File**: `screens/LiveRoomScreen.tsx`

Uses `react-native-gesture-handler` with a single Pan gesture on the main grid container.

**Swipe Map (LOCKED)**:
```
↑ UP     → Chat Overlay
↓ DOWN   → Viewers/Leaderboards Overlay
→ RIGHT  → Menu Overlay
← LEFT   → Stats Overlay
```

**Implementation Details**:
- Gestures only fire when NO overlay is open
- Each overlay has its own dismissal gesture (opposite direction)
- Threshold: 50px translation + velocity check
- Grid gesture detector wraps grid but doesn't interfere with rendering

**Why separate gestures for each overlay?**
- Main screen handles "open" gestures
- Each overlay handles its own "close" gesture
- Prevents gesture conflicts
- Clear ownership and predictable behavior

### 3. Grid Stability

**File**: `components/live/Grid12.tsx`

The 12-tile grid is ALWAYS mounted. Overlays render on top using absolute positioning.

**Key Implementation**:
```tsx
<View style={styles.gridContainer}>
  <Grid12 participants={participants} />  {/* Always here */}
</View>

{/* Overlays render separately */}
<ChatOverlay visible={state.activeOverlay === 'chat'} ... />
```

**Why this matters**:
- Grid never re-mounts = no video track interruptions
- Smooth overlay animations don't affect grid rendering
- Streaming team can rely on stable video surface
- Better performance (no mount/unmount cycles)

### 4. Streaming Integration Point

**File**: `hooks/useLiveRoomParticipants.ts`

This is a **PLACEHOLDER** hook that provides a clean interface for the streaming team.

**Current Implementation**:
- Returns mock/empty participant data
- Logs when goLive/stopLive are called
- Provides consistent interface for Grid component

**How Streaming Team Will Plug In**:

1. Install LiveKit React Native SDK
2. Replace placeholder logic with real LiveKit connection
3. Return actual participant data from room
4. Render video tracks in `Tile` component placeholder

**Example**:
```typescript
// Future implementation
export function useLiveRoomParticipants() {
  const room = useLiveKitRoom(/* config */);
  
  return {
    participants: room.participants,
    myIdentity: room.localParticipant.identity,
    isConnected: room.state === 'connected',
    goLive: async () => { /* LiveKit publish logic */ },
    stopLive: async () => { /* LiveKit unpublish logic */ },
    tileCount: room.participants.length,
  };
}
```

**Critical**: The UI doesn't care about LiveKit internals. It just needs the participant array.

## Overlay Design Pattern

All overlays follow the same pattern:

1. **Semi-transparent glass effect** using `expo-blur`
2. **Animated entry/exit** with `react-native-reanimated`
3. **Gesture-based dismissal** with swipe indicators
4. **Absolute positioning** over grid (doesn't affect layout)
5. **Conditional rendering** based on `visible` prop

**Example Structure**:
```tsx
export const ChatOverlay: React.FC<ChatOverlayProps> = ({ visible, onClose }) => {
  const translateY = useSharedValue(0);
  
  const panGesture = Gesture.Pan()
    .onUpdate(/* track swipe */)
    .onEnd(/* close if threshold reached */);

  if (!visible) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <BlurView intensity={40} style={styles.blur}>
          {/* Overlay content */}
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
};
```

## Debug Mode

**File**: `components/DebugPill.tsx`

Set `EXPO_PUBLIC_DEBUG_LIVE=1` in `.env` to enable.

Shows:
- Current overlay state (`chat`, `viewers`, `menu`, `stats`, or `none`)
- Tile count (number of participants)
- Connection status (🟢 connected / 🔴 disconnected)

**Why this is useful**:
- Quick visual feedback during development
- Easy to verify state transitions
- No need for console logs
- Can be shown to QA/testers

## Performance Considerations

1. **Grid never unmounts** - prevents expensive re-renders
2. **Memoized tile items** - `useMemo` in Grid12 prevents unnecessary recalculations
3. **Conditional overlay rendering** - overlays only exist in DOM when visible
4. **Reanimated on UI thread** - animations don't block JS thread
5. **Minimal state updates** - single state object reduces re-renders

## Testing Strategy

### Manual Testing Checklist

- [ ] App opens to grid only (no overlays visible)
- [ ] Swipe UP from anywhere opens chat
- [ ] Swipe DOWN from anywhere opens viewers/leaderboards
- [ ] Swipe RIGHT from anywhere opens menu
- [ ] Swipe LEFT from anywhere opens stats
- [ ] Swiping when overlay is open does nothing
- [ ] Each overlay can be dismissed with opposite swipe
- [ ] Tapping outside side sheets (menu/stats) closes them
- [ ] Only one overlay can be open at a time
- [ ] Grid remains visible behind all overlays
- [ ] No visual glitches during transitions
- [ ] Debug pill shows correct state (when enabled)

### Unit Testing (Future)

Suggested tests:
- State transitions in `useLiveRoomUI`
- Tile item creation in `Grid12`
- Gesture threshold logic in `LiveRoomScreen`
- Overlay visibility logic

## Future Enhancements (Out of Scope)

These are intentionally NOT implemented (scaffolding only):

1. **Actual streaming** - LiveKit integration
2. **Real chat** - WebSocket/Supabase realtime
3. **Purchase flows** - Payment processing
4. **User authentication** - Login/signup
5. **Profile management** - User settings
6. **Gifts/reactions** - In-stream interactions
7. **Navigation** - Multi-screen app structure
8. **Notifications** - Push notifications
9. **Analytics** - Event tracking
10. **Error handling** - Network errors, retries

## Development Workflow

```bash
# Install dependencies
cd mobile
npm install

# Start dev server
npm start

# In separate terminal, run on device/simulator
npm run ios    # iOS
npm run android # Android

# Enable debug mode
echo "EXPO_PUBLIC_DEBUG_LIVE=1" > .env
```

## Troubleshooting

**Problem**: Gestures not working  
**Solution**: Ensure `GestureHandlerRootView` wraps entire app (it does in `App.tsx`)

**Problem**: Overlays not showing  
**Solution**: Check z-index and absolute positioning. Overlays render after grid in DOM.

**Problem**: Grid remounting on overlay open  
**Solution**: This shouldn't happen. Grid and overlays are separate render trees. Check if Grid is inside conditional render (it shouldn't be).

**Problem**: Blur effect not working  
**Solution**: Ensure `expo-blur` is installed and configured. May not work on all Android devices.

## Code Quality Notes

- ✅ All files use TypeScript with strict mode
- ✅ Components are functional with hooks
- ✅ Consistent naming conventions
- ✅ Clear comments explaining "why" not just "what"
- ✅ Minimal dependencies
- ✅ No hardcoded magic numbers (constants defined)
- ✅ Responsive to different screen sizes (flex layouts)
- ✅ Dark theme throughout

## Commit Message

```
Scaffold mobile LiveRoom with 12-tile grid and swipe overlays (chat/viewers/menu/stats)

- Add React Native (Expo) app structure with TypeScript
- Implement 4×3 grid (12 tiles) with stable mounting
- Create 4 swipe overlays: Chat (up), Viewers (down), Menu (right), Stats (left)
- Add UI state management ensuring one overlay at a time
- Include placeholder streaming hook for LiveKit integration
- Add debug mode with visual state indicator
- Use glass morphism design with Reanimated animations
- Grid never unmounts when overlays open/close
- Clean separation between UI and streaming logic
```

## Questions for Streaming Team

1. **Video track rendering**: Where should we mount the LiveKit `VideoTrack` component in the Tile? (Currently just a placeholder view)
2. **Autofill logic**: How should we handle empty tiles? Show random streams? Leave empty?
3. **Room naming**: What's the room naming convention for the global multi-stream room?
4. **Participant metadata**: What additional data comes with each participant? (e.g., avatar, follow status)
5. **Publish permissions**: Can all users publish or only verified streamers?

## Contact

For questions about this scaffolding, refer to this guide and the inline code comments.

