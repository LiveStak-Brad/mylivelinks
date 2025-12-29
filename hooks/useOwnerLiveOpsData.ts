// Owner Live Ops Data Hook - Type Definitions and Stub Implementation
// This is a placeholder hook that will be wired to backend by other agents

import { useState, useEffect } from 'react';
import type { OwnerLiveResponse } from '@/lib/ownerPanel';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LiveOpsStreamData {
  id: string;
  streamer: string;
  streamerId: string;
  avatarUrl: string | null;
  room: string;
  roomId?: string;
  region: 'us-east' | 'us-west' | 'eu-west' | 'ap-south' | 'all';
  status: 'live' | 'starting' | 'ending';
  startedAt: string;
  viewers: number;
  giftsPerMin: number;
  chatPerMin: number;
}

export interface UseOwnerLiveOpsDataReturn {
  streams: LiveOpsStreamData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// MOCK DATA (Only used in __DEV__, removed in production)
// ============================================================================

const IS_DEV = process.env.NODE_ENV !== 'production';

function generateMockStreams(): LiveOpsStreamData[] {
  if (!IS_DEV) {
    return [];
  }

  const streamers = ['DJ_Emma', 'GamerMike', 'ArtistSarah', 'ComedyJoe', 'MusicLive', 'FitnessQueen', 'TechTalk', 'ChefMaster'];
  const rooms = ['Main Stage', 'Gaming Arena', 'Art Studio', 'Comedy Club', 'Music Hall', 'Fitness Zone', 'Tech Corner', 'Kitchen Live'];
  const regions: Array<'us-east' | 'us-west' | 'eu-west' | 'ap-south'> = ['us-east', 'us-west', 'eu-west', 'ap-south'];
  const statuses: Array<'live' | 'starting' | 'ending'> = ['live', 'starting', 'ending'];

  return Array.from({ length: 25 }, (_, i) => ({
    id: `stream-${i + 1}`,
    streamer: streamers[i % streamers.length],
    streamerId: `user-${i + 1}`,
    avatarUrl: null,
    room: rooms[i % rooms.length],
    roomId: `room-${i + 1}`,
    region: regions[i % regions.length],
    status: i < 20 ? 'live' : statuses[i % statuses.length],
    startedAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    viewers: Math.floor(Math.random() * 500) + 10,
    giftsPerMin: Math.floor(Math.random() * 50),
    chatPerMin: Math.floor(Math.random() * 200) + 10,
  }));
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * useOwnerLiveOpsData Hook
 * 
 * This is a STUB implementation. Backend integration agents will wire this to actual data source.
 * Returns typed interfaces for Live Operations monitoring.
 * 
 * @returns {UseOwnerLiveOpsDataReturn} - Streams data, loading state, error state, and refetch function
 */
export function useOwnerLiveOpsData(): UseOwnerLiveOpsDataReturn {
  const [streams, setStreams] = useState<LiveOpsStreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/owner/live?limit=100&offset=0', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to load live streams (${response.status})`);
      }

      const json = (await response.json()) as OwnerLiveResponse;
      if (!json.ok) {
        throw new Error(json.error?.message || 'Failed to load live streams');
      }

      const items = json.data.live_streams?.items ?? [];
      const mapped: LiveOpsStreamData[] = items.map((s) => ({
        id: String(s.stream_id ?? ''),
        streamer: String(s.host_username ?? 'unknown'),
        streamerId: String(s.host_profile_id ?? ''),
        avatarUrl: s.host_avatar_url ?? null,
        room: String(s.title ?? s.room_slug ?? 'Unknown room'),
        roomId: String(s.room_id ?? ''),
        region: 'all',
        status: s.status === 'live' ? 'live' : s.status === 'starting' ? 'starting' : 'ending',
        startedAt: s.started_at,
        viewers: Number(s.viewer_count ?? 0),
        giftsPerMin: 0,
        chatPerMin: 0,
      }));

      setStreams(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live operations data');
      if (IS_DEV) {
        setStreams(generateMockStreams());
      } else {
        setStreams([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    streams,
    loading,
    error,
    refetch: fetchData,
  };
}


