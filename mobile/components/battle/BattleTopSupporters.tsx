/**
 * BattleTopSupporters - Mobile version
 * Shows top 3 supporters for a battle side on React Native
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { BattleSupporter, BattleSide } from '../../types/battle';

interface BattleTopSupportersProps {
  supporters: BattleSupporter[];
  side: BattleSide;
  sideColor: string;
}

export const BattleTopSupporters: React.FC<BattleTopSupportersProps> = ({ 
  supporters, 
  side, 
  sideColor 
}) => {
  // Show top 3 only
  const topThree = supporters.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.sideIndicator, { backgroundColor: sideColor }]} />
        <Text style={styles.headerText}>SIDE {side} TOP SUPPORTERS</Text>
      </View>

      {/* Supporters List */}
      <View style={styles.list}>
        {topThree.map((supporter, index) => (
          <View key={supporter.id} style={styles.supporterRow}>
            {/* Rank */}
            <Text style={styles.rankEmoji}>{rankEmojis[index]}</Text>

            {/* Avatar */}
            {supporter.avatar_url ? (
              <Image 
                source={{ uri: supporter.avatar_url }} 
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {supporter.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Username & Badge */}
            <View style={styles.userInfo}>
              <Text style={styles.username} numberOfLines={1}>
                {supporter.username}
              </Text>
              {((supporter as { gifter_level?: number }).gifter_level ?? 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    Lvl {(supporter as { gifter_level?: number }).gifter_level}
                  </Text>
                </View>
              )}
            </View>

            {/* Coins Sent */}
            <View style={styles.coinsContainer}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.coinAmount}>
                {supporter.total_coins_sent.toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  sideIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  list: {
    gap: 4,
  },
  supporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
  },
  rankEmoji: {
    fontSize: 16,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinIcon: {
    fontSize: 14,
  },
  coinAmount: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

