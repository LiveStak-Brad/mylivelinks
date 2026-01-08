'use client';

/**
 * useBattleSession - Hook for managing battle/cohost session state
 * 
 * Provides:
 * - Active session detection for current user
 * - Realtime updates when session status changes
 * - Pending invite detection
 * - Session end/cooldown transitions
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  LiveSession,
  LiveSessionInvite,
  SessionType,
  SessionMode,
  SessionStatus,
  getActiveSessionForHost,
  respondToInvite,
  endSession,
  startRematch,
  getSessionRoomName,
  getRemainingSeconds,
} from '@/lib/battle-session';

export interface UseBattleSessionOptions {
  /** Current user's profile ID (for host mode) */
  profileId?: string | null;
  /** Host profile ID to watch (for viewer mode - watches that host's session) */
  watchHostId?: string | null;
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

export interface UseBattleSessionReturn {
  /** Current active session (if any) */
  session: LiveSession | null;
  /** Pending invites for current user */
  pendingInvites: LiveSessionInvite[];
  /** Whether we're loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Room name to join (battle_<id> or cohost_<id>) */
  roomName: string | null;
  /** Remaining seconds in current phase (battle or cooldown) */
  remainingSeconds: number;
  /** Whether user is host_a or host_b in session */
  isParticipant: boolean;
  /** Accept a pending invite */
  acceptInvite: (inviteId: string) => Promise<void>;
  /** Decline a pending invite */
  declineInvite: (inviteId: string) => Promise<void>;
  /** End the current session */
  endCurrentSession: () => Promise<void>;
  /** Transition to cooldown */
  transitionToCooldown: () => Promise<void>;
  /** Start a rematch */
  triggerRematch: () => Promise<void>;
  /** Refresh session state */
  refresh: () => Promise<void>;
}

export function useBattleSession({
  profileId,
  watchHostId,
  autoFetch = true,
}: UseBattleSessionOptions = {}): UseBattleSessionReturn {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [pendingInvites, setPendingInvites] = useState<LiveSessionInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine whose session to watch
  const targetHostId = watchHostId || profileId;
  
  // Check if current user is a participant
  const isParticipant = useMemo(() => {
    if (!session || !profileId) return false;
    return session.host_a.id === profileId || session.host_b.id === profileId;
  }, [session, profileId]);
  
  // Get room name
  const roomName = useMemo(() => {
    if (!session) return null;
    return getSessionRoomName(session.session_id, session.type);
  }, [session]);
  
  // Fetch active session for target host
  const fetchSession = useCallback(async () => {
    if (!targetHostId) {
      setSession(null);
      setLoading(false);
      return;
    }
    
    try {
      const activeSession = await getActiveSessionForHost(targetHostId);
      setSession(activeSession);
      setError(null);
      
      // Update remaining seconds
      if (activeSession) {
        const timeField = activeSession.status === 'cooldown' 
          ? activeSession.cooldown_ends_at 
          : activeSession.ends_at;
        setRemainingSeconds(getRemainingSeconds(timeField));
      } else {
        setRemainingSeconds(0);
      }
    } catch (err: any) {
      console.error('[useBattleSession] fetchSession error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [targetHostId]);
  
  // Fetch pending invites for current user
  const fetchPendingInvites = useCallback(async () => {
    if (!profileId) {
      setPendingInvites([]);
      return;
    }
    
    try {
      const { data, error: fetchError } = await supabase
        .from('live_session_invites')
        .select('*')
        .eq('to_host_id', profileId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPendingInvites((data || []) as LiveSessionInvite[]);
    } catch (err: any) {
      console.error('[useBattleSession] fetchPendingInvites error:', err);
    }
  }, [profileId, supabase]);
  
  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([fetchSession(), fetchPendingInvites()]);
  }, [fetchSession, fetchPendingInvites]);
  
  // Accept invite
  const acceptInvite = useCallback(async (inviteId: string) => {
    try {
      const result = await respondToInvite(inviteId, 'accepted');
      if (result.session_id) {
        // Refresh to get the new session
        await refresh();
      }
    } catch (err: any) {
      console.error('[useBattleSession] acceptInvite error:', err);
      throw err;
    }
  }, [refresh]);
  
  // Decline invite
  const declineInvite = useCallback(async (inviteId: string) => {
    try {
      await respondToInvite(inviteId, 'declined');
      // Remove from local state
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      console.error('[useBattleSession] declineInvite error:', err);
      throw err;
    }
  }, []);
  
  // End session
  const endCurrentSession = useCallback(async () => {
    if (!session) return;
    try {
      await endSession(session.session_id, 'end');
      setSession(null);
      setRemainingSeconds(0);
    } catch (err: any) {
      console.error('[useBattleSession] endCurrentSession error:', err);
      throw err;
    }
  }, [session]);
  
  // Transition to cooldown
  const transitionToCooldown = useCallback(async () => {
    if (!session) return;
    try {
      await endSession(session.session_id, 'cooldown');
      await refresh();
    } catch (err: any) {
      console.error('[useBattleSession] transitionToCooldown error:', err);
      throw err;
    }
  }, [session, refresh]);
  
  // Start rematch
  const triggerRematch = useCallback(async () => {
    if (!session) return;
    try {
      const newSessionId = await startRematch(session.session_id);
      await refresh();
    } catch (err: any) {
      console.error('[useBattleSession] triggerRematch error:', err);
      throw err;
    }
  }, [session, refresh]);
  
  // Timer countdown effect
  useEffect(() => {
    if (!session || remainingSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          // Timer expired - if we're in active state, transition to cooldown
          if (session.status === 'active' && isParticipant) {
            transitionToCooldown().catch(console.error);
          } else if (session.status === 'cooldown') {
            // Cooldown expired - refresh to see ended state
            refresh().catch(console.error);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session, remainingSeconds, isParticipant, transitionToCooldown, refresh]);
  
  // Realtime subscription for session updates
  useEffect(() => {
    if (!targetHostId) return;
    
    const channel = supabase
      .channel(`session_updates_${targetHostId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `host_a=eq.${targetHostId}`,
        },
        (payload) => {
          console.log('[useBattleSession] Session update (host_a):', payload);
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `host_b=eq.${targetHostId}`,
        },
        (payload) => {
          console.log('[useBattleSession] Session update (host_b):', payload);
          refresh();
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
  }, [targetHostId, supabase, refresh]);
  
  // Realtime subscription for invite updates (for hosts)
  useEffect(() => {
    if (!profileId) return;
    
    const channel = supabase
      .channel(`invite_updates_${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_session_invites',
          filter: `to_host_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[useBattleSession] New invite received:', payload);
          fetchPendingInvites();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_session_invites',
          filter: `from_host_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[useBattleSession] Sent invite updated:', payload);
          // If our invite was accepted, refresh session
          if (payload.new && (payload.new as any).status === 'accepted') {
            refresh();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, supabase, fetchPendingInvites, refresh]);
  
  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);
  
  return {
    session,
    pendingInvites,
    loading,
    error,
    roomName,
    remainingSeconds,
    isParticipant,
    acceptInvite,
    declineInvite,
    endCurrentSession,
    transitionToCooldown,
    triggerRematch,
    refresh,
  };
}

export default useBattleSession;
