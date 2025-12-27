/**
 * LiveRoom Mount Debug Pill
 * Shows mount status, render count, and navigation state
 * ONLY visible in dev builds (__DEV__)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIsFocused, useNavigationState } from '@react-navigation/native';

export const LiveRoomMountPill: React.FC = () => {
  const [mountedAt] = useState(() => new Date().toLocaleTimeString());
  const renderCount = useRef(0);
  const isFocused = useIsFocused();
  const routeName = useNavigationState(state => {
    const route = state.routes[state.index];
    return route?.name || 'unknown';
  });

  // Increment render count
  renderCount.current += 1;

  // Log mounts/unmounts
  useEffect(() => {
    console.log('[LIVEROOM_MOUNT] Mounted at:', mountedAt);
    return () => {
      console.log('[LIVEROOM_MOUNT] Unmounting! Rendered', renderCount.current, 'times');
    };
  }, []);

  // Log focus changes
  useEffect(() => {
    console.log('[LIVEROOM_MOUNT] Focus changed:', isFocused);
  }, [isFocused]);

  if (!__DEV__) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LiveRoom Mounted</Text>
      <Text style={styles.text}>Time: {mountedAt}</Text>
      <Text style={styles.text}>Renders: {renderCount.current}</Text>
      <Text style={styles.text}>Route: {routeName}</Text>
      <Text style={[styles.text, isFocused ? styles.focused : styles.unfocused]}>
        {isFocused ? '✅ Focused' : '⚠️ Unfocused'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4a9eff',
    minWidth: 200,
  },
  title: {
    color: '#4a9eff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  focused: {
    color: '#00ff00',
  },
  unfocused: {
    color: '#ff9900',
  },
});

