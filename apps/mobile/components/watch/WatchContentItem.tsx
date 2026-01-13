import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

interface WatchContentItemProps {
  thumbnailUrl: string;
  isLive: boolean;
  height: number;
  children?: React.ReactNode;
}

/**
 * Content wrapper for a single watch item within the nav shell.
 * Displays thumbnail/preview image filling the available space.
 * Video playback will be wired later.
 */
export default function WatchContentItem({
  thumbnailUrl,
  isLive,
  height,
  children,
}: WatchContentItemProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Background thumbnail/preview */}
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {/* Dark overlay for better UI contrast */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Child overlays (tabs, actions, captions, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
});
