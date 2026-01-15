import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface StreamStats {
  total_streams: number;
  total_viewers: number;
  peak_viewers: number;
  diamonds_earned_lifetime: number;
}

interface StreamingStatsSectionProps {
  stats: StreamStats | null;
  isOwnProfile: boolean;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function StreamingStatsSection({
  stats,
  isOwnProfile,
  colors,
  cardStyle,
}: StreamingStatsSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const hasData = stats && stats.total_streams > 0;

  // Visitor + no data = hide
  if (!hasData && !isOwnProfile) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <Feather name="bar-chart-2" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: textColor }]}>Streaming Stats</Text>
      </View>

      {!hasData ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No streaming stats yet. Go live to start tracking!
          </Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.total_streams}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedText }]}>Total Streams</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.total_viewers.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedText }]}>Total Viewers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.peak_viewers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedText }]}>Peak Viewers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.diamonds_earned_lifetime}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedText }]}>Diamonds</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
