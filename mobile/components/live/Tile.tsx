/**
 * Single tile component for the 12-tile grid
 * Displays participant info + LiveKit video track
 * 
 * Gestures:
 * - Long-press (450ms) → Enter edit mode
 * - Double-tap → Focus mode
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { VideoView } from '@livekit/react-native';
import type { TileItem } from '../../types/live';
import type { Room, VideoTrack } from 'livekit-client';

const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

interface TileProps {
  item: TileItem;
  isEditMode: boolean;
  isFocused: boolean;
  isMinimized: boolean;
  room: Room | null;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}

export const Tile: React.FC<TileProps> = ({ 
  item, 
  isEditMode,
  isFocused,
  isMinimized,
  room,
  onLongPress,
  onDoubleTap,
}) => {
  const { participant, isAutofill } = item;
  
  // Animation values for edit mode
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(0);

  // Get video track from room
  const videoTrack = useMemo(() => {
    if (!room || !participant) return null;

    const remoteParticipant = room.remoteParticipants.get(participant.identity);
    if (!remoteParticipant) return null;

    // Find first video track publication
    const videoPublication = Array.from(remoteParticipant.videoTrackPublications.values())[0];
    if (!videoPublication || !videoPublication.isSubscribed) return null;

    if (DEBUG) {
      console.log('[TRACK] Rendering video for:', {
        identity: participant.identity,
        trackSid: videoPublication.trackSid,
      });
    }

    return videoPublication.track as unknown as VideoTrack;
  }, [room, participant]);

  useEffect(() => {
    if (DEBUG && videoTrack) {
      console.log('[VIDEO] Rendering video for participant', participant?.identity);
    }
  }, [videoTrack, participant?.identity]);

  // Long-press gesture (450ms)
  const longPressGesture = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      if (!isEditMode && onLongPress) {
        onLongPress();
      }
    });

  // Double-tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (!isEditMode && onDoubleTap) {
        onDoubleTap();
      }
    });

  // Combine gestures (double-tap has priority)
  const composedGesture = Gesture.Exclusive(doubleTapGesture, longPressGesture);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: borderWidth.value,
    borderColor: '#4a9eff',
  }));

  // Update animations based on state
  React.useEffect(() => {
    if (isEditMode) {
      scale.value = withSpring(0.95);
      borderWidth.value = withSpring(2);
    } else {
      scale.value = withSpring(1);
      borderWidth.value = withSpring(0);
    }
  }, [isEditMode]);

  const containerStyle = [
    styles.container,
    isMinimized && styles.minimized,
    isFocused && styles.focused,
  ];

  if (!participant) {
    // Empty tile (autofill placeholder)
    return (
      <View style={[styles.container, styles.emptyTile]}>
        <Text style={styles.emptyText}>Available</Text>
      </View>
    );
  }

  const { username, isCameraEnabled, isMicEnabled, viewerCount } = participant;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[containerStyle, animatedStyle]}>
      {/* Video surface - LiveKit VideoRenderer */}
      {videoTrack ? (
        <VideoView
          videoTrack={videoTrack}
          style={styles.videoRenderer}
          objectFit="cover"
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.placeholderText}>📹</Text>
        </View>
      )}

      {/* LIVE badge - top left */}
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>

      {/* Username - bottom left */}
      <View style={styles.bottomLeft}>
        <Text style={styles.username} numberOfLines={1}>
          {username}
        </Text>
      </View>

      {/* Viewer count - bottom right */}
      {viewerCount !== undefined && (
        <View style={styles.bottomRight}>
          <Text style={styles.viewerCount}>👁 {viewerCount}</Text>
        </View>
      )}

      {/* Camera/mic status icons - top right */}
      <View style={styles.topRight}>
        {!isCameraEnabled && <Text style={styles.statusIcon}>📷</Text>}
        {!isMicEnabled && <Text style={styles.statusIcon}>🔇</Text>}
      </View>

      {/* Edit mode indicator */}
      {isEditMode && (
        <View style={styles.editIndicator}>
          <Text style={styles.editText}>✎</Text>
        </View>
      )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 4,
    position: 'relative',
  },
  emptyTile: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#555',
    fontSize: 12,
  },
  videoRenderer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.3,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ff3366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '60%',
  },
  username: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 10,
  },
  topRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  statusIcon: {
    fontSize: 14,
    opacity: 0.8,
  },
  minimized: {
    opacity: 0.3,
  },
  focused: {
    borderWidth: 3,
    borderColor: '#4a9eff',
  },
  editIndicator: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -12,
    backgroundColor: 'rgba(74, 158, 255, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

