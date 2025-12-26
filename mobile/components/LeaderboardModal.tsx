/**
 * LeaderboardModal Component - Mobile
 * 
 * WEB PARITY: components/LeaderboardModal.tsx
 * Displays top streamers and top gifters leaderboards with period filters
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';

interface LeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile?: (username: string) => void;
}

export function LeaderboardModal({ visible, onClose, onNavigateToProfile }: LeaderboardModalProps) {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<Period>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadLeaderboard();
    }
  }, [visible, type, period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_period: period,
        p_limit: 50,
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const entriesData = rows
        .map((row: any) => ({
          profile_id: row.profile_id,
          username: row.username,
          avatar_url: row.avatar_url,
          gifter_level: row.gifter_level || 0,
          metric_value: Number(row.metric_value ?? 0),
          rank: Number(row.rank ?? 0),
        }))
        .filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

      setEntries(entriesData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const handleEntryPress = (username: string) => {
    onClose();
    if (onNavigateToProfile) {
      onNavigateToProfile(username);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerIconContainer}>
                <Text style={styles.headerIcon}>🏆</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Leaderboards</Text>
                <Text style={styles.headerSubtitle}>Top performers</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Type Tabs */}
            <View style={styles.typeTabs}>
              <Pressable
                style={[
                  styles.typeTab,
                  type === 'top_streamers' && styles.typeTabActive,
                ]}
                onPress={() => setType('top_streamers')}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'top_streamers' && styles.typeTabTextActive,
                  ]}
                >
                  Top Streamers
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeTab,
                  type === 'top_gifters' && styles.typeTabActive,
                ]}
                onPress={() => setType('top_gifters')}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'top_gifters' && styles.typeTabTextActive,
                  ]}
                >
                  Top Gifters
                </Text>
              </Pressable>
            </View>

            {/* Period Tabs */}
            <View style={styles.periodTabs}>
              {(['daily', 'weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.periodTab,
                    period === p && styles.periodTabActive,
                  ]}
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      period === p && styles.periodTabTextActive,
                    ]}
                  >
                    {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View key={i} style={styles.skeletonItem} />
                ))}
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No entries yet</Text>
                <Text style={styles.emptySubtext}>Be the first to make the leaderboard!</Text>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {entries.map((entry) => (
                  <Pressable
                    key={entry.profile_id}
                    style={[
                      styles.entryItem,
                      entry.rank <= 3 && styles.entryItemTop,
                    ]}
                    onPress={() => handleEntryPress(entry.username)}
                  >
                    {/* Rank */}
                    <View style={styles.rankContainer}>
                      <Text
                        style={[
                          styles.rankText,
                          entry.rank === 1 && styles.rankText1,
                          entry.rank === 2 && styles.rankText2,
                          entry.rank === 3 && styles.rankText3,
                        ]}
                      >
                        {getRankIcon(entry.rank)}
                      </Text>
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                      {entry.avatar_url ? (
                        <View
                          style={[
                            styles.avatar,
                            entry.rank === 1 && styles.avatar1,
                            entry.rank === 2 && styles.avatar2,
                            entry.rank === 3 && styles.avatar3,
                          ]}
                        >
                          {/* Note: In production, use <Image source={{ uri: entry.avatar_url }} /> */}
                          <Text style={styles.avatarPlaceholder}>
                            {(entry.username?.[0] ?? '?').toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.avatar,
                            entry.rank === 1 && styles.avatar1,
                            entry.rank === 2 && styles.avatar2,
                            entry.rank === 3 && styles.avatar3,
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {(entry.username?.[0] ?? '?').toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* User Info */}
                    <View style={styles.userInfo}>
                      <Text
                        style={[
                          styles.username,
                          entry.rank <= 3 && styles.usernameTop,
                        ]}
                        numberOfLines={1}
                      >
                        @{entry.username}
                      </Text>
                    </View>

                    {/* Metric */}
                    <View style={styles.metricContainer}>
                      <Text
                        style={[
                          styles.metricValue,
                          entry.rank <= 3 && styles.metricValueTop,
                        ]}
                      >
                        {formatMetric(entry.metric_value)}
                      </Text>
                      <Text style={styles.metricLabel}>
                        {type === 'top_streamers' ? '💎 diamonds' : '🪙 coins'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f59e0b', // Amber gradient approximation
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  typeTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  typeTabActive: {
    backgroundColor: '#fff',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  typeTabTextActive: {
    color: '#f59e0b',
  },
  periodTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#fff',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  periodTabTextActive: {
    color: '#f59e0b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonItem: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9aa0a6',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  entriesList: {
    gap: 8,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  entryItemTop: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9aa0a6',
  },
  rankText1: {
    fontSize: 20,
  },
  rankText2: {
    fontSize: 18,
  },
  rankText3: {
    fontSize: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatar1: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: '#f59e0b',
  },
  avatar2: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#d1d5db',
  },
  avatar3: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#fb923c',
  },
  avatarPlaceholder: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  usernameTop: {
    color: '#fff',
    fontWeight: '700',
  },
  metricContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  metricValueTop: {
    color: '#fff',
  },
  metricLabel: {
    fontSize: 10,
    color: '#9aa0a6',
  },
});

