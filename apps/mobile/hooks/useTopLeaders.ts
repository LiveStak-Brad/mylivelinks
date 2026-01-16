import { useState, useEffect } from 'react';

const API_BASE_URL = 'https://www.mylivelinks.com';

interface TopLeaders {
  topStreamer: string | null;
  topGifter: string | null;
  topReferrer: string | null;
}

let cached: TopLeaders | null = null;
let fetchPromise: Promise<TopLeaders> | null = null;
let lastFetch = 0;

export function useTopLeaders(): TopLeaders {
  const [leaders, setLeaders] = useState<TopLeaders>(cached || { topStreamer: null, topGifter: null, topReferrer: null });

  useEffect(() => {
    if (cached && Date.now() - lastFetch < 60000) {
      setLeaders(cached);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetch(`${API_BASE_URL}/api/leaderboard-leaders`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          const result = { topStreamer: d?.top_streamer || null, topGifter: d?.top_gifter || null, topReferrer: d?.top_referrer || null };
          cached = result;
          lastFetch = Date.now();
          fetchPromise = null;
          return result;
        })
        .catch(() => {
          fetchPromise = null;
          return { topStreamer: null, topGifter: null, topReferrer: null };
        });
    }
    fetchPromise.then(setLeaders);
  }, []);

  return leaders;
}

export function getLeaderType(profileId: string | null | undefined, leaders: TopLeaders): 'streamer' | 'gifter' | 'referrer' | null {
  if (!profileId) return null;
  if (profileId === leaders.topStreamer) return 'streamer';
  if (profileId === leaders.topGifter) return 'gifter';
  if (profileId === leaders.topReferrer) return 'referrer';
  return null;
}
