import type { GifterStatus } from '@/lib/gifter-status';

// ============================================================================
// CLIENT-SIDE CACHE for gifter statuses
// Prevents /api/gifter-status/batch spam by caching results for 5 minutes
// ============================================================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const statusCache = new Map<string, { status: GifterStatus; cachedAt: number }>();
let inFlightRequest: Promise<Record<string, GifterStatus>> | null = null;
let inFlightIds: Set<string> | null = null;

function getCachedStatus(profileId: string): GifterStatus | null {
  const entry = statusCache.get(profileId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    statusCache.delete(profileId);
    return null;
  }
  return entry.status;
}

function setCachedStatus(profileId: string, status: GifterStatus): void {
  statusCache.set(profileId, { status, cachedAt: Date.now() });
}

export async function fetchGifterStatuses(profileIds: string[]): Promise<Record<string, GifterStatus>> {
  const uniqueIds = Array.from(new Set(profileIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) return {};

  // Check cache first - return cached results for known IDs
  const result: Record<string, GifterStatus> = {};
  const uncachedIds: string[] = [];

  for (const id of uniqueIds) {
    const cached = getCachedStatus(id);
    if (cached) {
      result[id] = cached;
    } else {
      uncachedIds.push(id);
    }
  }

  // If all IDs are cached, return immediately (no API call)
  if (uncachedIds.length === 0) {
    return result;
  }

  // Dedupe with in-flight request: if we're already fetching these IDs, wait for that request
  if (inFlightRequest && inFlightIds) {
    const allInFlight = uncachedIds.every((id) => inFlightIds!.has(id));
    if (allInFlight) {
      const inFlightResult = await inFlightRequest;
      for (const id of uncachedIds) {
        if (inFlightResult[id]) {
          result[id] = inFlightResult[id];
        }
      }
      return result;
    }
  }

  // Fetch uncached IDs from API
  inFlightIds = new Set(uncachedIds);
  inFlightRequest = (async () => {
    try {
      const res = await fetch('/api/gifter-status/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds: uncachedIds }),
        cache: 'no-store',
      });

      if (!res.ok) {
        return {};
      }

      const json = await res.json();
      const statuses = json?.statuses;
      if (!statuses || typeof statuses !== 'object') return {};

      // Cache the results
      for (const [id, status] of Object.entries(statuses)) {
        setCachedStatus(id, status as GifterStatus);
      }

      return statuses as Record<string, GifterStatus>;
    } finally {
      inFlightRequest = null;
      inFlightIds = null;
    }
  })();

  const fetchedStatuses = await inFlightRequest;

  // Merge fetched results with cached results
  for (const id of uncachedIds) {
    if (fetchedStatuses[id]) {
      result[id] = fetchedStatuses[id];
    }
  }

  return result;
}
