import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export type LiveTVRoomChannel = {
  id: string;
  name: string;
  liveNowCount: number;
  categoryIcon?: string;
  avatars: { id: string; label: string }[];
  gender?: 'Men' | 'Women';
};

type Props = {
  room: LiveTVRoomChannel;
  onPress: (room: LiveTVRoomChannel) => void;
};

export function LiveTVRoomChannelCard({ room, onPress }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const shownAvatars = room.avatars.slice(0, 6);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(room)}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {room.categoryIcon ? `${room.categoryIcon} ` : ''}
          {room.name}
        </Text>
      </View>

      <Text style={styles.liveNow}>
        {room.liveNowCount} live now
      </Text>

      <View style={styles.avatarsRow}>
        {shownAvatars.map((a, idx) => (
          <View key={a.id} style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -8 }]}> 
            <Text style={styles.avatarText}>{a.label.slice(0, 1).toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;

  return StyleSheet.create({
    card: {
      width: 220,
      backgroundColor: theme.colors.surfaceCard,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 14,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 6,
    },
    name: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    liveNow: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 12,
    },
    avatarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      borderWidth: 2,
      borderColor: theme.tokens.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '900',
    },
  });
}
