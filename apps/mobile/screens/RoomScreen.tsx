import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, useWindowDimensions, Pressable, Modal, TouchableOpacity, Alert, Platform, StatusBar as RNStatusBar, Animated, PanResponder, Dimensions, ScrollView, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track, RemoteTrack } from 'livekit-client';
import { VideoView } from '@livekit/react-native';
import { supabase } from '../lib/supabase';
import { fetchMobileToken, connectAndPublish, disconnectAndCleanup, startLiveStreamRecord, endLiveStreamRecord } from '../lib/livekit';
import { useAuth } from '../state/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { ChatContent, StatsContent, LeaderboardContent, OptionsContent, GiftContent } from '../components/RoomModalContents';

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
  videoTrack: RemoteTrack | LocalVideoTrack | null;
}

interface GridConfig {
  rows: number;
  cols: number;
}

// Drawer panel types
type DrawerPanel = 'none' | 'chat' | 'gifts' | 'leaderboard' | 'stats' | 'options';

// Volume map for per-participant volume control
interface VolumeMap {
  [identity: string]: number; // 0-100
}

// ============================================================================
// CONTROL BAR COMPONENT (P1)
// ============================================================================

interface ControlBarProps {
  isLandscape: boolean;
  onExitPress: () => void;
  onChatPress: () => void;
  onGiftsPress: () => void;
  onLeaderboardPress: () => void;
  onStatsPress: () => void;
  onOptionsPress: () => void;
  bottomInset: number;
  rightInset: number;
}

function ControlBar({ 
  isLandscape, 
  onExitPress, 
  onChatPress, 
  onGiftsPress, 
  onLeaderboardPress, 
  onStatsPress, 
  onOptionsPress,
  bottomInset,
  rightInset 
}: ControlBarProps) {
  const buttons = [
    { icon: 'arrow-back', label: 'Exit', onPress: onExitPress, active: false },
    { icon: 'chatbubble-ellipses', label: 'Chat', onPress: onChatPress },
    { icon: 'gift', label: 'Gifts', onPress: onGiftsPress },
    { icon: 'trophy', label: 'Board', onPress: onLeaderboardPress },
    { icon: 'stats-chart', label: 'Stats', onPress: onStatsPress },
    { icon: 'settings', label: 'Options', onPress: onOptionsPress },
  ];

  return (
    <View style={[
      styles.controlBar, 
      isLandscape ? styles.controlBarLandscape : styles.controlBarPortrait,
      { 
        paddingBottom: isLandscape ? 0 : Math.max(bottomInset, 8),
        paddingRight: isLandscape ? rightInset : 0
      }
    ]}>
      {buttons.map((btn, idx) => (
        <TouchableOpacity 
          key={idx} 
          style={[
            styles.controlButton, 
            isLandscape && styles.controlButtonLandscape,
            btn.active && styles.controlButtonActive
          ]}
          onPress={btn.onPress}
        >
          <Ionicons 
            name={btn.icon as any} 
            size={22} 
            color={btn.active ? '#4a90d9' : '#fff'} 
          />
          <Text style={[
            styles.controlButtonText, 
            isLandscape && styles.controlButtonTextLandscape,
            btn.active && styles.controlButtonTextActive
          ]}>
            {btn.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// BOTTOM DRAWER COMPONENT (P1)
// ============================================================================

interface BottomDrawerProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  bottomInset: number;
  isLandscape: boolean;
}

function BottomDrawer({ visible, title, onClose, children, bottomInset, isLandscape }: BottomDrawerProps) {
  const slideAnim = useRef(new Animated.Value(isLandscape ? 400 : 0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: isLandscape ? 400 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isLandscape, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Animated.View
          style={[
            isLandscape ? styles.drawerContainerLandscape : styles.drawerContainer,
            {
              paddingBottom: isLandscape ? 0 : Math.max(bottomInset, 16),
              transform: isLandscape 
                ? [{ translateX: slideAnim }]
                : [{ translateY: slideAnim }]
            }
          ]}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={[
              styles.drawerHeader,
              isLandscape && styles.drawerHeaderLandscape
            ]}>
              <Text style={[
                styles.drawerTitle,
                isLandscape && styles.drawerTitleLandscape
              ]}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={isLandscape ? 28 : 24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={[
                styles.drawerContent,
                isLandscape && styles.drawerContentLandscape
              ]} 
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}


// ============================================================================
// TILE ACTION SHEET COMPONENT (P2)
// ============================================================================

interface TileActionSheetProps {
  visible: boolean;
  participant: Participant | null;
  slotIndex: number;
  isLocal: boolean;
  isMuted: boolean;
  volume: number;
  canModerate: boolean;
  onClose: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (value: number) => void;
  onReplace: () => void;
  onKick: () => void;
  onViewProfile: () => void;
  bottomInset: number;
}

function TileActionSheet({
  visible,
  participant,
  slotIndex,
  isLocal,
  isMuted,
  volume,
  canModerate,
  onClose,
  onMuteToggle,
  onVolumeChange,
  onReplace,
  onKick,
  onViewProfile,
  bottomInset,
}: TileActionSheetProps) {
  if (!visible) return null;

  const displayName = isLocal ? 'You' : (participant?.identity?.replace(/^u_/, '').split(':')[0] || 'Unknown');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Pressable style={[styles.actionSheetContainer, { paddingBottom: Math.max(bottomInset, 16) }]} onPress={e => e.stopPropagation()}>
          <View style={styles.actionSheetHeader}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>{displayName}</Text>
            <Text style={styles.actionSheetSubtitle}>Slot {slotIndex + 1}</Text>
          </View>

          {/* Mute toggle */}
          {!isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onMuteToggle}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
              <Text style={styles.actionSheetRowText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
          )}

          {/* Volume slider */}
          {!isLocal && (
            <View style={styles.actionSheetVolumeRow}>
              <Ionicons name="volume-low" size={18} color="#888" />
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={100}
                value={volume}
                onValueChange={onVolumeChange}
                minimumTrackTintColor="#4a90d9"
                maximumTrackTintColor="#444"
                thumbTintColor="#fff"
              />
              <Ionicons name="volume-high" size={18} color="#888" />
            </View>
          )}

          {/* Replace */}
          <TouchableOpacity style={styles.actionSheetRow} onPress={onReplace}>
            <Ionicons name="swap-horizontal" size={22} color="#fff" />
            <Text style={styles.actionSheetRowText}>Replace</Text>
          </TouchableOpacity>

          {/* Kick (moderator only) */}
          {canModerate && !isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onKick}>
              <Ionicons name="remove-circle" size={22} color="#ff6b6b" />
              <Text style={[styles.actionSheetRowText, { color: '#ff6b6b' }]}>Kick</Text>
            </TouchableOpacity>
          )}

          {/* View Profile */}
          {!isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onViewProfile}>
              <Ionicons name="person" size={22} color="#fff" />
              <Text style={styles.actionSheetRowText}>View Profile</Text>
            </TouchableOpacity>
          )}

          {/* Close */}
          <TouchableOpacity style={[styles.actionSheetRow, styles.actionSheetCloseRow]} onPress={onClose}>
            <Text style={styles.actionSheetCloseText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  localVideoTrack?: LocalVideoTrack | null;
  isLocalTile?: boolean | undefined;
  width: number;
  height: number;
  slotIndex: number;
  onTilePress: (slotIndex: number, participant: Participant | null) => void;
}

// FIX #2: Memoize VideoTile to prevent re-renders when other tiles change
const VideoTile = React.memo(({ participant, localVideoTrack, isLocalTile, width, height, slotIndex, onTilePress }: VideoTileProps) => {
  // VideoTile - renders video if participant exists, local preview if publishing, otherwise empty slot
  const hasVideo = participant?.videoTrack || (isLocalTile && localVideoTrack);
  const videoTrack = participant?.videoTrack || localVideoTrack;
  
  return (
    <TouchableOpacity 
      style={[styles.tile, { width, height }]}
      activeOpacity={0.7}
      onPress={() => onTilePress(slotIndex, participant)}
    >
      {hasVideo && videoTrack ? (
        <>
          <VideoView
            style={styles.videoView}
            videoTrack={videoTrack as any}
            objectFit="cover"
            mirror={isLocalTile} // Mirror local video (front camera)
          />
          {/* Local indicator */}
          {isLocalTile && (
            <View style={styles.localIndicator}>
              <Text style={styles.localIndicatorText}>YOU</Text>
            </View>
          )}
          {/* Invisible overlay to capture touches */}
          <View style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <View style={styles.tilePlaceholder}>
          {/* Plus icon for empty slots */}
          <Ionicons name="add-circle-outline" size={32} color="#666" />
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if this tile's props actually changed
  return (
    prevProps.participant?.id === nextProps.participant?.id &&
    prevProps.participant?.videoTrack === nextProps.participant?.videoTrack &&
    prevProps.localVideoTrack === nextProps.localVideoTrack &&
    prevProps.isLocalTile === nextProps.isLocalTile &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.slotIndex === nextProps.slotIndex
    // onTilePress is stable from useCallback
  );
});

// ============================================================================
// GRID CONTAINER COMPONENT
// ============================================================================

interface GridContainerProps {
  participants: Participant[];
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  onTilePress: (slotIndex: number, participant: Participant | null) => void;
  localVideoTrack?: LocalVideoTrack | null;
  localAudioTrack?: LocalAudioTrack | null;
}

function GridContainer({ participants, screenWidth, screenHeight, isLandscape, onTilePress, localVideoTrack, localAudioTrack }: GridContainerProps & { localVideoTrack?: LocalVideoTrack | null; localAudioTrack?: LocalAudioTrack | null }) {
  const { rows, cols } = getGridConfig(isLandscape);
  const tileWidth = screenWidth / cols;
  const tileHeight = screenHeight / rows;

  // Create local participant object if publishing
  const localParticipant = localVideoTrack ? {
    id: 'local',
    identity: 'You',
    videoTrack: localVideoTrack,
  } : null;

  // Combine local participant with remote participants
  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  // Build fixed 12-slot grid - empty slots render as placeholders
  const gridRows: React.ReactNode[] = [];
  let slotIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowTiles: React.ReactNode[] = [];
    for (let col = 0; col < cols; col++) {
      const currentSlotIndex = slotIndex;
      const participant = allParticipants[currentSlotIndex] || null;
      const isLocalTile = localParticipant && currentSlotIndex === 0 ? true : undefined; // Local user always goes in slot 0

      rowTiles.push(
        <VideoTile
          key={`slot-${currentSlotIndex}`}
          participant={isLocalTile ? null : participant}
          localVideoTrack={isLocalTile ? localVideoTrack : null}
          isLocalTile={isLocalTile}
          width={tileWidth}
          height={tileHeight}
          slotIndex={currentSlotIndex}
          onTilePress={onTilePress}
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
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Room slug from navigation params (same identifier as web)
  const slug = route.params?.slug || route.params?.roomKey || 'live-central';

  // Track screen dimensions for orientation detection using hook (auto-updates on rotation)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  // FIX #2: Status bar visibility - mount only, no orientation triggers
  useEffect(() => {
    RNStatusBar.setHidden(false, 'none');
    return () => RNStatusBar.setHidden(false, 'none');
  }, []);

  // Unlock orientation when RoomScreen is focused, lock back to portrait when leaving
  useFocusEffect(
    useCallback(() => {
      const unlockOrientation = async () => {
        try {
          await ScreenOrientation.unlockAsync();

          if (Platform.OS === 'ios') {
            RNStatusBar.setHidden(false, 'fade');
          }
        } catch (error) {
          // Silently fail
        }
      };

      unlockOrientation();

      return () => {
        const lockOrientation = async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          } catch (error) {
            // Silently fail
          }
        };

        lockOrientation();
      };
    }, [])
  );

  // Room state
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // LiveKit state
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const roomRef = useRef<Room | null>(null);
  
  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const isPublishingRef = useRef(false); // Ref for heartbeat closure
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  
  // Room presence state with heartbeat to keep presence alive
  const presenceActiveRef = useRef(false);
  const roomPresenceTableAvailableRef = useRef<boolean | null>(null);
  const hasRoomIdColumnRef = useRef<boolean | null>(null);
  // CRITICAL: Refs to capture current values for cleanup (empty deps useEffect has stale closures)
  const userRef = useRef(user);
  const roomConfigRef = useRef<RoomConfig | null>(null);

  // Keep refs in sync with current values for cleanup
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    roomConfigRef.current = roomConfig;
  }, [roomConfig]);

  // Group live stream state
  const groupLiveStreamIdRef = useRef<number | null>(null);

  // P1: Control bar and drawer state
  const [activeDrawer, setActiveDrawer] = useState<DrawerPanel>('none');
  
  // P2: Tile action sheet state
  const [tileActionTarget, setTileActionTarget] = useState<{
    slotIndex: number;
    participant: Participant | null;
    isLocal: boolean;
  } | null>(null);
  const [volumeMap, setVolumeMap] = useState<VolumeMap>({});
  const [mutedParticipants, setMutedParticipants] = useState<Set<string>>(new Set());

  // P1: Swipe gesture handling
  const swipeThreshold = 50;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture swipes if gesture is significant
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 20 || Math.abs(dy) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Determine swipe direction
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical swipe
          if (dy < -swipeThreshold) {
            // Swipe up from anywhere -> Chat
            setActiveDrawer('chat');
          } else if (dy > swipeThreshold) {
            // Swipe down from anywhere -> Leaderboard
            setActiveDrawer('leaderboard');
          }
        } else {
          // Horizontal swipe
          if (dx < -swipeThreshold) {
            // Swipe R->L -> Stats
            setActiveDrawer('stats');
          } else if (dx > swipeThreshold) {
            // Swipe L->R -> Options
            setActiveDrawer('options');
          }
        }
      },
    })
  ).current;

  // Normalize room ID to match web (live-central -> live_central)
  const normalizedRoomId = useCallback((roomKey: string | undefined) => {
    const raw = roomKey || 'live_central';
    if (raw === 'live-central') return 'live_central';
    return raw;
  }, []);

  // Update room presence (event-driven only: call on explicit user actions)
  // - On join: updateRoomPresence(true, false)
  // - On start publishing: updateRoomPresence(true, true)
  // - On stop publishing: updateRoomPresence(true, false)
  // - On leave: updateRoomPresence(false)
  const updateRoomPresence = useCallback(async (isPresent: boolean, isLiveAvailable: boolean = false) => {
    if (!user) return;
    if (roomPresenceTableAvailableRef.current === false) return;

    const username = user.email?.split('@')[0] || user.id;
    const roomId = normalizedRoomId(roomConfig?.room_key);

    try {
      if (isPresent) {
        const baseRow: Record<string, any> = {
          profile_id: user.id,
          username,
          is_live_available: isLiveAvailable,
          last_seen_at: new Date().toISOString(),
        };

        if (hasRoomIdColumnRef.current !== false) {
          baseRow.room_id = roomId;
        }

        const { error } = await supabase.from('room_presence').upsert(baseRow);
        
        if (error) {
          if (error.code === '42703' || String(error.message || '').includes('room_id')) {
            hasRoomIdColumnRef.current = false;
            const fallbackRow = { ...baseRow };
            delete fallbackRow.room_id;
            const { error: fallbackError } = await supabase.from('room_presence').upsert(fallbackRow);
            if (fallbackError) {
              if (fallbackError.code === '42P01') {
                roomPresenceTableAvailableRef.current = false;
              }
              return;
            }
          } else if (error.code === '42P01') {
            roomPresenceTableAvailableRef.current = false;
            return;
          } else {
            console.error('[RoomScreen] presence upsert error:', error);
            return;
          }
        }

        presenceActiveRef.current = true;
        roomPresenceTableAvailableRef.current = true;
      } else {
        // CRITICAL: Include room_id in delete to only remove THIS room's presence
        const { error } = await supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', user.id)
          .eq('room_id', roomId);
        if (error && error.code !== '42P01') {
          console.error('[RoomScreen] presence delete error:', error);
        }
        presenceActiveRef.current = false;
      }
    } catch (err) {
      console.error('[RoomScreen] presence error:', err);
    }
  }, [user, roomConfig?.room_key, normalizedRoomId]);

  // Start publishing to the room (publish to existing connected session)
  const startPublishing = useCallback(async () => {
    const room = roomRef.current;
    
    if (!user || isPublishing || !room) {
      return;
    }

    try {
      setIsPublishing(true);
      isPublishingRef.current = true;

      // FIX #3: Lower video encoding - 540p @ 24fps
      const { createLocalTracks, VideoPresets } = await import('livekit-client');

      const tracks = await createLocalTracks({
        audio: true,
        video: {
          facingMode: 'user',
          resolution: VideoPresets.h540.resolution,
        },
      });

      for (const track of tracks) {
        // Publish with reduced bitrate and framerate
        if (track.kind === 'video') {
          await room.localParticipant.publishTrack(track, {
            videoEncoding: {
              maxBitrate: 800_000,
              maxFramerate: 24,
            },
          });
          setLocalVideoTrack(track as LocalVideoTrack);
        } else if (track.kind === 'audio') {
          await room.localParticipant.publishTrack(track);
          setLocalAudioTrack(track as LocalAudioTrack);
        }
      }

      await room.localParticipant.setMetadata(JSON.stringify({
        videoAspect: 'portrait',
        focus: 'top',
      }));

      const { liveStreamId, error: streamError } = await startLiveStreamRecord(user.id, 'group');
      if (!streamError && liveStreamId) {
        groupLiveStreamIdRef.current = liveStreamId;
      }

      updateRoomPresence(true, true);

      Alert.alert('Live!', 'You are now streaming in the room!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start streaming. Please try again.');
      setIsPublishing(false);
      isPublishingRef.current = false;
    }
  }, [user, isPublishing, updateRoomPresence]);

  // Handle tile press - empty slot = join, occupied = show action sheet (P2)
  const handleTilePress = useCallback((slotIndex: number, participant: Participant | null) => {
    const isLocalTile = slotIndex === 0 && localVideoTrack;

    if (isLocalTile) {
      setTileActionTarget({
        slotIndex,
        participant: {
          id: 'local',
          identity: 'You',
          videoTrack: localVideoTrack,
        },
        isLocal: true,
      });
      return;
    }

    if (!participant) {
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to join the room.');
        return;
      }

      if (isPublishing) {
        Alert.alert('Already Streaming', 'You are already streaming in this room.');
        return;
      }

      startPublishing();
    } else {
      setTileActionTarget({ slotIndex, participant, isLocal: false });
    }
  }, [user, isPublishing, startPublishing, localVideoTrack]);

  // P2: Tile action handlers
  const handleMuteToggle = useCallback(() => {
    if (!tileActionTarget?.participant) return;
    const identity = tileActionTarget.participant.identity;
    setMutedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(identity)) {
        next.delete(identity);
      } else {
        next.add(identity);
      }
      return next;
    });
  }, [tileActionTarget]);

  const handleVolumeChange = useCallback((value: number) => {
    if (!tileActionTarget?.participant) return;
    const identity = tileActionTarget.participant.identity;
    setVolumeMap(prev => ({ ...prev, [identity]: value }));
  }, [tileActionTarget]);

  const handleReplace = useCallback(() => {
    console.log('[RoomScreen] Replace tapped for slot:', tileActionTarget?.slotIndex);
    // TODO: Implement replace flow
    setTileActionTarget(null);
  }, [tileActionTarget]);

  const handleKick = useCallback(() => {
    console.log('[RoomScreen] Kick tapped for:', tileActionTarget?.participant?.identity);
    // TODO: Implement kick flow
    setTileActionTarget(null);
  }, [tileActionTarget]);

  const handleViewProfile = useCallback(() => {
    console.log('[RoomScreen] View profile tapped for:', tileActionTarget?.participant?.identity);
    // TODO: Navigate to profile
    setTileActionTarget(null);
  }, [tileActionTarget]);

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
              can_publish: true, // Allow publishing in fallback mode
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

    // Check if user can publish (like web does)
    // For Live Central and similar rooms, allow publishing by default for authenticated users
    const canPublish = !!user && (roomConfig.room_key === 'live_central' ||
                                   roomConfig.slug === 'live-central' ||
                                   roomConfig.permissions?.can_publish === true);

    // Use room_key as LiveKit room name (matches web: roomConfig.roomId)
    // Web uses 'live_central' (underscore) for LiveKit room name
    // Handle both slug format (live-central) and room_key format (live_central)
    let liveKitRoomName = roomConfig.room_key;

    // Special case: Live Central uses underscore format for LiveKit
    if (liveKitRoomName === 'live-central' || roomConfig.slug === 'live-central') {
      liveKitRoomName = 'live_central';
    }

    try {
      const identity = user ? `u_${user.id}` : `anon-${Date.now()}`;
      const displayName = user?.email?.split('@')[0] || user?.id || 'Viewer';

      const { token, url } = await fetchMobileToken(
        liveKitRoomName,
        identity,
        displayName,
        canPublish
      );

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // FIX #5: Silent event handlers - no logging
      room.on(RoomEvent.Connected, () => {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone) {
              if (!pub.isSubscribed) {
                try {
                  pub.setSubscribed(true);
                } catch (err) {
                  // Silently fail
                }
              }
            }
          });
        });
        
        setLiveKitRoom(room);
        setIsConnected(true);
        updateParticipants(room);
        updateRoomPresence(true, false);
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        setIsConnected(false);
        setParticipants([]);
        updateRoomPresence(false);
        
        const currentUser = userRef.current;
        if (groupLiveStreamIdRef.current && currentUser) {
          endLiveStreamRecord(currentUser.id);
          groupLiveStreamIdRef.current = null;
        }
        
        setIsPublishing(false);
        isPublishingRef.current = false;
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone) {
            if (!pub.isSubscribed) {
              try {
                pub.setSubscribed(true);
              } catch (err) {
                // Silently fail
              }
            }
          }
        });
        
        setParticipants(prev => {
          if (prev.some(p => p.id === participant.sid)) {
            return prev;
          }
          
          let videoTrack: RemoteTrack | null = null;
          participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
            if (pub.kind === Track.Kind.Video && pub.track) {
              videoTrack = pub.track as RemoteTrack;
            }
          });
          
          if (videoTrack) {
            return [...prev, {
              id: participant.sid,
              identity: participant.identity,
              videoTrack,
            }];
          }
          
          return prev;
        });
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants(prev => prev.filter(p => p.id !== participant.sid));
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          setParticipants(prev => {
            const index = prev.findIndex(p => p.id === participant.sid);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = { ...updated[index], videoTrack: track };
              return updated;
            } else {
              return [...prev, {
                id: participant.sid,
                identity: participant.identity,
                videoTrack: track,
              }];
            }
          });
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          setParticipants(prev => prev.filter(p => p.id !== participant.sid));
        }
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        if (publication.source === Track.Source.Camera || publication.source === Track.Source.Microphone) {
          if (!publication.isSubscribed) {
            try {
              publication.setSubscribed(true);
            } catch (err) {
              // Silently fail
            }
          }
        }
      });

      await room.connect(url, token);
      
      roomRef.current = room;
      // Note: setLiveKitRoom(room) is now called INSIDE RoomEvent.Connected handler (line ~1080)
      // This ensures liveKitRoom state is only set after successful connection
    } catch (err: any) {
      console.error('[RoomScreen] LiveKit connection error:', err);
      setError(err?.message || 'Failed to connect to live room');
    }
  }, [roomConfig, user, updateParticipants, updateRoomPresence]);

  // Connect to LiveKit when room config is loaded
  useEffect(() => {
    console.log('[RoomScreen] 🔌 Connection useEffect - roomConfig:', !!roomConfig, 'liveKitRoom:', !!liveKitRoom, 'roomRef:', !!roomRef.current);
    
    // CRITICAL FIX: Check if room state matches ref (hot reload can desync them)
    const roomStateValid = liveKitRoom && roomRef.current === liveKitRoom;
    
    if (roomConfig && !roomStateValid) {
      console.log('[RoomScreen] 🔌 Triggering connectToLiveKit() - roomStateValid:', roomStateValid);
      connectToLiveKit();
    } else {
      console.log('[RoomScreen] 🔌 Skipping connection - roomStateValid:', roomStateValid, 'hasConfig:', !!roomConfig);
    }
  }, [roomConfig, liveKitRoom, connectToLiveKit]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('[RoomScreen] Component unmounting, disconnecting room');
      
      // CRITICAL: Use refs for cleanup since empty deps means stale closures
      const currentUser = userRef.current;
      const currentRoomConfig = roomConfigRef.current;
      
      // End group live stream if publishing
      if (groupLiveStreamIdRef.current && currentUser) {
        console.log('[RoomScreen] group live_stream ended', { streamId: groupLiveStreamIdRef.current });
        endLiveStreamRecord(currentUser.id);
        groupLiveStreamIdRef.current = null;
      }
      
      // Clear presence (fire and forget)
      // CRITICAL: Include room_id to only remove THIS room's presence
      if (currentUser && presenceActiveRef.current && currentRoomConfig?.room_key) {
        const roomId = currentRoomConfig.room_key === 'live-central' ? 'live_central' : currentRoomConfig.room_key;
        console.log('[RoomScreen] Clearing presence on unmount...', { roomId, profileId: currentUser.id });
        supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', currentUser.id)
          .eq('room_id', roomId)
          .then(({ error }) => {
            if (error) {
              console.error('[RoomScreen] presence delete error on unmount:', error);
            } else {
              console.log('[RoomScreen] presence cleared on unmount', { roomId });
            }
          });
      } else {
        console.log('[RoomScreen] Skipping presence cleanup:', { 
          hasUser: !!currentUser, 
          presenceActive: presenceActiveRef.current, 
          hasRoomKey: !!currentRoomConfig?.room_key 
        });
      }
      
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []); // Empty deps - only run on unmount

  // Calculate safe dimensions that respect all safe area insets
  // Control bar: 60px height at bottom (portrait) OR 40px width at right (landscape)
  const CONTROL_BAR_SIZE = isLandscape ? 40 : 60;
  
  // Grid wrapper padding: ONLY safe area insets (NOT control bar space)
  const gridPaddingTop = insets.top;
  const gridPaddingBottom = insets.bottom;
  const gridPaddingLeft = insets.left;
  const gridPaddingRight = insets.right;
  
  // Grid dimensions: subtract BOTH safe area padding AND control bar space
  const safeGridHeight = screenHeight - gridPaddingTop - gridPaddingBottom - (isLandscape ? 0 : CONTROL_BAR_SIZE);
  const safeGridWidth = screenWidth - gridPaddingLeft - gridPaddingRight - (isLandscape ? CONTROL_BAR_SIZE : 0);

  // Always render the grid - overlay loading/error states on top
  // Grid MUST respect all safe area insets (notch, home bar, left/right in landscape)
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar
        style="light"
        backgroundColor="#000000"
        hidden={false}
        translucent={true}
      />
      {/* Grid wrapper with safe area padding for notch + home bar + control bar */}
      <View style={[styles.gridWrapper, {
        paddingTop: gridPaddingTop,
        paddingBottom: gridPaddingBottom,
        paddingLeft: gridPaddingLeft,
        paddingRight: gridPaddingRight
      }]}>
        <GridContainer
          participants={participants}
          screenWidth={safeGridWidth}
          screenHeight={safeGridHeight}
          isLandscape={isLandscape}
          onTilePress={handleTilePress}
          localVideoTrack={localVideoTrack}
          localAudioTrack={localAudioTrack}
        />
      </View>
      
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

      {/* P1: Control Bar (portrait only) */}
      <ControlBar
        isLandscape={isLandscape}
        onExitPress={() => navigation.goBack()}
        onChatPress={() => setActiveDrawer('chat')}
        onGiftsPress={() => setActiveDrawer('gifts')}
        onLeaderboardPress={() => setActiveDrawer('leaderboard')}
        onStatsPress={() => setActiveDrawer('stats')}
        onOptionsPress={() => setActiveDrawer('options')}
        bottomInset={insets.bottom}
        rightInset={insets.right}
      />

      {/* P1: Bottom Drawer Panels */}
      <BottomDrawer
        visible={activeDrawer === 'chat'}
        title="Chat"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <ChatContent roomSlug={slug} />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'gifts'}
        title="Send Gift"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <GiftContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'leaderboard'}
        title="Leaderboard"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <LeaderboardContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'stats'}
        title="Stats"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <StatsContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'options'}
        title="Options"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <OptionsContent />
      </BottomDrawer>

      {/* P2: Tile Action Sheet */}
      <TileActionSheet
        visible={tileActionTarget !== null}
        participant={tileActionTarget?.participant || null}
        slotIndex={tileActionTarget?.slotIndex || 0}
        isLocal={tileActionTarget?.isLocal || false}
        isMuted={tileActionTarget?.participant ? mutedParticipants.has(tileActionTarget.participant.identity) : false}
        volume={tileActionTarget?.participant ? (volumeMap[tileActionTarget.participant.identity] ?? 100) : 100}
        canModerate={roomConfig?.permissions?.can_moderate || false}
        onClose={() => setTileActionTarget(null)}
        onMuteToggle={handleMuteToggle}
        onVolumeChange={handleVolumeChange}
        onReplace={handleReplace}
        onKick={handleKick}
        onViewProfile={handleViewProfile}
        bottomInset={insets.bottom}
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
  gridWrapper: {
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
    // Remove borders for seamless full-screen video grid
  },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
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
  publishingIndicator: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishingText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCard: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    width: 280,
    alignItems: 'center',
  },
  playerCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playerAvatar: {
    marginBottom: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerSlot: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  playerCardActions: {
    width: '100%',
    gap: 10,
  },
  playerCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a90d9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  playerCardButtonSecondary: {
    backgroundColor: '#333',
  },
  playerCardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerCardButtonTextSecondary: {
    color: '#999',
  },
  // P1: Control Bar styles
  controlBar: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  controlBarPortrait: {
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  controlBarLandscape: {
    top: 0,
    bottom: 0,
    right: 0,  // Container stays at right edge
    width: 40,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 50,
  },
  controlButtonLandscape: {
    minWidth: 0,
    width: 36,
    paddingVertical: 4,
    paddingHorizontal: 1,  // Reduce horizontal padding to prevent text wrapping
  },
  controlButtonActive: {
    backgroundColor: 'rgba(74, 144, 217, 0.2)',
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  controlButtonTextLandscape: {
    fontSize: 8,  // Smaller font in landscape to prevent wrapping
    marginTop: 1,
  },
  controlButtonTextActive: {
    color: '#4a90d9',
  },
  // P1: Bottom Drawer styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 200,
  },
  drawerContainerLandscape: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    maxWidth: 400,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  drawerHeaderLandscape: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  drawerTitleLandscape: {
    fontSize: 22,
  },
  drawerContent: {
    padding: 20,
  },
  drawerContentLandscape: {
    padding: 24,
    paddingTop: 16,
  },
  drawerPlaceholder: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  // Chat styles
  chatContainer: {
    flex: 1,
    minHeight: 300,
  },
  chatLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  chatUsername: {
    color: '#4a90d9',
    fontWeight: '600',
    marginRight: 6,
  },
  chatMessageText: {
    color: '#fff',
    flex: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chatSendButton: {
    padding: 8,
  },
  // Gift styles
  giftContainer: {
    flex: 1,
    minHeight: 400,
  },
  giftLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftBalanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    margin: 12,
    marginBottom: 0,
  },
  giftBalanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  giftBalanceAmount: {
    color: '#4a90d9',
    fontSize: 16,
    fontWeight: '600',
  },
  giftList: {
    flex: 1,
  },
  giftListContent: {
    padding: 12,
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  giftItemSelected: {
    borderColor: '#4a90d9',
  },
  giftEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  giftInfo: {
    flex: 1,
  },
  giftName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  giftCost: {
    color: '#888',
    fontSize: 14,
  },
  giftSendBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  giftSendText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  giftSendButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  giftSendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Leaderboard styles
  leaderboardContainer: {
    flex: 1,
    minHeight: 400,
  },
  leaderboardTabs: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 0,
  },
  leaderboardTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  leaderboardTabActive: {
    borderBottomColor: '#4a90d9',
  },
  leaderboardTabText: {
    color: '#888',
    fontWeight: '600',
  },
  leaderboardTabTextActive: {
    color: '#4a90d9',
  },
  leaderboardPeriodTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  leaderboardPeriodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  leaderboardPeriodTabActive: {
    backgroundColor: '#4a90d9',
  },
  leaderboardPeriodTabText: {
    color: '#888',
    fontSize: 12,
  },
  leaderboardPeriodTabTextActive: {
    color: '#fff',
  },
  leaderboardLoading: {
    padding: 40,
    alignItems: 'center',
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leaderboardRank: {
    color: '#4a90d9',
    fontWeight: '600',
    width: 40,
  },
  leaderboardUsername: {
    color: '#fff',
    flex: 1,
  },
  leaderboardValue: {
    color: '#888',
  },
  // Stats styles
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statItem: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#4a90d9',
    fontSize: 32,
    fontWeight: '600',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  // Options styles
  optionsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  optionsText: {
    color: '#888',
    fontSize: 14,
  },
  // P2: Tile Action Sheet styles
  actionSheetContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginBottom: 12,
  },
  actionSheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionSheetSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionSheetRowText: {
    color: '#fff',
    fontSize: 16,
  },
  actionSheetVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  actionSheetCloseRow: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
  },
  actionSheetCloseText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  // Local indicator styles
  localIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
