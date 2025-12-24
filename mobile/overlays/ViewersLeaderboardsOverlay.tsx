/**
 * Viewers & Leaderboards Overlay - Swipe DOWN to open, UP to close
 * Shows current viewers and leaderboards in tabs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Viewer, LeaderboardEntry } from '../types/live';

interface ViewersLeaderboardsOverlayProps {
  visible: boolean;
  onClose: () => void;
}

// Mock data
const MOCK_VIEWERS: Viewer[] = [
  { id: '1', username: 'Viewer1', avatarUrl: undefined },
  { id: '2', username: 'Viewer2', avatarUrl: undefined },
  { id: '3', username: 'Viewer3', avatarUrl: undefined },
];

const MOCK_STREAMER_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', username: 'TopStreamer', value: 5420, avatarUrl: undefined },
  { id: '2', username: 'Streamer2', value: 3210, avatarUrl: undefined },
];

const MOCK_GIFTER_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', username: 'TopGifter', value: 1250, avatarUrl: undefined },
  { id: '2', username: 'Gifter2', value: 890, avatarUrl: undefined },
];

type Tab = 'viewers' | 'streamers' | 'gifters';

export const ViewersLeaderboardsOverlay: React.FC<ViewersLeaderboardsOverlayProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('viewers');
  
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward swipes
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -100) {
        // Swipe up threshold reached - close overlay
        runOnJS(onClose)();
      }
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <BlurView intensity={40} style={styles.blur}>
          <View style={styles.content}>
            {/* Header with swipe indicator */}
            <View style={styles.header}>
              <View style={styles.swipeIndicator} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'viewers' && styles.tabActive]}
                onPress={() => setActiveTab('viewers')}
              >
                <Text style={[styles.tabText, activeTab === 'viewers' && styles.tabTextActive]}>
                  Viewers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'streamers' && styles.tabActive]}
                onPress={() => setActiveTab('streamers')}
              >
                <Text style={[styles.tabText, activeTab === 'streamers' && styles.tabTextActive]}>
                  Top Streamers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'gifters' && styles.tabActive]}
                onPress={() => setActiveTab('gifters')}
              >
                <Text style={[styles.tabText, activeTab === 'gifters' && styles.tabTextActive]}>
                  Top Gifters
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView}>
              {activeTab === 'viewers' && (
                <View>
                  {MOCK_VIEWERS.map((viewer) => (
                    <View key={viewer.id} style={styles.listItem}>
                      <Text style={styles.itemText}>{viewer.username}</Text>
                    </View>
                  ))}
                </View>
              )}
              {activeTab === 'streamers' && (
                <View>
                  {MOCK_STREAMER_LEADERBOARD.map((entry, idx) => (
                    <View key={entry.id} style={styles.listItem}>
                      <Text style={styles.rankText}>#{idx + 1}</Text>
                      <Text style={styles.itemText}>{entry.username}</Text>
                      <Text style={styles.valueText}>💎 {entry.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {activeTab === 'gifters' && (
                <View>
                  {MOCK_GIFTER_LEADERBOARD.map((entry, idx) => (
                    <View key={entry.id} style={styles.listItem}>
                      <Text style={styles.rankText}>#{idx + 1}</Text>
                      <Text style={styles.itemText}>{entry.username}</Text>
                      <Text style={styles.valueText}>🎁 {entry.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabActive: {
    backgroundColor: '#4a9eff',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    gap: 12,
  },
  rankText: {
    color: '#4a9eff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 30,
  },
  itemText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  valueText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '600',
  },
});

