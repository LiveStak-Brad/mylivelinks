import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TopStreamer {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_live: boolean;
  diamonds_earned_lifetime: number;
  peak_viewers: number;
  total_streams: number;
}

interface TopStreamersSectionProps {
  streamers: TopStreamer[];
  onPressProfile: (profileId: string, username: string) => void;
  colors: any;
}

export default function TopStreamersSection({
  streamers,
  onPressProfile,
  colors,
}: TopStreamersSectionProps) {
  if (!streamers || streamers.length === 0) {
    return null;
  }

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Feather name="video" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Top Streamers</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.streamersRow}>
          {streamers.map((streamer, index) => {
            const displayName = streamer.display_name || streamer.username;
            
            return (
              <Pressable
                key={streamer.id}
                onPress={() => onPressProfile(streamer.id, streamer.username)}
                style={styles.streamerCard}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: streamer.avatar_url || undefined }}
                    style={styles.avatar}
                  />
                  {streamer.is_live && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.amount, { color: colors.primary }]}>
                  💎 {formatAmount(streamer.diamonds_earned_lifetime)}
                </Text>
                <Text style={[styles.stats, { color: colors.mutedText }]}>
                  {formatAmount(streamer.peak_viewers)} peak • {streamer.total_streams} streams
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  streamersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  streamerCard: {
    width: 120,
    alignItems: 'center',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  liveBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  amount: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  stats: {
    fontSize: 10,
    textAlign: 'center',
  },
});
