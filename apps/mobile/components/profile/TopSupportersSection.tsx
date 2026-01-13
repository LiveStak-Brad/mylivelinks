import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TopSupporter {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  total_gifted: number;
}

interface TopSupportersSectionProps {
  supporters: TopSupporter[];
  gifterStatuses?: Record<string, any>;
  onPressProfile: (profileId: string, username: string) => void;
  colors: any;
}

export default function TopSupportersSection({
  supporters,
  gifterStatuses,
  onPressProfile,
  colors,
}: TopSupportersSectionProps) {
  if (!supporters || supporters.length === 0) {
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
        <Feather name="award" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Top Supporters</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.supportersRow}>
          {supporters.map((supporter, index) => {
            const gifterStatus = gifterStatuses?.[supporter.id];
            const displayName = supporter.display_name || supporter.username;
            
            return (
              <Pressable
                key={supporter.id}
                onPress={() => onPressProfile(supporter.id, supporter.username)}
                style={styles.supporterCard}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <Image
                  source={{ uri: supporter.avatar_url || undefined }}
                  style={styles.avatar}
                />
                {gifterStatus && (
                  <View style={[styles.tierBadge, { backgroundColor: gifterStatus.badge_color }]}>
                    <Text style={styles.tierText}>{gifterStatus.tier}</Text>
                  </View>
                )}
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.amount, { color: colors.primary }]}>
                  {formatAmount(supporter.total_gifted)} coins
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
  supportersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  supporterCard: {
    width: 100,
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 4,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
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
  },
});
