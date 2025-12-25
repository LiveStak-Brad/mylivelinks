import type { GifterStatus } from '@/lib/gifter-status';

export async function fetchGifterStatuses(profileIds: string[]): Promise<Record<string, GifterStatus>> {
  const uniqueIds = Array.from(new Set(profileIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) return {};

  const res = await fetch('/api/gifter-status/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileIds: uniqueIds }),
    cache: 'no-store',
  });

  if (!res.ok) {
    return {};
  }

  const json = await res.json();
  const statuses = json?.statuses;
  if (!statuses || typeof statuses !== 'object') return {};
  return statuses as Record<string, GifterStatus>;
}
