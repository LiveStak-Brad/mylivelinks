import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WatchLiveBadgeProps {
  visible: boolean;
}

/**
 * LIVE badge overlay for live content.
 * Red pill with pulsing dot indicator.
 */
export default function WatchLiveBadge({ visible }: WatchLiveBadgeProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.label}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.95)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
