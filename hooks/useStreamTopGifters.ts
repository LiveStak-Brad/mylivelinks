'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

export interface StreamTopGifter {
  profile_id: string; // sender_id
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  total_coins: number;
  rank: number;
}

function normalizeBigintLike(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Stream-scoped Top Gifters (WEB Solo Live)
 *
 * Source of truth: `gifts` rows filtered by `live_stream_id`.
 * Aggregation: group by sender_id, sum coin_amount, sort desc.
 *
 * Uses realtime subscription for immediate updates with fallback polling.
 */
export function useStreamTopGifters({
  liveStreamId,
  enabled = true,
  pollIntervalMs = 30000, // Increased from 7s to 30s - realtime is primary
  limit = 20,
}: {
  liveStreamId?: number | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  limit?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [gifters, setGifters] = useState<StreamTopGifter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track aggregated data in ref for incremental updates
  const gifterMapRef = useRef<Map<string, { total: number; profile: any }>>(new Map());

  const load = useCallback(async (showLoading: boolean) => {
    if (!liveStreamId) return;
    
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const { data, error: qErr } = await supabase
        .from('gifts')
        .select(
          `
            sender_id,
            coin_amount,
            sender:profiles!gifts_sender_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `
        )
        .eq('live_stream_id', liveStreamId)
        .not('sender_id', 'is', null);

      if (qErr) throw qErr;

      const newMap = new Map<string, { total: number; profile: any }>();
      (data ?? []).forEach((gift: any) => {
        const senderId = gift?.sender_id;
        const profile = gift?.sender;
        if (!senderId || !profile) return;

        const delta = normalizeBigintLike(gift?.coin_amount);
        const existing = newMap.get(senderId);
        if (existing) {
          existing.total += delta;
        } else {
          newMap.set(senderId, { total: delta, profile });
        }
      });
      
      gifterMapRef.current = newMap;

      const sorted = Array.from(newMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, Math.max(1, limit))
        .map(([senderId, v], idx) => ({
          profile_id: senderId,
          username: v.profile?.username || 'Unknown',
          display_name: v.profile?.display_name ?? null,
          avatar_url: v.profile?.avatar_url ?? null,
          total_coins: v.total,
          rank: idx + 1,
        })) satisfies StreamTopGifter[];

      setGifters(sorted);
    } catch (e: any) {
      setGifters([]);
      setError(e?.message ? String(e.message) : 'Failed to load top gifters');
    } finally {
      setLoading(false);
    }
  }, [liveStreamId, limit, supabase]);

  useEffect(() => {
    if (!enabled || !liveStreamId) {
      setGifters([]);
      setLoading(false);
      setError(null);
      gifterMapRef.current = new Map();
      return;
    }

    let cancelled = false;

    // Initial load
    void load(true);

    // Event-driven updates only - NO POLLING
    // Subscribe to gift INSERT events for this stream
    const giftChannel = supabase
      .channel(`gifts-stream-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        (payload) => {
          if (cancelled) return;
          // New gift received - reload to get accurate aggregation
          // Updates ONLY on gift INSERT events
          void load(false);
        }
      )
      .subscribe((status) => {
        console.log('[useStreamTopGifters] Realtime subscription:', status);
      });

    return () => {
      cancelled = true;
      giftChannel.unsubscribe();
    };
  }, [enabled, liveStreamId, limit, pollIntervalMs, supabase, load]);

  return { gifters, loading, error };
}
 
