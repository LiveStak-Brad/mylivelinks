# Grid Selection Engine - Integration Example

This document shows how to integrate the grid selection engine with your LiveKit components.

## Step 1: Import the Hook

```typescript
import { useGridSelection } from "@/lib/live";
import type { ParticipantLite, SortMode } from "@/lib/live";
```

## Step 2: Convert LiveKit Participants

You need to convert LiveKit's participant objects to the `ParticipantLite` format:

```typescript
import { useParticipants } from "@livekit/components-react";
import { Room } from "livekit-client";

function convertToParticipantLite(
  livekitParticipant: any
): ParticipantLite | null {
  // Skip if no identity
  if (!livekitParticipant.identity) return null;

  return {
    identity: livekitParticipant.identity,
    hasVideo: livekitParticipant.isCameraEnabled ?? false,
    hasAudio: livekitParticipant.isMicrophoneEnabled ?? false,
    joinedAt: livekitParticipant.joinedAt ?? Date.now(),
    isSelf: livekitParticipant.isLocal ?? false,
    metrics: {
      // These would come from your metadata or database
      views: livekitParticipant.metadata?.views ?? 0,
      gifts: livekitParticipant.metadata?.gifts ?? 0,
      follows: livekitParticipant.metadata?.follows ?? 0,
    },
  };
}
```

## Step 3: Use in Your Component

```typescript
import { useState, useMemo } from "react";
import { useParticipants } from "@livekit/components-react";

function LiveGrid({ room }: { room: Room }) {
  // Get sort mode from user preference or state
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  
  // Generate stable seed per viewer session
  const [sessionSeed] = useState(() => crypto.randomUUID());
  
  // Get LiveKit participants
  const livekitParticipants = useParticipants(room);
  
  // Convert to ParticipantLite format
  const participants = useMemo(() => {
    return livekitParticipants
      .map(convertToParticipantLite)
      .filter((p): p is ParticipantLite => p !== null);
  }, [livekitParticipants]);
  
  // Get grid selection
  const { selection, hasOverflow, eligibleCount } = useGridSelection({
    participants,
    mode: sortMode,
    seed: sessionSeed,
    debug: process.env.NODE_ENV === "development",
  });
  
  return (
    <div className="flex flex-col gap-4">
      {/* Sort mode selector */}
      <div className="flex gap-2">
        <button onClick={() => setSortMode("newest")}>Newest</button>
        <button onClick={() => setSortMode("most_viewed")}>Most Viewed</button>
        <button onClick={() => setSortMode("most_gifted")}>Most Gifted</button>
        <button onClick={() => setSortMode("random")}>Random</button>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-4 grid-rows-3 gap-2">
        {selection.map((identity) => (
          <VideoTile key={identity} identity={identity} room={room} />
        ))}
      </div>
      
      {/* Overflow indicator */}
      {hasOverflow && (
        <div className="text-sm text-gray-500">
          Showing 12 of {eligibleCount} live participants
        </div>
      )}
    </div>
  );
}
```

## Step 4: Implement VideoTile Component

```typescript
function VideoTile({ identity, room }: { identity: string; room: Room }) {
  const participant = room.participants.get(identity);
  
  if (!participant) return null;
  
  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {/* Your video rendering logic */}
      <VideoTrack participant={participant} />
      
      {/* Participant info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60">
        <p className="text-white text-sm">{participant.name || identity}</p>
      </div>
    </div>
  );
}
```

## Step 5: Add Pinning (Optional)

If you want to support pinned participants:

```typescript
function LiveGrid({ room }: { room: Room }) {
  const [pinnedParticipants, setPinnedParticipants] = useState<string[]>([]);
  
  const { selection } = useGridSelection({
    participants,
    mode: sortMode,
    seed: sessionSeed,
    pinned: pinnedParticipants, // Pass pinned list
  });
  
  const handlePin = (identity: string) => {
    setPinnedParticipants(prev => 
      prev.includes(identity)
        ? prev.filter(id => id !== identity)
        : [...prev, identity]
    );
  };
  
  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-2">
      {selection.map((identity) => (
        <VideoTile 
          key={identity} 
          identity={identity} 
          room={room}
          isPinned={pinnedParticipants.includes(identity)}
          onPin={() => handlePin(identity)}
        />
      ))}
    </div>
  );
}
```

## Step 6: Fetch Metrics from Database (Optional)

If you want to show real-time metrics:

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function useParticipantMetrics(identities: string[]) {
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (identities.length === 0) return;
    
    // Fetch metrics from database
    const fetchMetrics = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, view_count, gift_count, follower_count")
        .in("id", identities);
      
      if (data) {
        const metricsMap = data.reduce((acc, profile) => {
          acc[profile.id] = {
            views: profile.view_count,
            gifts: profile.gift_count,
            follows: profile.follower_count,
          };
          return acc;
        }, {});
        
        setMetrics(metricsMap);
      }
    };
    
    fetchMetrics();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel("metrics")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "profiles",
        filter: `id=in.(${identities.join(",")})`,
      }, fetchMetrics)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [identities]);
  
  return metrics;
}

// Use in component:
function LiveGrid({ room }: { room: Room }) {
  const livekitParticipants = useParticipants(room);
  const identities = livekitParticipants.map(p => p.identity);
  const metrics = useParticipantMetrics(identities);
  
  const participants = useMemo(() => {
    return livekitParticipants.map(p => ({
      identity: p.identity,
      hasVideo: p.isCameraEnabled ?? false,
      joinedAt: p.joinedAt ?? Date.now(),
      metrics: metrics[p.identity] || { views: 0, gifts: 0, follows: 0 },
    }));
  }, [livekitParticipants, metrics]);
  
  // ... rest of component
}
```

## Important Notes

### 1. Do NOT Modify LiveKit Logic

This selection engine is **UI-only**. It does NOT:
- Connect/disconnect participants
- Subscribe/unsubscribe to tracks
- Modify room state
- Send any network requests

### 2. Stability is Key

The engine preserves `currentSelection` to prevent grid thrashing. This means:
- Participants stay in place when still eligible
- Only removed when they stop publishing
- Grid doesn't reshuffle every render

### 3. Random Mode Seed

For random mode to work correctly:
- Use a **stable seed per viewer session** (e.g., `sessionId` or `crypto.randomUUID()`)
- Don't use `Date.now()` or `Math.random()` as seed
- Same seed = same order (deterministic)

### 4. Performance

The selection engine is optimized:
- Pure functions (no side effects)
- Efficient sorting algorithms
- Memoized in React hooks
- No unnecessary re-renders

## Testing Your Integration

1. **Test with < 12 participants**: All should appear
2. **Test with > 12 participants**: Only 12 should appear
3. **Test mode switching**: Grid should update correctly
4. **Test participant leaving**: Should be removed from grid
5. **Test participant joining**: Should fill empty slots
6. **Test random mode**: Should be stable (not reshuffle)

## Troubleshooting

### Grid keeps reshuffling
- Make sure you're passing `currentSelection` or using `useGridSelection` hook
- Check that your seed is stable (not changing every render)

### Participants not appearing
- Verify `hasVideo === true` for those participants
- Check that identities are valid (not empty strings)
- Enable debug mode to see eligibility count

### Wrong participants selected
- Verify metrics are being passed correctly
- Check that sort mode matches your expectation
- Test with console.log to see participant data

## Complete Example

See `lib/live/README.md` for full API documentation and more examples.

