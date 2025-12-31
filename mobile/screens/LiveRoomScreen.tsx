/**
 * LiveRoomScreen - LANDSCAPE-ONLY Controller-Style UI
 * 
 * Features:
 * - Forces landscape orientation
 * - 12-tile camera grid (edge-to-edge, 0 padding)
 * - Side controllers (game-pad style)
 * - Swipe gestures for overlays
 * - Data parity with Web LiveRoom
 * 
 * Mode support:
 * - solo: Standard 12-grid layout with all controls
 * - battle: Cameras-only TikTok battle layout (minimal UI, portrait preferred)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions, Share, Alert } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Grid12 } from '../components/live/Grid12';
import { ChatOverlay } from '../overlays/ChatOverlay';
import { ViewersLeaderboardsOverlay } from '../overlays/ViewersLeaderboardsOverlay';
import { StatsOverlay } from '../overlays/StatsOverlay';
import { GiftOverlay } from '../overlays/GiftOverlay';
import { DebugPill } from '../components/DebugPill';
import { useLiveRoomUI } from '../state/liveRoomUI';
import { useLiveRoomParticipants } from '../hooks/useLiveRoomParticipants';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useThemeMode } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { OptionsMenu } from '../components/OptionsMenu';
import { MixerModal } from '../components/MixerModal';

const SWIPE_THRESHOLD = 50;
const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';
const ROOM_NAME = 'live_central';

type LiveRoomScreenProps = {
  mode?: 'solo' | 'battle';
  enabled?: boolean;
  onExitLive?: () => void;
  onNavigateToRooms?: () => void;
  onNavigateWallet: () => void;
};

export const LiveRoomScreen: React.FC<LiveRoomScreenProps> = ({ mode = 'solo', enabled = false, onExitLive, onNavigateToRooms, onNavigateWallet }) => {
  // 🔒 KEEP SCREEN AWAKE (prevent screen timeout)
  useKeepAwake();

  const navigation = useNavigation<any>();
  
  // Get safe area insets for proper button placement
  const insets = useSafeAreaInsets();
  
  // Track current user for room presence
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [targetRecipientId, setTargetRecipientId] = useState<string | null>(null);
  const [localMicEnabled, setLocalMicEnabled] = useState<boolean>(false);
  const [localCamEnabled, setLocalCamEnabled] = useState<boolean>(false);
  const likePressCooldownRef = useRef<number>(0);
  const goLivePressInFlightRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  // Modal states for Mixer (Options uses overlay system for parity with swipe-right menu)
  const [showMixerModal, setShowMixerModal] = useState(false);

  useEffect(() => {
    console.log('[LIVE_CRASH_FIX] live_room_screen_render', { enabled });
  }, [enabled]);
  
  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({ id: user.id, username: profile.username });
        }
      }
    };
    
    if (enabled) {
      loadUser();
    }
  }, [enabled]);

  // Track room presence
  useRoomPresence({
    userId: currentUser?.id || null,
    username: currentUser?.username || null,
    enabled: enabled && !!currentUser,
  });

  // UI state management
  const { 
    state, 
    openOverlay, 
    closeOverlay,
    enterEditMode,
    exitEditMode,
    setFocusedIdentity,
    initializeTileSlots,
  } = useLiveRoomUI();
  
  // LiveKit streaming hook
  const {
    participants,
    isConnected,
    tileCount,
    room,
    goLive,
    stopLive,
    isLive,
    isPublishing,
    connectionError,
    lastTokenEndpoint,
    lastTokenError,
    lastWsUrl,
    lastConnectError,
  } = useLiveRoomParticipants({ enabled });
  const { theme } = useThemeMode();

  const liveError = connectionError || lastConnectError || lastTokenError?.message || null;

  const canPublish = useMemo(() => {
    try {
      return room?.localParticipant?.permissions?.canPublish === true;
    } catch {
      return false;
    }
  }, [room]);

  useEffect(() => {
    const local = participants.find((p) => p.isLocal);
    if (!local) return;
    setLocalMicEnabled(!!local.isMicEnabled);
    setLocalCamEnabled(!!local.isCameraEnabled);
  }, [participants]);

  const parseProfileIdFromIdentity = useCallback((identityRaw: string | null): string | null => {
    const identity = typeof identityRaw === 'string' ? identityRaw : '';
    if (!identity) return null;
    if (identity.startsWith('u_')) {
      const rest = identity.slice('u_'.length);
      const profileId = rest.split(':')[0];
      return profileId || null;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity)) {
      return identity;
    }
    return null;
  }, []);

  const setRemoteAudioMuted = useCallback((muted: boolean, focusedIdentity?: string) => {
    if (!room) return;
    let changedCount = 0;

    room.remoteParticipants.forEach((participant) => {
      if (focusedIdentity && participant.identity === focusedIdentity) return;
      participant.audioTrackPublications.forEach((publication) => {
        const track: any = publication.track;
        if (!track) return;
        if (typeof track.setMuted === 'function') {
          track.setMuted(muted);
          changedCount++;
          return;
        }
        if (typeof track.setVolume === 'function') {
          track.setVolume(muted ? 0 : 1);
          changedCount++;
        }
      });
    });

    return changedCount;
  }, [room]);

  const getSlotIdentity = useCallback((slotIndex: number): string | null => {
    if (slotIndex < 0 || slotIndex > 11) return null;

    // Match Grid12 slot assignment behavior
    if (!state.tileSlots || state.tileSlots.length === 0) {
      return participants[slotIndex]?.identity ?? null;
    }

    const participantMap = new Map(participants.map(p => [p.identity, p] as const));
    const assigned: Array<string | null> = new Array(12).fill(null);

    for (let idx = 0; idx < 12; idx++) {
      const identity = state.tileSlots[idx];
      if (identity && participantMap.has(identity)) {
        assigned[idx] = identity;
      }
    }

    const used = new Set(assigned.filter(Boolean) as string[]);
    const remaining = participants.filter(p => !used.has(p.identity));
    let remainingIdx = 0;
    for (let i = 0; i < assigned.length && remainingIdx < remaining.length; i++) {
      if (!assigned[i]) {
        assigned[i] = remaining[remainingIdx++].identity;
      }
    }

    return assigned[slotIndex] ?? null;
  }, [participants, state.tileSlots]);

  const setSlotVolume = useCallback((slotIndex: number, value: number) => {
    if (!room) return;

    const identity = getSlotIdentity(slotIndex);
    if (!identity) return;

    const target: any =
      (room.localParticipant && room.localParticipant.identity === identity
        ? room.localParticipant
        : room.remoteParticipants.get(identity));

    if (!target) return;

    const clamped = Math.max(0, Math.min(1, value));
    target.audioTrackPublications?.forEach?.((publication: any) => {
      const track: any = publication?.track;
      if (!track) return;

      if (typeof track.setVolume === 'function') {
        track.setVolume(clamped);
        return;
      }
      if (typeof track.setMuted === 'function') {
        track.setMuted(clamped <= 0.001);
      }
    });
  }, [getSlotIdentity, room]);

  /**
   * Swipe gesture handler
   * Maps swipe directions to overlay actions:
   * - UP: Chat
   * - DOWN: Viewers/Leaderboards
   * - RIGHT: Menu
   * - LEFT: Stats
   * 
   * DISABLED when:
   * - Edit mode is active
   * - Focus mode is active
   */
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;

      // GESTURE PRIORITY: Disable swipes during edit or focus mode
      if (state.isEditMode) {
        if (DEBUG) console.log('[GESTURE] Swipe blocked → edit mode active');
        return;
      }
      if (state.focusedIdentity) {
        if (DEBUG) console.log('[GESTURE] Swipe blocked → focus mode active');
        return;
      }

      // Don't handle swipes if an overlay is already open
      if (state.activeOverlay !== null) return;

      // Determine primary swipe direction
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absY > absX) {
        // Vertical swipe
        if (translationY < -SWIPE_THRESHOLD && velocityY < -300) {
          // Swipe UP → Chat
          openOverlay('chat');
        } else if (translationY > SWIPE_THRESHOLD && velocityY > 300) {
          // Swipe DOWN → Viewers/Leaderboards
          openOverlay('viewers');
        }
      } else {
        // Horizontal swipe
        if (translationX > SWIPE_THRESHOLD && velocityX > 300) {
          // Swipe RIGHT → Menu
          openOverlay('menu');
        } else if (translationX < -SWIPE_THRESHOLD && velocityX < -300) {
          // Swipe LEFT → Stats
          openOverlay('stats');
        }
      }
    });

  const handleCloseOverlay = () => {
    closeOverlay();
  };

  const handleToggleGoLive = useCallback(async () => {
    if (goLivePressInFlightRef.current) return;
    goLivePressInFlightRef.current = true;

    try {
      if (!currentUser?.id) {
        Alert.alert('Login required', 'Please log in to go live.');
        return;
      }

      if (!isConnected) {
        const msg = [
          `TOKEN_ENDPOINT=${lastTokenEndpoint || ''}`,
          `TOKEN_STATUS=${lastTokenError?.status ?? 'no response'}`,
          `TOKEN_BODY=${lastTokenError?.bodySnippet || ''}`,
          `LIVEKIT_WS_URL=${lastWsUrl || ''}`,
          `CONNECT_ERROR=${lastConnectError || ''}`,
        ].join('\n');
        Alert.alert('Live error', msg);
        return;
      }

      if (!canPublish) {
        Alert.alert('Not allowed', 'This account is not allowed to publish live streams.');
        return;
      }

      if (isLive) {
        await stopLive();
      } else {
        await goLive();
      }
    } catch (err: any) {
      Alert.alert('Live error', err?.message || 'Failed to toggle live');
    } finally {
      goLivePressInFlightRef.current = false;
    }
  }, [canPublish, currentUser?.id, goLive, isConnected, isLive, lastConnectError, lastTokenEndpoint, lastTokenError?.bodySnippet, lastTokenError?.status, lastWsUrl, stopLive]);

  const handleToggleMic = useCallback(async () => {
    if (!room || room.state !== 'connected') return;
    if (!canPublish) return;
    try {
      const next = !localMicEnabled;
      setLocalMicEnabled(next);
      await room.localParticipant.setMicrophoneEnabled(next);
    } catch (err: any) {
      setLocalMicEnabled((prev) => !prev);
      Alert.alert('Mic error', err?.message || 'Failed to toggle microphone');
    }
  }, [canPublish, localMicEnabled, room]);

  const handleToggleCam = useCallback(async () => {
    if (!room || room.state !== 'connected') return;
    if (!canPublish) return;
    try {
      const next = !localCamEnabled;
      setLocalCamEnabled(next);
      await room.localParticipant.setCameraEnabled(next);
    } catch (err: any) {
      setLocalCamEnabled((prev) => !prev);
      Alert.alert('Camera error', err?.message || 'Failed to toggle camera');
    }
  }, [canPublish, localCamEnabled, room]);

  const handleEndStreamPress = useCallback(() => {
    if (!isLive) return;
    Alert.alert('End stream', 'End your live stream now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            await stopLive();
          } catch (err: any) {
            Alert.alert('End failed', err?.message || 'Failed to end stream');
          }
        },
      },
    ]);
  }, [isLive, stopLive]);

  const handleReportPress = useCallback(() => {
    const identity = state.focusedIdentity || targetRecipientId;
    const profileId = parseProfileIdFromIdentity(identity);
    if (!profileId) {
      Alert.alert('Select someone', 'Select a participant to report (pick a gift recipient or focus a tile).');
      return;
    }

    const p = participants.find((x) => x.identity === identity);
    const reportedUsername = p?.username || undefined;

    try {
      navigation.getParent?.()?.navigate?.('ReportUser', {
        reportedUserId: profileId,
        reportedUsername,
      });
    } catch {
      try {
        navigation.navigate?.('ReportUser', {
          reportedUserId: profileId,
          reportedUsername,
        });
      } catch {
        Alert.alert('Navigation error', 'Could not open report screen.');
      }
    }
  }, [navigation, participants, parseProfileIdFromIdentity, state.focusedIdentity, targetRecipientId]);

  const handleGiftPress = useCallback(() => {
    openOverlay('gift');
  }, [openOverlay]);

  const handleLikePress = useCallback(async () => {
    const now = Date.now();
    if (now - likePressCooldownRef.current < 600) return;
    likePressCooldownRef.current = now;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login required', 'Please log in to like.');
        return;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          profile_id: user.id,
          message_type: 'emoji',
          content: '❤️',
          room_id: ROOM_NAME,
          live_stream_id: null,
        } as any);

      if (error) {
        console.error('[LIKE] insert failed', error);
      }
    } catch (err) {
      console.error('[LIKE] failed', err);
    }
  }, []);

  const handleSharePress = useCallback(async () => {
    try {
      const roomName = 'live_central';
      const handle = currentUser?.username ? `@${currentUser.username}` : 'MyLiveLinks';
      const url = `https://www.mylivelinks.com/rooms?room=${encodeURIComponent(roomName)}`;

      await Share.share({
        message: `${handle} is live in ${roomName}. Join: ${url}`,
        url,
        title: `${handle} • ${roomName}`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Could not open share sheet');
    }
  }, [currentUser?.username]);

  const handleOptionsPress = useCallback(() => {
    openOverlay('menu');
  }, [openOverlay]);

  const handleMixerPress = useCallback(() => {
    setShowMixerModal(true);
  }, []);

  const handleMixerChange = useCallback((slotIndex: number, value: number) => {
    if (DEBUG) console.log(`[MIXER] Slot ${slotIndex} → ${Math.round(value * 100)}%`);
    setSlotVolume(slotIndex, value);
  }, [setSlotVolume]);

  const handleFilterPress = useCallback(() => {
    Alert.alert('Coming soon', 'Video filters will be available in a future update.');
  }, []);

  // Gesture handlers for tiles
  const handleLongPress = useCallback((identity: string) => {
    if (DEBUG) console.log(`[GESTURE] Long-press → enter edit mode (identity=${identity})`);
    enterEditMode();
  }, [enterEditMode]);

  const handleDoubleTap = useCallback((identity: string) => {
    if (state.focusedIdentity === identity) {
      // Double-tap focused tile → exit focus mode
      if (DEBUG) console.log('[GESTURE] Double-tap focused tile → exit focus mode');
      setFocusedIdentity(null);
      
      // Unmute all audio tracks
      const unmutedCount = setRemoteAudioMuted(false) || 0;
      if (DEBUG) console.log(`[AUDIO] Exit focus → restored audio for ${unmutedCount} tracks`);
    } else {
      // Double-tap different tile → enter focus mode
      if (DEBUG) console.log(`[GESTURE] Double-tap → focus identity=${identity}`);
      setFocusedIdentity(identity);
      
      // Mute all other audio tracks locally
      const mutedCount = setRemoteAudioMuted(true, identity) || 0;
      if (DEBUG) console.log(`[AUDIO] Focus mode → muted others count=${mutedCount}`);
    }
  }, [state.focusedIdentity, setFocusedIdentity, setRemoteAudioMuted]);

  const handleExitEditMode = useCallback(() => {
    exitEditMode();
  }, [exitEditMode]);

  const handleExitFocus = useCallback(() => {
    setFocusedIdentity(null);
    
    // Unmute all audio tracks
    const unmutedCount = setRemoteAudioMuted(false) || 0;
    if (DEBUG) console.log(`[AUDIO] Exit focus → restored audio for ${unmutedCount} tracks`);
  }, [setFocusedIdentity, setRemoteAudioMuted]);

  // Auto-exit focus if focused participant leaves
  useEffect(() => {
    if (state.focusedIdentity && room) {
      const focusedExists = participants.some(
        p => p.identity === state.focusedIdentity
      );
      if (!focusedExists) {
        if (DEBUG) console.log('[GESTURE] Focused participant left → auto-exit focus');
        setFocusedIdentity(null);
      }
    }
  }, [participants, state.focusedIdentity, setFocusedIdentity, room]);

  // Handle exit with orientation unlock
  const handleExitLive = useCallback(async () => {
    // Clean stop if we were live
    try {
      if (isLive) {
        await stopLive();
      }
    } catch {
      // ignore
    }

    try {
      await room?.disconnect();
    } catch {
      // ignore
    }
    onExitLive?.();
  }, [isLive, onExitLive, room, stopLive]);

  const handleNavigateToRooms = useCallback(async () => {
    onNavigateToRooms?.();
  }, [onNavigateToRooms]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* 3-COLUMN LAYOUT: [LEFT] [CAMERA] [RIGHT] */}
      <View style={styles.container}>
        
        {/* LEFT COLUMN - Controls */}
        <View style={[styles.leftColumn, { paddingTop: insets.top || 8, paddingBottom: insets.bottom || 8, paddingLeft: insets.left || 12 }]}>
          {/* Back Button - Position 1 */}
          <TouchableOpacity onPress={handleExitLive} style={styles.vectorButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color="#10b981" />
          </TouchableOpacity>
          
          {/* Mic toggle - Position 2 */}
          <TouchableOpacity
            style={styles.vectorButton}
            onPress={handleToggleMic}
            activeOpacity={0.7}
            disabled={!canPublish}
          >
            <Ionicons name={localMicEnabled ? 'mic' : 'mic-off'} size={26} color={canPublish ? '#10b981' : '#6b7280'} />
          </TouchableOpacity>
          
          {/* Cam toggle - Position 3 */}
          <TouchableOpacity
            style={styles.vectorButton}
            onPress={handleToggleCam}
            activeOpacity={0.7}
            disabled={!canPublish}
          >
            <Ionicons name={localCamEnabled ? 'videocam' : 'videocam-off'} size={26} color={canPublish ? '#ec4899' : '#6b7280'} />
          </TouchableOpacity>
          
          {/* FILTER BUTTON - Position 4 (aligns with Mixer) */}
          <TouchableOpacity
            style={styles.vectorButton}
            onPress={handleFilterPress}
            activeOpacity={0.7}
          >
            <Ionicons name="color-wand" size={26} color="#ec4899" />
          </TouchableOpacity>

          {/* GO LIVE / END STREAM - Position 5 */}
          <TouchableOpacity
            style={styles.vectorButton}
            onPress={isLive ? handleEndStreamPress : handleToggleGoLive}
            activeOpacity={0.7}
            disabled={!isLive && !canPublish}
          >
            <Ionicons
              name={isLive ? 'stop-circle' : 'radio'}
              size={28}
              color={!canPublish ? '#6b7280' : (isLive ? '#ef4444' : '#ec4899')}
            />
          </TouchableOpacity>
        </View>

        {/* CAMERA GRID - MIDDLE COLUMN (fits BETWEEN left and right) */}
        {/* Battle mode: cameras-only layout, minimal UI */}
        {/* Solo mode: standard controller layout with full grid */}
        <View style={styles.centerGridWrapper}>
          <GestureDetector gesture={swipeGesture}>
            <View style={[styles.cameraGrid, mode === 'battle' && styles.cameraGridBattle]}>
              <Grid12 
                participants={participants}
                isEditMode={state.isEditMode}
                focusedIdentity={state.focusedIdentity}
                tileSlots={state.tileSlots}
                room={room}
                onLongPress={handleLongPress}
                onDoubleTap={handleDoubleTap}
                onExitEditMode={handleExitEditMode}
                onExitFocus={handleExitFocus}
                onInitializeTileSlots={initializeTileSlots}
              />
            </View>
          </GestureDetector>

          {!isConnected && !!liveError && (
            <View style={styles.connectionErrorBanner} pointerEvents="none">
              <Text style={styles.connectionErrorTitle}>Live connection failed</Text>
              <Text style={styles.connectionErrorText} numberOfLines={4}>
                {String(liveError)}
              </Text>
            </View>
          )}
        </View>

        {/* RIGHT COLUMN - Controls */}
        <View style={[styles.rightColumn, { paddingTop: insets.top || 8, paddingBottom: insets.bottom || 8, paddingRight: insets.right || 12 }]}>
          {/* Options */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleOptionsPress} activeOpacity={0.7}>
            <Ionicons name="settings-sharp" size={26} color="#6366f1" />
          </TouchableOpacity>

          {/* Report */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleReportPress} activeOpacity={0.7}>
            <Ionicons name="flag" size={24} color="#ef4444" />
          </TouchableOpacity>

          {/* Gift */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleGiftPress} activeOpacity={0.7}>
            <Ionicons name="gift" size={26} color="#f59e0b" />
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleLikePress} activeOpacity={0.7}>
            <Ionicons name="heart" size={24} color="#ec4899" />
          </TouchableOpacity>

          {/* Mixer */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleMixerPress} activeOpacity={0.7}>
            <Ionicons name="options" size={26} color="#06b6d4" />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleSharePress} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlays - Slide over entire screen */}
      {!state.isEditMode && !state.focusedIdentity && (
        <>
          <ChatOverlay visible={state.activeOverlay === 'chat'} onClose={handleCloseOverlay} roomId={ROOM_NAME} />
          <ViewersLeaderboardsOverlay visible={state.activeOverlay === 'viewers'} onClose={handleCloseOverlay} />
          <OptionsMenu
            visible={state.activeOverlay === 'menu'}
            onClose={handleCloseOverlay}
            onNavigateToWallet={() => {
              handleCloseOverlay();
              onNavigateWallet();
            }}
          />
          <StatsOverlay visible={state.activeOverlay === 'stats'} onClose={handleCloseOverlay} roomStats={{ viewerCount: 0, liveCount: participants.length }} showDebug={false} />
          <GiftOverlay
            visible={state.activeOverlay === 'gift'}
            onClose={handleCloseOverlay}
            participants={participants}
            targetRecipientId={targetRecipientId}
            onSelectRecipientId={setTargetRecipientId}
          />
        </>
      )}

      {/* Mixer Modal - 12-slot volume control */}
      <MixerModal
        visible={showMixerModal}
        onClose={() => setShowMixerModal(false)}
        onChange={handleMixerChange}
      />

      {/* Portrait Hint - Translucent overlay */}
      {!isLandscape && (
        <View style={styles.portraitHint}>
          <Text style={styles.portraitHintIcon}>📱 → 📱</Text>
          <Text style={styles.portraitHintText}>Rotate screen</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // 3-COLUMN ROW LAYOUT: [LEFT] [CAMERA] [RIGHT]
  container: {
    flex: 1,
    flexDirection: 'row', // Side by side columns
    backgroundColor: '#000',
  },
  
  // LEFT COLUMN - Matches right column spacing with space-evenly
  leftColumn: {
    width: 88,
    justifyContent: 'space-evenly', // Same as right column for alignment
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 20,
    paddingVertical: 16, // Same as right column
    backgroundColor: '#000',
    overflow: 'hidden',
    zIndex: 100,
  },
  
  // CENTER GRID WRAPPER - OWNS GRID WIDTH (optimized for better fit)
  centerGridWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  
  // CAMERA GRID - FULL HEIGHT/WIDTH within wrapper
  cameraGrid: {
    flex: 1,
    backgroundColor: '#000',
    zIndex: 1,
  },
  
  // Battle mode variant - portrait optimized
  cameraGridBattle: {
    // Minimal UI adjustments for battle mode
    // Grid layout handles the actual camera arrangement
  },

  connectionErrorBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 999,
  },
  connectionErrorTitle: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  connectionErrorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // RIGHT COLUMN - Evenly distributed controls
  rightColumn: {
    width: 88,
    justifyContent: 'space-evenly', // Evenly distributed
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
    zIndex: 100,
  },
  
  spacer: {
    flex: 1,
  },
  
  // VECTOR BUTTONS - Consistent size and touch target (48x48 for better accessibility)
  vectorButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Portrait hint
  portraitHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  portraitHintIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  portraitHintText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

