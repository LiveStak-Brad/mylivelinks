'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import SmartBrandLogo from './SmartBrandLogo';
import Tile from './Tile';
import Chat from './Chat';
import ViewerList from './ViewerList';
import Leaderboard from './Leaderboard';
import DiamondConversion from './DiamondConversion';
import UserStatsSection from './UserStatsSection';
import CoinPurchaseSection from './CoinPurchaseSection';
import TopSupporters from './TopSupporters';
import UserMenu from './UserMenu';
import OptionsMenu from './OptionsMenu';
import StreamerSelectionModal from './StreamerSelectionModal';
import GoLiveButton from './GoLiveButton';
import Image from 'next/image';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { Room, RoomEvent } from 'livekit-client';

interface LiveStreamer {
  id: string;
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_published: boolean;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
}

interface GridSlot {
  slotIndex: number;
  streamer: LiveStreamer | null;
  isPinned: boolean;
  isMuted: boolean;
  isEmpty: boolean;
  volume: number; // 0.0 to 1.0, default 0.5 (medium)
}

type UiPanels = {
  focusMode: boolean;
  chatOpen: boolean;
  leaderboardsOpen: boolean;
  viewersOpen: boolean;
  rightStackOpen: boolean; // supporters/stats/coins block
};

export default function LiveRoom() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(true); // Start as true to render immediately
  const [gridSlots, setGridSlots] = useState<GridSlot[]>(() => 
    Array.from({ length: 12 }, (_, i) => ({
      slotIndex: i + 1,
      streamer: null,
      isPinned: false,
      isMuted: false,
      isEmpty: true,
      volume: 0.5,
    }))
  );
  const [liveStreamers, setLiveStreamers] = useState<LiveStreamer[]>([]);
  const [loading, setLoading] = useState(false); // Start as false to render immediately
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [expandedTileId, setExpandedTileId] = useState<number | null>(null);
  const [volumeSliderOpenSlot, setVolumeSliderOpenSlot] = useState<number | null>(null);
  const [selectedSlotForReplacement, setSelectedSlotForReplacement] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserPublishing, setIsCurrentUserPublishing] = useState(false); // Track if current user is publishing
  
  // Live Grid Sort Mode
  type LiveSortMode = 'random' | 'most_viewed' | 'most_gifted' | 'newest';
  const [sortMode, setSortMode] = useState<LiveSortMode>('random');
  const [randomSeed] = useState<number>(() => Math.floor(Date.now() / 1000)); // Stable seed per page load
  
  // UI Panel state management
  const [uiPanels, setUiPanels] = useState<UiPanels>({
    focusMode: false,
    chatOpen: true,
    leaderboardsOpen: true,
    viewersOpen: true,
    rightStackOpen: true,
  });

  const supabase = createClient();

  // Check if auth is disabled for testing
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  // Shared LiveKit room connection - connect once, stay connected
  const [sharedRoom, setSharedRoom] = useState<Room | null>(null);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const roomConnectionRef = useRef<{ connecting: boolean; connected: boolean }>({ connecting: false, connected: false });
  const roomRef = useRef<Room | null>(null);

  // Connect to shared LiveKit room ONCE on mount
  useEffect(() => {
    let mounted = true;
    
    const connectSharedRoom = async () => {
      // CRITICAL: Enforce "connect once" guard - prevent double-connect from:
      // - React Strict Mode double-invoking effects in dev
      // - Fast refresh / component remount
      // - Route transitions
      if (roomConnectionRef.current.connecting || roomConnectionRef.current.connected) {
        console.log('Room connection already in progress or connected, skipping');
        return;
      }

      try {
        // Set connecting flag IMMEDIATELY to prevent race conditions
        roomConnectionRef.current.connecting = true;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user && !authDisabled) {
          console.log('No user, skipping room connection');
          roomConnectionRef.current.connecting = false; // Reset flag on early return
          return;
        }

        // Get token for viewer connection
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (!accessToken && !authDisabled) {
          console.log('No access token, skipping room connection');
          roomConnectionRef.current.connecting = false; // Reset flag on early return
          return;
        }

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: 'live_central',
            participantName: 'Viewer',
            canPublish: true, // CRITICAL: Must be true so streamers can publish on shared room
            canSubscribe: true,
            userId: user?.id || 'anonymous',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get token: ${response.status}`);
        }

        const { token, url } = await response.json();
        
        if (!token || !url) {
          throw new Error('Invalid token response');
        }

        // Import Room dynamically
        const { Room: LiveKitRoom } = await import('livekit-client');
        const newRoom = new LiveKitRoom({
          adaptiveStream: true,
          dynacast: true,
        });

        // Set up event handlers BEFORE connecting
        const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
        
        const handleConnected = () => {
          if (mounted) {
            if (DEBUG_LIVEKIT) {
              console.log('[DEBUG] Room connected:', {
                roomState: newRoom.state,
                roomName: newRoom.name,
                localParticipantSid: newRoom.localParticipant.sid,
                localParticipantIdentity: newRoom.localParticipant.identity,
                remoteParticipantsCount: newRoom.remoteParticipants.size,
              });
            }
            console.log('Shared LiveKit room connected');
            setIsRoomConnected(true);
            roomConnectionRef.current.connected = true;
            roomConnectionRef.current.connecting = false;
          }
        };

        const handleDisconnected = () => {
          if (mounted) {
            if (DEBUG_LIVEKIT) {
              console.log('[DEBUG] Room disconnected:', {
                roomState: newRoom.state,
                roomName: newRoom.name,
              });
            }
            console.log('Shared LiveKit room disconnected');
            setIsRoomConnected(false);
            // CRITICAL: Reset connection flags on disconnect to allow reconnection if needed
            roomConnectionRef.current.connected = false;
            roomConnectionRef.current.connecting = false;
          }
        };

        const handleParticipantConnected = (participant: any) => {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Participant connected:', {
              identity: participant.identity,
              sid: participant.sid,
              trackPublicationsCount: participant.trackPublications.size,
              isLocal: participant === newRoom.localParticipant,
            });
          }
        };

        const handleParticipantDisconnected = (participant: any) => {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Participant disconnected:', {
              identity: participant.identity,
              sid: participant.sid,
            });
          }
        };

        const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Track subscribed:', {
              participantIdentity: participant.identity,
              trackKind: track.kind,
              trackSid: track.sid,
              publicationSid: publication.trackSid,
            });
          }
        };

        const handleTrackUnsubscribed = (track: any, publication: any, participant: any) => {
          if (DEBUG_LIVEKIT) {
            console.log('[DEBUG] Track unsubscribed:', {
              participantIdentity: participant.identity,
              trackKind: track.kind,
              trackSid: track.sid,
            });
          }
        };

        newRoom.on(RoomEvent.Connected, handleConnected);
        newRoom.on(RoomEvent.Disconnected, handleDisconnected);
        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

        // Connect to room
        await newRoom.connect(url, token);
        
        // Wait a moment to ensure connection is fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mounted) {
          // Verify connection before setting state
          if (newRoom.state === 'connected') {
            roomRef.current = newRoom;
            setSharedRoom(newRoom);
            setIsRoomConnected(true);
            roomConnectionRef.current.connected = true;
            roomConnectionRef.current.connecting = false;
          } else {
            throw new Error('Room did not connect successfully');
          }
        } else {
          // Cleanup if component unmounted during connection
          newRoom.off(RoomEvent.Connected, handleConnected);
          newRoom.off(RoomEvent.Disconnected, handleDisconnected);
          await newRoom.disconnect();
        }
      } catch (error: any) {
        console.error('Error connecting shared room:', error);
        // CRITICAL: Always reset connecting flag on error to allow retry
        roomConnectionRef.current.connecting = false;
        roomConnectionRef.current.connected = false;
        if (mounted) {
          setIsRoomConnected(false);
        }
      }
    };

    connectSharedRoom();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect().catch(console.error);
        roomRef.current = null;
        setSharedRoom(null);
        setIsRoomConnected(false);
      }
      // CRITICAL: Always reset connection flags on cleanup to prevent stale state
      roomConnectionRef.current = { connecting: false, connected: false };
    };
  }, [supabase, authDisabled]);

  // Get current user ID and track room presence
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  
  useEffect(() => {
    if (authDisabled) {
      // Skip auth check if disabled for testing
      setCurrentUserId(null);
      setCurrentUsername(null);
      return;
    }
    
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Get username for room presence
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (profile) {
          setCurrentUsername(profile.username);
        }
      } else {
        setCurrentUserId(null);
        setCurrentUsername(null);
      }
    };
    
    initUser();
  }, [supabase, authDisabled]);

  // Track room presence (global room presence, separate from tile watching)
  useRoomPresence({
    userId: currentUserId,
    username: currentUsername,
    enabled: !authDisabled && !!currentUserId && !!currentUsername,
  });

  // Auto-enable Focus Mode when tile is expanded
  useEffect(() => {
    if (expandedTileId !== null && !uiPanels.focusMode) {
      setUiPanels(prev => ({ ...prev, focusMode: true }));
    }
  }, [expandedTileId, uiPanels.focusMode]);

  // Auto-mute all other tiles when one is expanded
  useEffect(() => {
    if (expandedTileId !== null) {
      setGridSlots(prev => prev.map(slot => {
        if (slot.slotIndex === expandedTileId) {
          return { ...slot, isMuted: false }; // Unmute expanded tile
        }
        return { ...slot, isMuted: true }; // Mute all others
      }));
    }
  }, [expandedTileId]);

  const toggleFocusMode = () => {
    setUiPanels(prev => ({ ...prev, focusMode: !prev.focusMode }));
    // Exit fullscreen when disabling focus mode
    if (uiPanels.focusMode) {
      setExpandedTileId(null);
    }
  };

  const handleExpandTile = (slotIndex: number) => {
    setExpandedTileId(slotIndex);
  };

  const handleExitFullscreen = () => {
    setExpandedTileId(null);
    // Restore previous mute states (TODO: implement restore logic)
    setGridSlots(prev => prev.map(slot => ({ ...slot, isMuted: false })));
  };

  // Debug logging
  useEffect(() => {
    console.log('LiveRoom state:', { 
      mounted, 
      loading, 
      gridSlotsLength: gridSlots.length,
      liveStreamersLength: liveStreamers.length 
    });
  }, [mounted, loading, gridSlots.length, liveStreamers.length]);

  // Initialize immediately - don't wait for useEffect
  const initialSlots: GridSlot[] = Array.from({ length: 12 }, (_, i) => ({
    slotIndex: i + 1,
    streamer: null,
    isPinned: false,
    isMuted: false,
    isEmpty: true,
    volume: 0.5, // Medium volume by default
  }));

  // Initialize 12 empty slots
  useEffect(() => {
    // Set mounted and loading immediately
    setMounted(true);
    setLoading(false);
    setGridSlots(initialSlots);
  }, []);

  // Ensure current user stays in slot 1 when live
  // Use ref to prevent infinite loops from gridSlots dependency
  const gridSlotsRef = useRef<GridSlot[]>(gridSlots);
  useEffect(() => {
    gridSlotsRef.current = gridSlots;
  }, [gridSlots]);

  useEffect(() => {
    if (!currentUserId || authDisabled) return;
    
    const ensureUserInSlot1 = async () => {
      const { data: userLiveStream } = await supabase
        .from('live_streams')
        .select('id, is_published, live_available')
        .eq('profile_id', currentUserId)
        .eq('live_available', true)
        .single();
      
      if (userLiveStream) {
        // User is live - ensure they're in slot 1
        const currentSlots = gridSlotsRef.current;
        const slot1 = currentSlots.find(s => s.slotIndex === 1);
        const userInSlot1 = slot1?.streamer?.profile_id === currentUserId;
        
        if (!userInSlot1) {
          // Find user's streamer data
          const userStreamer = liveStreamers.find(s => s.profile_id === currentUserId);
          if (userStreamer) {
            addUserToSlot1(userStreamer);
          } else {
            // Load user's streamer data
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url, gifter_level')
              .eq('id', currentUserId)
              .single();
            
            if (userProfile) {
              let badgeInfo = null;
              if (userProfile.gifter_level) {
                const { data: badge } = await supabase
                  .from('gifter_levels')
                  .select('*')
                  .eq('level', userProfile.gifter_level)
                  .single();
                badgeInfo = badge;
              }
              
              const ownStream: LiveStreamer = {
                id: userLiveStream.id.toString(),
                profile_id: currentUserId,
                username: userProfile.username,
                avatar_url: userProfile.avatar_url,
                is_published: userLiveStream.is_published,
                live_available: userLiveStream.live_available,
                viewer_count: 0,
                gifter_level: badgeInfo?.level || 0,
                badge_name: badgeInfo?.badge_name,
                badge_color: badgeInfo?.badge_color,
              };
              
              addUserToSlot1(ownStream);
            }
          }
        }
      }
    };
    
    ensureUserInSlot1();
  }, [currentUserId, liveStreamers, authDisabled]); // Removed gridSlots from deps to prevent loops

  // Load live streamers and user's grid layout
  useEffect(() => {
    if (!mounted) return;

    // Load streamers first, then grid layout (which depends on streamers)
    // Pass streamers directly to avoid race condition with state updates
    loadLiveStreamers().then((streamers) => {
      loadUserGridLayout(streamers);
    });

    // Subscribe to live streamer changes
    // CRITICAL: Debounce to prevent rapid reloads that cause disconnections
    let gridReloadTimeout: NodeJS.Timeout | null = null;
    const channel = supabase
      .channel('live-streamers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          // Debounce grid reload to prevent disconnections
          if (gridReloadTimeout) {
            clearTimeout(gridReloadTimeout);
          }
          gridReloadTimeout = setTimeout(() => {
            // Only update streamer list, don't reload grid layout
            // Grid layout reload causes disconnections
            loadLiveStreamers().then((streamers) => {
              // Update streamer list but preserve current grid
              setLiveStreamers(streamers);
              // Only auto-fill empty slots, don't reload entire layout
              autoFillGrid();
            });
          }, 2000); // 2 second debounce
        }
      )
      .subscribe();

    // Also trigger publish state update when active_viewers changes
    // This ensures that when a streamer watches their own stream, publishing starts immediately
    // Use debouncing to prevent rapid updates
    let publishStateUpdateTimeout: NodeJS.Timeout | null = null;
    let fullReloadTimeout: NodeJS.Timeout | null = null;
    let lastFullReload = 0;
    const MIN_RELOAD_INTERVAL = 3000; // Max once every 3 seconds
    
    const activeViewersChannel = supabase
      .channel('active-viewers-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_viewers',
        },
        async () => {
          // Update publish state (debounced)
          if (publishStateUpdateTimeout) {
            clearTimeout(publishStateUpdateTimeout);
          }
          publishStateUpdateTimeout = setTimeout(async () => {
            try {
              await supabase.rpc('update_publish_state_from_viewers');
              // Only update viewer counts, don't reload everything
              updateViewerCountsOnly();
              
              // Debounced full reload (max once every 3 seconds)
              const now = Date.now();
              if (now - lastFullReload >= MIN_RELOAD_INTERVAL) {
                if (fullReloadTimeout) {
                  clearTimeout(fullReloadTimeout);
                }
                fullReloadTimeout = setTimeout(async () => {
                  lastFullReload = Date.now();
                  await loadLiveStreamers();
                }, 500); // Small delay to batch multiple updates
              }
            } catch (error) {
              console.error('Error updating publish state:', error);
            }
          }, 2000); // Wait 2 seconds after last change before updating
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(activeViewersChannel);
    };
  }, [sortMode, mounted]); // Reload when sort mode or mount state changes

  // Update viewer counts only (without full reload) to prevent re-subscription loops
  const updateViewerCountsOnly = async () => {
    try {
      // Update viewer counts for all current streamers without reloading everything
      const updatedStreamers = await Promise.all(
        liveStreamers.map(async (streamer) => {
          if (!streamer.live_available || !streamer.id) return streamer;
          
          const { count } = await supabase
            .from('active_viewers')
            .select('*', { count: 'exact', head: true })
            .eq('live_stream_id', parseInt(streamer.id))
            .eq('is_active', true)
            .eq('is_unmuted', true)
            .eq('is_visible', true)
            .eq('is_subscribed', true)
            .gt('last_active_at', new Date(Date.now() - 60000).toISOString());
          
          return { ...streamer, viewer_count: count || 0 };
        })
      );
      
      setLiveStreamers(updatedStreamers);
    } catch (error) {
      console.error('Error updating viewer counts:', error);
    }
  };

  const loadLiveStreamers = async () => {
    try {
      let user = null;
      if (!authDisabled) {
        const result = await supabase.auth.getUser();
        user = result.data?.user || null;
      }
      
      // If auth disabled, still load streamers (just without user filtering)
      if (!authDisabled && !user) {
        setLoading(false);
        return;
      }

      // Use new RPC function with sort mode
      let data: any[] = [];
      let error: any = null;

      if (sortMode === 'random') {
        // Use random function with stable seed
        const result = await supabase.rpc('get_live_grid_random', {
          p_viewer_id: user.id,
          p_seed: randomSeed,
        });
        data = result.data || [];
        error = result.error;
      } else {
        // Use sorted function
        const result = await supabase.rpc('get_live_grid', {
          p_viewer_id: user.id,
          p_sort_mode: sortMode,
        });
        data = result.data || [];
        error = result.error;
      }

      if (error) {
        console.error('RPC error, falling back to regular query:', error);
        // Fallback to old RPC
        const fallbackResult = await supabase.rpc('get_available_streamers_filtered', {
          p_viewer_id: user.id,
        });
        if (fallbackResult.error) throw fallbackResult.error;
        data = fallbackResult.data || [];
      }

      // Process streamers from RPC (new structure)
      const streamerData = data || [];

      // Batch load gifter levels for badges
      const profileIds = [...new Set(streamerData.map((s: any) => s.streamer_id))];
      const profileBadgeMap: Record<string, any> = {};
      
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, gifter_level')
          .in('id', profileIds);
        
        if (profiles) {
          const uniqueLevels = [...new Set(profiles.map((p: any) => p.gifter_level).filter((l: any) => l !== null && l > 0))];
          
          if (uniqueLevels.length > 0) {
            const { data: badges } = await supabase
              .from('gifter_levels')
              .select('*')
              .in('level', uniqueLevels);
            
            if (badges) {
              const badgeMap: Record<number, any> = {};
              badges.forEach((badge: any) => {
                badgeMap[badge.level] = badge;
              });
              
              profiles.forEach((profile: any) => {
                if (profile.gifter_level) {
                  profileBadgeMap[profile.id] = badgeMap[profile.gifter_level];
                }
              });
            }
          }
        }
      }

      // Map streamers with badge info
      let streamersWithBadges = streamerData.map((stream: any) => {
        const badgeInfo = profileBadgeMap[stream.streamer_id] || null;

        return {
          id: stream.live_stream_id?.toString() || stream.streamer_id,
          profile_id: stream.streamer_id,
          username: stream.username,
          avatar_url: stream.avatar_url,
          is_published: stream.is_published || false, // Only true when actually publishing
          live_available: true, // RPC only returns live_available = true
          viewer_count: stream.viewer_count || 0,
          gifter_level: badgeInfo?.level || 0,
          badge_name: badgeInfo?.badge_name,
          badge_color: badgeInfo?.badge_color,
        } as LiveStreamer;
      });

      // Also fetch streamers who are live_available but not yet published (waiting for viewers)
      // This ensures all "waiting" cameras are available to new viewers
      if (user) {
        const { data: waitingStreams } = await supabase
          .from('live_streams')
          .select('id, profile_id, is_published, live_available')
          .eq('live_available', true)
          .eq('is_published', false);

        if (waitingStreams && waitingStreams.length > 0) {
          const waitingProfileIds = waitingStreams.map((s: any) => s.profile_id);
          const { data: waitingProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, gifter_level')
            .in('id', waitingProfileIds);

          if (waitingProfiles) {
            // Get badges for waiting streamers
            const uniqueLevels = [...new Set(waitingProfiles.map((p: any) => p.gifter_level).filter((l: any) => l !== null && l > 0))];
            const waitingBadgeMap: Record<string, any> = {};
            
            if (uniqueLevels.length > 0) {
              const { data: badges } = await supabase
                .from('gifter_levels')
                .select('*')
                .in('level', uniqueLevels);
              
              if (badges) {
                const badgeMap: Record<number, any> = {};
                badges.forEach((badge: any) => {
                  badgeMap[badge.level] = badge;
                });
                
                waitingProfiles.forEach((profile: any) => {
                  if (profile.gifter_level) {
                    waitingBadgeMap[profile.id] = badgeMap[profile.gifter_level];
                  }
                });
              }
            }

            // Add waiting streamers to the list (if not already present)
            for (const stream of waitingStreams) {
              const alreadyExists = streamersWithBadges.find(s => s.profile_id === stream.profile_id);
              if (!alreadyExists) {
                const profile = waitingProfiles.find((p: any) => p.id === stream.profile_id);
                if (profile) {
                  const badgeInfo = waitingBadgeMap[profile.id] || null;
                  
                  // Get viewer count for waiting streamers too
                  let viewerCount = 0;
                  const { count } = await supabase
                    .from('active_viewers')
                    .select('*', { count: 'exact', head: true })
                    .eq('live_stream_id', stream.id)
                    .eq('is_active', true)
                    .eq('is_unmuted', true)
                    .eq('is_visible', true)
                    .eq('is_subscribed', true)
                    .gt('last_active_at', new Date(Date.now() - 60000).toISOString());
                  viewerCount = count || 0;
                  
                  streamersWithBadges.push({
                    id: stream.id.toString(),
                    profile_id: stream.profile_id,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                    is_published: false,
                    live_available: true,
                    viewer_count: viewerCount,
                    gifter_level: badgeInfo?.level || 0,
                    badge_name: badgeInfo?.badge_name,
                    badge_color: badgeInfo?.badge_color,
                  } as LiveStreamer);
                }
              }
            }
          }
        }

        // Always include the current user's own stream if they're live, even if not published yet
        const { data: ownLiveStream } = await supabase
          .from('live_streams')
          .select('id, profile_id, is_published, live_available')
          .eq('profile_id', user.id)
          .eq('live_available', true)
          .single();

        if (ownLiveStream) {
          const ownStreamExists = streamersWithBadges.find(s => s.profile_id === user.id);
          if (!ownStreamExists) {
            // Get user's profile for their own stream
            const { data: ownProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url, gifter_level')
              .eq('id', user.id)
              .single();

            if (ownProfile) {
              // Get badge if they have one
              let badgeInfo = null;
              if (ownProfile.gifter_level) {
                const { data: badge } = await supabase
                  .from('gifter_levels')
                  .select('*')
                  .eq('level', ownProfile.gifter_level)
                  .single();
                badgeInfo = badge;
              }

              // Get viewer count for own stream
              let ownViewerCount = 0;
              const { count: ownCount } = await supabase
                .from('active_viewers')
                .select('*', { count: 'exact', head: true })
                .eq('live_stream_id', ownLiveStream.id)
                .eq('is_active', true)
                .eq('is_unmuted', true)
                .eq('is_visible', true)
                .eq('is_subscribed', true)
                .gt('last_active_at', new Date(Date.now() - 60000).toISOString());
              ownViewerCount = ownCount || 0;
              
              streamersWithBadges.unshift({
                id: ownLiveStream.id.toString(),
                profile_id: user.id,
                username: ownProfile.username,
                avatar_url: ownProfile.avatar_url,
                is_published: ownLiveStream.is_published,
                live_available: true,
                viewer_count: ownViewerCount,
                gifter_level: badgeInfo?.level || 0,
                badge_name: badgeInfo?.badge_name,
                badge_color: badgeInfo?.badge_color,
              } as LiveStreamer);
            }
          }
        }
      }

      setLiveStreamers(streamersWithBadges);
      // If no streamers found, still set loading to false
      if (!streamersWithBadges || streamersWithBadges.length === 0) {
        setLoading(false);
      }
      
      // Return streamers array so caller can use it directly (fixes race condition)
      return streamersWithBadges;
    } catch (error) {
      console.error('Error loading live streamers:', error);
      setLoading(false);
      // Ensure we have empty slots even on error
      if (gridSlots.length === 0) {
        const emptySlots: GridSlot[] = Array.from({ length: 12 }, (_, i) => ({
          slotIndex: i + 1,
          streamer: null,
          isPinned: false,
          isMuted: false,
          isEmpty: true,
          volume: 0.5, // Medium volume by default
        }));
        setGridSlots(emptySlots);
      }
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadUserGridLayout = async (streamers?: LiveStreamer[]) => {
    try {
      let user = null;
      if (!authDisabled) {
        const result = await supabase.auth.getUser();
        user = result.data?.user || null;
      }
      
      if (!user) {
        // No user - use default empty grid
        const emptySlots = Array.from({ length: 12 }, (_, i) => ({
          slotIndex: i + 1,
          streamer: null,
          isPinned: false,
          isMuted: false,
          isEmpty: true,
          volume: 0.5,
        }));
        setGridSlots(emptySlots);
        return;
      }
      
      // Use provided streamers array or fall back to state (for backwards compatibility)
      const availableStreamers = streamers || liveStreamers;

      // Check if user is live - if so, ensure they're in slot 1
      const { data: userLiveStream } = await supabase
        .from('live_streams')
        .select('id, is_published, live_available')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .single();

      const { data, error } = await supabase
        .from('user_grid_slots')
        .select('*')
        .eq('viewer_id', user.id)
        .order('slot_index');

      if (error) throw error;

      if (data && data.length > 0) {
        // Load streamer info for each slot
        const updatedSlots = await Promise.all(
          data.map(async (slot: any) => {
            if (!slot.streamer_id) {
              return {
                slotIndex: slot.slot_index,
                streamer: null,
                isPinned: slot.is_pinned,
                isMuted: slot.is_muted,
                isEmpty: true,
                volume: 0.5, // Medium volume by default
              };
            }

            // Get streamer info from provided array or state
            const streamer = availableStreamers.find(
              (s) => s.profile_id === slot.streamer_id
            );

            return {
              slotIndex: slot.slot_index,
              streamer: streamer || null,
              isPinned: slot.is_pinned,
              isMuted: slot.is_muted,
              isEmpty: !streamer,
              volume: 0.5, // Medium volume by default
            };
          })
        );

        // Fill remaining slots
        const filledIndices = updatedSlots.map((s) => s.slotIndex);
        
        // If user is live, ensure they're in slot 1 (lock them there)
        if (userLiveStream) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url, gifter_level')
            .eq('id', user.id)
            .single();
          
          if (userProfile) {
            let badgeInfo = null;
            if (userProfile.gifter_level) {
              const { data: badge } = await supabase
                .from('gifter_levels')
                .select('*')
                .eq('level', userProfile.gifter_level)
                .single();
              badgeInfo = badge;
            }
            
            const ownStream: LiveStreamer = {
              id: userLiveStream.id.toString(),
              profile_id: user.id,
              username: userProfile.username,
              avatar_url: userProfile.avatar_url,
              is_published: userLiveStream.is_published,
              live_available: userLiveStream.live_available,
              viewer_count: 0,
              gifter_level: badgeInfo?.level || 0,
              badge_name: badgeInfo?.badge_name,
              badge_color: badgeInfo?.badge_color,
            };
            
            // CRITICAL: Force user into slot 1 (self-pinning) - override any saved layout
            const slot1Index = updatedSlots.findIndex(s => s.slotIndex === 1);
            if (slot1Index >= 0) {
              updatedSlots[slot1Index] = {
                ...updatedSlots[slot1Index],
                streamer: ownStream,
                isEmpty: false,
              };
            } else {
              // Slot 1 doesn't exist, add it
              updatedSlots.push({
                slotIndex: 1,
                streamer: ownStream,
                isPinned: false,
                isMuted: false,
                isEmpty: false,
                volume: 0.5,
              });
            }
            
            // Remove user from any other slot
            updatedSlots.forEach((slot, index) => {
              if (slot.slotIndex !== 1 && slot.streamer?.profile_id === user.id) {
                updatedSlots[index] = {
                  ...slot,
                  streamer: null,
                  isEmpty: true,
                };
              }
            });
          }
        }
        
        // Fill remaining slots (1-12) that don't have streamers
        for (let i = 1; i <= 12; i++) {
          if (!filledIndices.includes(i)) {
            updatedSlots.push({
              slotIndex: i,
              streamer: null,
              isPinned: false,
              isMuted: false,
              isEmpty: true,
              volume: 0.5,
            });
          }
        }

        // Sort slots by index
        const sortedSlots = updatedSlots.sort((a, b) => a.slotIndex - b.slotIndex);
        
        // CRITICAL: Autofill empty slots with available streamers (runs on join)
        // This ensures new users see all available cameras immediately
        // This also triggers active_viewers entries which will trigger publishing
        const emptySlots = sortedSlots.filter(s => s.isEmpty);
        if (emptySlots.length > 0 && availableStreamers.length > 0) {
          // Get streamers not already in grid
          const usedStreamerIds = new Set(sortedSlots.filter(s => s.streamer).map(s => s.streamer!.profile_id));
          const unusedStreamers = availableStreamers.filter(s => !usedStreamerIds.has(s.profile_id));
          
          // Fill empty slots with available streamers (prioritize published, then live_available)
          const sortedStreamers = unusedStreamers.sort((a, b) => {
            if (a.is_published !== b.is_published) return a.is_published ? -1 : 1;
            if (a.live_available !== b.live_available) return a.live_available ? -1 : 1;
            return b.viewer_count - a.viewer_count;
          });
          
          sortedStreamers.slice(0, emptySlots.length).forEach((streamer, index) => {
            const emptySlot = emptySlots[index];
            if (emptySlot) {
              const slotIndex = sortedSlots.findIndex(s => s.slotIndex === emptySlot.slotIndex);
              if (slotIndex >= 0) {
                sortedSlots[slotIndex] = {
                  ...sortedSlots[slotIndex],
                  streamer,
                  isEmpty: false,
                };
              }
            }
          });
        }

        setGridSlots(sortedSlots);
        saveGridLayout(sortedSlots);
      } else {
        // No saved layout - auto-fill with ALL available streamers (both published and waiting)
        // This ensures new users see all cameras that are available
        autoFillGrid();
      }
    } catch (error) {
      console.error('Error loading grid layout:', error);
      autoFillGrid();
    }
  };

  const saveGridLayout = useCallback(async (slots: GridSlot[]) => {
    try {
      if (authDisabled) {
        // Skip saving if auth disabled (testing mode)
        return;
      }
      
      let user = null;
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      if (!user) return;

      // Delete existing slots
      await supabase
        .from('user_grid_slots')
        .delete()
        .eq('viewer_id', user.id);

      // Insert new slots
      const slotsToSave = slots
        .filter((slot) => slot.streamer !== null)
        .map((slot) => ({
          viewer_id: user.id,
          slot_index: slot.slotIndex,
          streamer_id: slot.streamer?.profile_id || null,
          live_stream_id: slot.streamer ? parseInt(slot.streamer.id) : null,
          is_pinned: slot.isPinned,
          is_muted: slot.isMuted,
        }));

      if (slotsToSave.length > 0) {
        await supabase.from('user_grid_slots').insert(slotsToSave);
      }
    } catch (error) {
      console.error('Error saving grid layout:', error);
    }
  }, [supabase]);

  const autoFillGrid = useCallback(() => {
    if (liveStreamers.length === 0) return;

    // Sort by: published first, then live_available, then by viewer count
    // This ensures published streamers appear first, then waiting ones
    const sorted = [...liveStreamers].sort((a, b) => {
      // Published streamers first
      if (a.is_published !== b.is_published) {
        return a.is_published ? -1 : 1;
      }
      // Then live_available streamers
      if (a.live_available !== b.live_available) {
        return a.live_available ? -1 : 1;
      }
      // Then by viewer count
      return b.viewer_count - a.viewer_count;
    });

    const newSlots: GridSlot[] = Array.from({ length: 12 }, (_, i) => {
      const streamer = sorted[i] || null;
      return {
        slotIndex: i + 1,
        streamer,
        isPinned: false,
        isMuted: false,
        isEmpty: !streamer,
        volume: 0.5, // Medium volume by default
      };
    });

    setGridSlots(newSlots);
    saveGridLayout(newSlots);
  }, [liveStreamers, saveGridLayout]);

  const handleGoLive = async (liveStreamId: number, profileId: string) => {
    try {
      console.log('handleGoLive called:', { liveStreamId, profileId });
      
      // Directly load the user's stream data instead of reloading all streamers
      if (authDisabled) {
        alert('⚠️ Testing Mode: "Go Live" requires authentication. Please enable auth or log in.');
        return;
      }
      
      let user = null;
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      
      if (!user || user.id !== profileId) {
        console.error('User mismatch or not authenticated');
        return;
      }

      // Load user's profile and live stream data
      const [profileResult, liveStreamResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, avatar_url, gifter_level')
          .eq('id', profileId)
          .single(),
        supabase
          .from('live_streams')
          .select('id, is_published, live_available')
          .eq('id', liveStreamId)
          .single(),
      ]);

      if (profileResult.error || !profileResult.data) {
        console.error('Error loading profile:', profileResult.error);
        return;
      }

      if (liveStreamResult.error || !liveStreamResult.data) {
        console.error('Error loading live stream:', liveStreamResult.error);
        return;
      }

      const profile = profileResult.data;
      const liveStream = liveStreamResult.data;

      // Get badge if they have one
      let badgeInfo = null;
      if (profile.gifter_level) {
        const { data: badge } = await supabase
          .from('gifter_levels')
          .select('*')
          .eq('level', profile.gifter_level)
          .single();
        badgeInfo = badge;
      }

      // Create streamer object
      const ownStream: LiveStreamer = {
        id: liveStream.id.toString(),
        profile_id: profileId,
        username: profile.username,
        avatar_url: profile.avatar_url,
        is_published: liveStream.is_published,
        live_available: liveStream.live_available,
        viewer_count: 0, // Will be updated by realtime
        gifter_level: badgeInfo?.level || 0,
        badge_name: badgeInfo?.badge_name,
        badge_color: badgeInfo?.badge_color,
      };

      // Add to liveStreamers list if not already there
      setLiveStreamers((prev) => {
        const exists = prev.find(s => s.profile_id === profileId);
        if (exists) {
          // Update existing
          return prev.map(s => s.profile_id === profileId ? ownStream : s);
        } else {
          // Add new
          return [ownStream, ...prev];
        }
      });

      // Immediately add to slot 1
      addUserToSlot1(ownStream);
      
      console.log('User added to slot 1:', ownStream);
    } catch (error) {
      console.error('Error adding user to grid:', error);
    }
  };

  const addUserToSlot1 = (streamer: LiveStreamer) => {
    // Use current grid slots from state
    const currentSlots = [...gridSlots];
    
    // Check if user is already in slot 1
    const slot1 = currentSlots.find(s => s.slotIndex === 1);
    if (slot1 && slot1.streamer?.profile_id === streamer.profile_id) {
      // Already in slot 1, but update streamer data in case it changed
      const slot1Index = currentSlots.findIndex(s => s.slotIndex === 1);
      if (slot1Index !== -1) {
        currentSlots[slot1Index] = {
          ...currentSlots[slot1Index],
          streamer: streamer, // Update with latest data
        };
        setGridSlots(currentSlots);
        saveGridLayout(currentSlots);
      }
      return;
    }

    const slot1Index = currentSlots.findIndex(s => s.slotIndex === 1);
    
    // Remove user from any other slot they might be in
    const userSlotIndex = currentSlots.findIndex(s => s.streamer?.profile_id === streamer.profile_id);
    if (userSlotIndex !== -1 && userSlotIndex !== slot1Index) {
      currentSlots[userSlotIndex] = {
        ...currentSlots[userSlotIndex],
        streamer: null,
        isEmpty: true,
      };
    }
    
    // If slot 1 has someone else, move them to first available slot
    // Priority: 1) slot user was in, 2) first empty slot, 3) last slot
    if (slot1Index !== -1 && currentSlots[slot1Index].streamer && 
        currentSlots[slot1Index].streamer?.profile_id !== streamer.profile_id) {
      const displacedStreamer = currentSlots[slot1Index].streamer;
      
      // Find target slot: prefer user's old slot, then first empty, then last slot
      let targetSlotIndex = -1;
      
      if (userSlotIndex !== -1 && userSlotIndex !== slot1Index) {
        // Use the slot the user was in
        targetSlotIndex = userSlotIndex;
      } else {
        // Find first empty slot (excluding slot 1)
        targetSlotIndex = currentSlots.findIndex(s => s.isEmpty && s.slotIndex !== 1);
        
        // If no empty slot, use the last occupied slot (shift everyone down)
        if (targetSlotIndex === -1) {
          // Find the last slot that has a streamer
          for (let i = currentSlots.length - 1; i >= 0; i--) {
            if (currentSlots[i].slotIndex !== 1 && currentSlots[i].streamer) {
              targetSlotIndex = i;
              break;
            }
          }
          
          // If still no slot found, use slot 12 (last slot)
          if (targetSlotIndex === -1) {
            targetSlotIndex = currentSlots.findIndex(s => s.slotIndex === 12);
          }
        }
      }
      
      // Move displaced streamer to target slot
      if (targetSlotIndex !== -1) {
        currentSlots[targetSlotIndex] = {
          ...currentSlots[targetSlotIndex],
          streamer: displacedStreamer,
          isEmpty: false,
        };
      } else {
        // Fallback: if we can't find a slot, log warning but don't lose the streamer
        console.warn('Could not find slot for displaced streamer:', displacedStreamer?.username);
      }
    }

    // Put the user in slot 1 (top-left)
    if (slot1Index !== -1) {
      currentSlots[slot1Index] = {
        ...currentSlots[slot1Index],
        streamer: streamer,
        isEmpty: false,
        isPinned: false,
      };
    }

    setGridSlots(currentSlots);
    
    // Save to database
    saveGridLayout(currentSlots);
    
    console.log('Added user to slot 1 (top-left)');
  };

  const handleDragStart = (slotIndex: number) => {
    setDraggedSlot(slotIndex);
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredSlot(slotIndex);
  };

  const handleDrop = async (e: React.DragEvent, targetSlotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Drop event triggered on slot:', targetSlotIndex);
    
    // Check if dropping a viewer from the viewer list
    const dragData = e.dataTransfer.getData('application/json');
    console.log('Drag data:', dragData);
    
    if (dragData && dragData.trim()) {
      try {
        const data = JSON.parse(dragData);
        console.log('Parsed drag data:', data);
        
        if (data.type === 'viewer' && data.profile_id) {
          console.log('Processing viewer drop:', data.profile_id, 'into slot:', targetSlotIndex);
          
          // Find the streamer info for this viewer
          const streamer = liveStreamers.find((s) => s.profile_id === data.profile_id);
          console.log('Found streamer in list:', streamer);
          
          if (!streamer) {
            console.log('Streamer not in list, loading from database...');
            // Try to load streamer info if not in list
            await loadStreamerForViewer(data.profile_id, data.live_stream_id, targetSlotIndex);
            setDraggedSlot(null);
            setHoveredSlot(null);
            return;
          }

          const targetSlot = gridSlots.find((s) => s.slotIndex === targetSlotIndex);
          console.log('Target slot:', targetSlot);
          
          if (!targetSlot) {
            console.error('Target slot not found!');
            return;
          }

          // Create new slots array
          const newSlots = gridSlots.map(slot => {
            if (slot.slotIndex === targetSlotIndex) {
              return {
                ...slot,
                streamer: streamer,
                isEmpty: false,
                volume: 0.5,
              };
            }
            return slot;
          });
          
          console.log('Updating slots, new slots:', newSlots);
          
          setGridSlots(newSlots);
          saveGridLayout(newSlots);
          setDraggedSlot(null);
          setHoveredSlot(null);
          return;
        }
      } catch (error) {
        console.error('Error parsing drag data:', error);
      }
    }

    // Original drag-and-drop logic for grid slots
    if (draggedSlot === null) return;

    const draggedStreamer: LiveStreamer | null = gridSlots.find((s) => s.slotIndex === draggedSlot)?.streamer || null;
    const targetSlot = gridSlots.find((s) => s.slotIndex === targetSlotIndex);

    if (!targetSlot || !draggedStreamer) return;

    const newSlots = [...gridSlots];
    
    // Swap or move
    if (targetSlot.streamer) {
      // Swap
      const targetStreamer: LiveStreamer | null = targetSlot.streamer;
      const draggedSlotObj = newSlots.find((s) => s.slotIndex === draggedSlot);
      const targetSlotObj = newSlots.find((s) => s.slotIndex === targetSlotIndex);
      if (draggedSlotObj && targetSlotObj) {
        draggedSlotObj.streamer = targetStreamer;
        targetSlotObj.streamer = draggedStreamer;
      }
    } else {
      // Move to empty slot
      const draggedSlotObj = newSlots.find((s) => s.slotIndex === draggedSlot);
      const targetSlotObj = newSlots.find((s) => s.slotIndex === targetSlotIndex);
      if (draggedSlotObj && targetSlotObj) {
        draggedSlotObj.streamer = null;
        draggedSlotObj.isEmpty = true;
        targetSlotObj.streamer = draggedStreamer;
        targetSlotObj.isEmpty = false;
      }
    }

    setGridSlots(newSlots);
    saveGridLayout(newSlots);
    setDraggedSlot(null);
    setHoveredSlot(null);
  };

  const loadStreamerForViewer = async (profileId: string, liveStreamId: number | undefined, slotIndex: number) => {
    try {
      console.log('Loading streamer for viewer:', profileId, liveStreamId, slotIndex);
      
      // Load streamer info from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError || !profile) {
        console.error('Error loading profile:', profileError);
        return;
      }

      // Get live stream info
      let streamId = liveStreamId;
      let isPublished = false;
      if (!streamId) {
        const { data: streamData } = await supabase
          .from('live_streams')
          .select('id, is_published')
          .eq('profile_id', profileId)
          .eq('live_available', true)
          .single();
        streamId = streamData?.id;
        isPublished = streamData?.is_published || false;
      } else {
        // If we have streamId, fetch is_published status
        const { data: streamData } = await supabase
          .from('live_streams')
          .select('is_published')
          .eq('id', streamId)
          .single();
        isPublished = streamData?.is_published || false;
      }

      // Get badge info
      let badgeInfo = null;
      if (profile.gifter_level !== null) {
        const { data: badge } = await supabase
          .from('gifter_levels')
          .select('*')
          .eq('level', profile.gifter_level)
          .single();
        badgeInfo = badge;
      }

      // Get viewer count - must match the same criteria as update_publish_state_from_viewers
      // Count only active viewers: is_active + unmuted + visible + subscribed + heartbeat within 60 seconds
      let viewerCount = 0;
      if (streamId) {
        const { count } = await supabase
          .from('active_viewers')
          .select('*', { count: 'exact', head: true })
          .eq('live_stream_id', streamId)
          .eq('is_active', true)
          .eq('is_unmuted', true)
          .eq('is_visible', true)
          .eq('is_subscribed', true)
          .gt('last_active_at', new Date(Date.now() - 60000).toISOString()); // Within last 60 seconds
        viewerCount = count || 0;
      }

      const streamer: LiveStreamer = {
        id: streamId?.toString() || `stream-${profileId}`,
        profile_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        is_published: isPublished, // Use actual value from database
        live_available: !!streamId, // true if they have a live stream
        viewer_count: viewerCount,
        gifter_level: profile.gifter_level || 0,
        badge_name: badgeInfo?.badge_name,
        badge_color: badgeInfo?.badge_color,
      };

      // Add to liveStreamers list if not already there
      setLiveStreamers((prev) => {
        if (!prev.find((s) => s.profile_id === profileId)) {
          return [...prev, streamer];
        }
        return prev;
      });

      // Add to grid slot
      const newSlots = [...gridSlots];
      const targetSlot = newSlots.find((s) => s.slotIndex === slotIndex);
      if (targetSlot) {
        targetSlot.streamer = streamer;
        targetSlot.isEmpty = false;
        targetSlot.volume = 0.5;
        console.log('Added streamer to slot:', slotIndex, streamer.username);
      }

      setGridSlots(newSlots);
      saveGridLayout(newSlots);
    } catch (error) {
      console.error('Error loading streamer for viewer:', error);
    }
  };

  const handleCloseTile = (slotIndex: number) => {
    const newSlots = [...gridSlots];
    const slot = newSlots.find((s) => s.slotIndex === slotIndex);
    if (slot) {
      slot.streamer = null;
      slot.isEmpty = true;
      slot.isPinned = false;
      slot.isMuted = false;
    }
    setGridSlots(newSlots);
    saveGridLayout(newSlots);
  };

  const handleMuteTile = (slotIndex: number) => {
    const newSlots = [...gridSlots];
    const slot = newSlots.find((s) => s.slotIndex === slotIndex);
    if (slot) {
      slot.isMuted = !slot.isMuted;
    }
    setGridSlots(newSlots);
    saveGridLayout(newSlots);
  };

  const handleVolumeChange = (slotIndex: number, volume: number) => {
    const newSlots = [...gridSlots];
    const slot = newSlots.find((s) => s.slotIndex === slotIndex);
    if (slot) {
      slot.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    }
    setGridSlots(newSlots);
    // Note: Volume is per-viewer preference, not saved to database
  };

  const handleRandomize = () => {
    // Clear any active filter when randomizing
    setSortMode('random');
    autoFillGrid();
  };

  const handleSortModeChange = (mode: LiveSortMode) => {
    // Don't do anything if clicking the same filter
    if (mode === sortMode) return;
    
    setSortMode(mode);
    // Reload streamers with new sort mode
    loadLiveStreamers();
  };

  const handleAddStreamer = async (slotIndex: number, streamerId: string) => {
    // Check if this is the current user going live
    let user = null;
    if (!authDisabled) {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
    }
    const isCurrentUser = user && user.id === streamerId;
    
    // If it's the current user and they're live, auto-place them in slot 1
    if (isCurrentUser) {
      // Check if user is live
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('id, is_published, live_available')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .single();
      
      if (liveStream) {
        // User is live - auto-place in slot 1
        await loadLiveStreamers(); // Refresh streamers list
        
        // Wait a bit for state to update, then add to slot 1
        setTimeout(() => {
          setLiveStreamers((currentStreamers) => {
            const ownStream = currentStreamers.find(s => s.profile_id === streamerId);
            if (ownStream) {
              addUserToSlot1(ownStream);
            } else {
              // If not found, load it manually
              loadStreamerForViewer(streamerId, liveStream.id, 1);
            }
            return currentStreamers;
          });
        }, 200);
        return;
      }
    }
    
    // For other streamers or if current user is not live, use the selected slot
    let streamer = liveStreamers.find((s) => s.profile_id === streamerId);
    
    // If streamer not found in list, load it
    if (!streamer) {
      // Get live stream ID if available
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('id, is_published')
        .eq('profile_id', streamerId)
        .eq('live_available', true)
        .single();
      
      if (liveStream) {
        // Load full streamer data
        await loadStreamerForViewer(streamerId, liveStream.id, slotIndex);
        return;
      } else {
        // Not live, just load profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, gifter_level')
          .eq('id', streamerId)
          .single();
        
        if (profile) {
          // Get badge if they have one
          let badgeInfo = null;
          if (profile.gifter_level) {
            const { data: badge } = await supabase
              .from('gifter_levels')
              .select('*')
              .eq('level', profile.gifter_level)
              .single();
            badgeInfo = badge;
          }
          
          streamer = {
            id: profile.id,
            profile_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            is_published: false,
            live_available: false,
            viewer_count: 0,
            gifter_level: badgeInfo?.level || 0,
            badge_name: badgeInfo?.badge_name,
            badge_color: badgeInfo?.badge_color,
          } as LiveStreamer;
        } else {
          console.error('Profile not found:', streamerId);
          return;
        }
      }
    }

    const newSlots = [...gridSlots];
    const slot = newSlots.find((s) => s.slotIndex === slotIndex);
    if (slot && streamer) {
      slot.streamer = streamer;
      slot.isEmpty = false;
    }
    setGridSlots(newSlots);
    saveGridLayout(newSlots);
  };

  // Always render content - no blocking checks

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
      {/* Testing Mode Banner (if auth disabled) */}
      {authDisabled && (
        <div className="w-full bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white text-center py-2 px-4 text-sm font-semibold">
          ⚠️ TESTING MODE: Authentication Disabled - Anyone can access
        </div>
      )}
      
      {/* Beta/Testing Banner */}
      <div className="bg-yellow-500 text-black text-center py-2 px-4 text-sm font-semibold z-50 flex-shrink-0">
        <span className="inline-block">BETA/TESTING - NO CASH VALUE</span>
      </div>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-50 relative pb-8">
        <div className="w-full px-6 flex items-center justify-between relative min-h-[120px] h-[120px]">
          {/* Left Section - Apply for a Room */}
          <div className="flex items-center flex-shrink-0 z-10">
            <a
              href="/apply"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition whitespace-nowrap text-base sm:text-lg font-semibold shadow-md"
            >
              Apply for a Room
            </a>
          </div>

          {/* Sort Buttons Group - Positioned halfway between Apply and Logo */}
          <div className="flex items-center gap-3 flex-shrink-0 z-10 absolute left-[25%] transform -translate-x-1/2">
            <button
              onClick={handleRandomize}
              className={`px-6 py-3 rounded-lg transition whitespace-nowrap text-base sm:text-lg font-semibold shadow-md flex-shrink-0 ${
                sortMode === 'random'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 opacity-70 hover:opacity-100'
              }`}
            >
              Randomize
            </button>
            
            <button
              onClick={() => handleSortModeChange('most_viewed')}
              className={`px-4 py-3 rounded-lg transition whitespace-nowrap text-sm sm:text-base font-semibold shadow-md flex-shrink-0 ${
                sortMode === 'most_viewed'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 opacity-70 hover:opacity-100'
              }`}
            >
              Most Viewed
            </button>
            
            <button
              onClick={() => handleSortModeChange('most_gifted')}
              className={`px-4 py-3 rounded-lg transition whitespace-nowrap text-sm sm:text-base font-semibold shadow-md flex-shrink-0 ${
                sortMode === 'most_gifted'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 opacity-70 hover:opacity-100'
              }`}
            >
              Most Gifted
            </button>
            
            <button
              onClick={() => handleSortModeChange('newest')}
              className={`px-4 py-3 rounded-lg transition whitespace-nowrap text-sm sm:text-base font-semibold shadow-md flex-shrink-0 ${
                sortMode === 'newest'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 opacity-70 hover:opacity-100'
              }`}
            >
              Newest
            </button>
          </div>

          {/* Center Logo - Absolutely centered, sized to fit header perfectly */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-0">
            <a href="/live" className="flex items-center pointer-events-auto">
              <Image
                src="/branding/mylivelinkstransparent.png"
                alt="MyLiveLinks"
                width={400}
                height={160}
                className="h-28 sm:h-36 md:h-44 lg:h-52 w-auto object-contain"
                priority
              />
            </a>
          </div>

          {/* Right Section - Go Live, Focus Mode, Options and Login grouped together */}
          <div className="flex items-center gap-3 flex-shrink-0 z-10">
            <GoLiveButton 
              sharedRoom={sharedRoom} 
              isRoomConnected={isRoomConnected} 
              onGoLive={handleGoLive}
              onPublishingChange={setIsCurrentUserPublishing}
            />
            <button
              onClick={toggleFocusMode}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition whitespace-nowrap text-sm sm:text-base font-medium shadow-md"
            >
              {uiPanels.focusMode ? 'Show UI' : 'Focus Mode'}
            </button>
            <OptionsMenu />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content - Vertical Layout: Cameras on top, then Chat/Viewers/Leaderboard below */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Fullscreen Tile Mode */}
        {expandedTileId !== null && (() => {
          const expandedSlot = gridSlots.find(s => s.slotIndex === expandedTileId);
          if (!expandedSlot?.streamer) return null;
          return (
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden bg-black">
              <div className="relative w-full h-full flex items-center justify-center">
                <Tile
                  streamerId={expandedSlot.streamer.profile_id}
                  streamerUsername={expandedSlot.streamer.username}
                  streamerAvatar={expandedSlot.streamer.avatar_url}
                  isLive={expandedSlot.streamer.is_published}
                  isLiveAvailable={expandedSlot.streamer.live_available}
                  viewerCount={expandedSlot.streamer.viewer_count}
                  gifterLevel={expandedSlot.streamer.gifter_level}
                  badgeName={expandedSlot.streamer.badge_name}
                  badgeColor={expandedSlot.streamer.badge_color}
                  slotIndex={expandedSlot.slotIndex}
                  liveStreamId={expandedSlot.streamer.id && (expandedSlot.streamer.is_published || expandedSlot.streamer.live_available) ? (() => {
                    const idStr = expandedSlot.streamer.id.toString();
                    // Only parse if it's a real stream ID (numeric), not seed data (stream-X or seed-X)
                    if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) {
                      return undefined;
                    }
                    const parsed = parseInt(idStr);
                    return parsed > 0 ? parsed : undefined;
                  })() : undefined}
                  sharedRoom={sharedRoom}
                  isRoomConnected={isRoomConnected}
                  onClose={handleExitFullscreen}
                  onMute={() => handleMuteTile(expandedSlot.slotIndex)}
                  isMuted={expandedSlot.isMuted}
                  volume={expandedSlot.volume}
                  onVolumeChange={(volume) => handleVolumeChange(expandedSlot.slotIndex, volume)}
                  isFullscreen={true}
                  onExitFullscreen={handleExitFullscreen}
                />
              </div>
            </div>
          );
        })()}

        {/* Normal Grid Mode */}
        {expandedTileId === null && (
          <>
            {/* Video Grid - Top (Full Width, Bigger) */}
            <div className={`${uiPanels.focusMode ? 'flex-1' : 'flex-shrink-0'} px-2 ${uiPanels.focusMode ? 'py-2 pb-2' : 'pt-8 pb-0'} overflow-hidden`}>
              <div className="max-w-full mx-auto w-full h-full flex items-center justify-center">
                {/* 12-Tile Grid - 4/4/4 layout in Focus Mode, 6/6 otherwise */}
                <div className={`grid ${uiPanels.focusMode ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'} ${uiPanels.focusMode ? 'gap-1.5 max-w-[90%]' : 'gap-2'} w-full ${uiPanels.focusMode ? 'h-auto' : 'h-full'}`}>
                {(gridSlots.length > 0 ? gridSlots : Array.from({ length: 12 }, (_, i) => ({
                  slotIndex: i + 1,
                  streamer: null,
                  isPinned: false,
                  isMuted: false,
                  isEmpty: true,
                  volume: 0.5,
                }))).map((slot) => (
                  <div
                    key={slot.slotIndex}
                    draggable={!slot.isEmpty && volumeSliderOpenSlot !== slot.slotIndex}
                    onDragStart={() => {
                      if (volumeSliderOpenSlot !== slot.slotIndex) {
                        handleDragStart(slot.slotIndex);
                      }
                    }}
                    onDragOver={(e) => {
                      if (volumeSliderOpenSlot !== slot.slotIndex) {
                        handleDragOver(e, slot.slotIndex);
                      }
                    }}
                    onDrop={(e) => {
                      if (volumeSliderOpenSlot !== slot.slotIndex) {
                        handleDrop(e, slot.slotIndex);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedSlot(null);
                      setHoveredSlot(null);
                    }}
                    className={`
                      transition-all duration-200
                      ${draggedSlot === slot.slotIndex ? 'opacity-50 scale-95' : ''}
                      ${hoveredSlot === slot.slotIndex ? 'ring-4 ring-blue-500' : ''}
                    `}
                  >
                      {slot.isEmpty || !slot.streamer ? (
                      <div 
                        className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition"
                        onClick={() => setSelectedSlotForReplacement(slot.slotIndex)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          setHoveredSlot(slot.slotIndex);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop(e, slot.slotIndex);
                        }}
                      >
                        <span className="text-gray-400 text-sm mb-2">Empty Slot</span>
                        <span className="text-gray-500 text-xs">Click to add streamer</span>
                      </div>
                    ) : slot.streamer ? (
                      <Tile
                        streamerId={slot.streamer.profile_id}
                        streamerUsername={slot.streamer.username}
                        streamerAvatar={slot.streamer.avatar_url}
                        isLive={slot.streamer.is_published}
                        isLiveAvailable={slot.streamer.live_available}
                        viewerCount={slot.streamer.viewer_count}
                        gifterLevel={slot.streamer.gifter_level}
                        badgeName={slot.streamer.badge_name}
                        badgeColor={slot.streamer.badge_color}
                        slotIndex={slot.slotIndex}
                        liveStreamId={slot.streamer.id && (slot.streamer.is_published || slot.streamer.live_available) ? (() => {
                          const idStr = slot.streamer.id.toString();
                          // Only parse if it's a real stream ID (numeric), not seed data (stream-X or seed-X)
                          if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) {
                            return undefined;
                          }
                          const parsed = parseInt(idStr);
                          return parsed > 0 ? parsed : undefined;
                        })() : undefined}
                        sharedRoom={sharedRoom}
                        isRoomConnected={isRoomConnected}
                        isCurrentUserPublishing={isCurrentUserPublishing}
                        onClose={() => handleCloseTile(slot.slotIndex)}
                        onMute={() => handleMuteTile(slot.slotIndex)}
                        isMuted={slot.isMuted}
                        volume={slot.volume}
                        onVolumeChange={(volume) => handleVolumeChange(slot.slotIndex, volume)}
                        onExpand={() => handleExpandTile(slot.slotIndex)}
                        onVolumeSliderToggle={(isOpen) => {
                          setVolumeSliderOpenSlot(isOpen ? slot.slotIndex : null);
                        }}
                        onReplace={() => setSelectedSlotForReplacement(slot.slotIndex)}
                      />
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Streamer Selection Modal */}
        <StreamerSelectionModal
          isOpen={selectedSlotForReplacement !== null}
          onClose={() => setSelectedSlotForReplacement(null)}
          onSelect={(streamerId) => {
            if (selectedSlotForReplacement !== null) {
              handleAddStreamer(selectedSlotForReplacement, streamerId);
              setSelectedSlotForReplacement(null);
            }
          }}
          currentUserId={currentUserId}
        />

            {/* Bottom Section - Leaderboard, Chat, Viewers + Stats side by side */}
            {!uiPanels.focusMode && (
              <div className="flex-1 flex flex-row min-h-0 overflow-hidden border-t border-gray-200 dark:border-gray-700">
                {/* Leaderboards - Left */}
                {uiPanels.leaderboardsOpen && (
                  <div className="hidden lg:flex lg:w-80 xl:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-3">Leaderboards</h3>
                      <Leaderboard />
                    </div>
                  </div>
                )}

                {/* Chat - Middle (fills remaining space) */}
                <div className={`flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${!uiPanels.chatOpen ? 'hidden' : ''}`}>
                  <Chat />
                </div>

                {/* Viewers + Stats - Right */}
                {(uiPanels.viewersOpen || uiPanels.rightStackOpen) && (
                  <div className="hidden lg:flex flex-shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex flex-row">
                    {/* Viewer List - Left side */}
                    {uiPanels.viewersOpen && (
                      <div className="w-64 xl:w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <ViewerList onDragStart={(viewer) => {
                          // Viewer drag started - can add visual feedback if needed
                        }} />
                      </div>
                    )}
                    
                    {/* Stats - Right side */}
                    {uiPanels.rightStackOpen && (
                      <div className="w-80 xl:w-96 flex-shrink-0 overflow-y-auto">
                        <div className="p-4 space-y-4">
                          {/* Top Supporters - At the top */}
                          <TopSupporters />
                          
                          {/* User Stats Section */}
                          <UserStatsSection />
                          
                          {/* Coin Purchase Section */}
                          <CoinPurchaseSection />
                          
                          {/* Diamond Conversion - At the bottom */}
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                            <DiamondConversion />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

