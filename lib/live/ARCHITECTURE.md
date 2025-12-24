# Grid Selection Engine - Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LiveKit Room                             │
│  (20+ participants publishing video/audio)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ LiveKit Participant Objects
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Your Component Layer                          │
│  - Convert LiveKit participants to ParticipantLite               │
│  - Fetch metrics from database (optional)                        │
│  - Manage sort mode and pinned state                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ ParticipantLite[]
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Grid Selection Engine (lib/live)                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Filter Eligibility                                    │   │
│  │    - hasVideo === true                                   │   │
│  │    - Valid identity                                      │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. Handle Pinned (if any)                               │   │
│  │    - Pinned participants occupy first slots              │   │
│  │    - If 12+ pinned, return first 12                      │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. Preserve Current Selection (Anti-Thrash)             │   │
│  │    - Keep currently selected if still eligible           │   │
│  │    - Only remove if stopped publishing                   │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. Fill Empty Slots                                      │   │
│  │    - Calculate remaining slots needed                    │   │
│  │    - Get candidates (not pinned, not current)            │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 5. Sort by Mode                                          │   │
│  │    - newest: joinedAt DESC                               │   │
│  │    - most_viewed: metrics.views DESC                     │   │
│  │    - most_gifted: metrics.gifts DESC                     │   │
│  │    - most_followed: metrics.follows DESC                 │   │
│  │    - random: deterministic shuffle (seeded)              │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 6. Select Top N                                          │   │
│  │    - Take top candidates to fill remaining slots         │   │
│  │    - Cap at 12 total                                     │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 7. Return Selection                                      │   │
│  │    - Ordered list of identities (max 12)                 │   │
│  │    - Debug info (eligible count, mode, reason)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ selection: string[]
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Rendering Layer                          │
│  - Map selection to VideoTile components                         │
│  - Display 12 tiles in 4x3 grid                                  │
│  - Show overflow indicator if needed                             │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

```
LiveKit Participant
{
  identity: "user123",
  isCameraEnabled: true,
  joinedAt: 1703456789000,
  metadata: { views: 150, gifts: 30 }
}
                │
                │ Convert
                ▼
ParticipantLite
{
  identity: "user123",
  hasVideo: true,
  joinedAt: 1703456789000,
  metrics: { views: 150, gifts: 30 }
}
                │
                │ Select
                ▼
Selection Output
{
  selection: ["user123", "user456", ...],
  debug: {
    eligibleCount: 20,
    mode: "most_viewed",
    reason: "Selected top 12 from 20 eligible"
  }
}
                │
                │ Render
                ▼
<VideoTile identity="user123" />
<VideoTile identity="user456" />
...
```

## 🔄 State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component State                               │
│                                                                   │
│  - sortMode: SortMode                                            │
│  - pinnedParticipants: string[]                                  │
│  - sessionSeed: string (stable per session)                      │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                useGridSelection Hook                             │
│                                                                   │
│  Internal State:                                                 │
│  - currentSelection: string[] (for stability)                    │
│                                                                   │
│  Memoized Computation:                                           │
│  - Runs selectGridParticipants()                                 │
│  - Updates currentSelection on change                            │
│                                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                     Stable Selection
                  (No thrashing, deterministic)
```

## 🎯 Selection Algorithm (Pseudocode)

```
function selectGridParticipants(input):
  # Step 1: Filter eligible
  eligible = filter(input.participants, p => p.hasVideo && p.identity)
  
  # Step 2: Handle pinned
  pinnedEligible = filter(input.pinned, id => id in eligible)
  if length(pinnedEligible) >= 12:
    return pinnedEligible[0:12]
  
  # Step 3: Preserve current selection
  nonPinned = eligible - pinnedEligible
  currentStillEligible = filter(input.currentSelection, id => id in nonPinned)
  
  # Step 4: Calculate remaining slots
  remainingSlots = 12 - length(pinnedEligible) - length(currentStillEligible)
  
  # Step 5: Get candidates for new slots
  candidates = nonPinned - currentStillEligible
  
  # Step 6: Sort candidates by mode
  sortedCandidates = sort(candidates, input.mode, input.seed)
  
  # Step 7: Select top N
  newSelections = sortedCandidates[0:remainingSlots]
  
  # Step 8: Combine and return
  return pinnedEligible + currentStillEligible + newSelections
```

## 🔀 Sort Algorithm Details

### Newest
```
sort by:
  1. joinedAt DESC (higher = newer)
  2. identity ASC (alphabetical)
```

### Metric-based (views/gifts/follows)
```
sort by:
  1. metric DESC (higher = better)
  2. joinedAt DESC (newer = tie-breaker)
  3. identity ASC (alphabetical)
```

### Random (Deterministic)
```
1. Create seeded PRNG from seed string
2. Fisher-Yates shuffle using PRNG
3. Same seed = same shuffle order
```

## 🧩 Module Structure

```
lib/live/
├── types.ts                    # Type definitions
│   ├── ParticipantLite
│   ├── SortMode
│   ├── SelectionInput
│   └── SelectionOutput
│
├── selectGridParticipants.ts  # Core engine (pure functions)
│   ├── selectGridParticipants()
│   ├── isEligible()
│   ├── sortParticipants()
│   ├── sortByNewest()
│   ├── sortByMetric()
│   ├── deterministicShuffle()
│   ├── createSeededRandom()
│   ├── getRemovedParticipants()
│   └── getAddedParticipants()
│
├── useGridSelection.ts        # React hooks
│   ├── useGridSelection()
│   └── useGridSelectionPure()
│
├── selectGridParticipants.test.ts  # Tests (29 cases)
│
├── index.ts                   # Public API
│
├── README.md                  # Full documentation
├── INTEGRATION_EXAMPLE.md     # Integration guide
├── QUICK_REFERENCE.md         # Quick reference
└── ARCHITECTURE.md            # This file
```

## 🔒 Isolation Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      LiveKit Layer                               │
│  - Room management                                               │
│  - Publishing/subscribing                                        │
│  - Track management                                              │
│  - Network communication                                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ NO INTERACTION
                             │ (Intentional isolation)
                             │
┌─────────────────────────────────────────────────────────────────┐
│                   Selection Engine Layer                         │
│  - Pure selection logic                                          │
│  - Sorting algorithms                                            │
│  - Stability management                                          │
│  - NO side effects                                               │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Design Patterns Used

### 1. Pure Functions
- All core logic is pure (no side effects)
- Same inputs always produce same outputs
- Easy to test and reason about

### 2. Strategy Pattern
- Different sort modes as strategies
- Easy to add new sort modes
- Clean separation of concerns

### 3. Memoization
- React hooks use `useMemo` for performance
- Prevents unnecessary recalculations
- Stable references

### 4. Seeded Randomness
- Deterministic shuffle using LCG
- Reproducible results
- No true randomness

### 5. Composition
- Small, focused functions
- Composed into larger algorithm
- Easy to test individually

## 📈 Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Filter eligible | O(n) | O(n) |
| Sort by metric | O(n log n) | O(n) |
| Deterministic shuffle | O(n) | O(n) |
| Overall | O(n log n) | O(n) |

Where n = number of participants (typically < 100)

## 🔐 Guarantees

1. **Determinism**: Same inputs = same outputs
2. **Stability**: Preserves selection when possible
3. **Capacity**: Never exceeds 12 tiles
4. **Eligibility**: Only shows publishing participants
5. **Isolation**: No LiveKit side effects

## 🚫 Anti-Patterns Avoided

- ❌ Using `Math.random()` for shuffle (non-deterministic)
- ❌ Modifying input parameters (impure)
- ❌ Coupling with LiveKit lifecycle
- ❌ Making network requests
- ❌ Storing persistent state
- ❌ Global variables or singletons

## ✅ Best Practices Followed

- ✅ Pure functions (no side effects)
- ✅ TypeScript for type safety
- ✅ Comprehensive test coverage
- ✅ Clear documentation
- ✅ Single responsibility principle
- ✅ Separation of concerns
- ✅ Minimal API surface

