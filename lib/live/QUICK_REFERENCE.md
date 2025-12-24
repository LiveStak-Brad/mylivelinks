# Grid Selection Engine - Quick Reference

## 🚀 Quick Start

```typescript
import { useGridSelection } from "@/lib/live";

const { selection } = useGridSelection({
  participants: livekitParticipants.map(p => ({
    identity: p.identity,
    hasVideo: p.isCameraEnabled,
    joinedAt: p.joinedAt,
  })),
  mode: "newest",
  seed: sessionId,
});

// Render selection in your grid
```

## 📋 Sort Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `newest` | Recent joiners first | Default, fair rotation |
| `most_viewed` | Highest view count | Promote popular streamers |
| `most_gifted` | Most gifts received | Reward top earners |
| `most_followed` | Most followers | Feature influencers |
| `random` | Deterministic shuffle | Fair discovery |

## 🎯 Key Rules

1. **Max 12 tiles** - Hard limit, no exceptions
2. **Only `hasVideo === true`** - Must be publishing
3. **Stability** - Preserves current selection when possible
4. **Deterministic random** - Same seed = same order
5. **Local-only** - No LiveKit lifecycle changes

## 🔧 Common Patterns

### Basic Usage
```typescript
const { selection } = useGridSelection({
  participants,
  mode: "newest",
});
```

### With Pinning
```typescript
const { selection } = useGridSelection({
  participants,
  mode: "newest",
  pinned: ["favorite-user"],
});
```

### With Metrics
```typescript
const participants = livekitParticipants.map(p => ({
  identity: p.identity,
  hasVideo: p.isCameraEnabled,
  joinedAt: p.joinedAt,
  metrics: {
    views: p.metadata?.views ?? 0,
    gifts: p.metadata?.gifts ?? 0,
    follows: p.metadata?.follows ?? 0,
  },
}));
```

### Pure Function (No Hook)
```typescript
import { selectGridParticipants } from "@/lib/live";

const result = selectGridParticipants({
  participants,
  mode: "newest",
  currentSelection: previousSelection,
});
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Grid keeps reshuffling | Use stable seed for random mode |
| Participants not appearing | Check `hasVideo === true` |
| Wrong order | Verify metrics are passed correctly |
| Too many in grid | Check eligibility filtering |

## 📊 Return Values

```typescript
{
  selection: string[],        // Max 12 identities
  eligibleCount: number,      // Total eligible count
  mode: SortMode,             // Current mode
  hasOverflow: boolean,       // More than 12 eligible?
}
```

## ✅ Testing

```bash
npm test lib/live/selectGridParticipants.test.ts
```

## 📚 Full Documentation

- **API Docs**: `lib/live/README.md`
- **Integration Guide**: `lib/live/INTEGRATION_EXAMPLE.md`
- **Summary**: `GRID_SELECTION_ENGINE_SUMMARY.md`

