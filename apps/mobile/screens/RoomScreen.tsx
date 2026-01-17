import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, StatusBar, useWindowDimensions } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track, RemoteTrack } from 'livekit-client';
import { VideoView } from '@livekit/react-native';
import { supabase } from '../lib/supabase';
import { fetchMobileToken } from '../lib/livekit';
import { useAuth } from '../state/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

type RoomScreenParams = {
  slug?: string;
  roomKey?: string;
};

type RoomScreenRouteProp = RouteProp<{ RoomScreen: RoomScreenParams }, 'RoomScreen'>;

interface RoomConfig {
  id: string;
  room_key: string;
  slug: string;
  name: string;
  description: string | null;
  room_type: string;
  visibility: string;
  status: string;
  grid_size: number;
  permissions: {
    can_view: boolean;
    can_publish: boolean;
    can_moderate: boolean;
  };
}

interface Participant {
  id: string;
  identity: string;
  videoTrack: RemoteTrack | null;
}

interface GridConfig {
  rows: number;
  cols: number;
}

// ============================================================================
// GRID LAYOUT CALCULATOR
// ============================================================================

function getGridConfig(isLandscape: boolean): GridConfig {
  // Fixed 12-slot grid: 4x3 portrait, 3x4 landscape
  return isLandscape ? { rows: 3, cols: 4 } : { rows: 4, cols: 3 };
}

// ============================================================================
// VIDEO TILE COMPONENT
// ============================================================================

interface VideoTileProps {
  participant: Participant | null;
  width: number;
  height: number;
}

function VideoTile({ participant, width, height }: VideoTileProps) {
  // VideoTile - renders video if participant exists, otherwise empty slot
  return (
    <View style={[styles.tile, { width, height }]}>
      {participant?.videoTrack ? (
        <VideoView
          style={styles.videoView}
          videoTrack={participant.videoTrack as any}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={styles.tilePlaceholder} />
      )}
    </View>
  );
}

// ============================================================================
// GRID CONTAINER COMPONENT
// ============================================================================

interface GridContainerProps {
  participants: Participant[];
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
}

function GridContainer({ participants, screenWidth, screenHeight, isLandscape }: GridContainerProps) {
  const { rows, cols } = getGridConfig(isLandscape);
  const tileWidth = screenWidth / cols;
  const tileHeight = screenHeight / rows;

  // Build fixed 12-slot grid - empty slots render as placeholders
  const gridRows: React.ReactNode[] = [];
  let slotIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowTiles: React.ReactNode[] = [];
    for (let col = 0; col < cols; col++) {
      const participant = participants[slotIndex] || null;
      rowTiles.push(
        <VideoTile
          key={`slot-${slotIndex}`}
          participant={participant}
          width={tileWidth}
          height={tileHeight}
        />
      );
      slotIndex++;
    }
    gridRows.push(
      <View key={`row-${row}`} style={styles.gridRow}>
        {rowTiles}
      </View>
    );
  }

  return <View style={styles.gridContainer}>{gridRows}</View>;
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export default function RoomScreen() {
  const route = useRoute<RoomScreenRouteProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Room slug from navigation params (same identifier as web)
  const slug = route.params?.slug || route.params?.roomKey || 'live-central';

  // Track screen dimensions for orientation detection using hook (auto-updates on rotation)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  
  // Debug: log orientation changes
  useEffect(() => {
    console.log('[RoomScreen] Orientation changed:', isLandscape ? 'LANDSCAPE' : 'PORTRAIT', 
      'dimensions:', screenWidth, 'x', screenHeight);
  }, [isLandscape, screenWidth, screenHeight]);

  // Room state
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // LiveKit state
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const roomRef = useRef<Room | null>(null);

  // Fetch room config from same RPC as web
  const fetchRoomConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_get_room_config', {
        p_slug: slug,
      });

      if (rpcError) {
        console.error('[RoomScreen] RPC error:', rpcError);
        
        // Fallback to Live Central default if room not found
        if (slug === 'live-central' || slug === 'live_central') {
          console.log('[RoomScreen] Using Live Central fallback config');
          setRoomConfig({
            id: 'live-central-default',
            room_key: 'live_central',
            slug: 'live-central',
            name: 'Live Central',
            description: 'The main live streaming room',
            room_type: 'official',
            visibility: 'public',
            status: 'live',
            grid_size: 12,
            permissions: {
              can_view: true,
              can_publish: false,
              can_moderate: false,
            },
          });
        } else {
          setError('Room not found');
        }
        return;
      }

      console.log('[RoomScreen] RPC returned room config:', JSON.stringify(data, null, 2));
      setRoomConfig(data);
    } catch (err: any) {
      console.error('[RoomScreen] Error fetching room config:', err);
      setError(err?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchRoomConfig();
  }, [fetchRoomConfig]);

  // Subscribe to room status changes (realtime)
  useEffect(() => {
    if (!roomConfig?.id || roomConfig.id === 'live-central-default') return;

    const channel = supabase
      .channel(`room-status-${roomConfig.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomConfig.id}`,
        },
        (payload) => {
          console.log('[RoomScreen] Room status changed:', payload.new);
          // Refetch room config on status change
          fetchRoomConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomConfig?.id, fetchRoomConfig]);

  // Update participants list from LiveKit room
  const updateParticipants = useCallback((room: Room) => {
    const remoteParticipants: Participant[] = [];
    
    console.log('[RoomScreen] Checking remote participants, count:', room.remoteParticipants.size);
    
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      console.log('[RoomScreen] Participant:', participant.identity, 'tracks:', participant.trackPublications.size);
      
      let videoTrack: RemoteTrack | null = null;
      
      participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
        console.log('[RoomScreen]   Publication:', pub.kind, 'subscribed:', pub.isSubscribed, 'track:', !!pub.track);
        
        // Check for video tracks - include even if not yet subscribed (will update when subscribed)
        if (pub.kind === Track.Kind.Video && pub.track) {
          videoTrack = pub.track as RemoteTrack;
          console.log('[RoomScreen]   Found video track for', participant.identity);
        }
      });

      // Add all participants with video tracks (subscribed or not)
      if (videoTrack) {
        remoteParticipants.push({
          id: participant.sid,
          identity: participant.identity,
          videoTrack,
        });
      }
    });

    console.log('[RoomScreen] Updated participants:', remoteParticipants.length, 'with video');
    setParticipants(remoteParticipants);
  }, []);

  // Connect to LiveKit room (same room name as web)
  const connectToLiveKit = useCallback(async () => {
    if (!roomConfig) {
      console.log('[RoomScreen] Cannot connect - no room config');
      return;
    }
    
    // Check permissions - handle both nested object and direct boolean
    const canView = typeof roomConfig.permissions?.can_view === 'boolean' 
      ? roomConfig.permissions.can_view 
      : true; // Default to true for public rooms
    
    if (!canView) {
      console.log('[RoomScreen] Cannot connect - no view permission');
      return;
    }

    // Use room_key as LiveKit room name (matches web: roomConfig.roomId)
    // Web uses 'live_central' (underscore) for LiveKit room name
    // Handle both slug format (live-central) and room_key format (live_central)
    let liveKitRoomName = roomConfig.room_key;
    
    // Special case: Live Central uses underscore format for LiveKit
    if (liveKitRoomName === 'live-central' || roomConfig.slug === 'live-central') {
      liveKitRoomName = 'live_central';
    }
    
    try {
      const identity = user?.id || `anon-${Date.now()}`;
      const displayName = user?.email?.split('@')[0] || 'Viewer';
      
      console.log('[RoomScreen] Connecting to LiveKit room:', liveKitRoomName);
      console.log('[RoomScreen] User identity:', identity);
      
      const { token, url } = await fetchMobileToken(
        liveKitRoomName,
        identity,
        displayName,
        false // isHost = false for viewer
      );

      console.log('[RoomScreen] Token received, URL:', url);
      console.log('[RoomScreen] Token length:', token?.length);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Event handlers
      room.on(RoomEvent.Connected, () => {
        console.log('[RoomScreen] Connected to LiveKit room:', liveKitRoomName);
        console.log('[RoomScreen] Remote participants count:', room.remoteParticipants.size);
        room.remoteParticipants.forEach((p) => {
          console.log('[RoomScreen] Remote participant:', p.identity, 'tracks:', p.trackPublications.size);
          p.trackPublications.forEach((pub) => {
            console.log('[RoomScreen]   Track:', pub.kind, 'subscribed:', pub.isSubscribed, 'hasTrack:', !!pub.track);
          });
        });
        setIsConnected(true);
        updateParticipants(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[RoomScreen] Disconnected from LiveKit room');
        setIsConnected(false);
        setParticipants([]);
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        updateParticipants(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateParticipants(room);
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('[RoomScreen] Track subscribed:', track.kind, 'from', participant.identity);
        updateParticipants(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log('[RoomScreen] Track unsubscribed:', track.kind, 'from', participant.identity);
        updateParticipants(room);
      });

      await room.connect(url, token);
      
      roomRef.current = room;
      setLiveKitRoom(room);
    } catch (err: any) {
      console.error('[RoomScreen] LiveKit connection error:', err);
      setError(err?.message || 'Failed to connect to live room');
    }
  }, [roomConfig, user, updateParticipants]);

  // Connect to LiveKit when room config is loaded
  useEffect(() => {
    if (roomConfig && !liveKitRoom) {
      connectToLiveKit();
    }
  }, [roomConfig, liveKitRoom, connectToLiveKit]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('[RoomScreen] Component unmounting, disconnecting room');
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []); // Empty deps - only run on unmount

  // Calculate available height (screen height minus top safe area for status bar)
  const gridHeight = screenHeight - insets.top;

  // Always render the grid - overlay loading/error states on top
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      {/* Black spacer for status bar area */}
      <View style={{ height: insets.top, backgroundColor: '#000000' }} />
      <GridContainer
        participants={participants}
        screenWidth={screenWidth}
        screenHeight={gridHeight}
        isLandscape={isLandscape}
      />
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.overlayContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading room...</Text>
        </View>
      )}
      
      {/* Error overlay */}
      {error && !loading && (
        <View style={styles.overlayContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* No access overlay */}
      {roomConfig && roomConfig.permissions?.can_view === false && !loading && !error && (
        <View style={styles.overlayContainer}>
          <Text style={styles.errorText}>You do not have access to this room</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gridContainer: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  emptyGrid: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tile: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#333333',
  },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  videoView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
