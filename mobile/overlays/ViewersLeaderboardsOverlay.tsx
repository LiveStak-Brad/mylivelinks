/**
 * Viewers & Leaderboards Overlay - Swipe DOWN to open, UP to close
 * Shows current viewers and leaderboards in tabs with REAL DATA
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useViewers } from '../hooks/useViewers';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface ViewersLeaderboardsOverlayProps {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'viewers' | 'streamers' | 'gifters';

export const ViewersLeaderboardsOverlay: React.FC<ViewersLeaderboardsOverlayProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('viewers');
  
  // Fetch real data
  const { viewers, loading: viewersLoading } = useViewers();
  const { entries: streamerLeaderboard, loading: streamersLoading } = useLeaderboard('top_streamers', 'daily');
  const { entries: gifterLeaderboard, loading: giftersLoading } = useLeaderboard('top_gifters', 'daily');
  
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
                  Viewers ({viewers.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'streamers' && styles.tabActive]}
                onPress={() => setActiveTab('streamers')}
              >
                <Text style={[styles.tabText, activeTab === 'streamers' && styles.tabTextActive]}>
                  Streamers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'gifters' && styles.tabActive]}
                onPress={() => setActiveTab('gifters')}
              >
                <Text style={[styles.tabText, activeTab === 'gifters' && styles.tabTextActive]}>
                  Gifters
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollView}>
              {activeTab === 'viewers' && (
                <View>
                  {viewersLoading ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color="#4a9eff" size="large" />
                      <Text style={styles.emptySubtitle}>Loading viewers...</Text>
                    </View>
                  ) : viewers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No viewers yet</Text>
                      <Text style={styles.emptySubtitle}>Viewers will appear here when they join the room.</Text>
                    </View>
                  ) : (
                    viewers.map((viewer) => (
                      <View key={viewer.profile_id} style={styles.listItem}>
                        {viewer.is_live_available && <Text style={styles.liveIndicator}>🔴</Text>}
                        <Text style={styles.itemText}>{viewer.username}</Text>
                        {viewer.gifter_level > 0 && (
                          <Text style={styles.levelBadge}>Lvl {viewer.gifter_level}</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
              {activeTab === 'streamers' && (
                <View>
                  {streamersLoading ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color="#4a9eff" size="large" />
                      <Text style={styles.emptySubtitle}>Loading leaderboard...</Text>
                    </View>
                  ) : streamerLeaderboard.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No data yet</Text>
                      <Text style={styles.emptySubtitle}>Top streamers will appear here.</Text>
                    </View>
                  ) : (
                    streamerLeaderboard.map((entry) => (
                      <View key={entry.profile_id} style={styles.listItem}>
                        <Text style={styles.rankText}>#{entry.rank}</Text>
                        <Text style={styles.itemText}>{entry.username}</Text>
                        <Text style={styles.valueText}>💎 {entry.metric_value}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
              {activeTab === 'gifters' && (
                <View>
                  {giftersLoading ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color="#4a9eff" size="large" />
                      <Text style={styles.emptySubtitle}>Loading leaderboard...</Text>
                    </View>
                  ) : gifterLeaderboard.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No data yet</Text>
                      <Text style={styles.emptySubtitle}>Top gifters will appear here.</Text>
                    </View>
                  ) : (
                    gifterLeaderboard.map((entry) => (
                      <View key={entry.profile_id} style={styles.listItem}>
                        <Text style={styles.rankText}>#{entry.rank}</Text>
                        <Text style={styles.itemText}>{entry.username}</Text>
                        <Text style={styles.valueText}>🎁 {entry.metric_value}</Text>
                      </View>
                    ))
                  )}
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
  emptyState: {
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
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
  liveIndicator: {
    fontSize: 10,
    marginRight: 4,
  },
  levelBadge: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    color: '#4a9eff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});

