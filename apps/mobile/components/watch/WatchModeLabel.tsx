import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type WatchMode = 'all' | 'liveOnly' | 'creatorOnly';

interface WatchModeLabelProps {
  mode: WatchMode;
}

const MODE_LABELS: Record<WatchMode, string | null> = {
  all: null, // Don't show label in "All" mode (default)
  liveOnly: 'LIVE ONLY',
  creatorOnly: 'CREATOR ONLY',
};

/**
 * Non-interactive mode status label.
 * Shows current horizontal swipe mode: Live Only / Creator Only.
 * Hidden in "All" mode (default state).
 * 
 * NOT a clickable tab or pill — mode switching is via horizontal swipe only.
 * Swipe logic will be wired later.
 */
export default function WatchModeLabel({ mode }: WatchModeLabelProps) {
  const label = MODE_LABELS[mode];

  // Don't render anything in default "all" mode
  if (!label) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Subtle, non-interactive appearance
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
