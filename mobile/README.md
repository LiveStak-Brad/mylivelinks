# MyLiveLinks Mobile

React Native (Expo) mobile app with swipe-based UI for live streaming.

## Architecture Overview

### State Management

**Single Source of Truth**: `state/liveRoomUI.ts`
- Manages overlay visibility (only ONE overlay open at a time)
- Handles coin/diamond balance
- Controls connection state
- Prevents UI thrashing

### Gesture Handling

**Main Screen Gestures** (`screens/LiveRoomScreen.tsx`):
- **Swipe UP** → Open Chat Overlay
- **Swipe DOWN** → Open Viewers/Leaderboards Overlay  
- **Swipe RIGHT** → Open Menu Overlay
- **Swipe LEFT** → Open Stats Overlay

**Overlay Dismissal**:
- Each overlay has its own dismissal gesture (opposite direction)
- Tap outside overlay to close (for side sheets)
- Swipe indicators provide visual feedback

### Grid Component

**12-Tile Grid** (`components/live/Grid12.tsx`):
- 4 columns × 3 rows = 12 tiles
- Landscape-first orientation
- **NEVER unmounts** when overlays open/close
- Stable mounting ensures smooth performance

**Tile Component** (`components/live/Tile.tsx`):
- LIVE badge (top-left)
- Username (bottom-left)
- Viewer count (bottom-right)
- Camera/mic status icons (top-right)
- Video surface placeholder (for LiveKit integration)

### Overlays

All overlays use:
- Semi-transparent glass effect (`expo-blur`)
- Smooth slide-in/out animations (`react-native-reanimated`)
- Gesture-based dismissal
- Do NOT resize/reflow the grid

**1. ChatOverlay** (`overlays/ChatOverlay.tsx`)
- Scrollable chat messages
- Text input with send button
- Swipe down to dismiss

**2. ViewersLeaderboardsOverlay** (`overlays/ViewersLeaderboardsOverlay.tsx`)
- Tabbed interface (Viewers / Top Streamers / Top Gifters)
- Scrollable lists
- Swipe up to dismiss

**3. MenuOverlay** (`overlays/MenuOverlay.tsx`)
- Balance display (coins & diamonds)
- Purchase Coins (stub)
- Convert Coins (stub)
- Wallet (stub)
- Settings (stub)
- Swipe left to dismiss

**4. StatsOverlay** (`overlays/StatsOverlay.tsx`)
- Room stats (viewer count, live count)
- My stats (gifts, follows)
- Debug info (when enabled)
- Swipe right to dismiss

## Streaming Integration (Placeholder)

**Hook**: `hooks/useLiveRoomParticipants.ts`

This is a PLACEHOLDER for the streaming team to plug in LiveKit later.

Current interface:
```typescript
interface UseLiveRoomParticipantsReturn {
  participants: Participant[];
  myIdentity: string | null;
  isConnected: boolean;
  goLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  tileCount: number;
}
```

The grid renders tiles based on `participants` array. Streaming team will:
1. Replace placeholder hook with real LiveKit logic
2. Provide actual participant data
3. Render video tracks in tile video surface placeholder
4. Handle pub/sub logic

**IMPORTANT**: UI state (overlays, gestures) is completely separate from streaming logic.

## Setup & Installation

```bash
cd mobile
npm install
```

## Running the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Debug mode (shows debug pill in corner)
EXPO_PUBLIC_DEBUG_LIVE=1

# Supabase (configure later)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# LiveKit (configure later)
EXPO_PUBLIC_LIVEKIT_URL=wss://your-livekit-url
```

## Debug Mode

Set `EXPO_PUBLIC_DEBUG_LIVE=1` to enable the debug pill in the bottom-left corner.

Shows:
- Current overlay state
- Tile count
- Connection status (🟢/🔴)

## Testing Checklist

- [ ] App opens to grid only (no overlays)
- [ ] Swipe UP opens chat overlay (scrollable)
- [ ] Swipe DOWN opens viewers/leaderboards overlay (scrollable)
- [ ] Swipe RIGHT opens menu overlay with Purchase/Convert options
- [ ] Swipe LEFT opens stats overlay
- [ ] Opening/closing overlays does NOT remount grid component
- [ ] Only one overlay open at a time
- [ ] All gestures work smoothly
- [ ] Debug pill shows correct state (when enabled)

## File Structure

```
mobile/
├── App.tsx                          # Entry point
├── screens/
│   └── LiveRoomScreen.tsx          # Main screen with gesture handling
├── components/
│   ├── live/
│   │   ├── Grid12.tsx              # 12-tile grid (4×3)
│   │   └── Tile.tsx                # Single tile component
│   └── DebugPill.tsx               # Debug overlay state display
├── overlays/
│   ├── ChatOverlay.tsx             # Chat (swipe up)
│   ├── ViewersLeaderboardsOverlay.tsx  # Viewers/leaderboards (swipe down)
│   ├── MenuOverlay.tsx             # Menu (swipe right)
│   └── StatsOverlay.tsx            # Stats (swipe left)
├── state/
│   └── liveRoomUI.ts               # UI state management
├── hooks/
│   └── useLiveRoomParticipants.ts  # Placeholder streaming hook
├── types/
│   └── live.ts                     # TypeScript types
├── package.json
├── app.json
└── tsconfig.json
```

## Next Steps for Streaming Team

1. Replace `useLiveRoomParticipants` with real LiveKit integration
2. Render actual video tracks in `Tile` component video placeholder
3. Implement pub/sub logic for going live
4. Connect to Supabase for real-time updates
5. Implement actual purchase/convert flows in menu

## Design Principles

✅ **Minimal UI state** - Single source of truth prevents thrashing  
✅ **Stable grid** - Never unmounts, always mounted  
✅ **Clean separation** - UI logic separate from streaming logic  
✅ **Predictable gestures** - One overlay at a time, clear swipe map  
✅ **Performance-first** - Smooth animations, efficient rendering

