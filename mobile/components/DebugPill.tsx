/**
 * Debug pill component - shows when EXPO_PUBLIC_DEBUG_LIVE=1
 * Displays overlay state, tile count, connection status, edit mode, and focus mode
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OverlayType } from '../types/live';

import { getRuntimeEnv } from '../lib/env';

interface DebugPillProps {
  overlayState: OverlayType;
  tileCount: number;
  isConnected: boolean;
  isEditMode: boolean;
  focusedIdentity: string | null;
  filledSlots: number;
}

export const DebugPill: React.FC<DebugPillProps> = ({
  overlayState,
  tileCount,
  isConnected,
  isEditMode,
  focusedIdentity,
  filledSlots,
}) => {
  // Only show if debug mode is enabled
  const debugMode = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVE') === '1';
  
  if (!debugMode) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Overlay: {overlayState || 'none'} | Edit: {isEditMode ? 'true' : 'false'} | 
        Focus: {focusedIdentity ? focusedIdentity.slice(0, 6) : 'null'} | 
        Slots: {filledSlots} | Tiles: {tileCount} | 
        {isConnected ? ' 🟢' : ' 🔴'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a9eff',
    zIndex: 9999,
  },
  text: {
    color: '#4a9eff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

