'use client';

import { ReactNode, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { Volume2, Focus, Shuffle, Eye, Gift as GiftIcon, Sparkles, FileText } from 'lucide-react';
import SmartBrandLogo from './SmartBrandLogo';
import { LIVEKIT_ROOM_NAME, DEBUG_LIVEKIT, TOKEN_ENDPOINT, canUserGoLive } from '@/lib/livekit-constants';
import type { RoomConfig, RoomUser } from '@/lib/room-config';
import { createLiveCentralConfig } from '@/lib/room-config';
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
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';
import MobileWebWatchLayout from './mobile/MobileWebWatchLayout';
import RoomBanner from './RoomBanner';
import { ShareModal } from './ShareModal';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Drawer from '@/components/owner/ui-kit/Drawer';

interface LiveStreamer {
  id: string;
  profile_id: string;
  username: string;
  avatar_url?: string;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  gifter_status?: GifterStatus | null;
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

type PanelShellProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

function PanelShell({ title, children, className = '', bodyClassName = '' }: PanelShellProps) {
  return (
    <div className={`flex flex-col min-h-0 overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}> 
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      </div>
      <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

function LiveRoomStatsStack() {
  return (
    <div className="p-4 space-y-4">
      <TopSupporters />
      <UserStatsSection />
      <CoinPurchaseSection />
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <DiamondConversion />
      </div>
    </div>
  );
}

interface LiveRoomProps {
  mode?: 'solo' | 'battle';
  layoutStyle?: 'tiktok-viewer' | 'twitch-viewer' | 'battle-cameras';
  /** Room configuration - if not provided, defaults to LiveCentral */
  roomConfig?: RoomConfig;
}

// Default config for LiveCentral (the original main room)
const DEFAULT_ROOM_CONFIG = createLiveCentralConfig(canUserGoLive);

// Screens narrower than this should switch grid tiles to compact tap-to-open controls
const COMPACT_GRID_BREAKPOINT = 1536;

export default function LiveRoom({ 
  mode = 'solo', 
  layoutStyle = 'twitch-viewer',
  roomConfig = DEFAULT_ROOM_CONFIG,
}: LiveRoomProps = {}) {
  const scopeRoomId = useMemo(
    () => roomConfig.contentRoomId || roomConfig.roomId || 'live-central',
    [roomConfig.contentRoomId, roomConfig.roomId]
  );
  const presenceRoomId = useMemo(() => {
    const raw = roomConfig.roomId || roomConfig.contentRoomId || 'live_central';
    // LiveCentral historically used both "live-central" and "live_central".
    // room_presence scoping/migrations use "live_central".
    if (raw === 'live-central') return 'live_central';
    return raw;
  }, [roomConfig.roomId, roomConfig.contentRoomId]);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(true); // Start as true to render immediately
  const [initError, setInitError] = useState<string | null>(null); // Track initialization errors
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
  const gridSlotsRef = useRef<GridSlot[]>(gridSlots);
  useEffect(() => {
    gridSlotsRef.current = gridSlots;
  }, [gridSlots]);
  const [liveStreamers, setLiveStreamers] = useState<LiveStreamer[]>([]);
  const liveStreamersRef = useRef<LiveStreamer[]>([]); // Track current streamers to prevent clearing
  
  // PHASE 4: Centralized LiveKit tracks map (eliminates per-tile listeners)
  // Map: streamerId -> { video?: RemoteTrack, audio?: RemoteTrack }
  const tracksMapRef = useRef<Map<string, { video?: any; audio?: any }>>(new Map());
  const [tracksByStreamerId, setTracksByStreamerId] = useState<Map<string, { video?: any; audio?: any }>>(new Map());
  const tracksCommitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Batched commit for track updates (50ms debounce)
  const scheduleTracksCommit = useCallback(() => {
    if (tracksCommitTimerRef.current) return;
    tracksCommitTimerRef.current = setTimeout(() => {
      setTracksByStreamerId(new Map(tracksMapRef.current));
      tracksCommitTimerRef.current = null;
    }, 50);
  }, []);
  
  // Sync ref with state changes
  useEffect(() => {
    liveStreamersRef.current = liveStreamers;
  }, [liveStreamers]);
  
  const [loading, setLoading] = useState(false); // Start as false to render immediately
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [expandedTileId, setExpandedTileId] = useState<number | null>(null);
  const [volumeSliderOpenSlot, setVolumeSliderOpenSlot] = useState<number | null>(null);
  const [selectedSlotForReplacement, setSelectedSlotForReplacement] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserPublishing, setIsCurrentUserPublishing] = useState(false); // Track if current user is publishing
  const [layoutVersion, setLayoutVersion] = useState<number>(0);

  const [canPublishForBanner, setCanPublishForBanner] = useState(false);
  useEffect(() => {
    let mounted = true;
    try {
      const result = roomConfig.permissions.canPublish(currentUserId ? { id: currentUserId } : null);
      if (result && typeof (result as any).then === 'function') {
        setCanPublishForBanner(false);
        void (result as Promise<boolean>)
          .then((value) => {
            if (mounted) setCanPublishForBanner(Boolean(value));
          })
          .catch(() => {
            if (mounted) setCanPublishForBanner(false);
          });
      } else {
        setCanPublishForBanner(Boolean(result));
      }
    } catch {
      setCanPublishForBanner(false);
    }

    return () => {
      mounted = false;
    };
  }, [currentUserId, roomConfig.permissions]);
  
  // Go Live button trigger - ref to programmatically click the hidden GoLiveButton
  const goLiveButtonRef = useRef<HTMLButtonElement | null>(null);
  const handleGoLiveClick = useCallback(() => {
    // Programmatically trigger the hidden GoLiveButton
    goLiveButtonRef.current?.click();
  }, []);
  const [pendingSlot1Insert, setPendingSlot1Insert] = useState<LiveStreamer | null>(null);
  const [pendingPublish, setPendingPublish] = useState<boolean>(false);
  const [publishAllowed, setPublishAllowed] = useState<boolean>(true);
  const [roomPresenceCountMinusSelf, setRoomPresenceCountMinusSelf] = useState<number>(0); // Room-demand: count of others in room
  const hasPresenceCountRpcRef = useRef<boolean | null>(null);
  const hasRoomPresenceRoomIdColumnRef = useRef<boolean | null>(null);
  const roomPresenceTableAvailableRef = useRef<boolean | null>(null);
  const closedStreamersRef = useRef<Set<string>>(new Set()); // Streamers closed by viewer (do not auto-refill)
  
  // BANDWIDTH SAVING: Router for redirecting when user leaves/returns
  const router = useRouter();
  const wasHiddenRef = useRef(false); // Track if page was hidden
  const disconnectedDueToVisibilityRef = useRef(false); // Track if we disconnected due to visibility
  
  // Live Grid Sort Mode
  type LiveSortMode = 'random' | 'most_viewed' | 'most_gifted' | 'newest' | 'trending';
  const [sortMode, setSortMode] = useState<LiveSortMode>('trending');
  const [randomSeed] = useState<number>(() => Math.floor(Date.now() / 1000)); // Stable seed per page load
  
  // UI Panel state management
  const [uiPanels, setUiPanels] = useState<UiPanels>({
    focusMode: false,
    chatOpen: true,
    leaderboardsOpen: true,
    viewersOpen: true,
    rightStackOpen: true,
  });
  const [panelMode, setPanelMode] = useState<'inline' | 'drawer'>('inline');
  const [drawerOpen, setDrawerOpen] = useState<'leaderboard' | 'viewers' | 'stats' | null>(null);
  useEffect(() => {
    const updatePanelMode = () => {
      const isDrawer = window.innerWidth < 1280; // below xl switch to drawer overlay
      setPanelMode(isDrawer ? 'drawer' : 'inline');
      if (!isDrawer) setDrawerOpen(null);
    };
    updatePanelMode();
    window.addEventListener('resize', updatePanelMode);
    return () => window.removeEventListener('resize', updatePanelMode);
  }, []);
  const [bannerCollapsed, setBannerCollapsed] = useState(true); // Room banner starts collapsed
  const [headerCollapsed, setHeaderCollapsed] = useState(true); // Main header starts collapsed

  // MOBILE WEB: Detect mobile web browser and orientation
  const isMobileWeb = useIsMobileWeb();
  const [isCompactDesktop, setIsCompactDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < COMPACT_GRID_BREAKPOINT;
  });
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') {
        return;
      }
      setIsCompactDesktop(window.innerWidth < COMPACT_GRID_BREAKPOINT);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // CRITICAL: Memoize Supabase client to prevent recreation on every render
  // This prevents effects from re-running and causing LiveKit disconnect/reconnect loops
  const supabase = useMemo(() => createClient(), []);
  const enableLiveGridRpc = process.env.NEXT_PUBLIC_ENABLE_LIVE_GRID_RPC === 'true';

  // Check if auth is disabled for testing
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Shared LiveKit room connection - connect once, stay connected
  const [sharedRoom, setSharedRoom] = useState<Room | null>(null);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const roomConnectionRef = useRef<{ connecting: boolean; connected: boolean }>({ connecting: false, connected: false });
  const roomRef = useRef<Room | null>(null);
  
  // PHASE 4: Manually sync local participant tracks (called after publishing)
  const syncLocalTracks = useCallback(() => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    
    const extractUserId = (identity: string) => {
      const parts = identity.split(':');
      return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
    };
    
    const userId = extractUserId(room.localParticipant.identity);
    if (!userId) return;
    
    const localTracks: { video?: any; audio?: any } = {};
    const { Track } = require('livekit-client');
    
    room.localParticipant.trackPublications.forEach((publication) => {
      if (publication.track) {
        if (publication.track.kind === Track.Kind.Video) {
          localTracks.video = publication.track;
        } else if (publication.track.kind === Track.Kind.Audio) {
          localTracks.audio = publication.track;
        }
      }
    });
    
    if (localTracks.video || localTracks.audio) {
      tracksMapRef.current.set(userId, localTracks);
      scheduleTracksCommit();
      setIsCurrentUserPublishing(true);
    }
  }, [scheduleTracksCommit]);
  
  // Periodically check for local tracks (fallback if events don't fire)
  useEffect(() => {
    if (!isRoomConnected) return;
    
    const interval = setInterval(() => {
      syncLocalTracks();
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [isRoomConnected, syncLocalTracks]);
  
  // Expose room to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).sharedRoom = sharedRoom;
      (window as any).debugLiveRoom = {
        room: sharedRoom,
        isRoomConnected,
        currentUserId,
        isCurrentUserPublishing,
        gridSlots,
        liveStreamers,
      };
    }
  }, [sharedRoom, isRoomConnected, currentUserId, isCurrentUserPublishing, gridSlots, liveStreamers]);
  // CRITICAL: Track room instance ID for debugging - prove only ONE instance exists
  const roomInstanceIdRef = useRef<number>(0);
  // Store handlers in ref so cleanup can access them
  const handlersRef = useRef<{
    handleConnected: () => void;
    handleDisconnected: () => void;
    handleParticipantConnected: (participant: any) => void;
    handleParticipantDisconnected: (participant: any) => void;
    handleTrackSubscribed: (track: any, publication: any, participant: any) => void;
    handleTrackUnsubscribed: (track: any, publication: any, participant: any) => void;
  } | null>(null);

  // Connect to shared LiveKit room ONCE on mount
  useEffect(() => {
    let isEffectActive = true;
    
    const connectSharedRoom = async () => {
      // CRITICAL: Enforce "connect once" guard - prevent double-connect from:
      // - React Strict Mode double-invoking effects in dev
      // - Fast refresh / component remount
      // - Route transitions
      if (roomConnectionRef.current.connecting || roomConnectionRef.current.connected) {
        return;
      }

      try {
        // Set connecting flag IMMEDIATELY to prevent race conditions
        roomConnectionRef.current.connecting = true;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user && !authDisabled) {
          roomConnectionRef.current.connecting = false; // Reset flag on early return
          return;
        }

        // Get token for viewer connection
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (!accessToken && !authDisabled) {
          roomConnectionRef.current.connecting = false; // Reset flag on early return
          return;
        }

        // UNIQUE PARTICIPANT IDENTITY - Device-scoped
        let deviceId = '';
        let anonId = '';
        
        if (typeof window !== 'undefined') {
          // Get or create device ID (stable per browser/install)
          deviceId = localStorage.getItem('mylivelinks_device_id') || '';
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('mylivelinks_device_id', deviceId);
          }
          
          // Get or create anonymous ID for non-authenticated users
          anonId = localStorage.getItem('mylivelinks_anon_id') || '';
          if (!anonId) {
            anonId = `anon-${crypto.randomUUID()}`;
            localStorage.setItem('mylivelinks_anon_id', anonId);
          }
        }
        
        // Generate session ID (unique per connection)
        const sessionId = crypto.randomUUID();
        
        const userId = user?.id || anonId || 'anonymous';
        const participantIdentity = user?.id || anonId || 'anonymous';
        const participantDisplayName = user?.email || user?.id || anonId || 'Viewer';
        const deviceType = 'web';

        // Use room config for permission check
        const roomUser: RoomUser | null = user ? { id: user.id, email: user.email } : null;
        const publishEligible = await Promise.resolve(roomConfig.permissions.canPublish(roomUser));

        const response = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            roomName: roomConfig.roomId,
            participantName: participantIdentity,
            canPublish: publishEligible,
            canSubscribe: true,
            userId: userId,
            displayName: participantDisplayName,
            // Device-scoped identity fields
            deviceType: deviceType,
            deviceId: deviceId,
            sessionId: sessionId,
            role: publishEligible ? 'publisher' : 'viewer',
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
        
        // CRITICAL: Track room instance creation - prove only ONE instance
        roomInstanceIdRef.current += 1;
        const currentInstanceId = roomInstanceIdRef.current;
        
        const newRoom = new LiveKitRoom({
          adaptiveStream: true,
          dynacast: true,
        });

        // Set up event handlers BEFORE connecting
        
        const handleConnected = () => {
          if (isEffectActive) {
            setIsRoomConnected(true);
            roomConnectionRef.current.connected = true;
            roomConnectionRef.current.connecting = false;
          }
        };

        const handleDisconnected = () => {
          if (isEffectActive) {
            setIsRoomConnected(false);
            // CRITICAL: Reset connection flags on disconnect to allow reconnection if needed
            roomConnectionRef.current.connected = false;
            roomConnectionRef.current.connecting = false;
          }
        };

        const handleParticipantConnected = (participant: any) => {
          
          // CRITICAL: When a new participant connects and starts publishing, 
          // trigger auto-fill to add them to empty slots immediately
          if (!participant.isLocal && participant.trackPublications.size > 0) {
            // Reload streamers list from DB (to get profile info) then auto-fill
            setTimeout(() => {
              loadLiveStreamers().then(() => {
                // Auto-fill will run via the effect when liveStreamers updates
              });
            }, 1000); // Small delay to ensure DB is updated
          }
        };

        const handleParticipantDisconnected = (participant: any) => {
          // PHASE 4: Clean up tracks for disconnected participant
          const extractUserId = (identity: string) => {
            const parts = identity.split(':');
            return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
          };
          const streamerId = extractUserId(participant.identity);
          if (streamerId && tracksMapRef.current.has(streamerId)) {
            tracksMapRef.current.delete(streamerId);
            scheduleTracksCommit();
          }
        };

        const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
          // PHASE 4: Centralized track management - update tracksMapRef
          const extractUserId = (identity: string) => {
            const parts = identity.split(':');
            return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
          };
          const streamerId = extractUserId(participant.identity);
          if (!streamerId) return;
          
          const existing = tracksMapRef.current.get(streamerId) || {};
          const { Track } = require('livekit-client');
          
          if (track.kind === Track.Kind.Video) {
            tracksMapRef.current.set(streamerId, { ...existing, video: track });
          } else if (track.kind === Track.Kind.Audio) {
            tracksMapRef.current.set(streamerId, { ...existing, audio: track });
          }
          
          scheduleTracksCommit();
        };

        const handleTrackUnsubscribed = (track: any, publication: any, participant: any) => {
          // PHASE 4: Remove track from map
          const extractUserId = (identity: string) => {
            const parts = identity.split(':');
            return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
          };
          const streamerId = extractUserId(participant.identity);
          if (!streamerId) return;
          
          const existing = tracksMapRef.current.get(streamerId);
          if (!existing) return;
          
          const { Track } = require('livekit-client');
          if (track.kind === Track.Kind.Video) {
            const updated = { ...existing };
            delete updated.video;
            if (updated.audio) {
              tracksMapRef.current.set(streamerId, updated);
            } else {
              tracksMapRef.current.delete(streamerId);
            }
          } else if (track.kind === Track.Kind.Audio) {
            const updated = { ...existing };
            delete updated.audio;
            if (updated.video) {
              tracksMapRef.current.set(streamerId, updated);
            } else {
              tracksMapRef.current.delete(streamerId);
            }
          }
          
          scheduleTracksCommit();
        };
        
        const handleTrackPublished = (publication: any, participant: any) => {
          // PHASE 4: Add published track to tracks map
          const extractUserId = (identity: string) => {
            const parts = identity.split(':');
            return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
          };
          const streamerId = extractUserId(participant.identity);
          if (!streamerId) return;
          
          const existing = tracksMapRef.current.get(streamerId) || {};
          const { Track } = require('livekit-client');
          
          if (publication.track) {
            if (publication.track.kind === Track.Kind.Video) {
              tracksMapRef.current.set(streamerId, { ...existing, video: publication.track });
            } else if (publication.track.kind === Track.Kind.Audio) {
              tracksMapRef.current.set(streamerId, { ...existing, audio: publication.track });
            }
            scheduleTracksCommit();
          }
          
          // CRITICAL: If local participant publishes video, set isCurrentUserPublishing
          if (participant.isLocal && publication.track?.kind === Track.Kind.Video) {
            setIsCurrentUserPublishing(true);
            
            // Immediately add current user to grid using their participant data
            const extractUserId = (identity: string) => {
              const parts = identity.split(':');
              return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
            };
            const userId = extractUserId(participant.identity);
            
            if (userId) {
              // Fetch user's profile and add to liveStreamers
              supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                  supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .eq('id', userId)
                    .single()
                    .then(({ data: profile }) => {
                      if (profile) {
                        const userStreamer: LiveStreamer = {
                          id: `local-${userId}`,
                          profile_id: profile.id,
                          username: profile.username,
                          avatar_url: profile.avatar_url,
                          live_available: true,
                          viewer_count: 0,
                          gifter_level: 0,
                          gifter_status: null,
                        };
                        
                        // Add to liveStreamers if not already there
                        setLiveStreamers(prev => {
                          const exists = prev.some(s => s.profile_id === userId);
                          if (exists) return prev;
                          return [userStreamer, ...prev];
                        });
                        
                        // Also trigger adding to slot 1
                        setTimeout(() => {
                          const currentSlots = gridSlotsRef.current;
                          const slot1 = currentSlots.find(s => s.slotIndex === 1);
                          const userInSlot1 = slot1?.streamer?.profile_id === userId;
                          
                          if (!userInSlot1) {
                            const newSlots = [...currentSlots];
                            const slot1Index = newSlots.findIndex(s => s.slotIndex === 1);
                            if (slot1Index !== -1) {
                              newSlots[slot1Index] = {
                                ...newSlots[slot1Index],
                                streamer: userStreamer,
                                isEmpty: false,
                              };
                              setGridSlots(newSlots);
                            }
                          }
                        }, 100);
                      }
                    });
                }
              });
            }
          }
          
          // CRITICAL: When someone publishes a track, trigger auto-fill to add them to empty slots
          // This ensures new streamers appear immediately without waiting for DB polling
          if (!participant.isLocal) {
            setTimeout(() => {
              loadLiveStreamers().then(() => {
              });
            }, 1000);
          }
        };

        // Store handlers in ref so cleanup can access them
        handlersRef.current = {
          handleConnected,
          handleDisconnected,
          handleParticipantConnected,
          handleParticipantDisconnected,
          handleTrackSubscribed,
          handleTrackUnsubscribed,
          handleTrackPublished,
        } as any;

        newRoom.on(RoomEvent.Connected, handleConnected);
        newRoom.on(RoomEvent.Disconnected, handleDisconnected);
        newRoom.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
        newRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        newRoom.on(RoomEvent.TrackPublished, handleTrackPublished);
        newRoom.on(RoomEvent.LocalTrackPublished, handleTrackPublished); // Also listen for local track publications
        
        // Store room ref AFTER adding listeners
        roomRef.current = newRoom;

        // Connect to room
        if (DEBUG_LIVEKIT) {
          const tokenHashShort = token ? token.substring(0, 8) + '...' : 'none';
          
        }
        await newRoom.connect(url, token);
        
        // Wait a moment to ensure connection is fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (isEffectActive) {
          // Verify connection before setting state
          if (newRoom.state === 'connected') {
            // PHASE 4: Bootstrap tracks map with existing participants (one-time sync)
            const extractUserId = (identity: string) => {
              const parts = identity.split(':');
              return parts[0]?.startsWith('u_') ? parts[0].substring(2) : parts[0];
            };
            const { Track } = await import('livekit-client');
            
            // Add local participant tracks (for self-view)
            if (newRoom.localParticipant) {
              const localStreamerId = extractUserId(newRoom.localParticipant.identity);
              if (localStreamerId) {
                const localTracks: { video?: any; audio?: any } = {};
                newRoom.localParticipant.trackPublications.forEach((publication) => {
                  if (publication.track) {
                    if (publication.track.kind === Track.Kind.Video) {
                      localTracks.video = publication.track;
                    } else if (publication.track.kind === Track.Kind.Audio) {
                      localTracks.audio = publication.track;
                    }
                  }
                });
                if (localTracks.video || localTracks.audio) {
                  tracksMapRef.current.set(localStreamerId, localTracks);
                }
              }
            }
            
            // Add remote participants
            newRoom.remoteParticipants.forEach((participant) => {
              const streamerId = extractUserId(participant.identity);
              if (!streamerId) return;
              
              const tracks: { video?: any; audio?: any } = {};
              participant.trackPublications.forEach((publication) => {
                if (publication.track) {
                  if (publication.track.kind === Track.Kind.Video) {
                    tracks.video = publication.track;
                  } else if (publication.track.kind === Track.Kind.Audio) {
                    tracks.audio = publication.track;
                  }
                }
              });
              
              if (tracks.video || tracks.audio) {
                tracksMapRef.current.set(streamerId, tracks);
              }
            });
            
            // Commit bootstrap tracks
            scheduleTracksCommit();
            
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
        // CRITICAL: Always reset connecting flag on error to allow retry
        roomConnectionRef.current.connecting = false;
        roomConnectionRef.current.connected = false;
        if (isEffectActive) {
          setIsRoomConnected(false);
        }
      }
    };

    connectSharedRoom();

    return () => {
      isEffectActive = false;
      if (roomRef.current && handlersRef.current) {
        // CRITICAL: Remove ALL event listeners before disconnecting to prevent memory leaks
        const handlers = handlersRef.current;
        roomRef.current.off(RoomEvent.Connected, handlers.handleConnected);
        roomRef.current.off(RoomEvent.Disconnected, handlers.handleDisconnected);
        roomRef.current.off(RoomEvent.ParticipantConnected, handlers.handleParticipantConnected);
        roomRef.current.off(RoomEvent.ParticipantDisconnected, handlers.handleParticipantDisconnected);
        roomRef.current.off(RoomEvent.TrackSubscribed, handlers.handleTrackSubscribed);
        roomRef.current.off(RoomEvent.TrackUnsubscribed, handlers.handleTrackUnsubscribed);
        if ((handlers as any).handleTrackPublished) {
          roomRef.current.off(RoomEvent.TrackPublished, (handlers as any).handleTrackPublished);
          roomRef.current.off(RoomEvent.LocalTrackPublished, (handlers as any).handleTrackPublished);
        }
        handlersRef.current = null;
        roomRef.current.disconnect().catch(() => {});
        roomRef.current = null;
        setSharedRoom(null);
        setIsRoomConnected(false);
      }
      // CRITICAL: Always reset connection flags on cleanup to prevent stale state
      roomConnectionRef.current = { connecting: false, connected: false };
    };
  }, [supabase, authDisabled]);

  // =============================================================================
  // BANDWIDTH SAVING: Visibility Change Detection
  // When user minimizes, switches tabs, or navigates away - disconnect to save bandwidth
  // When they return, redirect to home (connections are stale anyway)
  // =============================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      const isHidden = document.hidden;
      if (isHidden) {
        // Page is now hidden (tab switch, minimize, app switch on mobile)
        wasHiddenRef.current = true;
        
        // If user is streaming, stop their stream to save bandwidth
        if (isCurrentUserPublishing && currentUserId) {
          try {
            // Update database to end live stream
            await supabase
              .from('live_streams')
              .update({ live_available: false, ended_at: new Date().toISOString() })
              .eq('profile_id', currentUserId);
            
            // Remove from grid slots
            await supabase
              .from('user_grid_slots')
              .delete()
              .eq('streamer_id', currentUserId);
          } catch (err) {
          }
        }
        
        // Disconnect from LiveKit room to save bandwidth
        if (roomRef.current && roomConnectionRef.current.connected) {
          try {
            if (handlersRef.current) {
              const handlers = handlersRef.current;
              roomRef.current.off(RoomEvent.Connected, handlers.handleConnected);
              roomRef.current.off(RoomEvent.Disconnected, handlers.handleDisconnected);
              roomRef.current.off(RoomEvent.ParticipantConnected, handlers.handleParticipantConnected);
              roomRef.current.off(RoomEvent.ParticipantDisconnected, handlers.handleParticipantDisconnected);
              roomRef.current.off(RoomEvent.TrackSubscribed, handlers.handleTrackSubscribed);
              roomRef.current.off(RoomEvent.TrackUnsubscribed, handlers.handleTrackUnsubscribed);
            }
            await roomRef.current.disconnect();
            disconnectedDueToVisibilityRef.current = true;
          } catch (err) {
          }
          roomRef.current = null;
          roomConnectionRef.current = { connecting: false, connected: false };
          setSharedRoom(null);
          setIsRoomConnected(false);
          setIsCurrentUserPublishing(false);
        }
      } else {
        // Page is now visible again
        if (wasHiddenRef.current && disconnectedDueToVisibilityRef.current) {
          // User returned after being away - redirect to home for fresh start
          wasHiddenRef.current = false;
          disconnectedDueToVisibilityRef.current = false;
          
          // Show a brief notification and redirect
          router.push('/');
        }
      }
    };
    
    // Handle page unload (closing tab, navigating away completely)
    const handleBeforeUnload = async () => {
      // If user is streaming, try to stop their stream
      if (isCurrentUserPublishing && currentUserId) {
        // Use sendBeacon for reliable delivery during page unload
        const payload = JSON.stringify({
          profile_id: currentUserId,
          action: 'end_stream'
        });
        
        // Try to update via beacon (may not always work but best effort)
        navigator.sendBeacon('/api/stream-cleanup', payload);
      }
      
      // Disconnect room synchronously if possible
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (err) {
          // Ignore errors during unload
        }
      }
    };
    
    // Handle page hide (more reliable than beforeunload on mobile)
    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        // Page is being unloaded (not just cached for back-forward)
        handleBeforeUnload();
      }
    };
    
    // Handle window blur (switching to another window)
    const handleWindowBlur = () => {
      // Only disconnect if page is also hidden (not just focus lost to another window)
      // This prevents disconnecting when clicking on browser UI or popups
      setTimeout(() => {
        if (document.hidden) {
          handleVisibilityChange();
        }
      }, 100);
    };
    
    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [supabase, currentUserId, isCurrentUserPublishing, isRoomConnected, router]);

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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // Get username for room presence - use maybeSingle() to avoid error
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();
          const fallbackUsername = user.id.slice(0, 8);
          setCurrentUsername((profile?.username as string | null | undefined) || fallbackUsername);
        } else {
          setCurrentUserId(null);
          setCurrentUsername(null);
        }
        setInitError(null); // Clear any previous errors
      } catch (error) {
        setInitError(error instanceof Error ? error.message : 'Failed to load user data');
        // Set to null to allow viewing as anonymous
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
    roomId: presenceRoomId,
    enabled: !authDisabled && !!currentUserId && !!currentUsername,
  });

  // ROOM-DEMAND: Track room presence count (excluding self) for publisher enable logic
  useEffect(() => {
    if (!currentUserId || authDisabled || !presenceRoomId) {
      setRoomPresenceCountMinusSelf(0);
      return;
    }
    const missingTableError = (error: any) => {
      if (!error) return false;
      const code = error.code;
      const message = String(error.message || '');
      return code === '42P01' || message.includes('room_presence');
    };

    const loadRoomPresenceCount = async () => {
      if (roomPresenceTableAvailableRef.current === false) {
        setRoomPresenceCountMinusSelf(0);
        return;
      }

      try {
        let count: number | null = null;

        // Prefer RPC if it exists
        if (hasPresenceCountRpcRef.current !== false) {
          const rpcResult = await supabase.rpc('get_room_presence_count_minus_self', {
            p_room_id: presenceRoomId,
          });
          if (!rpcResult.error) {
            count = (rpcResult.data || 0) as number;
            hasPresenceCountRpcRef.current = true;
          } else {
            if (rpcResult.error?.code === 'PGRST202' || missingTableError(rpcResult.error)) {
              hasPresenceCountRpcRef.current = false;
              if (missingTableError(rpcResult.error)) {
                roomPresenceTableAvailableRef.current = false;
                setRoomPresenceCountMinusSelf(0);
                return;
              }
            } else {
              console.error('Error loading room presence count (rpc):', rpcResult.error);
            }
          }
        }

        // Fallback to direct query
        if (count == null) {
          const baseQuery = () =>
            supabase
              .from('room_presence')
              .select('profile_id', { count: 'exact', head: true })
              .gt('last_seen_at', new Date(Date.now() - 60000).toISOString())
              .neq('profile_id', currentUserId);

          const tryScopedQuery = async () => {
            const query = baseQuery();
            if (hasRoomPresenceRoomIdColumnRef.current !== false) {
              const scoped = await query.eq('room_id', presenceRoomId);
              if (!scoped.error) {
                hasRoomPresenceRoomIdColumnRef.current = true;
                return scoped.count || 0;
              }
              const scopedError = scoped.error;
              if (scopedError?.code === '42703' || String(scopedError?.message || '').includes('room_id')) {
                hasRoomPresenceRoomIdColumnRef.current = false;
              } else if (missingTableError(scopedError)) {
                roomPresenceTableAvailableRef.current = false;
                setRoomPresenceCountMinusSelf(0);
                return null;
              } else {
                console.error('Error loading room presence count (scoped):', scopedError);
              }
            }

            const unscoped = await baseQuery();
            if (unscoped.error) {
              if (missingTableError(unscoped.error)) {
                roomPresenceTableAvailableRef.current = false;
                setRoomPresenceCountMinusSelf(0);
                return null;
              }
              console.error('Error loading room presence count (unscoped):', unscoped.error);
              return null;
            }
            return unscoped.count || 0;
          };

          const scopedCount = await tryScopedQuery();
          if (scopedCount == null) {
            return;
          }
          count = scopedCount;
          roomPresenceTableAvailableRef.current = true;
        }

        setRoomPresenceCountMinusSelf(count || 0);
        if (DEBUG_LIVEKIT) {
          
        }
      } catch (err) {
      }
    };

    let cancelled = false;
    let roomPresenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const initPresenceTracking = async () => {
      await loadRoomPresenceCount();
      if (cancelled || roomPresenceTableAvailableRef.current === false) {
        return;
      }

      roomPresenceChannel = supabase
        .channel(`room-presence-count-updates-${presenceRoomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_presence',
          },
          async () => {
            setTimeout(async () => {
              await loadRoomPresenceCount();
            }, 500);
          }
        )
        .subscribe();

      pollInterval = setInterval(() => {
        if (roomPresenceTableAvailableRef.current === false) return;
        loadRoomPresenceCount();
      }, 5000);
    };

    initPresenceTracking();

    return () => {
      cancelled = true;
      if (roomPresenceChannel) {
        supabase.removeChannel(roomPresenceChannel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [currentUserId, authDisabled, supabase, presenceRoomId]);

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

  const toggleFocusMode = useCallback(() => {
    setUiPanels((prev) => {
      const next = !prev.focusMode;
      // Exit fullscreen when disabling focus mode (return to normal chat mode)
      if (!next) {
        setExpandedTileId(null);
      }
      return { ...prev, focusMode: next };
    });
  }, []);

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

  useEffect(() => {
    if (!currentUserId || authDisabled) return;
    
    // Debounce to prevent rapid queries causing 406 errors
    let timeoutId: NodeJS.Timeout | null = null;
    
    const ensureUserInSlot1 = async () => {
      try {
        const { data: userLiveStreams, error: queryError } = await supabase
          .from('live_streams')
          .select('id, live_available')
          .eq('profile_id', currentUserId)
          .eq('live_available', true)
          .eq('streaming_mode', 'group') // Only check group mode streams
          .limit(1);

        const userLiveStream = userLiveStreams?.[0] ?? null;
        
        // If query fails with 406, skip silently (RLS or query issue)
        if (queryError) {
          if (queryError.code === 'PGRST116' || queryError.message?.includes('406')) {
            // No row found or RLS issue - skip silently
            return;
          }
          throw queryError;
        }
        
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
                .select('username, avatar_url')
                .eq('id', currentUserId)
                .single();
              if (userProfile) {
                const ownStatusMap = await fetchGifterStatuses([currentUserId]);
                const ownStatus = ownStatusMap[currentUserId] || null;
                
                const ownStream: LiveStreamer = {
                  id: userLiveStream.id.toString(),
                  profile_id: currentUserId,
                  username: userProfile.username,
                  avatar_url: userProfile.avatar_url,
                  live_available: userLiveStream.live_available,
                  viewer_count: 0,
                  gifter_level: 0,
                  gifter_status: ownStatus,
                };
                addUserToSlot1(ownStream);
              }
            }
          } else {
          }
        }
      } catch (error) {
        // Silently ignore 406 errors (RLS or query issues)
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'PGRST116') {
        }
      }
    };
    
    // Debounce: only run after 500ms of no changes
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      ensureUserInSlot1();
    }, 500);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
    let lastLoadTime = 0;
    const MIN_LOAD_INTERVAL = 3000; // Minimum 3 seconds between loads
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
            const now = Date.now();
            // CRITICAL: Prevent rapid calls - only load if enough time has passed
            if (now - lastLoadTime < MIN_LOAD_INTERVAL) {
              return;
            }
            lastLoadTime = now;
            // Only update streamer list, don't reload grid layout
            // Grid layout reload causes disconnections
            loadLiveStreamers().then((streamers) => {
              // CRITICAL: Always run grid cleanup FIRST, regardless of streamer count
              // This ensures offline streamers are removed from tiles even if all streamers go offline
              const liveStreamerIds = new Set(streamers.map(s => s.profile_id));
              setGridSlots(prevSlots => {
                let hasChanges = false;
                const updatedSlots = prevSlots.map(slot => {
                  if (slot.streamer && !liveStreamerIds.has(slot.streamer.profile_id)) {
                    // Streamer is in grid but no longer live - remove them
                    hasChanges = true;
                    return {
                      ...slot,
                      streamer: null,
                      isEmpty: true,
                    };
                  }
                  return slot;
                });
                
                if (hasChanges) {
                  // Save the updated grid
                  saveGridLayout(updatedSlots);
                  return updatedSlots;
                }
                return prevSlots;
              });
              
              // Update streamer list
              // Use functional update to compare and prevent unnecessary re-renders
              setLiveStreamers((prevStreamers) => {
                const currentStreamers = liveStreamersRef.current.length > 0 ? liveStreamersRef.current : prevStreamers;
                
                // Compare to see if anything changed
                if (currentStreamers.length === streamers.length && streamers.length > 0) {
                  const prevIds = currentStreamers.map(s => `${s.profile_id}:${s.live_available}:${s.viewer_count}`).join(',');
                  const newIds = streamers.map(s => `${s.profile_id}:${s.live_available}:${s.viewer_count}`).join(',');
                  if (prevIds === newIds) {
                    return currentStreamers; // No change, prevent re-render
                  }
                }
                
                // Update ref with new data BEFORE returning
                liveStreamersRef.current = streamers;
                if (DEBUG_LIVEKIT) {
                  
                }
                
                return streamers; // Changed, update - this triggers useEffect that calls autoFillGrid
              });
              // Auto-fill is now triggered by useEffect when liveStreamers changes
            });
          }, 2000); // 2 second debounce
        }
      )
      .subscribe();

    // ROOM-DEMAND: Disabled tile-demand path (update_publish_state_from_viewers)
    // active_viewers changes no longer control publishing - room presence does
    // Keep active_viewers subscription for analytics/viewer counts only
    let fullReloadTimeout: NodeJS.Timeout | null = null;
    let lastFullReload = 0;
    const MIN_RELOAD_INTERVAL = 5000; // Max once every 5 seconds
    
    // NOTE: active_viewers changes should NOT reload grid or affect publishing/subscribing
    // We only keep viewer counts via explicit calls (updateViewerCountsOnly) when needed

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortMode, mounted]); // Reload when sort mode or mount state changes

  // Update viewer counts only (without full reload) to prevent re-subscription loops
  const updateViewerCountsOnly = async () => {
    try {
      // Safety check: ensure liveStreamers is an array
      if (!liveStreamers || !Array.isArray(liveStreamers) || liveStreamers.length === 0) {
        return;
      }
      
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
      
      // Only update if viewer counts actually changed
      setLiveStreamers((prevStreamers) => {
        if (prevStreamers.length === updatedStreamers.length) {
          const prevCounts = prevStreamers.map(s => `${s.profile_id}:${s.viewer_count}`).join(',');
          const newCounts = updatedStreamers.map(s => `${s.profile_id}:${s.viewer_count}`).join(',');
          if (prevCounts === newCounts) {
            return prevStreamers; // No change, prevent re-render
          }
        }
        return updatedStreamers; // Changed, update
      });
    } catch (error) {
    }
  };

  const loadLiveStreamers = async () => {
    try {
      let user = null;
      if (!authDisabled) {
        const result = await supabase.auth.getUser();
        user = result.data?.user || null;
      }
      
      // CRITICAL: Get viewer ID safely - handle authDisabled mode
      const viewerId = authDisabled ? null : user?.id;
      
      // If auth disabled, still load streamers (just without user filtering)
      if (!authDisabled && !user) {
        setLoading(false);
        // CRITICAL: Don't return empty array if we have existing streamers - might be temporary auth issue
        const existingStreamers = liveStreamersRef.current.length > 0 ? liveStreamersRef.current : [];
        if (existingStreamers.length > 0) {
          return existingStreamers;
        }
        return []; // Only return empty if truly no streamers
      }

      // Use new RPC function with sort mode
      let data: any[] = [];
      let error: any = null;

      // CRITICAL: Only call RPCs that require viewer_id if we have one
      // If authDisabled, skip RPCs and go directly to fallback query
      if (enableLiveGridRpc && !authDisabled && viewerId) {
        // Tonight launch mode: avoid get_live_grid (returns 400 in current DB).
        // Use filtered RPC if present, otherwise fall back to direct query.
        const fallbackResult = await supabase.rpc('get_available_streamers_filtered', {
          p_viewer_id: viewerId,
        });
        if (fallbackResult.error) {
          error = fallbackResult.error;
        } else if (fallbackResult.data) {
          data = fallbackResult.data;
        }
      }
      
      // CRITICAL: If authDisabled or RPCs failed, use direct query fallback
      if (authDisabled || error || data.length === 0) {
        // Final fallback: direct query from live_streams (filter by group mode)
        const directResult = await supabase
          .from('live_streams')
          .select('id, profile_id, live_available')
          .eq('live_available', true)
          .eq('streaming_mode', 'group') // Only group live streams
          .order('id', { ascending: false }) // Order by id DESC (newest first) since published_at not selected
          .limit(50);
        
        if (directResult.error) {
          return []; // Return empty array instead of throwing
        }
        
        // Convert to expected format
        const profileIds = directResult.data?.map((s: any) => s.profile_id) || [];
        if (profileIds.length === 0) {
          return [];
        }
        
        // Load profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, gifter_level')
            .in('id', profileIds);
          
          if (!profiles) {
            return [];
          }
          
          // Get viewer counts
          const streamersWithCounts = await Promise.all(
            directResult.data.map(async (stream: any) => {
              const profile = profiles.find((p: any) => p.id === stream.profile_id);
              if (!profile) return null;
              
              const { count } = await supabase
                .from('active_viewers')
                .select('*', { count: 'exact', head: true })
                .eq('live_stream_id', stream.id)
                .eq('is_active', true)
                .eq('is_unmuted', true)
                .eq('is_visible', true)
                .eq('is_subscribed', true)
                .gt('last_active_at', new Date(Date.now() - 60000).toISOString());
              
              return {
                streamer_id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                live_stream_id: stream.id,
                viewer_count: count || 0,
              };
            })
          );
          
        data = streamersWithCounts.filter((s: any) => s !== null) as any[];
        error = null; // Clear error since fallback succeeded
      }

      // Process streamers from RPC (new structure)
      const streamerData = data || [];

      // Batch load gifter levels for badges
      const profileIds = [...new Set(streamerData.map((s: any) => s.streamer_id).filter((id: any) => id != null))];
      const statusMap = await fetchGifterStatuses(profileIds);

      // Map streamers with badge info
      let streamersWithBadges = streamerData.map((stream: any) => {
        const status = statusMap[stream.streamer_id] || null;

        return {
          id: stream.live_stream_id?.toString() || stream.streamer_id,
          profile_id: stream.streamer_id,
          username: stream.username,
          avatar_url: stream.avatar_url,
          live_available: true, // RPC only returns live_available = true
          viewer_count: stream.viewer_count || 0,
          gifter_level: 0,
          gifter_status: status,
        } as LiveStreamer;
      });

      // Also fetch streamers who are live_available but not yet published (waiting for viewers)
      // This ensures all "waiting" cameras are available to new viewers
      // FILTER: Only fetch group mode streams
      if (user) {
        const { data: waitingStreams } = await supabase
          .from('live_streams')
          .select('id, profile_id, live_available')
          .eq('live_available', true)
          .eq('streaming_mode', 'group'); // Only group live streams

        if (waitingStreams && waitingStreams.length > 0) {
          const waitingProfileIds = waitingStreams.map((s: any) => s.profile_id);
          const { data: waitingProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', waitingProfileIds);

          if (waitingProfiles) {
            const waitingStatusMap = await fetchGifterStatuses(waitingProfiles.map((p: any) => p.id));

            // Add waiting streamers to the list (if not already present)
            for (const stream of waitingStreams) {
              const alreadyExists = streamersWithBadges.find(s => s.profile_id === stream.profile_id);
              if (!alreadyExists) {
                const profile = waitingProfiles.find((p: any) => p.id === stream.profile_id);
                if (profile) {
                  const status = waitingStatusMap[profile.id] || null;
                  
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
                    live_available: true,
                    viewer_count: viewerCount,
                    gifter_level: 0,
                    gifter_status: status,
                  } as LiveStreamer);
                }
              }
            }
          }
        }

        // Always include the current user's own stream if they're live
        const { data: ownLiveStreams, error: ownLiveStreamError } = await supabase
          .from('live_streams')
          .select('id, profile_id, live_available')
          .eq('profile_id', user.id)
          .eq('live_available', true)
          .limit(1);

        const ownLiveStream = ownLiveStreams?.[0] ?? null;

        if (ownLiveStreamError) {
          if (DEBUG_LIVEKIT) {
            
          }
        }

        if (ownLiveStream) {
          const ownStreamExists = streamersWithBadges.find(s => s.profile_id === user.id);
          if (!ownStreamExists) {
            // Get user's profile for their own stream
            const { data: ownProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', user.id)
              .single();

            if (ownProfile) {
              const ownStatusMap = await fetchGifterStatuses([user.id]);
              const ownStatus = ownStatusMap[user.id] || null;

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
                live_available: true,
                viewer_count: ownViewerCount,
                gifter_level: 0,
                gifter_status: ownStatus,
              } as LiveStreamer);
            }
          }
        }
      }

        // CRITICAL: Only update state if streamers actually changed (prevent unnecessary re-renders)
        // Compare by profile_id and key properties to avoid creating new array reference unnecessarily
        setLiveStreamers((prevStreamers) => {
          // CRITICAL: ABSOLUTE GUARD - Never clear streamers if we have existing ones and get empty array
          // Use ref to check current state (more reliable than prevStreamers in rapid updates)
          const currentStreamers = liveStreamersRef.current.length > 0 ? liveStreamersRef.current : prevStreamers;
          
          // CRITICAL: NEVER clear streamers if we have existing ones - this prevents remount loops
          // Empty arrays from loadLiveStreamers() are likely errors/race conditions, not real "no streamers"
          if (streamersWithBadges.length === 0) {
            const currentCount = currentStreamers.length > 0 ? currentStreamers.length : liveStreamersRef.current.length;
            if (currentCount > 0) {
              // Return existing streamers to prevent clearing state
              return currentStreamers.length > 0 ? currentStreamers : liveStreamersRef.current;
            }
            // Only allow empty array if we truly have no streamers (initial load)
            // But still check ref to be safe
            if (liveStreamersRef.current.length > 0) {
              return liveStreamersRef.current;
            }
            liveStreamersRef.current = [];
            return [];
          }
          
          // ENHANCED: Deep comparison - check if data actually changed
          // Compare by profile_id, live_available, and viewer_count
          if (currentStreamers.length === streamersWithBadges.length) {
            const prevIds = currentStreamers.map(s => `${s.profile_id}:${s.live_available}:${s.viewer_count}`).join(',');
            const newIds = streamersWithBadges.map(s => `${s.profile_id}:${s.live_available}:${s.viewer_count}`).join(',');
            if (prevIds === newIds) {
              // Data hasn't changed, return previous array reference to prevent re-render
              // This is CRITICAL - prevents tile subscription effects from rerunning
              return currentStreamers; // Return same reference
            }
          }
          
          // Update ref with new data BEFORE returning
          liveStreamersRef.current = streamersWithBadges;
          // Data changed, return new array
          return streamersWithBadges;
        });
      
      // If no streamers found, still set loading to false
      if (!streamersWithBadges || streamersWithBadges.length === 0) {
        setLoading(false);
      }
      
      // Return streamers array so caller can use it directly (fixes race condition)
      return streamersWithBadges;
    } catch (error) {
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
      const { data: userLiveStreams, error: userLiveStreamError } = await supabase
        .from('live_streams')
        .select('id, live_available')
        .eq('profile_id', user.id)
        .eq('live_available', true)
        .limit(1);

      const userLiveStream = userLiveStreams?.[0] ?? null;

      if (userLiveStreamError) {
        if (DEBUG_LIVEKIT) {
          
        }
      }

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
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
          
          if (userProfile) {
            const ownStatusMap = await fetchGifterStatuses([user.id]);
            const ownStatus = ownStatusMap[user.id] || null;
            
            const ownStream: LiveStreamer = {
              id: userLiveStream.id.toString(),
              profile_id: user.id,
              username: userProfile.username,
              avatar_url: userProfile.avatar_url,
              live_available: userLiveStream.live_available,
              viewer_count: 0,
              gifter_level: 0,
              gifter_status: ownStatus,
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
        // CRITICAL: Ensure updatedSlots is valid before sorting
        if (!updatedSlots || !Array.isArray(updatedSlots)) {
          const defaultSlots = Array.from({ length: 12 }, (_, i) => ({
            slotIndex: i + 1,
            streamer: null,
            isPinned: false,
            isMuted: false,
            isEmpty: true,
            volume: 0.5,
          }));
          setGridSlots(defaultSlots);
          autoFillGrid();
          return;
        }
        
        const sortedSlots = updatedSlots
          .filter((s): s is GridSlot => s != null && typeof s === 'object' && typeof s.slotIndex === 'number')
          .sort((a, b) => a.slotIndex - b.slotIndex);
        
        // CRITICAL: Ensure sortedSlots has exactly 12 slots
        const finalSortedSlots: GridSlot[] = sortedSlots.length === 12
          ? sortedSlots
          : Array.from({ length: 12 }, (_, i) => {
              const existing = sortedSlots.find(s => s.slotIndex === i + 1);
              return existing || {
                slotIndex: i + 1,
                streamer: null,
                isPinned: false,
                isMuted: false,
                isEmpty: true,
                volume: 0.5,
              };
            });
        
        // CRITICAL: Autofill empty slots with available streamers (runs on join)
        // This ensures new users see all available cameras immediately
        // This also triggers active_viewers entries which will trigger publishing
        const emptySlots = finalSortedSlots.filter(s => s.isEmpty);
        if (emptySlots.length > 0 && availableStreamers.length > 0) {
          // Get streamers not already in grid
          // CRITICAL: Add null checks to prevent "Cannot read properties of null" errors
          const usedStreamerIds = new Set(
            finalSortedSlots
              .filter(s => s && s.streamer && s.streamer.profile_id)
              .map(s => s.streamer!.profile_id)
          );
          const unusedStreamers = (availableStreamers || []).filter(s => s && s.profile_id && !usedStreamerIds.has(s.profile_id));
          
          // Fill empty slots with available streamers (prioritize live_available, then viewer count)
          const sortedStreamers = unusedStreamers.sort((a, b) => {
            if (!a || !b) return 0;
            if (a.live_available !== b.live_available) return a.live_available ? -1 : 1;
            return (b.viewer_count || 0) - (a.viewer_count || 0);
          });
          
          // CRITICAL: Ensure we don't access array indices that don't exist
          if (sortedStreamers && Array.isArray(sortedStreamers) && emptySlots && Array.isArray(emptySlots)) {
            const maxFill = Math.min(sortedStreamers.length, emptySlots.length);
            for (let index = 0; index < maxFill; index++) {
              const streamer = sortedStreamers[index];
              const emptySlot = emptySlots[index];
              if (streamer && emptySlot && streamer.profile_id && emptySlot.slotIndex) {
                const slotIndex = finalSortedSlots.findIndex(s => s && s.slotIndex === emptySlot.slotIndex);
                if (slotIndex >= 0 && slotIndex < finalSortedSlots.length && finalSortedSlots[slotIndex]) {
                  finalSortedSlots[slotIndex] = {
                    ...finalSortedSlots[slotIndex],
                    streamer,
                    isEmpty: false,
                  };
                }
              }
            }
          }
        }

        setGridSlots(finalSortedSlots);
        saveGridLayout(finalSortedSlots);
      } else {
        // No saved layout - auto-fill with ALL available streamers (both published and waiting)
        // This ensures new users see all cameras that are available
        autoFillGrid();
      }
    } catch (error) {
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
    }
  }, [supabase]);

  const autoFillGrid = useCallback(() => {
    
    if (liveStreamers.length === 0) {
      return;
    }

    // CRITICAL: Only fill EMPTY slots, preserve existing tiles
    // This prevents clearing streams when realtime updates fire
    setGridSlots((currentSlots) => {
      // CRITICAL: Ensure currentSlots is always a valid array
      if (!currentSlots || !Array.isArray(currentSlots) || currentSlots.length === 0) {
        return Array.from({ length: 12 }, (_, i) => ({
          slotIndex: i + 1,
          streamer: null,
          isPinned: false,
          isMuted: false,
          isEmpty: true,
          volume: 0.5,
        }));
      }
      
      // Find empty slots - filter out any null/undefined entries
      const validSlots = currentSlots.filter((s): s is GridSlot => s != null && typeof s === 'object' && typeof s.slotIndex === 'number');
      const emptySlots = validSlots.filter(s => s.isEmpty);
      
      if (emptySlots.length === 0) {
        // No empty slots, nothing to fill
        return validSlots;
      }

      // CRITICAL: Deduplicate - get ALL streamers already in grid (across all slots)
      const usedStreamerIds = new Set(
        validSlots
          .filter(s => s && s.streamer && s.streamer.profile_id)
          .map(s => s.streamer!.profile_id)
      );

      // Get available streamers not already in grid and not closed by viewer
      // CRITICAL: This prevents same person appearing in multiple tiles (bandwidth waste)
      const closedIds = closedStreamersRef.current;
      const availableStreamers = liveStreamers.filter(
        s => !usedStreamerIds.has(s.profile_id) && !closedIds.has(s.profile_id)
      );

      if (availableStreamers.length === 0) {
        // No new streamers to add
        return currentSlots;
      }

      // Sort by: live_available first, then by viewer count
      const sorted = [...availableStreamers].sort((a, b) => {
        if (a.live_available !== b.live_available) {
          return a.live_available ? -1 : 1;
        }
        return b.viewer_count - a.viewer_count;
      });

      // Fill empty slots with available streamers
      const updatedSlots = [...validSlots];
      let streamerIndex = 0;
      
      // CRITICAL: Ensure sorted array is valid and we don't access out-of-bounds indices
      if (!sorted || !Array.isArray(sorted) || sorted.length === 0) {
        return validSlots;
      }
      
      for (let i = 0; i < updatedSlots.length && streamerIndex < sorted.length; i++) {
        const slot = updatedSlots[i];
        const streamer = sorted[streamerIndex];
        
        // CRITICAL: Validate both slot and streamer before accessing properties
        if (slot && slot.isEmpty && streamer && streamer.profile_id) {
          updatedSlots[i] = {
            ...slot,
            streamer: streamer,
            isEmpty: false,
          };
          streamerIndex++;
        }
      }

      // Only save if we actually changed something
      if (streamerIndex > 0) {
        if (DEBUG_LIVEKIT) {
          
        }
        saveGridLayout(updatedSlots);
      }

      return updatedSlots;
    });
  }, [liveStreamers, saveGridLayout]);

  // Auto-fill empty slots whenever liveStreamers changes
  // This ensures new streamers automatically appear in empty boxes
  useEffect(() => {
    if (liveStreamers.length > 0 && gridSlots.length > 0) {
      const emptyCount = gridSlots.filter(s => s.isEmpty).length;
      
      // Only trigger if there are actually empty slots to fill
      if (emptyCount > 0) {
        // Small delay to ensure state is fully updated
        const timer = setTimeout(() => {
          autoFillGrid();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [liveStreamers, autoFillGrid]); // Removed gridSlots to prevent excessive re-runs

  const handleGoLive = async (liveStreamId: number, profileId: string) => {
    try {
      // Directly load the user's stream data instead of reloading all streamers
      if (authDisabled) {
        alert('⚠️ Testing Mode: "Go Live" requires authentication. Please enable auth or log in.');
        return;
      }
      
      let user = null;
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      
      if (!user || user.id !== profileId) {
        return;
      }

      // Load user's profile and live stream data
      const [profileResult, liveStreamResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', profileId)
          .single(),
        supabase
          .from('live_streams')
          .select('id, live_available')
          .eq('id', liveStreamId)
          .single(),
      ]);

      if (profileResult.error || !profileResult.data) {
        return;
      }

      if (liveStreamResult.error || !liveStreamResult.data) {
        return;
      }

      const profile = profileResult.data;
      const liveStream = liveStreamResult.data;

      const statusMap = await fetchGifterStatuses([profileId]);
      const status = statusMap[profileId] || null;

      // Create streamer object
      const ownStream: LiveStreamer = {
        id: liveStream.id.toString(),
        profile_id: profileId,
        username: profile.username,
        avatar_url: profile.avatar_url,
        live_available: liveStream.live_available,
        viewer_count: 0, // Will be updated by realtime
        gifter_level: 0,
        gifter_status: status,
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

      setPublishAllowed(false);

      const currentSlots = [...gridSlotsRef.current];
      const slot1Index = currentSlots.findIndex(s => s.slotIndex === 1);
      const oldUserSlotIndex = currentSlots.findIndex(s => s.streamer?.profile_id === ownStream.profile_id);

      if (oldUserSlotIndex !== -1 && oldUserSlotIndex !== slot1Index) {
        currentSlots[oldUserSlotIndex] = {
          ...currentSlots[oldUserSlotIndex],
          streamer: null,
          isEmpty: true,
        };
      }

      if (slot1Index !== -1) {
        const displacedStreamer = currentSlots[slot1Index].streamer;
        if (displacedStreamer && displacedStreamer.profile_id !== ownStream.profile_id) {
          let targetSlotIndex = -1;

          if (oldUserSlotIndex !== -1 && oldUserSlotIndex !== slot1Index) {
            targetSlotIndex = oldUserSlotIndex;
          } else {
            targetSlotIndex = currentSlots.findIndex(s => s.isEmpty && s.slotIndex !== 1);

            if (targetSlotIndex === -1) {
              for (let i = currentSlots.length - 1; i >= 0; i--) {
                if (currentSlots[i].slotIndex !== 1 && currentSlots[i].streamer) {
                  targetSlotIndex = i;
                  break;
                }
              }

              if (targetSlotIndex === -1) {
                targetSlotIndex = currentSlots.findIndex(s => s.slotIndex === 12);
              }
            }
          }

          if (targetSlotIndex !== -1) {
            currentSlots[targetSlotIndex] = {
              ...currentSlots[targetSlotIndex],
              streamer: displacedStreamer,
              isEmpty: false,
            };
          } else {
          }

          currentSlots[slot1Index] = {
            ...currentSlots[slot1Index],
            streamer: null,
            isEmpty: true,
            isPinned: false,
          };
        }
      }

      setGridSlots(currentSlots);
      saveGridLayout(currentSlots);
      setPendingSlot1Insert(ownStream);
      setLayoutVersion(v => v + 1);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (!pendingSlot1Insert) return;

    requestAnimationFrame(() => {
      const currentSlots = [...gridSlotsRef.current];
      const slot1Index = currentSlots.findIndex(s => s.slotIndex === 1);

      const userSlotIndex = currentSlots.findIndex(s => s.streamer?.profile_id === pendingSlot1Insert.profile_id);
      if (userSlotIndex !== -1 && userSlotIndex !== slot1Index) {
        currentSlots[userSlotIndex] = {
          ...currentSlots[userSlotIndex],
          streamer: null,
          isEmpty: true,
        };
      }

      if (slot1Index !== -1) {
        currentSlots[slot1Index] = {
          ...currentSlots[slot1Index],
          streamer: pendingSlot1Insert,
          isEmpty: false,
          isPinned: false,
        };
      }

      setGridSlots(currentSlots);
      saveGridLayout(currentSlots);
      setPendingSlot1Insert(null);
      setPendingPublish(true);
      setLayoutVersion(v => v + 1);
    });
  }, [layoutVersion, pendingSlot1Insert, saveGridLayout]);

  useEffect(() => {
    if (!pendingPublish) return;

    requestAnimationFrame(() => {
      setPublishAllowed(true);
      setPendingPublish(false);
    });
  }, [layoutVersion, pendingPublish]);

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
    // Check if dropping a viewer from the viewer list
    const dragData = e.dataTransfer.getData('application/json');
    if (dragData && dragData.trim()) {
      try {
        const data = JSON.parse(dragData);
        if (data.type === 'viewer' && data.profile_id) {
          // Find the streamer info for this viewer
          const streamer = liveStreamers.find((s) => s.profile_id === data.profile_id);
          if (!streamer) {
            // Try to load streamer info if not in list
            await loadStreamerForViewer(data.profile_id, data.live_stream_id, targetSlotIndex);
            setDraggedSlot(null);
            setHoveredSlot(null);
            return;
          }

          const targetSlot = gridSlots.find((s) => s.slotIndex === targetSlotIndex);
          if (!targetSlot) {
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
          setGridSlots(newSlots);
          saveGridLayout(newSlots);
          setDraggedSlot(null);
          setHoveredSlot(null);
          return;
        }
      } catch (error) {
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
      // Load streamer info from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError || !profile) {
        return;
      }

      // Get live stream info
      let streamId = liveStreamId;
      let isPublished = false;
      if (!streamId) {
        const { data: streamData } = await supabase
          .from('live_streams')
          .select('id')
          .eq('profile_id', profileId)
          .eq('live_available', true)
          .single();
        streamId = streamData?.id;
        isPublished = true; // If live_available=true, they're publishing
      } else {
        // If they have a live stream, they're publishing
        isPublished = true;
      }

      const statusMap = await fetchGifterStatuses([profileId]);
      const status = statusMap[profileId] || null;

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
        live_available: !!streamId, // true if they have a live stream
        viewer_count: viewerCount,
        gifter_level: 0,
        gifter_status: status,
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
      }

      setGridSlots(newSlots);
      saveGridLayout(newSlots);
    } catch (error) {
    }
  };

  const handleCloseTile = async (slotIndex: number) => {
    const newSlots = [...gridSlots];
    const slot = newSlots.find((s) => s.slotIndex === slotIndex);
    if (slot) {
      // CRITICAL: If user closes their own box, end their stream (do NOT rely on isCurrentUserPublishing, which can be briefly stale)
      if (slot.streamer && slot.streamer.profile_id === currentUserId) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('live_streams')
              .update({ live_available: false, ended_at: new Date().toISOString() })
              .eq('profile_id', user.id);
            await supabase.from('user_grid_slots').delete().eq('streamer_id', user.id);

            // Best-effort service role cleanup (covers RLS edge cases)
            try {
              await fetch('/api/stream-cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'end_stream', reason: 'close_tile' }),
              });
            } catch (cleanupErr) {
            }

            // Proactively clear local state; GoLiveButton realtime will also stop LiveKit publishing
            setIsCurrentUserPublishing(false);
          }
        } catch (err) {
        }
      }
      // Prevent auto-refill of this streamer in this viewer's grid
      if (slot.streamer) {
        closedStreamersRef.current.add(slot.streamer.profile_id);
      }
      
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

  const handleUnmuteAll = () => {
    // Unmute all tiles to enable sound
    setGridSlots(prev => prev.map(slot => ({ ...slot, isMuted: false })));
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

  // Wire GlobalHeader "live room" vector buttons to LiveRoom state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onRandomize = () => handleRandomize();
    const onUnmuteAll = () => handleUnmuteAll();
    const onToggleFocusMode = () => toggleFocusMode();
    const onSetSortMode = (evt: Event) => {
      const mode = (evt as CustomEvent)?.detail?.mode as LiveSortMode | undefined;
      if (!mode) return;
      if (mode !== 'random' && mode !== 'most_viewed' && mode !== 'most_gifted' && mode !== 'newest' && mode !== 'trending') return;
      handleSortModeChange(mode);
    };

    window.addEventListener('liveroom:randomize', onRandomize);
    window.addEventListener('liveroom:unmuteAll', onUnmuteAll);
    window.addEventListener('liveroom:toggleFocusMode', onToggleFocusMode);
    window.addEventListener('liveroom:setSortMode', onSetSortMode);

    return () => {
      window.removeEventListener('liveroom:randomize', onRandomize);
      window.removeEventListener('liveroom:unmuteAll', onUnmuteAll);
      window.removeEventListener('liveroom:toggleFocusMode', onToggleFocusMode);
      window.removeEventListener('liveroom:setSortMode', onSetSortMode);
    };
  }, [handleRandomize, handleSortModeChange, handleUnmuteAll, toggleFocusMode]);

  const handleAddStreamer = async (slotIndex: number, streamerId: string) => {
    // CRITICAL: Deduplicate - remove this streamer from any other slots first
    // This prevents same person appearing in multiple tiles (bandwidth waste)
    setGridSlots(prev => {
      const otherSlotWithSameStreamer = prev.findIndex(
        s => s.streamer?.profile_id === streamerId && s.slotIndex !== slotIndex
      );
      
      if (otherSlotWithSameStreamer !== -1) {
        
        const updated = [...prev];
        // Clear the other slot
        updated[otherSlotWithSameStreamer] = {
          ...updated[otherSlotWithSameStreamer],
          streamer: null,
          isEmpty: true,
        };
        return updated;
      }
      return prev;
    });
    
    // Check if this is the current user going live
    let user = null;
    if (!authDisabled) {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
    }
    // If it's the current user and they're live, auto-place them in slot 1
    if (user && user.id === streamerId) {
      // Check if user is live
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('id, live_available')
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
        .select('id')
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
          .select('id, username, avatar_url')
          .eq('id', streamerId)
          .single();
        
        if (profile) {
          const statusMap = await fetchGifterStatuses([profile.id]);
          const status = statusMap[profile.id] || null;
          
          streamer = {
            id: profile.id,
            profile_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            live_available: false,
            viewer_count: 0,
            gifter_level: 0,
            gifter_status: status,
          } as LiveStreamer;
        } else {
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

  // Handle leave room (for mobile web)
  const handleLeaveRoom = useCallback(() => {
    router.push('/');
  }, [router]);

  // ============================================
  // MOBILE WEB RENDERING
  // ============================================
  // On mobile web browsers, show simplified video-only experience
  // Portrait mode: Show rotate overlay
  // Landscape mode: Show MobileWebWatchLayout
  
  if (isMobileWeb) {
    return (
      <MobileWebWatchLayout
        mode={mode}
        layoutStyle={layoutStyle}
        roomId={scopeRoomId}
        roomName={roomConfig.branding.name}
        gridSlots={gridSlots}
        sharedRoom={sharedRoom}
        isRoomConnected={isRoomConnected}
        currentUserId={currentUserId}
        isCurrentUserPublishing={isCurrentUserPublishing}
        tracksByStreamerId={tracksByStreamerId}
        viewerCount={roomPresenceCountMinusSelf}
        onGoLive={handleGoLive}
        onPublishingChange={setIsCurrentUserPublishing}
        publishAllowed={publishAllowed}
        streamingMode="group"
        onLeave={handleLeaveRoom}
        onMuteTile={handleMuteTile}
        onVolumeChange={handleVolumeChange}
        onCloseTile={handleCloseTile}
      />
    );
  }

  // ============================================
  // DESKTOP WEB RENDERING (unchanged)
  // ============================================

  return (
    <div className="h-[100dvh] w-[100dvw] bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col fixed inset-0 pt-0 lg:pt-[72px] min-h-0">
      {/* Hidden Go Live Button - triggered by camera button in header */}
      <div className="fixed -left-[9999px]" id="liveroom-go-live-button">
        <GoLiveButton
          sharedRoom={sharedRoom}
          isRoomConnected={isRoomConnected}
          onGoLive={handleGoLive}
          onPublishingChange={setIsCurrentUserPublishing}
          publishAllowed={publishAllowed}
          mode="group"
          buttonRef={goLiveButtonRef}
        />
      </div>
      
      {/* Testing Mode Banner (if auth disabled) */}
      {authDisabled && (
        <div className="w-full bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white text-center py-2 px-4 text-sm font-semibold">
          ⚠️ TESTING MODE: Authentication Disabled - Anyone can access
        </div>
      )}

      {/* Room Banner with branding */}
      <RoomBanner
        roomKey={roomConfig.roomId}
        roomName={roomConfig.branding.name}
        presentedBy={
          roomConfig.branding.presentedBy ??
          (roomConfig.teamSlug ? `Team: ${roomConfig.teamSlug}` : 'MyLiveLinks Official')
        }
        bannerStyle="default"
        customGradient={roomConfig.branding.fallbackGradient}
        showGoLiveButton={true}
        isLive={isCurrentUserPublishing}
        onGoLiveClick={handleGoLiveClick}
        canPublish={canPublishForBanner}
      />

      {/* Background image layer */}
      {roomConfig.branding.backgroundUrl && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `url(${roomConfig.branding.backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

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
                  key={`${expandedSlot.slotIndex}:${expandedSlot.streamer.profile_id}`}
                  streamerId={expandedSlot.streamer.profile_id}
                  streamerUsername={expandedSlot.streamer.username}
                  streamerAvatar={expandedSlot.streamer.avatar_url}
                  isLive={expandedSlot.streamer.live_available}
                  viewerCount={expandedSlot.streamer.viewer_count}
                  gifterStatus={expandedSlot.streamer.gifter_status}
                  slotIndex={expandedSlot.slotIndex}
                  roomId={scopeRoomId}
                  liveStreamId={expandedSlot.streamer.id && expandedSlot.streamer.live_available ? (() => {
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
                  videoTrack={tracksByStreamerId.get(expandedSlot.streamer.profile_id)?.video ?? null}
                  audioTrack={tracksByStreamerId.get(expandedSlot.streamer.profile_id)?.audio ?? null}
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
            {/* Video Grid - Top (Full Width, Bigger) - Full screen on mobile */}
            <div
              className={`${uiPanels.focusMode ? 'flex-1' : 'md:flex-shrink-0 flex-1 md:flex-initial'} px-2 ${uiPanels.focusMode ? 'py-0 pb-0' : 'pt-0 pb-0'} overflow-x-hidden overflow-y-auto lg:overflow-hidden`}
            >
              <div className="max-w-full mx-auto w-full h-full flex items-start lg:items-center justify-center">
                {/* 12-Tile Grid - 4/4/4 layout in Focus Mode, 6/6 otherwise */}
                <div className={`grid ${uiPanels.focusMode ? 'grid-cols-4' : 'grid-cols-4 lg:grid-cols-6'} ${uiPanels.focusMode ? 'gap-1 max-w-[90%]' : 'gap-1'} w-full ${uiPanels.focusMode ? 'h-auto' : 'h-full'}`}>
                {(() => {
                  // DEBUG: Log grid rendering (only in debug mode to avoid performance issues)
                  if (process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1') {
                    
                  }
                  
                  // CRITICAL: Ensure gridSlots is always a valid array - handle null/undefined cases
                  if (!gridSlots || !Array.isArray(gridSlots)) {
                    const defaultSlots = Array.from({ length: 12 }, (_, i) => ({
                      slotIndex: i + 1,
                      streamer: null,
                      isPinned: false,
                      isMuted: false,
                      isEmpty: true,
                      volume: 0.5,
                    }));
                    return defaultSlots.map((slot: GridSlot) => {
                      if (!slot || typeof slot.slotIndex !== 'number') {
                        return null;
                      }
                      return (
                        <div key={slot.slotIndex} className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                          <span className="text-gray-400 text-sm">Empty Slot</span>
                        </div>
                      );
                    }).filter((el) => el !== null);
                  }
                  
                  // Filter out null/undefined slots
                  const validSlots = gridSlots.filter((slot: GridSlot | null | undefined): slot is GridSlot => 
                    slot != null && typeof slot === 'object' && typeof slot.slotIndex === 'number'
                  );
                  
                  // Ensure we always have exactly 12 slots
                  const finalSlots: GridSlot[] = validSlots.length === 12 
                    ? validSlots 
                    : Array.from({ length: 12 }, (_, i) => {
                        const existingSlot = validSlots.find((s: GridSlot) => s && s.slotIndex === i + 1);
                        if (existingSlot && existingSlot.slotIndex === i + 1) {
                          return existingSlot;
                        }
                        return {
                          slotIndex: i + 1,
                          streamer: null,
                          isPinned: false,
                          isMuted: false,
                          isEmpty: true,
                          volume: 0.5,
                        };
                      });
                  
                  // CRITICAL: Final validation - ensure finalSlots is never null and always has 12 items
                  if (!finalSlots || !Array.isArray(finalSlots) || finalSlots.length !== 12) {
                    const defaultSlots = Array.from({ length: 12 }, (_, i) => ({
                      slotIndex: i + 1,
                      streamer: null,
                      isPinned: false,
                      isMuted: false,
                      isEmpty: true,
                      volume: 0.5,
                    }));
                    return defaultSlots.map((slot: GridSlot) => {
                      if (!slot || typeof slot.slotIndex !== 'number') {
                        return null;
                      }
                      return (
                        <div key={slot.slotIndex} className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                          <span className="text-gray-400 text-sm">Empty Slot</span>
                        </div>
                      );
                    }).filter((el) => el !== null);
                  }
                  
                  // DEBUG: Only log in debug mode to avoid performance issues
                  if (process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1') {
                  }
                  
                  // CRITICAL: Ensure finalSlots is always a valid array before mapping
                  if (!finalSlots || !Array.isArray(finalSlots)) {
                    return Array.from({ length: 12 }, (_, i) => (
                      <div key={`fallback-${i}`} className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                        <span className="text-gray-400 text-sm">Loading...</span>
                      </div>
                    ));
                  }
                  
                  // CRITICAL: Wrap map in try-catch to prevent crashes and log detailed errors
                  try {
                    // CRITICAL: Filter out any null/undefined entries and ensure we have exactly 12 slots
                    const validSlots = finalSlots
                      .filter((slot: GridSlot | null | undefined): slot is GridSlot => {
                        if (slot == null || typeof slot !== 'object') return false;
                        if (typeof slot.slotIndex !== 'number') return false;
                        return true;
                      })
                      .slice(0, 12); // Ensure we don't exceed 12 slots
                    
                    // Fill to 12 slots if needed
                    const slotsToRender: GridSlot[] = [];
                    for (let i = 0; i < 12; i++) {
                      const existingSlot = validSlots.find(s => s.slotIndex === i + 1);
                      if (existingSlot) {
                        slotsToRender.push(existingSlot);
                      } else {
                        slotsToRender.push({
                          slotIndex: i + 1,
                          streamer: null,
                          isPinned: false,
                          isMuted: false,
                          isEmpty: true,
                          volume: 0.5,
                        });
                      }
                    }
                    
                    return slotsToRender.map((slot: GridSlot, index: number) => {
                        // CRITICAL: Validate slot structure before rendering - double check
                        if (!slot || typeof slot !== 'object' || typeof slot.slotIndex !== 'number') {
                          return (
                            <div key={`error-${index}`} className="aspect-[3/2] bg-red-200 dark:bg-red-800 rounded-lg border-2 border-red-500 flex flex-col items-center justify-center">
                              <span className="text-red-600 text-sm">Error: Invalid Slot</span>
                            </div>
                          );
                        }
                      
                        try {
                          const profileIdValue = (slot as any)?.streamer?.profile_id;
                          let occupantKey = 'empty';
                          if (typeof profileIdValue === 'string' && profileIdValue.length > 0) {
                            occupantKey = profileIdValue;
                          } else if (Array.isArray(profileIdValue) && profileIdValue.length > 0 && profileIdValue[0] != null) {
                            occupantKey = String(profileIdValue[0]);
                          }

                          return (
                          <div
                            key={`${slot.slotIndex}:${occupantKey}`}
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
                        ) : (() => {
                          // CRITICAL: Validate slot and streamer before accessing properties
                          if (!slot || typeof slot !== 'object') {
                            return (
                              <div className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                                <span className="text-gray-400 text-sm">Invalid Slot</span>
                              </div>
                            );
                          }
                          
                          // CRITICAL: Validate streamer properties are valid strings/numbers before rendering
                          const streamer = slot.streamer;
                          if (!streamer || typeof streamer !== 'object' || streamer === null) {
                            return (
                              <div className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                                <span className="text-gray-400 text-sm">Invalid Streamer Data</span>
                              </div>
                            );
                          }
                          
                          // CRITICAL: Safely extract profile_id - handle null, arrays, and strings
                          // NEVER access [0] without checking everything first - access only once
                          let profileId: string | null = null;
                          try {
                            const profileIdValue = streamer?.profile_id;
                            if (profileIdValue != null && profileIdValue !== undefined) {
                              if (Array.isArray(profileIdValue) && profileIdValue.length > 0) {
                                // CRITICAL: Access [0] only once after verifying array has elements
                                const firstElement = profileIdValue[0];
                                if (firstElement != null && firstElement !== undefined) {
                                  profileId = String(firstElement);
                                }
                              } else if (typeof profileIdValue === 'string' && profileIdValue.length > 0) {
                                profileId = profileIdValue;
                              }
                            }
                          } catch (e) {
                            profileId = null; // Ensure it's null on error
                          }
                          
                          // CRITICAL: Safely extract username - handle null, arrays, and strings
                          // NEVER access [0] without checking everything first - access only once
                          let username: string | null = null;
                          try {
                            const usernameValue = streamer?.username;
                            if (usernameValue != null && usernameValue !== undefined) {
                              if (Array.isArray(usernameValue) && usernameValue.length > 0) {
                                // CRITICAL: Access [0] only once after verifying array has elements
                                const firstElement = usernameValue[0];
                                if (firstElement != null && firstElement !== undefined) {
                                  username = String(firstElement);
                                }
                              } else if (typeof usernameValue === 'string' && usernameValue.length > 0) {
                                username = usernameValue;
                              }
                            }
                          } catch (e) {
                            username = null; // Ensure it's null on error
                          }
                          
                          if (!profileId || !username) {
                            return (
                              <div className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                                <span className="text-gray-400 text-sm">Invalid Streamer Data</span>
                              </div>
                            );
                          }
                          
                          // Parse liveStreamId safely
                          let liveStreamId: number | undefined = undefined;
                          if (streamer?.id != null && streamer?.live_available) {
                            try {
                              // CRITICAL: Safely extract id value - handle null, arrays, and other types
                              // NEVER access [0] without checking everything first - access only once
                              let idValue: any = null;
                              const idRaw = streamer.id;
                              if (idRaw != null && idRaw !== undefined) {
                                if (Array.isArray(idRaw) && idRaw.length > 0) {
                                  // CRITICAL: Access [0] only once after verifying array has elements
                                  const firstElement = idRaw[0];
                                  if (firstElement != null && firstElement !== undefined) {
                                    idValue = firstElement;
                                  }
                                } else {
                                  idValue = idRaw;
                                }
                              }
                              
                              if (idValue != null && idValue !== undefined) {
                                const idStr = String(idValue);
                                // Only parse if it's a real stream ID (numeric), not seed data (stream-X or seed-X)
                                if (!idStr.startsWith('stream-') && !idStr.startsWith('seed-')) {
                                  const parsed = parseInt(idStr);
                                  if (!isNaN(parsed) && parsed > 0) {
                                    liveStreamId = parsed;
                                  }
                                }
                              }
                            } catch (e) {
                              liveStreamId = undefined; // Ensure it's undefined on error
                            }
                          }
                          
                          return (
                            <Tile
                              streamerId={profileId}
                              streamerUsername={username}
                              streamerAvatar={typeof streamer.avatar_url === 'string' ? streamer.avatar_url : undefined}
                              isLive={!!streamer.live_available}
                              viewerCount={typeof streamer.viewer_count === 'number' ? streamer.viewer_count : 0}
                              gifterStatus={(streamer as any).gifter_status || null}
                              slotIndex={slot.slotIndex}
                              roomId={scopeRoomId}
                              liveStreamId={liveStreamId}
                        sharedRoom={sharedRoom}
                        isRoomConnected={isRoomConnected}
                        isCurrentUserPublishing={isCurrentUserPublishing}
                        videoTrack={tracksByStreamerId.get(profileId)?.video ?? null}
                        audioTrack={tracksByStreamerId.get(profileId)?.audio ?? null}
                        compactMode={isCompactDesktop}
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
                          );
                        })()}
                      </div>
                          );
                        } catch (error) {
                          return (
                            <div key={`error-${slot.slotIndex}`} className="aspect-[3/2] bg-red-200 dark:bg-red-800 rounded-lg border-2 border-red-500 flex flex-col items-center justify-center">
                              <span className="text-red-600 text-sm">Render Error</span>
                            </div>
                          );
                        }
                      });
                  } catch (error) {
                    // Return empty slots as fallback
                    return Array.from({ length: 12 }, (_, i) => (
                      <div key={`fallback-${i}`} className="aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center">
                        <span className="text-gray-400 text-sm">Error Loading</span>
                      </div>
                    ));
                  }
                })()}
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

        {/* Bottom Section - Leaderboard, Chat, Viewers + Stats side by side - HIDE ON MOBILE */}
        {!uiPanels.focusMode && (
          <>
            <div className="hidden 2xl:flex flex-1 min-h-0 overflow-hidden border-t border-gray-200 dark:border-gray-700 2xl:flex-row xl:flex-row lg:flex-col">
              {/* Leaderboards - Left */}
              {uiPanels.leaderboardsOpen && (
                <div className="hidden lg:flex flex-col 2xl:w-[330px] xl:w-[300px] lg:w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-[540px] xl:h-[620px] 2xl:h-[700px] max-h-full overflow-y-auto transition-all">
                  <div className="flex flex-col h-full w-full">
                    <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto flex flex-col p-0">
                      <Leaderboard roomSlug={scopeRoomId} roomName={roomConfig.branding.name} />
                    </div>
                  </div>
                </div>
              )}

              {/* Chat - Middle (fills remaining space) */}
              <div className={`flex-1 min-h-0 h-full overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-w-[350px] md:min-w-[360px] lg:min-w-[400px] xl:min-w-[420px] ${!uiPanels.chatOpen ? 'hidden' : ''}`}>
                <Chat roomSlug={scopeRoomId} onShareClick={() => setShowShareModal(true)} />
              </div>

              {/* Viewers + Stats - Right */}
              {(uiPanels.viewersOpen || uiPanels.rightStackOpen) && (
                <div className="hidden lg:flex flex-shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex flex-row">
                  {/* Viewer List - Left side */}
                  {uiPanels.viewersOpen && (
                    <div className="2xl:w-80 xl:w-full lg:w-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all">
                      <ViewerList roomId={presenceRoomId} onDragStart={(viewer) => {
                        // Viewer drag started - can add visual feedback if needed
                      }} />
                    </div>
                  )}
                  
                  {/* Stats - Right side */}
                  {uiPanels.rightStackOpen && (
                    <div className="2xl:w-80 xl:w-72 lg:w-full flex-shrink-0 overflow-y-auto transition-all">
                      <div className="space-y-4">
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

            <div className="hidden xl:grid 2xl:hidden flex-1 min-h-0 overflow-hidden border-t border-gray-200 dark:border-gray-700 h-[clamp(420px,52vh,720px)] grid-cols-[minmax(320px,380px)_minmax(460px,1fr)_minmax(320px,400px)]">
              <div className="min-h-0 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex flex-col min-h-0 h-full">
                  <PanelShell title="Leaderboards" className="flex-1 min-h-0 border-0" bodyClassName="px-5 py-4">
                    <Leaderboard roomSlug={scopeRoomId} roomName={roomConfig.branding.name} />
                  </PanelShell>
                  <PanelShell title="Viewers" className="flex-1 min-h-0 border-0 border-t border-gray-200 dark:border-gray-700" bodyClassName="p-0">
                    <ViewerList roomId={presenceRoomId} onDragStart={(viewer) => {
                      // Viewer drag started - can add visual feedback if needed
                    }} />
                  </PanelShell>
                </div>
              </div>

              <div className={`min-h-0 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${!uiPanels.chatOpen ? 'hidden' : ''}`}>
                <div className="min-h-0 h-full min-w-[460px]">
                  <Chat roomSlug={scopeRoomId} onShareClick={() => setShowShareModal(true)} />
                </div>
              </div>

              <div className="min-h-0 overflow-hidden bg-white dark:bg-gray-800">
                <PanelShell title="Your Stats" className="h-full border-0" bodyClassName="p-0">
                  <LiveRoomStatsStack />
                </PanelShell>
              </div>
            </div>

            <div className="hidden lg:flex xl:hidden flex-1 min-h-0 overflow-hidden border-t border-gray-200 dark:border-gray-700 flex-col">
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen((prev) => (prev === 'leaderboard' ? null : 'leaderboard'))}
                    className={`px-3 py-2 rounded-md text-sm font-medium border ${drawerOpen === 'leaderboard' ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    aria-pressed={drawerOpen === 'leaderboard'}
                  >
                    Leaderboards
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen((prev) => (prev === 'viewers' ? null : 'viewers'))}
                    className={`px-3 py-2 rounded-md text-sm font-medium border ${drawerOpen === 'viewers' ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    aria-pressed={drawerOpen === 'viewers'}
                  >
                    Viewers
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen((prev) => (prev === 'stats' ? null : 'stats'))}
                    className={`px-3 py-2 rounded-md text-sm font-medium border ${drawerOpen === 'stats' ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    aria-pressed={drawerOpen === 'stats'}
                  >
                    Stats
                  </button>
                </div>
              </div>

              <div className={`flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-800 ${!uiPanels.chatOpen ? 'hidden' : ''}`}>
                <Chat roomSlug={scopeRoomId} onShareClick={() => setShowShareModal(true)} />
              </div>

              <Drawer
                isOpen={drawerOpen !== null}
                onClose={() => setDrawerOpen(null)}
                position="right"
                size="lg"
              >
                {drawerOpen === 'leaderboard' && <Leaderboard roomSlug={scopeRoomId} roomName={roomConfig.branding.name} />}
                {drawerOpen === 'viewers' && (
                  <ViewerList roomId={presenceRoomId} onDragStart={(viewer) => {
                    // Viewer drag started - can add visual feedback if needed
                  }} />
                )}
                {drawerOpen === 'stats' && <LiveRoomStatsStack />}
              </Drawer>
            </div>
          </>
        )}
        </>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`${roomConfig.branding.name} - Live Room`}
        url={typeof window !== 'undefined' ? window.location.href : `https://www.mylivelinks.com/live`}
        contentType="live"
      />
    </div>
  );
}
