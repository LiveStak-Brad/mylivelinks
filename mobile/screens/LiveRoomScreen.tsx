/**
 * LiveRoomScreen - Main container for the mobile live room experience
 * 
 * Features:
 * - 12-tile grid (4×3 landscape) that stays mounted at all times
 * - Swipe gestures to open/close overlays (disabled during edit/focus mode)
 * - Long-press tiles to enter edit mode (reorder tiles)
 * - Double-tap tiles to enter focus mode (expand + mute others)
 * - Only one overlay/mode active at a time
 * - Grid never unmounts when overlays appear
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Grid12 } from '../components/live/Grid12';
import { ChatOverlay } from '../overlays/ChatOverlay';
import { ViewersLeaderboardsOverlay } from '../overlays/ViewersLeaderboardsOverlay';
import { MenuOverlay } from '../overlays/MenuOverlay';
import { StatsOverlay } from '../overlays/StatsOverlay';
import { DebugPill } from '../components/DebugPill';
import { useLiveRoomUI } from '../state/liveRoomUI';
import { useLiveRoomParticipants } from '../hooks/useLiveRoomParticipants';

const SWIPE_THRESHOLD = 50;

export const LiveRoomScreen: React.FC = () => {
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
  
  // Placeholder streaming hook
  const { participants, isConnected, tileCount } = useLiveRoomParticipants();

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
        console.log('[GESTURE] Swipe blocked → edit mode active');
        return;
      }
      if (state.focusedIdentity) {
        console.log('[GESTURE] Swipe blocked → focus mode active');
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

  // Gesture handlers for tiles
  const handleLongPress = useCallback((identity: string) => {
    console.log(`[GESTURE] Long-press → enter edit mode (identity=${identity})`);
    enterEditMode();
  }, [enterEditMode]);

  const handleDoubleTap = useCallback((identity: string) => {
    if (state.focusedIdentity === identity) {
      // Double-tap focused tile → exit focus mode
      console.log('[GESTURE] Double-tap focused tile → exit focus mode');
      setFocusedIdentity(null);
      // TODO: Unmute all audio tracks (streaming team will implement)
      console.log('[AUDIO] Exit focus → restore all audio');
    } else {
      // Double-tap different tile → enter focus mode
      console.log(`[GESTURE] Double-tap → focus identity=${identity}`);
      setFocusedIdentity(identity);
      // TODO: Mute all other audio tracks locally (streaming team will implement)
      const otherCount = participants.length - 1;
      console.log(`[AUDIO] Focus mode → muted others count=${otherCount}`);
    }
  }, [state.focusedIdentity, setFocusedIdentity, participants.length]);

  const handleExitEditMode = useCallback(() => {
    console.log('[GESTURE] Exit edit mode → restore normal interaction');
    exitEditMode();
  }, [exitEditMode]);

  const handleExitFocus = useCallback(() => {
    console.log('[GESTURE] Exit focus mode → restore grid');
    setFocusedIdentity(null);
    console.log('[AUDIO] Exit focus → restore all audio');
  }, [setFocusedIdentity]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Main grid - ALWAYS mounted, never unmounts */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.gridContainer}>
          <Grid12 
            participants={participants}
            isEditMode={state.isEditMode}
            focusedIdentity={state.focusedIdentity}
            tileSlots={state.tileSlots}
            onLongPress={handleLongPress}
            onDoubleTap={handleDoubleTap}
            onExitEditMode={handleExitEditMode}
            onExitFocus={handleExitFocus}
            onInitializeTileSlots={initializeTileSlots}
          />
        </View>
      </GestureDetector>

      {/* Overlays - render on top of grid (only when not in edit/focus mode) */}
      {!state.isEditMode && !state.focusedIdentity && (
        <>
          <ChatOverlay
            visible={state.activeOverlay === 'chat'}
            onClose={handleCloseOverlay}
          />

          <ViewersLeaderboardsOverlay
            visible={state.activeOverlay === 'viewers'}
            onClose={handleCloseOverlay}
          />

          <MenuOverlay
            visible={state.activeOverlay === 'menu'}
            onClose={handleCloseOverlay}
            coinBalance={state.coinBalance}
            diamondBalance={state.diamondBalance}
          />

          <StatsOverlay
            visible={state.activeOverlay === 'stats'}
            onClose={handleCloseOverlay}
            roomStats={{
              viewerCount: 0,
              liveCount: participants.length,
            }}
            showDebug={process.env.EXPO_PUBLIC_DEBUG_LIVE === '1'}
          />
        </>
      )}

      {/* Debug pill - only visible when EXPO_PUBLIC_DEBUG_LIVE=1 */}
      <DebugPill
        overlayState={state.activeOverlay}
        tileCount={tileCount}
        isConnected={isConnected}
        isEditMode={state.isEditMode}
        focusedIdentity={state.focusedIdentity}
        filledSlots={state.tileSlots.length}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  gridContainer: {
    flex: 1,
  },
});

