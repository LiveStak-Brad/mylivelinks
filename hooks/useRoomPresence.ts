/**
 * Room Presence Hook
 * Manages global room presence for /live page (separate from tile watching)
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

interface UseRoomPresenceOptions {
  userId: string | null;
  username: string | null;
  roomId?: string | null;
  enabled?: boolean;
}

export function useRoomPresence({ userId, username, roomId, enabled = true }: UseRoomPresenceOptions) {
  const supabase = createClient();
  const presenceRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const normalizedRoomId = roomId || 'live_central';
  const roomPresenceTableAvailableRef = useRef<boolean | null>(null);
  const hasRoomIdColumnRef = useRef<boolean | null>(null);

  const missingTableError = (error: any) => {
    if (!error) return false;
    const code = error.code;
    const message = String(error.message || '');
    return code === '42P01' || message.includes('room_presence');
  };

  const updatePresence = useCallback(
    async (isPresent: boolean, isLiveAvailable: boolean = false) => {
      if (!userId || !username || !enabled) return;
      if (roomPresenceTableAvailableRef.current === false) return;

      try {
        if (isPresent) {
          const baseRow: Record<string, any> = {
            profile_id: userId,
            username,
            is_live_available: isLiveAvailable,
            last_seen_at: new Date().toISOString(),
          };

          if (hasRoomIdColumnRef.current !== false) {
            baseRow.room_id = normalizedRoomId;
          }

          const upsertRow = async (row: Record<string, any>) => {
            const { error } = await supabase.from('room_presence').upsert(row);
            return error;
          };

          let upsertError = await upsertRow(baseRow);
          if (upsertError) {
            if (upsertError.code === '42703' || String(upsertError.message || '').includes('room_id')) {
              hasRoomIdColumnRef.current = false;
              const fallbackRow = { ...baseRow };
              delete fallbackRow.room_id;
              upsertError = await upsertRow(fallbackRow);
            }

            if (upsertError) {
              if (missingTableError(upsertError)) {
                roomPresenceTableAvailableRef.current = false;
                return;
              }
              console.error('Error upserting room presence:', upsertError);
              return;
            }
          }

          presenceRef.current = true;
          roomPresenceTableAvailableRef.current = true;
        } else {
          const { error } = await supabase.from('room_presence').delete().eq('profile_id', userId);
          if (error) {
            if (missingTableError(error)) {
              roomPresenceTableAvailableRef.current = false;
              return;
            }
            console.error('Error deleting room presence:', error);
            return;
          }
          presenceRef.current = false;
        }
      } catch (err) {
        console.error('Error managing room presence:', err);
      }
    },
    [userId, username, enabled, supabase, normalizedRoomId]
  );

  // Initial presence update and heartbeat setup
  useEffect(() => {
    if (!userId || !username || !enabled) {
      // Ensure presence is removed if disabled or user logs out
      if (presenceRef.current) {
        updatePresence(false);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Check if user is live_available
    const checkLiveStatus = async () => {
      const { data: liveStreams, error } = await supabase
        .from('live_streams')
        .select('live_available')
        .eq('profile_id', userId)
        .limit(1);

      const liveStream = liveStreams?.[0] ?? null;

      if (error) {
        console.error('Error checking live status:', error);
        return false;
      }

      return !!liveStream?.live_available;
    };

    // Set initial presence
    checkLiveStatus().then(isLive => {
      updatePresence(true, isLive);
    });

    // Set up heartbeat (every 20 seconds - slightly faster than 60s stale threshold)
    if (!heartbeatIntervalRef.current) {
      heartbeatIntervalRef.current = setInterval(async () => {
        const isLive = await checkLiveStatus();
        updatePresence(true, isLive); // Keep presence alive
      }, 20000);
    }

    // Cleanup on unmount or disable
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Delay cleanup slightly to allow for navigation
      cleanupTimeoutRef.current = setTimeout(() => {
        updatePresence(false);
      }, 1000);
    };
  }, [userId, username, enabled, updatePresence, supabase, normalizedRoomId]);

  // Handle window/tab closing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userId && enabled && presenceRef.current) {
        // Use navigator.sendBeacon for best effort to send data on unload
        const payload = JSON.stringify({ profile_id: userId });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/room-presence/remove', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [userId, enabled, normalizedRoomId]);

  return null; // This hook doesn't render anything
}












