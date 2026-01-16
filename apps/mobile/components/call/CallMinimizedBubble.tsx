import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { brand } from '../../theme/colors';
import type { CallMode } from './CallModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 80;
const MARGIN = 16;

export interface CallMinimizedBubbleProps {
  visible: boolean;
  onRestore: () => void;
  onEndCall: () => void;
  callMode: CallMode;
  remoteDisplayName: string;
  remoteAvatarUrl: string | null;
  callDuration?: number;
  isConnected?: boolean;
}

const NO_PROFILE_PIC = require('../../assets/no-profile-pic.png');

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CallMinimizedBubble({
  visible,
  onRestore,
  onEndCall,
  callMode,
  remoteDisplayName,
  remoteAvatarUrl,
  callDuration = 0,
  isConnected = false,
}: CallMinimizedBubbleProps) {
  const insets = useSafeAreaInsets();

  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - BUBBLE_SIZE - MARGIN,
      y: SCREEN_HEIGHT / 2 - BUBBLE_SIZE / 2,
    })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        const minY = insets.top + MARGIN;
        const maxY = SCREEN_HEIGHT - BUBBLE_SIZE - insets.bottom - MARGIN;
        const clampedY = Math.max(minY, Math.min(maxY, currentY));

        const snapToLeft = currentX < SCREEN_WIDTH / 2;
        const targetX = snapToLeft ? MARGIN : SCREEN_WIDTH - BUBBLE_SIZE - MARGIN;

        Animated.spring(pan, {
          toValue: { x: targetX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  if (!visible) return null;

  const avatarSource = remoteAvatarUrl?.trim()
    ? { uri: remoteAvatarUrl }
    : NO_PROFILE_PIC;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Main bubble - tap to restore */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Restore ${callMode} call with ${remoteDisplayName}`}
        onPress={onRestore}
        style={({ pressed }) => [styles.bubble, pressed && styles.bubblePressed]}
      >
        <Image source={avatarSource} style={styles.avatar} />
        
        {/* Call type indicator */}
        <View style={[styles.callIndicator, callMode === 'video' ? styles.videoIndicator : styles.voiceIndicator]}>
          <Feather name={callMode === 'video' ? 'video' : 'phone'} size={10} color="#FFFFFF" />
        </View>

        {/* Duration badge */}
        {isConnected && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          </View>
        )}

        {/* Connecting pulse */}
        {!isConnected && (
          <View style={styles.connectingBadge}>
            <View style={styles.connectingDot} />
          </View>
        )}
      </Pressable>

      {/* End call button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="End call"
        onPress={onEndCall}
        style={({ pressed }) => [styles.endCallBtn, pressed && styles.endCallBtnPressed]}
      >
        <Feather name="phone-off" size={14} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#1F2937',
    borderWidth: 3,
    borderColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bubblePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  avatar: {
    width: BUBBLE_SIZE - 8,
    height: BUBBLE_SIZE - 8,
    borderRadius: (BUBBLE_SIZE - 8) / 2,
  },
  callIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B0B0F',
  },
  videoIndicator: {
    backgroundColor: brand.primary,
  },
  voiceIndicator: {
    backgroundColor: brand.secondary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0B0B0F',
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectingBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0B0B0F',
  },
  connectingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  endCallBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  endCallBtnPressed: {
    backgroundColor: '#DC2626',
    opacity: 0.9,
  },
});
