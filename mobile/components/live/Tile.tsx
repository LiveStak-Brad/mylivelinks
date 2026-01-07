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
import type { TileItem } from '../../types/live';
import { useThemeMode } from '../../contexts/ThemeContext';

import { getRuntimeEnv } from '../../lib/env';

const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVE') === '1';

interface TileProps {
  item: TileItem;
  isEditMode: boolean;
  isFocused: boolean;
  isMinimized: boolean;
  // IMPORTANT: Do not import LiveKit types/modules at module scope.
  // This component is only loaded dynamically after LiveKit readiness.
  room: any;
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
  const { theme } = useThemeMode();
  let VideoView: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    VideoView = require('@livekit/react-native')?.VideoView ?? null;
  } catch {
    VideoView = null;
  }
  
  // Animation values for edit mode
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(0);

  // Get video track from room
  const videoTrack = useMemo(() => {
    if (!room || !participant) return null;

    let Track: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const livekit = require('livekit-client');
      Track = livekit?.Track ?? null;
    } catch {
      Track = null;
    }

    const isLocal = !!room.localParticipant && room.localParticipant.identity === participant.identity;

    const targetParticipant: any =
      room.localParticipant && room.localParticipant.identity === participant.identity
        ? room.localParticipant
        : room.remoteParticipants.get(participant.identity);
    if (!targetParticipant) return null;

    const videoPublications = Array.from(targetParticipant.videoTrackPublications.values());

    const screenPub = videoPublications.find((pub: any) => {
      if (Track && pub?.source !== Track.Source.ScreenShare) return false;
      if (!pub?.track) return false;
      return isLocal ? !pub?.isMuted : !!pub?.isSubscribed;
    });
    const cameraPub = videoPublications.find((pub: any) => {
      if (Track && pub?.source !== Track.Source.Camera) return false;
      if (!pub?.track) return false;
      return isLocal ? !pub?.isMuted : !!pub?.isSubscribed;
    });
    const anyPub = videoPublications.find((pub: any) => {
      if (!pub?.track) return false;
      return isLocal ? !pub?.isMuted : !!pub?.isSubscribed;
    });

    const videoPublication: any = screenPub || cameraPub || anyPub;
    if (!videoPublication) return null;

    if (DEBUG) {
      console.log('[TRACK] Rendering video for:', {
        identity: participant.identity,
        trackSid: videoPublication.trackSid,
        source: videoPublication.source,
      });
    }

    return videoPublication.track as any;
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

  const containerStyle = useMemo(
    () => [
      styles.container,
      isMinimized && styles.minimized,
      isFocused && { borderColor: '#4a9eff', borderWidth: 3 },
    ],
    [isFocused, isMinimized]
  );

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
        {videoTrack && VideoView ? (
          <VideoView
            videoTrack={videoTrack}
            style={{ ...styles.videoRenderer }}
            objectFit="cover"
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>📹</Text>
          </View>
        )}

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
    backgroundColor: 'transparent',
    borderRadius: 4, // Slight rounded corners
    overflow: 'hidden',
    margin: 0,
    borderWidth: 0, // Remove border since we have gaps now
    position: 'relative',
  },
  emptyTile: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Dark color for empty slots
    borderRadius: 4, // Slight rounded corners
  },
  emptyText: {
    color: '#ffffff', // White text for "Available"
    fontSize: 12,
    fontWeight: '500',
  },
  videoRenderer: {
    flex: 1,
    backgroundColor: '#000', // Force black background
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Dark gray when no video
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

