import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type LeaderType = 'streamer' | 'gifter' | 'referrer';

const LEADER_CONFIG: Record<LeaderType, { icon: string; label: string; color: string }> = {
  streamer: { icon: '🎬', label: '#1 Streamer', color: '#8b5cf6' },
  gifter: { icon: '🎁', label: '#1 Gifter', color: '#f59e0b' },
  referrer: { icon: '🤝', label: '#1 Referrer', color: '#10b981' },
};

interface TopLeaderBadgeProps {
  type: LeaderType;
  size?: 'sm' | 'md';
}

export default function TopLeaderBadge({ type, size = 'sm' }: TopLeaderBadgeProps) {
  const config = LEADER_CONFIG[type];
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <View style={styles.container}>
      <Text style={[styles.icon, { fontSize }]}>{config.icon}</Text>
      <Text style={[styles.label, { fontSize, color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    lineHeight: 14,
  },
  label: {
    fontWeight: '700',
  },
});
