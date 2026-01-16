import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
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
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

const PODIUM_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export default function TopSupportersSection({
  supporters,
  gifterStatuses,
  onPressProfile,
  colors,
  cardStyle,
}: TopSupportersSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  
  if (!supporters || supporters.length === 0) {
    return null;
  }

  const formatAmount = (amount: number | undefined | null) => {
    const val = amount ?? 0;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  // Get top 3 supporters
  const top3 = supporters.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const renderPodiumPlace = (
    supporter: TopSupporter | undefined,
    place: 1 | 2 | 3,
    podiumColor: string,
    podiumHeight: number,
    avatarSize: number
  ) => {
    if (!supporter) return <View style={{ flex: 1 }} />;
    
    const gifterStatus = gifterStatuses?.[supporter.id];
    const displayName = supporter.display_name || supporter.username;
    const placeLabels = { 1: '1st', 2: '2nd', 3: '3rd' };

    return (
      <Pressable
        style={styles.podiumPlace}
        onPress={() => onPressProfile(supporter.id, supporter.username)}
      >
        {/* Avatar with crown/medal */}
        <View style={styles.avatarContainer}>
          {place === 1 && (
            <View style={styles.crownContainer}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          )}
          <Image
            source={{ uri: supporter.avatar_url || undefined }}
            style={[
              styles.avatar,
              { 
                width: avatarSize, 
                height: avatarSize, 
                borderRadius: avatarSize / 2,
                borderWidth: 3,
                borderColor: podiumColor,
              }
            ]}
          />
          {/* Place badge */}
          <View style={[styles.placeBadge, { backgroundColor: podiumColor }]}>
            <Text style={styles.placeText}>{placeLabels[place]}</Text>
          </View>
        </View>

        {/* Name */}
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {displayName}
        </Text>

        {/* Amount */}
        <Text style={[styles.amount, { color: colors.primary }]}>
          {formatAmount(supporter.total_gifted)}
        </Text>

        {/* Podium block */}
        <View style={[styles.podiumBlock, { height: podiumHeight, backgroundColor: podiumColor }]}>
          <Text style={styles.podiumNumber}>{place}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <Feather name="award" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: textColor }]}>Top Supporters</Text>
      </View>
      
      {/* Podium Layout: 2nd - 1st - 3rd */}
      <View style={styles.podiumContainer}>
        {renderPodiumPlace(second, 2, PODIUM_COLORS.silver, 50, 60)}
        {renderPodiumPlace(first, 1, PODIUM_COLORS.gold, 70, 76)}
        {renderPodiumPlace(third, 3, PODIUM_COLORS.bronze, 40, 56)}
      </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 20,
  },
  podiumPlace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  crownContainer: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 24,
  },
  avatar: {
    backgroundColor: '#333',
  },
  placeBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -18,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  placeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    maxWidth: 90,
  },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  podiumBlock: {
    width: '90%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.3)',
  },
});
