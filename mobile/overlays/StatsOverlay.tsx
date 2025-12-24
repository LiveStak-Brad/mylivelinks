/**
 * Stats Overlay - Swipe LEFT to open, RIGHT to close
 * Shows room stats and user stats
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { RoomStats } from '../types/live';

interface StatsOverlayProps {
  visible: boolean;
  onClose: () => void;
  roomStats?: RoomStats;
  showDebug?: boolean;
}

const DEFAULT_STATS: RoomStats = {
  viewerCount: 0,
  liveCount: 0,
  totalGiftsSent: 0,
  totalGiftsReceived: 0,
};

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  visible,
  onClose,
  roomStats = DEFAULT_STATS,
  showDebug = false,
}) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow rightward swipes (to close)
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX > 100) {
        // Swipe right threshold reached - close overlay
        runOnJS(onClose)();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <BlurView intensity={40} style={styles.blur}>
            <ScrollView style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerText}>Stats</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Room Stats */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Stats</Text>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Viewers</Text>
                  <Text style={styles.statValue}>{roomStats.viewerCount}</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Live Streamers</Text>
                  <Text style={styles.statValue}>{roomStats.liveCount}</Text>
                </View>
              </View>

              {/* My Stats */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Stats</Text>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Gifts Sent</Text>
                  <Text style={styles.statValue}>{roomStats.totalGiftsSent || 0}</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Gifts Received</Text>
                  <Text style={styles.statValue}>{roomStats.totalGiftsReceived || 0}</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Follows</Text>
                  <Text style={styles.statValue}>0</Text>
                </View>
              </View>

              {/* Debug Info (if enabled) */}
              {showDebug && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Debug Info</Text>
                  
                  <View style={styles.debugItem}>
                    <Text style={styles.debugLabel}>LiveKit Status:</Text>
                    <Text style={styles.debugValue}>Not Connected</Text>
                  </View>

                  <View style={styles.debugItem}>
                    <Text style={styles.debugLabel}>WebSocket:</Text>
                    <Text style={styles.debugValue}>N/A</Text>
                  </View>

                  <View style={styles.debugItem}>
                    <Text style={styles.debugLabel}>Render Count:</Text>
                    <Text style={styles.debugValue}>-</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 350,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#4a9eff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  debugLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  debugValue: {
    color: '#4a9eff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

