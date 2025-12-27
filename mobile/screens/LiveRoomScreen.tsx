/**
 * LiveRoomScreen - LANDSCAPE-ONLY Controller-Style UI
 * 
 * Features:
 * - Forces landscape orientation
 * - 12-tile camera grid (edge-to-edge, 0 padding)
 * - Side controllers (game-pad style)
 * - Swipe gestures for overlays
 * - Data parity with Web LiveRoom
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions, Share, Alert } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Grid12 } from '../components/live/Grid12';
import { ChatOverlay } from '../overlays/ChatOverlay';
import { ViewersLeaderboardsOverlay } from '../overlays/ViewersLeaderboardsOverlay';
import { MenuOverlay } from '../overlays/MenuOverlay';
import { StatsOverlay } from '../overlays/StatsOverlay';
import { GiftOverlay } from '../overlays/GiftOverlay';
import { DebugPill } from '../components/DebugPill';
import { useLiveRoomUI } from '../state/liveRoomUI';
import { useLiveRoomParticipants } from '../hooks/useLiveRoomParticipants';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useThemeMode } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

const SWIPE_THRESHOLD = 50;
const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

type LiveRoomScreenProps = {
  enabled?: boolean;
  onExitLive?: () => void;
  onNavigateToRooms?: () => void;
  onNavigateWallet: () => void;
};

export const LiveRoomScreen: React.FC<LiveRoomScreenProps> = ({ enabled = false, onExitLive, onNavigateToRooms, onNavigateWallet }) => {
  // 🔒 KEEP SCREEN AWAKE (prevent screen timeout)
  useKeepAwake();
  
  // Get safe area insets for proper button placement
  const insets = useSafeAreaInsets();
  
  // Track current user for room presence
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [targetRecipientId, setTargetRecipientId] = useState<string | null>(null);
  const goLivePressInFlightRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  // 🔒 LOCK ORIENTATION TO LANDSCAPE on mount/focus
  useFocusEffect(
    useCallback(() => {
      if (DEBUG) console.log('[ORIENTATION] Locking to landscape...');
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(err => {
        console.error('[ORIENTATION] Failed to lock:', err);
      });

      // Unlock on unmount/blur
      return () => {
        if (DEBUG) console.log('[ORIENTATION] Unlocking orientation...');
        ScreenOrientation.unlockAsync().catch(err => {
          console.error('[ORIENTATION] Failed to unlock:', err);
        });
      };
    }, [])
  );
  
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
  const { participants, isConnected, tileCount, room, goLive, stopLive, isLive, isPublishing } = useLiveRoomParticipants({ enabled });
  const { theme } = useThemeMode();

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
  }, [currentUser?.id, goLive, isLive, stopLive]);

  const handleGiftPress = useCallback(() => {
    openOverlay('gift');
  }, [openOverlay]);

  const handlePiPPress = useCallback(() => {
    if (state.focusedIdentity) {
      setFocusedIdentity(null);
      return;
    }
    if (participants.length > 0) {
      setFocusedIdentity(participants[0].identity);
      return;
    }
    Alert.alert('PiP', 'PiP coming soon');
  }, [participants, setFocusedIdentity, state.focusedIdentity]);

  const handleSharePress = useCallback(async () => {
    try {
      const roomName = 'live_central';
      const handle = currentUser?.username ? `@${currentUser.username}` : 'MyLiveLinks';
      const url = `https://mylivelinks.com/rooms?room=${encodeURIComponent(roomName)}`;

      await Share.share({
        message: `${handle} is live in ${roomName}. Join: ${url}`,
        url,
        title: `${handle} • ${roomName}`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message || 'Could not open share sheet');
    }
  }, [currentUser?.username]);

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
    if (DEBUG) console.log('[EXIT] Unlocking orientation before exit...');

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

    await ScreenOrientation.unlockAsync().catch(err => {
      console.error('[EXIT] Failed to unlock:', err);
    });
    onExitLive?.();
  }, [isLive, onExitLive, room, stopLive]);

  const handleNavigateToRooms = useCallback(async () => {
    if (DEBUG) console.log('[EXIT] Unlocking orientation before rooms nav...');
    await ScreenOrientation.unlockAsync().catch(err => {
      console.error('[EXIT] Failed to unlock:', err);
    });
    onNavigateToRooms?.();
  }, [onNavigateToRooms]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* 3-COLUMN LAYOUT: [LEFT] [CAMERA] [RIGHT] */}
      <View style={styles.container}>
        
        {/* LEFT COLUMN - Controls */}
        <View style={[styles.leftColumn, { paddingTop: insets.top || 8, paddingBottom: insets.bottom || 8, paddingLeft: insets.left || 8 }]}>
          {/* Back Button - TOP LEFT */}
          <TouchableOpacity onPress={handleExitLive} style={styles.vectorButton}>
            <Text style={[styles.vectorIcon, { color: '#4a9eff' }]}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.spacer} />
          
          {/* GO LIVE - BOTTOM LEFT */}
          <TouchableOpacity
            style={styles.goLiveButton}
            disabled={false}
            onPress={handleToggleGoLive}
          >
            <View style={[styles.goLiveDot, (isLive && isPublishing) && styles.goLiveDotActive]} />
            <Text style={styles.goLiveText}>GO{'\n'}LIVE</Text>
          </TouchableOpacity>
        </View>

        {/* CAMERA GRID - MIDDLE COLUMN (fits BETWEEN left and right) */}
        <View style={styles.centerGridWrapper}>
          <GestureDetector gesture={swipeGesture}>
            <View style={styles.cameraGrid}>
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
        </View>

        {/* RIGHT COLUMN - Controls */}
        <View style={[styles.rightColumn, { paddingTop: insets.top || 8, paddingBottom: insets.bottom || 8, paddingRight: insets.right || 8 }]}>
          {/* Gift - TOP RIGHT */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleGiftPress}>
            <Text style={[styles.vectorIcon, { color: '#ff6b9d' }]}>🎁</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          {/* PiP - MIDDLE RIGHT */}
          <TouchableOpacity style={styles.vectorButton} onPress={handlePiPPress}>
            <Text style={[styles.pipText, { color: '#a78bfa' }]}>PiP</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          {/* Share - BOTTOM RIGHT */}
          <TouchableOpacity style={styles.vectorButton} onPress={handleSharePress}>
            <Text style={[styles.vectorIcon, { color: '#34d399' }]}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlays - Slide over entire screen */}
      {!state.isEditMode && !state.focusedIdentity && (
        <>
          <ChatOverlay visible={state.activeOverlay === 'chat'} onClose={handleCloseOverlay} />
          <ViewersLeaderboardsOverlay visible={state.activeOverlay === 'viewers'} onClose={handleCloseOverlay} />
          <MenuOverlay visible={state.activeOverlay === 'menu'} onClose={handleCloseOverlay} onOpenWallet={onNavigateWallet} />
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
  },
  
  // LEFT COLUMN (Back + GO LIVE) - BUTTON + SAFE AREA SPACE
  leftColumn: {
    width: 80, // Increased to contain GO LIVE glow (52px button + 8px shadow + padding)
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6, // Center buttons within column
    backgroundColor: '#000', // Opaque background
    zIndex: 100, // Above grid
  },
  
  // CENTER GRID WRAPPER - OWNS GRID WIDTH (prevents grid from rendering under controllers)
  centerGridWrapper: {
    flex: 1, // Takes remaining space between columns
    overflow: 'hidden', // CRITICAL: Clips grid content to prevent overflow under controllers
    backgroundColor: '#000',
  },
  
  // CAMERA GRID - FULL HEIGHT/WIDTH within wrapper
  cameraGrid: {
    flex: 1, // Fill centerGridWrapper completely
    backgroundColor: '#000',
    zIndex: 1, // Below controls
  },
  
  // RIGHT COLUMN (Gift + PiP + Share) - BUTTON + SAFE AREA SPACE
  rightColumn: {
    width: 80, // Increased to contain gift/PiP/share buttons fully
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6, // Center buttons within column
    backgroundColor: '#000', // Opaque background
    zIndex: 100, // Above grid
  },
  
  spacer: {
    flex: 1,
  },
  
  // GO LIVE BUTTON (ONLY circular button)
  goLiveButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 12,
  },
  
  goLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  
  goLiveDotActive: {
    backgroundColor: '#fff',
  },
  
  goLiveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 9,
    letterSpacing: 0.5,
  },
  
  // VECTOR BUTTONS
  vectorButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  vectorIcon: {
    fontSize: 24,
  },
  
  vectorLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  
  // PiP text style
  pipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
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

