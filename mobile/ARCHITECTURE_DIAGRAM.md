# MyLiveLinks Mobile - Architecture Diagram

## Component Hierarchy

```
App.tsx (Root)
└── GestureHandlerRootView
    └── SafeAreaView
        └── LiveRoomScreen (Main Container)
            ├── GestureDetector (swipe detection)
            │   └── Grid12 (4×3 tiles, ALWAYS MOUNTED)
            │       └── Tile × 12
            │           ├── Video Surface (placeholder)
            │           ├── LIVE Badge
            │           ├── Username
            │           ├── Viewer Count
            │           └── Status Icons
            │
            ├── ChatOverlay (absolute position, conditional)
            ├── ViewersLeaderboardsOverlay (absolute position, conditional)
            ├── MenuOverlay (absolute position, conditional)
            ├── StatsOverlay (absolute position, conditional)
            └── DebugPill (absolute position, conditional)
```

## State Flow

```
useLiveRoomUI() Hook
└── LiveRoomUIState
    ├── activeOverlay: 'chat' | 'viewers' | 'menu' | 'stats' | null
    ├── isConnected: boolean
    ├── coinBalance: number
    └── diamondBalance: number

useLiveRoomParticipants() Hook (PLACEHOLDER)
└── Returns
    ├── participants: Participant[]
    ├── myIdentity: string | null
    ├── isConnected: boolean
    ├── goLive(): Promise<void>
    ├── stopLive(): Promise<void>
    └── tileCount: number
```

## Gesture Flow

```
User Swipe on Grid
    ↓
GestureDetector.Pan.onEnd()
    ↓
Check: Is overlay already open?
    ├── YES → Ignore swipe
    └── NO → Determine direction
        ├── UP (↑) → openOverlay('chat')
        ├── DOWN (↓) → openOverlay('viewers')
        ├── RIGHT (→) → openOverlay('menu')
        └── LEFT (←) → openOverlay('stats')
    ↓
State updates: activeOverlay = 'chat' (example)
    ↓
Re-render: ChatOverlay visible={true}
    ↓
User swipes DOWN on ChatOverlay
    ↓
ChatOverlay.panGesture.onEnd()
    ↓
Threshold reached?
    └── YES → onClose() → closeOverlay()
        ↓
State updates: activeOverlay = null
        ↓
Re-render: ChatOverlay visible={false} (unmounts)
```

## Data Flow (Future with LiveKit)

```
LiveKit Room
    ↓
useLiveRoomParticipants()
    ↓
participants: Participant[]
    ↓
Grid12 receives participants
    ↓
createTileItems(participants)
    ├── Maps participants to tiles (up to 12)
    └── Fills remaining with empty tiles
    ↓
Renders 12 Tile components
    ↓
Each Tile shows:
    ├── Video Track (from LiveKit)
    ├── Participant metadata
    └── Status indicators
```

## Overlay Layout (Visual)

### Chat Overlay (Swipe UP)
```
┌─────────────────────────────────┐
│         Grid (4×3)              │
│  [All 12 tiles visible behind]  │
│                                 │
├─────────────────────────────────┤
│ ╭───────────────────────────╮   │ ← Bottom half
│ │  ——————  Swipe indicator  │   │
│ │     💬 Chat               │   │
│ │  ┌─────────────────────┐ │   │
│ │  │ User1: Hello!       │ │   │
│ │  │ User2: Welcome      │ │   │
│ │  └─────────────────────┘ │   │
│ │  [Message input here]   │   │
│ ╰───────────────────────────╯   │
└─────────────────────────────────┘
```

### Viewers/Leaderboards Overlay (Swipe DOWN)
```
┌─────────────────────────────────┐
│ ╭───────────────────────────╮   │ ← Top 60%
│ │  ——————  Swipe indicator  │   │
│ │  [Viewers] [Streamers]    │   │
│ │  ┌─────────────────────┐ │   │
│ │  │ #1 TopStreamer 💎5K │ │   │
│ │  │ #2 Streamer2   💎3K │ │   │
│ │  └─────────────────────┘ │   │
│ ╰───────────────────────────╯   │
├─────────────────────────────────┤
│         Grid (4×3)              │
│  [All 12 tiles visible behind]  │
└─────────────────────────────────┘
```

### Menu Overlay (Swipe RIGHT)
```
┌──────────────────┬──────────────┐
│                  │ ╭──────────╮ │ ← Right side
│   Grid (4×3)     │ │   Menu   │ │
│   [12 tiles]     │ │          │ │
│   [visible       │ │ 🪙 Coins │ │
│    behind]       │ │ 💎 Diam. │ │
│                  │ │          │ │
│                  │ │ Purchase │ │
│                  │ │ Convert  │ │
│                  │ │ Wallet   │ │
│                  │ ╰──────────╯ │
└──────────────────┴──────────────┘
```

### Stats Overlay (Swipe LEFT)
```
┌──────────────┬────────────────────┐
│ ╭──────────╮ │                    │ ← Left side
│ │  Stats   │ │     Grid (4×3)     │
│ │          │ │     [12 tiles]     │
│ │ Viewers  │ │     [visible       │
│ │ Live: 12 │ │      behind]       │
│ │          │ │                    │
│ │ Gifts    │ │                    │
│ │ Sent: 0  │ │                    │
│ ╰──────────╯ │                    │
└──────────────┴────────────────────┘
```

## File Structure (Complete)

```
mobile/
├── package.json                 # Expo config & dependencies
├── app.json                     # Expo app manifest
├── tsconfig.json               # TypeScript config
├── .gitignore                  # Git ignore rules
├── .env.example                # Example environment variables
├── README.md                   # Setup & usage guide
├── IMPLEMENTATION_GUIDE.md     # Architecture decisions
├── ARCHITECTURE_DIAGRAM.md     # This file
│
├── App.tsx                     # Root component
│
├── screens/
│   └── LiveRoomScreen.tsx      # Main screen (gestures + layout)
│
├── components/
│   ├── live/
│   │   ├── Grid12.tsx          # 12-tile grid container
│   │   └── Tile.tsx            # Single tile UI
│   └── DebugPill.tsx           # Debug mode indicator
│
├── overlays/
│   ├── ChatOverlay.tsx         # Chat interface
│   ├── ViewersLeaderboardsOverlay.tsx  # Viewers & leaderboards
│   ├── MenuOverlay.tsx         # Menu with purchase/convert
│   └── StatsOverlay.tsx        # Room & user stats
│
├── state/
│   └── liveRoomUI.ts           # UI state management hook
│
├── hooks/
│   └── useLiveRoomParticipants.ts  # Placeholder streaming hook
│
├── types/
│   └── live.ts                 # TypeScript type definitions
│
└── assets/
    └── .gitkeep                # Placeholder for images
```

## Key Design Principles Visualized

### 1. Stable Grid
```
Time:    t0 ────────→ t1 ────────→ t2 ────────→ t3
         Grid         Grid         Grid         Grid
         mounted      mounted      mounted      mounted
                      ↓            ↓            ↓
                      Overlay      Overlay      Overlay
                      appears      changes      disappears
                      
         Grid DOM node NEVER recreated
```

### 2. Single Overlay State
```
State: activeOverlay

null ──swipe up──→ 'chat' ──swipe down──→ null
  ↑                                          ↓
  └──────────────── swipe left ─────────────┘
                        │
                     'stats'

Only ONE non-null value at a time
```

### 3. Separation of Concerns
```
┌─────────────────────────────────────────┐
│  LiveRoomScreen (UI Controller)         │
│  - Gesture detection                    │
│  - Overlay state management             │
│  - Layout composition                   │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┴───────────┐
    ↓                       ↓
┌─────────────┐    ┌─────────────────────┐
│  Grid12     │    │  useLiveRoom        │
│  - Layout   │    │  Participants       │
│  - Tiles    │    │  (Streaming Logic)  │
│  - Render   │    │  - LiveKit          │
└─────────────┘    │  - Pub/Sub          │
                   │  - Tracks           │
                   └─────────────────────┘
     ↑                      │
     └──────participants────┘
     
UI never knows about LiveKit internals
Streaming never knows about gesture logic
```

## Performance Optimization Strategy

```
Render Cycle Optimization:
1. Grid12 uses useMemo for tile items → prevents recalc on every render
2. Tile components are React.memo (future) → only re-render on prop change
3. Overlays conditionally render → not in DOM when closed
4. Animations on UI thread → Reanimated worklets
5. State updates batched → single state object

Result: Smooth 60fps even with 12 video tiles
```

## Integration Points for Streaming Team

```
┌──────────────────────────────────┐
│  PLACEHOLDER                     │
│  hooks/useLiveRoomParticipants   │
│                                  │
│  Replace with:                   │
│  ├── LiveKit connection logic    │
│  ├── Participant track rendering │
│  ├── Pub/sub state management    │
│  └── Error handling              │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│  Grid12 receives participants     │
│  → No changes needed             │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│  Tile renders video surface      │
│  → Add LiveKit VideoTrack here   │
└──────────────────────────────────┘
```

This architecture ensures the UI team and streaming team can work independently without conflicts.

