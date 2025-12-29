import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import type { LiveStreamData } from '../../screens/LiveOpsScreen';

interface StreamCardProps {
  stream: LiveStreamData;
  onPress: (stream: LiveStreamData) => void;
}

const regionLabels: Record<string, string> = {
  'us-east': 'US East',
  'us-west': 'US West',
  'eu-west': 'EU West',
  'ap-south': 'Asia Pacific',
  all: 'Global',
};

const statusColors = {
  live: { bg: '#22c55e15', text: '#22c55e', icon: 'circle' as const },
  starting: { bg: '#3b82f615', text: '#3b82f6', icon: 'loader' as const },
  ending: { bg: '#f9731615', text: '#f97316', icon: 'minus-circle' as const },
};

export function StreamCard({ stream, onPress }: StreamCardProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const duration = getStreamDuration(stream.startedAt);
  const statusConfig = statusColors[stream.status];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(stream)}
    >
      {/* Header Row */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {stream.avatarUrl ? (
            <View style={styles.avatar}>
              {/* Image would go here */}
              <Feather name="user" size={20} color="#fff" />
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Feather name="user" size={20} color="#fff" />
            </View>
          )}
          {stream.status === 'live' && (
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
            </View>
          )}
        </View>

        {/* Streamer Info */}
        <View style={styles.headerInfo}>
          <View style={styles.streamerRow}>
            <Text style={styles.streamerName} numberOfLines={1}>
              {stream.streamer}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Feather name={statusConfig.icon} size={10} color={statusConfig.text} />
              <Text style={[styles.statusText, { color: statusConfig.text }]}>
                {stream.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.roomRow}>
            <Feather name="radio" size={12} color={theme.colors.textMuted} />
            <Text style={styles.roomText} numberOfLines={1}>
              {stream.room}
            </Text>
            {stream.roomId && (
              <Text style={styles.roomId} numberOfLines={1}>
                • {stream.roomId}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.stats}>
        {/* Region */}
        <View style={styles.stat}>
          <Feather name="map-pin" size={14} color={theme.colors.textMuted} />
          <Text style={styles.statLabel}>{regionLabels[stream.region]}</Text>
        </View>

        {/* Duration */}
        <View style={styles.stat}>
          <Feather name="clock" size={14} color={theme.colors.textMuted} />
          <Text style={styles.statValue}>{duration}</Text>
        </View>

        {/* Viewers */}
        <View style={[styles.stat, styles.statHighlight]}>
          <Feather name="eye" size={14} color="#3b82f6" />
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>
            {stream.viewers.toLocaleString()}
          </Text>
        </View>

        {/* Engagement */}
        <View style={styles.stat}>
          <Feather name="gift" size={12} color="#a855f7" />
          <Text style={styles.statValue}>{stream.giftsPerMin}</Text>
          <Text style={styles.statDivider}>/</Text>
          <Feather name="message-square" size={12} color="#22c55e" />
          <Text style={styles.statValue}>{stream.chatPerMin}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getStreamDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  }
  return `${diffMins}m`;
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    card: {
      backgroundColor: theme.tokens.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 12,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    cardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarPlaceholder: {
      backgroundColor: `${theme.colors.accent}`,
    },
    liveDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#ef4444',
      borderWidth: 2,
      borderColor: theme.tokens.surfaceCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
    },
    headerInfo: {
      flex: 1,
      gap: 4,
    },
    streamerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    streamerName: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    roomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    roomText: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    roomId: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontFamily: 'monospace',
    },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statHighlight: {
      backgroundColor: '#3b82f615',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    statValue: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    statDivider: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
  });
}

