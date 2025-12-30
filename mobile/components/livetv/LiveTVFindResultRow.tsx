import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';
import type { Stream, StreamBadge } from './StreamCard';

type Props = {
  stream: Stream;
  onPress: (stream: Stream) => void;
};

function formatCount(viewerCount: number) {
  if (viewerCount >= 1_000_000) return `${(viewerCount / 1_000_000).toFixed(1)}M`;
  if (viewerCount >= 1_000) return `${(viewerCount / 1_000).toFixed(1)}K`;
  return String(viewerCount);
}

export function LiveTVFindResultRow({ stream, onPress }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const primaryBadge = (stream.badges?.[0] ?? null) as StreamBadge | null;

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(stream)} activeOpacity={0.85}>
      <View style={styles.thumb} />

      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {stream.streamer_display_name}
        </Text>

        <View style={styles.subRow}>
          <Text style={styles.count}>{formatCount(stream.viewer_count)} watching</Text>
          {stream.category ? <Text style={styles.dot}>·</Text> : null}
          {stream.category ? <Text style={styles.category}>{stream.category}</Text> : null}
        </View>
      </View>

      {primaryBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{primaryBadge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.07)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    meta: {
      flex: 1,
    },
    name: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 4,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    count: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    dot: {
      color: theme.colors.textMuted,
      marginHorizontal: 6,
      fontSize: 14,
      fontWeight: '800',
    },
    category: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    badge: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    badgeText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
  });
}
