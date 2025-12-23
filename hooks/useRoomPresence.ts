/**
 * Room Presence Hook
 * Manages global room presence for /live page (separate from tile watching)
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

interface UseRoomPresenceOptions {
  userId: string | null;
  username: string | null;
  enabled?: boolean;
}

export function useRoomPresence({ userId, username, enabled = true }: UseRoomPresenceOptions) {
  const supabase = createClient();
  const presenceRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(async (isPresent: boolean, isLiveAvailable: boolean = false) => {
    if (!userId || !username || !enabled) return;

    try {
      if (isPresent) {
        // Upsert presence record with live_available status
        const { error } = await supabase.rpc('upsert_room_presence', {
          p_profile_id: userId,
          p_username: username,
          p_is_live_available: isLiveAvailable,
        });
        if (error) console.error('Error upserting room presence:', error);
        presenceRef.current = true;
      } else {
        // Delete presence record
        const { error } = await supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', userId);
        if (error) console.error('Error deleting room presence:', error);
        presenceRef.current = false;
      }
    } catch (err) {
      console.error('Error managing room presence:', err);
    }
  }, [userId, username, enabled, supabase]);

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
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('live_available')
        .eq('profile_id', userId)
        .eq('live_available', true)
        .single();
      
      return !!liveStream;
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
  }, [userId, username, enabled, updatePresence, supabase]);

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
  }, [userId, enabled]);

  return null; // This hook doesn't render anything
}

