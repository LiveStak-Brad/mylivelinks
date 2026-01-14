import React, { useState, useRef, useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface WatchContentItemProps {
  thumbnailUrl: string;
  mediaUrl?: string | null;
  isLive: boolean;
  isVisible?: boolean;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  height: number;
  children?: React.ReactNode;
}

// Check if URL is a video
function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm') || lower.includes('.m3u8');
}

/**
 * Content wrapper for a single watch item within the nav shell.
 * Displays image/video filling the available space.
 * Square/portrait images are centered and fit to screen width.
 */
export default function WatchContentItem({
  thumbnailUrl,
  mediaUrl,
  isLive,
  isVisible = true,
  isMuted = true,
  onMuteToggle,
  height,
  children,
}: WatchContentItemProps) {
  const { width } = useWindowDimensions();
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<Video>(null);

  const effectiveMediaUrl = mediaUrl || thumbnailUrl;
  const isVideo = isVideoUrl(effectiveMediaUrl) && !videoError;
  const hasValidUrl = effectiveMediaUrl && effectiveMediaUrl.length > 0;

  // Control playback imperatively when visibility changes
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;

    if (isVisible && !isLive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isVisible, isLive, isVideo]);

  // Control mute state imperatively
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    videoRef.current.setIsMutedAsync(isMuted).catch(() => {});
  }, [isMuted, isVideo]);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Background - Video or Image */}
      {isVideo && hasValidUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: effectiveMediaUrl }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isVisible && !isLive}
          isLooping
          isMuted={isMuted}
          onError={() => setVideoError(true)}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          usePoster={!!thumbnailUrl}
        />
      ) : hasValidUrl ? (
        <Image
          source={{ uri: effectiveMediaUrl }}
          style={styles.media}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Subtle overlay for UI contrast */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Child overlays (tabs, actions, captions, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2937',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
