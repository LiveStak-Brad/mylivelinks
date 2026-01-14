import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MllProBadge from '../shared/MllProBadge';

interface ProfileBadgesProps {
  isMllPro?: boolean;
  gifterTier?: string;
  gifterLevel?: number;
  streakDays?: number;
  gifterRank?: number;
  streamerRank?: number;
  colors: any;
}

export default function ProfileBadges({
  isMllPro,
  gifterTier,
  gifterLevel,
  streakDays,
  gifterRank,
  streamerRank,
  colors,
}: ProfileBadgesProps) {
  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      case 'diamond': return '#B9F2FF';
      default: return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      {gifterTier && gifterLevel && (
        <View style={[styles.badge, { backgroundColor: getTierColor(gifterTier) }]}>
          <Feather name="award" size={12} color="#fff" />
          <Text style={styles.badgeText}>
            {gifterTier} {gifterLevel}
          </Text>
        </View>
      )}
      
      {streakDays && streakDays > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FF6B35' }]}>
          <Feather name="zap" size={12} color="#fff" />
          <Text style={styles.badgeText}>Streak {streakDays}</Text>
        </View>
      )}
      
      {gifterRank === 1 && (
        <View style={[styles.badge, { backgroundColor: '#FFD700' }]}>
          <Text style={[styles.badgeText, { color: '#000' }]}>#1 Gifter</Text>
        </View>
      )}
      
      {streamerRank === 1 && (
        <View style={[styles.badge, { backgroundColor: '#9333EA' }]}>
          <Text style={styles.badgeText}>#1 Streamer</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
