# Grid Selection Engine

Local-only selection engine for determining which 12 participants appear in a viewer's grid.

## Overview

This module implements pure, deterministic logic for selecting participants to display in a 12-tile grid. It handles:

- **Autofill**: Automatically fills empty slots from eligible participants
- **Overflow**: Selects top 12 when more than 12 are available
- **Stability**: Preserves existing selection to prevent thrashing
- **Sorting**: Multiple modes (newest, most_viewed, most_gifted, most_followed, random)
- **Pinning**: Priority display for pinned participants
- **Deterministic**: Same inputs produce same outputs (especially for random mode)

## Key Features

### 🎯 Selection Logic

- **Max 12 tiles**: Hard limit on grid capacity
- **Eligibility**: Only participants with `hasVideo === true`
- **Local-only**: Each viewer has their own independent grid selection
- **No side effects**: Pure functions, no LiveKit lifecycle changes

### 🔒 Anti-Thrash

The engine preserves currently selected participants when they remain eligible, only replacing them when:
- They stop publishing video
- User changes sort mode
- Better candidates appear in non-stability modes

### 🎲 Deterministic Random

Random mode uses a seeded PRNG to ensure:
- Same seed + same participants = same order
- No reshuffling on every render
- Stable experience per viewer session

## Usage

### Basic Usage (Pure Function)

```typescript
import { selectGridParticipants } from "@/lib/live";

const result = selectGridParticipants({
  participants: [
    {
      identity: "user1",
      hasVideo: true,
      joinedAt: Date.now(),
      metrics: { views: 100, gifts: 50, follows: 200 }
    },
    // ... more participants
  ],
  mode: "newest",
  currentSelection: ["user1"], // Optional: for stability
  pinned: [], // Optional: pinned participants
  seed: "viewer-session-id", // Optional: for random mode
});

console.log(result.selection); // ['user1', 'user2', ...]
console.log(result.debug); // { eligibleCount: 15, mode: 'newest', ... }
```

### React Hook

```typescript
import { useGridSelection } from "@/lib/live";

function LiveGrid({ livekitParticipants }) {
  const { selection, hasOverflow, eligibleCount } = useGridSelection({
    participants: livekitParticipants.map(p => ({
      identity: p.identity,
      hasVideo: p.isCameraEnabled,
      joinedAt: p.joinedAt,
      metrics: {
        views: p.viewCount,
        gifts: p.giftCount,
      },
    })),
    mode: "newest",
    seed: sessionId,
  });

  return (
    <div className="grid grid-cols-4 grid-rows-3">
      {selection.map(identity => (
        <VideoTile key={identity} identity={identity} />
      ))}
      {hasOverflow && (
        <div>+{eligibleCount - 12} more</div>
      )}
    </div>
  );
}
```

## Sort Modes

### `newest`
Higher `joinedAt` timestamp = newer = higher priority (descending order)

### `most_viewed`
Sort by `metrics.views` descending (missing = 0)

### `most_gifted`
Sort by `metrics.gifts` descending (missing = 0)

### `most_followed`
Sort by `metrics.follows` descending (missing = 0)

### `random`
Deterministic shuffle using seed. Same seed = same order.

## Tie-Breaking

When participants have equal values, ties are broken in order:
1. **Primary metric** (e.g., views, gifts)
2. **joinedAt** (newer first)
3. **identity** (alphabetical, for determinism)

## Pinning

Pinned participants always appear first (if eligible):

```typescript
selectGridParticipants({
  participants,
  mode: "newest",
  pinned: ["favorite-streamer", "friend"],
});
// Result: ['favorite-streamer', 'friend', ... 10 more from mode sorting]
```

If more than 12 participants are pinned, only the first 12 are shown.

## API Reference

### Types

```typescript
interface ParticipantLite {
  identity: string;
  hasVideo: boolean;
  joinedAt: number;
  isSelf?: boolean;
  hasAudio?: boolean;
  metrics?: {
    views?: number;
    gifts?: number;
    follows?: number;
  };
}

type SortMode = 
  | "random" 
  | "newest" 
  | "most_viewed" 
  | "most_gifted" 
  | "most_followed";

interface SelectionInput {
  participants: ParticipantLite[];
  mode: SortMode;
  currentSelection?: string[];
  pinned?: string[];
  seed?: string | number;
}

interface SelectionOutput {
  selection: string[];
  debug?: {
    eligibleCount: number;
    mode: SortMode;
    reason?: string;
  };
}
```

### Functions

#### `selectGridParticipants(input: SelectionInput): SelectionOutput`

Main selection function. Pure, deterministic, no side effects.

#### `getRemovedParticipants(prev: string[], current: string[]): string[]`

Helper to find which participants were removed from selection.

#### `getAddedParticipants(prev: string[], current: string[]): string[]`

Helper to find which participants were added to selection.

### Hooks

#### `useGridSelection(options: UseGridSelectionOptions): UseGridSelectionReturn`

React hook with internal state management for stability.

#### `useGridSelectionPure(options: UseGridSelectionOptions): UseGridSelectionReturn`

React hook without state management (for external state control).

## Testing

Run the comprehensive test suite:

```bash
npm test lib/live/selectGridParticipants.test.ts
```

Tests cover:
- ✅ Basic fill (< 12 participants)
- ✅ Overflow (> 12 participants)
- ✅ Stability with currentSelection
- ✅ Deterministic random mode
- ✅ Tie-breakers
- ✅ Pinned participants
- ✅ Edge cases

## Design Principles

1. **Pure functions**: No side effects, easy to test
2. **Deterministic**: Same inputs = same outputs
3. **Stability**: Minimize grid thrashing
4. **Performance**: Efficient sorting and selection
5. **Simplicity**: No unnecessary complexity
6. **Type-safe**: Full TypeScript coverage

## Non-Goals

This module does **NOT**:
- ❌ Manage LiveKit room lifecycle
- ❌ Handle publishing/subscribing
- ❌ Implement UI components
- ❌ Handle payments or chat
- ❌ Make network requests
- ❌ Store persistent state

## Integration Example

```typescript
// In your LiveKit component
function useLiveGrid(room: Room, sortMode: SortMode) {
  const [sessionSeed] = useState(() => crypto.randomUUID());
  
  // Get LiveKit participants
  const participants = useParticipants(room);
  
  // Convert to ParticipantLite format
  const participantData: ParticipantLite[] = participants.map(p => ({
    identity: p.identity,
    hasVideo: p.isCameraEnabled,
    hasAudio: p.isMicrophoneEnabled,
    joinedAt: p.joinedAt ?? Date.now(),
    metrics: {
      views: p.metadata?.views,
      gifts: p.metadata?.gifts,
      follows: p.metadata?.follows,
    },
  }));
  
  // Get selection
  const { selection } = useGridSelection({
    participants: participantData,
    mode: sortMode,
    seed: sessionSeed,
  });
  
  return selection;
}
```

## License

Part of MyLiveLinks.com codebase.

