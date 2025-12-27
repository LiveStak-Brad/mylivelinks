/**
 * Viewers Hook - REAL DATA (parity with Web)
 * 
 * Fetches viewers from room_presence table
 * Same data source as components/ViewerList.tsx on web
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase as createClient } from '../lib/supabase';

export interface Viewer {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  is_active: boolean;
  last_active_at: string;
  is_live_available: boolean;
}

export function useViewers() {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient;

  const loadViewers = useCallback(async () => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // Get viewers from room_presence (global room presence)
      const { data: presenceData, error } = await supabase
        .from('room_presence')
        .select(`
          profile_id,
          last_seen_at,
          profiles!inner (
            id,
            username,
            avatar_url,
            gifter_level
          )
        `);

      if (error) throw error;

      // Join with live_streams to determine who is live
      const { data: liveStreamsData } = await supabase
        .from('live_streams')
        .select('profile_id, live_available')
        .eq('live_available', true);

      const liveProfileIds = new Set(liveStreamsData?.map((ls: any) => ls.profile_id) || []);

      const viewersWithLiveStatus = (presenceData || []).map((item: any) => {
        const profile = item.profiles;
        const isLive = liveProfileIds.has(profile.id);

        return {
          profile_id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          gifter_level: profile.gifter_level || 0,
          is_active: true,
          last_active_at: item.last_seen_at,
          is_live_available: isLive,
        };
      });

      // Sort: live users first, then by last_active_at
      const sortedViewers = viewersWithLiveStatus.sort((a, b) => {
        if (a.is_live_available && !b.is_live_available) return -1;
        if (!a.is_live_available && b.is_live_available) return 1;
        return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
      });

      setViewers(sortedViewers);
    } catch (error) {
      console.error('[VIEWERS] Error loading viewers:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadViewers();

    // Realtime subscriptions for room_presence
    const roomPresenceChannel = supabase
      .channel('room-presence-mobile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_presence',
        },
        () => {
          loadViewers();
        }
      )
      .subscribe();

    const liveStreamsChannel = supabase
      .channel('live-streams-mobile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          loadViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomPresenceChannel);
      supabase.removeChannel(liveStreamsChannel);
    };
  }, [loadViewers, supabase]);

  return {
    viewers,
    loading,
    currentUserId,
    refresh: loadViewers,
  };
}

