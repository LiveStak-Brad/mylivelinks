'use client';

/**
 * useBattleScores - Hook for managing battle score state and real-time updates
 * 
 * Provides:
 * - Real-time score updates via Supabase channel
 * - Supporter leaderboard
 * - Boost round state
 * - Chat point tracking
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BattleSupporter {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  side: string; // Multi-team support: A, B, C, D, E, F, G, H, I, J, K, L
  points: number;
  chat_awarded: boolean;
}

export interface BoostState {
  active: boolean;
  multiplier: number;
  started_at: string | null;
  ends_at: string | null;
}

export interface BattleScoreSnapshot {
  session_id: string;
  points: Record<string, number>; // Multi-team support: A, B, C, D, E, F, G, H, I, J, K, L
  supporters: BattleSupporter[];
  participantStates: Record<string, any>;
  boost: BoostState;
}

export interface UseBattleScoresOptions {
  /** Session ID to track scores for */
  sessionId: string | null;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseBattleScoresReturn {
  /** Current score snapshot */
  scores: BattleScoreSnapshot | null;
  /** Whether we're loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh scores */
  refresh: () => Promise<void>;
  /** Award chat points to a user (once per battle) */
  awardChatPoints: (profileId: string, username: string, side: string) => Promise<void>;
}

export function useBattleScores({
  sessionId,
  autoFetch = true,
}: UseBattleScoresOptions): UseBattleScoresReturn {
  const [scores, setScores] = useState<BattleScoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Fetch score snapshot
  const fetchScores = useCallback(async () => {
    if (!sessionId) {
      setScores(null);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error: fetchError } = await supabase.rpc('rpc_battle_score_snapshot', {
        p_session_id: sessionId,
      });
      
      if (fetchError) throw fetchError;
      setScores(data as BattleScoreSnapshot);
      setError(null);
    } catch (err: any) {
      console.error('[useBattleScores] fetchScores error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, supabase]);
  
  // Award chat points (called when user sends first message in battle)
  const awardChatPoints = useCallback(async (
    profileId: string,
    username: string,
    side: string
  ) => {
    if (!sessionId) return;
    
    // Check if user already awarded
    const alreadyAwarded = scores?.supporters.some(
      s => s.profile_id === profileId && s.chat_awarded
    );
    
    if (alreadyAwarded) return;
    
    try {
      // Award 3 points for chat participation (not multiplied by boost)
      await supabase.rpc('rpc_battle_score_apply', {
        p_session_id: sessionId,
        p_side: side,
        p_points_delta: 3,
        p_supporter: {
          profile_id: profileId,
          username,
          display_name: null,
          avatar_url: null,
          side,
          points_delta: 3,
          chat_award: true,
        },
      });
      
      // Refresh to get updated state
      await fetchScores();
    } catch (err: any) {
      console.error('[useBattleScores] awardChatPoints error:', err);
    }
  }, [sessionId, scores, supabase, fetchScores]);
  
  // Refresh scores
  const refresh = useCallback(async () => {
    await fetchScores();
  }, [fetchScores]);
  
  // Realtime subscription for score updates
  useEffect(() => {
    if (!sessionId) return;
    
    const channel = supabase
      .channel(`battle_scores_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_scores',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[useBattleScores] Score update:', payload);
          fetchScores();
        }
      )
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, supabase, fetchScores]);
  
  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchScores();
    }
  }, [autoFetch, fetchScores]);
  
  return {
    scores,
    loading,
    error,
    refresh,
    awardChatPoints,
  };
}

export default useBattleScores;
