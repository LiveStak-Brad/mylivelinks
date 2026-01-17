'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { isBlockedBidirectional } from '@/lib/blocks';
import { Eye } from 'lucide-react';
import { GifterBadge as TierBadge } from '@/components/gifter';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import UserActionCardV2 from './UserActionCardV2';
import LiveAvatar from './LiveAvatar';

interface Viewer {
  profile_id: string;
  username: string;
  avatar_url: string | undefined;
  is_active: boolean;
  last_active_at: string;
  is_live_available: boolean; // Whether they're live streaming/available
  is_published: boolean; // Whether they're actually publishing video
  live_stream_id: number | undefined; // Their live stream ID if available
}

interface ViewerListProps {
  roomId: string;
  onDragStart?: (viewer: Viewer) => void;
}

export default function ViewerList({ roomId, onDragStart }: ViewerListProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});
  const [selectedProfile, setSelectedProfile] = useState<{
    profileId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    gifterStatus?: GifterStatus | null;
    isLive?: boolean;
  } | null>(null);
  const supabase = createClient();

  const normalizedRoomId = roomId || 'live_central';
  const [hasRoomIdColumn, setHasRoomIdColumn] = useState<boolean>(true);
  
  // Debounce timer ref to prevent excessive API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const MIN_LOAD_INTERVAL = 3000; // Minimum 3 seconds between loads

  // Debounced load function to prevent excessive API calls
  const debouncedLoadViewers = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Check if we loaded recently
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    if (timeSinceLastLoad < MIN_LOAD_INTERVAL) {
      // Schedule load after remaining time
      debounceTimerRef.current = setTimeout(() => {
        lastLoadTimeRef.current = Date.now();
        loadViewers();
      }, MIN_LOAD_INTERVAL - timeSinceLastLoad);
    } else {
      // Load immediately
      lastLoadTimeRef.current = now;
      loadViewers();
    }
  }, []);

  useEffect(() => {
    // Get current user ID and load viewers
    const initViewers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);
      // Load viewers after setting currentUserId
      lastLoadTimeRef.current = Date.now();
      await loadViewers();
    };
    
    initViewers();

    // Realtime subscriptions for room_presence (global room presence)
    const roomPresenceChannel = supabase
      .channel(`room-presence-realtime-${normalizedRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_presence',
          ...(hasRoomIdColumn ? { filter: `room_id=eq.${normalizedRoomId}` } : {}),
        },
        () => {
          // Debounced reload when room presence changes
          debouncedLoadViewers();
        }
      )
      .subscribe();

    const liveStreamsChannel = supabase
      .channel('live-streams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          // Debounced reload when live status changes
          debouncedLoadViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomPresenceChannel);
      supabase.removeChannel(liveStreamsChannel);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [normalizedRoomId, supabase, hasRoomIdColumn, debouncedLoadViewers]);

  const loadViewers = async () => {
    try {
      // Get current user ID if not set
      let userId = currentUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;
        setCurrentUserId(userId);
      }

      const blockedPeerIds = new Set<string>();
      try {
        const { data: blockRows } = await supabase
          .from('blocks')
          .select('blocker_id, blocked_id')
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

        (blockRows ?? []).forEach((r: any) => {
          const other = r.blocker_id === userId ? r.blocked_id : r.blocker_id;
          if (typeof other === 'string') blockedPeerIds.add(other);
        });
      } catch {
        // ignore
      }

      // Get viewers from room_presence (global room presence, NOT tile watching)
      // This shows everyone currently on /live page, regardless of what tiles they're watching
      let presenceData: any[] | null = null;
      let error: any = null;

      if (hasRoomIdColumn) {
        const scoped = await supabase
          .from('room_presence')
          .select('profile_id, username, is_live_available, last_seen_at, room_id')
          .eq('room_id', normalizedRoomId)
          .gt('last_seen_at', new Date(Date.now() - 60000).toISOString())
          .order('is_live_available', { ascending: false })
          .order('last_seen_at', { ascending: false });

        if (scoped.error?.code === '42703') {
          setHasRoomIdColumn(false);
        } else {
          presenceData = scoped.data;
          error = scoped.error;
        }
      }

      if (!hasRoomIdColumn || error?.code === '42703' || presenceData == null) {
        const unscoped = await supabase
          .from('room_presence')
          .select('profile_id, username, is_live_available, last_seen_at')
          .gt('last_seen_at', new Date(Date.now() - 60000).toISOString())
          .order('is_live_available', { ascending: false })
          .order('last_seen_at', { ascending: false });
        presenceData = unscoped.data;
        error = unscoped.error;
      }

      if (error) throw error;

      const presenceRows = presenceData || [];

      const blockChecks = await Promise.all(
        presenceRows.map(async (p: any) => {
          const pid = p?.profile_id as string | null | undefined;
          if (!pid || pid === userId) return false;
          return isBlockedBidirectional(supabase as any, userId, pid);
        })
      );

      presenceRows.forEach((p: any, idx: number) => {
        const pid = p?.profile_id as string | null | undefined;
        if (pid && blockChecks[idx]) blockedPeerIds.add(pid);
      });

      const filteredPresence = presenceRows.filter((p: any) => !blockedPeerIds.has(p.profile_id));

      const profileIds = [...new Set(filteredPresence.map((item: any) => item.profile_id))];
      
      // Get profile info (avatar) and live stream info
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', profileIds);

      const { data: liveStreams } = await supabase
        .from('live_streams')
        .select('profile_id, id, live_available')
        .in('profile_id', profileIds)
        .eq('live_available', true);

      const profileMap = new Map<string, any>(
        (profiles || []).map((p: any) => [p.id, p])
      );

      const liveStreamMap = new Map(
        (liveStreams || []).map((ls: any) => [
          ls.profile_id, 
          { 
            isLiveAvailable: ls.live_available || false, 
            streamId: ls.id 
          }
        ])
      );

      // Build viewers list from room_presence
      const viewersWithBadges = await Promise.all(
        (presenceData || []).map(async (presence: any) => {
          if (blockedPeerIds.has(presence.profile_id)) return null;
          const profile = profileMap.get(presence.profile_id) as { id: string; username: string; avatar_url?: string } | undefined;
          if (!profile) return null;

          const liveInfo = liveStreamMap.get(presence.profile_id) as { 
            isLiveAvailable: boolean; 
            streamId: number 
          } | undefined;

          return {
            profile_id: presence.profile_id,
            username: presence.username || profile.username,
            avatar_url: profile.avatar_url ?? undefined,
            is_active: true,
            last_active_at: presence.last_seen_at,
            is_live_available: presence.is_live_available || liveInfo?.isLiveAvailable || false,
            is_published: false, // Removed - no longer used
            live_stream_id: liveInfo?.streamId ?? undefined,
          };
        })
      );

      // Filter out nulls and sort: live_available users first, then others
      const sortedViewers = viewersWithBadges
        .filter((v): v is Viewer => v !== null)
        .sort((a, b) => {
          // live_available users first
          if (a.is_live_available && !b.is_live_available) return -1;
          if (!a.is_live_available && b.is_live_available) return 1;
          
          // Current user second (if not live)
          if (a.profile_id === currentUserId && b.profile_id !== currentUserId && !a.is_live_available) return -1;
          if (b.profile_id === currentUserId && a.profile_id !== currentUserId && !b.is_live_available) return 1;
          
          // Everyone else sorted by last_seen_at (most recent first)
          return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
        });

      setViewers(sortedViewers);

      const statusMap = await fetchGifterStatuses(sortedViewers.map((v) => v.profile_id));
      setGifterStatusMap(statusMap);
    } catch (error) {
      console.error('Error loading viewers:', error);
      // No fallback needed - room_presence is the source of truth for viewer list
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Viewers</h2>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-500 dark:text-cyan-400" strokeWidth={2} />
            <span className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">
              {viewers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Viewer List - Scrollable, Takes Remaining Space */}
      {/* Use dvh for better iOS Safari support */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100dvh - 300px)' }}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : viewers.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            No viewers yet
          </div>
        ) : (
          <div className="space-y-1">
            {viewers.map((viewer) => (
              <div
                key={viewer.profile_id}
                className={`
                  flex items-center gap-2 p-2 rounded transition cursor-pointer
                  ${viewer.is_live_available 
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900 cursor-default'
                  }
                `}
              >
                {/* Webcam Icon for Live Viewers, Avatar with live indicator for Others */}
                {viewer.is_live_available ? (
                  // Show red webcam icon for all live viewers (published or preview mode)
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg border border-red-400">
                      <svg 
                        className="w-5 h-5 text-white" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        {/* Webcam body - rectangular */}
                        <rect x="5" y="7" width="14" height="9" rx="1.5" fill="white" opacity="0.9"/>
                        <rect x="5" y="7" width="14" height="9" rx="1.5" stroke="currentColor"/>
                        {/* Webcam lens - circular */}
                        <circle cx="12" cy="11.5" r="2.5" fill="currentColor" opacity="0.3"/>
                        <circle cx="12" cy="11.5" r="1.5" fill="currentColor" opacity="0.5"/>
                        <circle cx="12" cy="11.5" r="0.8" fill="currentColor"/>
                        {/* Webcam stand/base - triangular */}
                        <path d="M9 16 L12 19 L15 16" fill="white" opacity="0.9" stroke="currentColor"/>
                        <line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
                      <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                    </div>
                  </div>
                ) : (
                  <LiveAvatar
                    avatarUrl={viewer.avatar_url}
                    username={viewer.username}
                    isLive={viewer.is_live_available}
                    size="sm"
                    showLiveBadge={false}
                  />
                )}

                {/* Username + Badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserNameWithBadges
                      profileId={viewer.profile_id}
                      name={viewer.username}
                      gifterStatus={gifterStatusMap[viewer.profile_id]}
                      textSize="text-sm"
                      nameClassName="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                      clickable
                      onClick={(e) => {
                        e?.preventDefault();
                        e?.stopPropagation();
                        setSelectedProfile({
                          profileId: viewer.profile_id,
                          username: viewer.username,
                          avatarUrl: viewer.avatar_url,
                          gifterStatus: gifterStatusMap[viewer.profile_id] || null,
                          isLive: viewer.is_live_available,
                        });
                      }}
                    />
                    {viewer.profile_id === currentUserId && viewer.profile_id !== roomOwnerId && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500 text-white rounded">
                        You
                      </span>
                    )}
                  </div>
                </div>

                {viewer.is_live_available ? (
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = 'move';
                      const dragData = {
                        type: 'viewer',
                        profile_id: viewer.profile_id,
                        username: viewer.username,
                        avatar_url: viewer.avatar_url,
                        live_stream_id: viewer.live_stream_id,
                      };
                      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                      e.dataTransfer.setData('text/plain', viewer.profile_id);
                      if (onDragStart) {
                        onDragStart(viewer);
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-grab active:cursor-grabbing"
                    title="Drag to add to grid"
                  >
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Drag</span>
                  </button>
                ) : null}

                {/* Active Indicator */}
                {viewer.is_active && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Active" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Action Card V2 */}
      {selectedProfile && (
        <UserActionCardV2
          profileId={selectedProfile.profileId}
          username={selectedProfile.username}
          displayName={selectedProfile.displayName}
          avatarUrl={selectedProfile.avatarUrl}
          gifterStatus={selectedProfile.gifterStatus}
          isLive={selectedProfile.isLive}
          onClose={() => setSelectedProfile(null)}
          inLiveRoom={true}
          roomId="live_central"
          liveStreamId={viewers.find(v => v.profile_id === selectedProfile.profileId)?.live_stream_id}
        />
      )}
    </div>
  );
}

