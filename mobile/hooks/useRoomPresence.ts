/**
 * Room Presence Hook - REAL DATA (parity with Web)
 * 
 * Tracks user's presence in the live room
 * Same behavior as hooks/useRoomPresence.ts on web
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseRoomPresenceOptions {
  userId: string | null;
  username: string | null;
  enabled: boolean;
}

export function useRoomPresence({ userId, username, enabled }: UseRoomPresenceOptions) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || !username) {
      return;
    }

    const checkLiveStatus = async () => {
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('live_available')
        .eq('profile_id', userId)
        .eq('live_available', true)
        .maybeSingle();

      return !!liveStream;
    };

    const joinRoom = async () => {
      try {
        const isLive = await checkLiveStatus();

        const { error } = await supabase.rpc('upsert_room_presence', {
          p_profile_id: userId,
          p_username: username,
          p_is_live_available: isLive,
        });

        if (error) {
          console.error('[ROOM_PRESENCE] Error joining room:', error);
        } else {
          console.log('[ROOM_PRESENCE] Joined room');
          hasJoinedRef.current = true;
        }
      } catch (error) {
        console.error('[ROOM_PRESENCE] Exception joining room:', error);
      }
    };

    const updateHeartbeat = async () => {
      try {
        const isLive = await checkLiveStatus();

        const { error } = await supabase.rpc('upsert_room_presence', {
          p_profile_id: userId,
          p_username: username,
          p_is_live_available: isLive,
        });

        if (error) {
          console.error('[ROOM_PRESENCE] Error updating heartbeat:', error);
        }
      } catch (error) {
        console.error('[ROOM_PRESENCE] Exception updating heartbeat:', error);
      }
    };

    const leaveRoom = async () => {
      try {
        const { error } = await supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', userId);

        if (error) {
          console.error('[ROOM_PRESENCE] Error leaving room:', error);
        } else {
          console.log('[ROOM_PRESENCE] Left room');
        }
      } catch (error) {
        console.error('[ROOM_PRESENCE] Exception leaving room:', error);
      }
    };

    // Join room on mount
    joinRoom();

    // Set up heartbeat (update every 10 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      updateHeartbeat();
    }, 20000);

    // Cleanup: leave room and stop heartbeat
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (hasJoinedRef.current) {
        leaveRoom();
        hasJoinedRef.current = false;
      }
    };
  }, [userId, username, enabled]);
}

