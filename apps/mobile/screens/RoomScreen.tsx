import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, ScaledSize, Text, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track } from 'livekit-client';
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
  videoTrack: Track | null;
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
          videoTrack={participant.videoTrack}
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
  
  // Room slug from navigation params (same identifier as web)
  const slug = route.params?.slug || route.params?.roomKey || 'live-central';

  // Track screen dimensions for orientation detection
  const [dimensions, setDimensions] = useState<ScaledSize>(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const isLandscape = dimensions.width > dimensions.height;

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

  // Connect to LiveKit room (same room name as web)
  const connectToLiveKit = useCallback(async () => {
    if (!roomConfig || !roomConfig.permissions.can_view) {
      console.log('[RoomScreen] Cannot connect - no room config or no view permission');
      return;
    }

    // Use room_key as LiveKit room name (matches web: roomConfig.roomId)
    // Web uses room_key for LiveKit, e.g., 'live_central'
    const liveKitRoomName = roomConfig.room_key;
    
    try {
      const identity = user?.id || `anon-${Date.now()}`;
      const displayName = user?.email?.split('@')[0] || 'Viewer';
      
      console.log('[RoomScreen] Fetching token for room:', liveKitRoomName);
      
      const { token, url } = await fetchMobileToken(
        liveKitRoomName,
        identity,
        displayName,
        false // isHost = false for viewer
      );

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Event handlers
      room.on(RoomEvent.Connected, () => {
        console.log('[RoomScreen] Connected to LiveKit room:', liveKitRoomName);
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

      room.on(RoomEvent.TrackSubscribed, () => {
        updateParticipants(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        updateParticipants(room);
      });

      await room.connect(url, token);
      
      roomRef.current = room;
      setLiveKitRoom(room);
    } catch (err: any) {
      console.error('[RoomScreen] LiveKit connection error:', err);
      setError(err?.message || 'Failed to connect to live room');
    }
  }, [roomConfig, user]);

  // Update participants list from LiveKit room
  const updateParticipants = useCallback((room: Room) => {
    const remoteParticipants: Participant[] = [];
    
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      let videoTrack: Track | null = null;
      
      participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.kind === Track.Kind.Video && pub.track) {
          videoTrack = pub.track;
        }
      });

      remoteParticipants.push({
        id: participant.sid,
        identity: participant.identity,
        videoTrack,
      });
    });

    setParticipants(remoteParticipants);
  }, []);

  // Connect to LiveKit when room config is loaded
  useEffect(() => {
    if (roomConfig && !liveKitRoom) {
      connectToLiveKit();
    }

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomConfig, liveKitRoom, connectToLiveKit]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // No access
  if (roomConfig && !roomConfig.permissions.can_view) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>You do not have access to this room</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GridContainer
        participants={participants}
        screenWidth={dimensions.width}
        screenHeight={dimensions.height}
        isLandscape={isLandscape}
      />
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
});
