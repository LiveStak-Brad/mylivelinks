import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

interface UseGlobalPresenceHeartbeatOptions {
  userId: string | null;
  username: string | null;
  enabled?: boolean;
}

export function useGlobalPresenceHeartbeat({ userId, username, enabled = true }: UseGlobalPresenceHeartbeatOptions) {
  const supabase = createClient();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!userId || !username || !enabled) {
      return;
    }

    const sendHeartbeat = async () => {
      if (!isVisibleRef.current) return;

      try {
        const { error } = await supabase.from('room_presence').upsert({
          profile_id: userId,
          username,
          room_id: 'global',
          is_live_available: false,
          last_seen_at: new Date().toISOString(),
        });

        if (error) {
          console.error('[useGlobalPresenceHeartbeat] Error upserting presence:', error);
        }
      } catch (err) {
        console.error('[useGlobalPresenceHeartbeat] Error sending heartbeat:', err);
      }
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        sendHeartbeat();
      }
    };

    sendHeartbeat();

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      if (userId && enabled) {
        const payload = JSON.stringify({ profile_id: userId, room_id: 'global' });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/room-presence/remove', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      cleanupTimeoutRef.current = setTimeout(async () => {
        try {
          await supabase.from('room_presence').delete().eq('profile_id', userId).eq('room_id', 'global');
        } catch (err) {
          console.error('[useGlobalPresenceHeartbeat] Error cleaning up presence:', err);
        }
      }, 2000);
    };
  }, [userId, username, enabled, supabase]);

  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  return null;
}
