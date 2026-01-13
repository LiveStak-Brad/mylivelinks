import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

export type MediaViewerKind = 'image' | 'video';

export type MediaViewerProps = {
  kind: MediaViewerKind;
  url: string;
  onRequestClose: () => void;
};

function looksLikeHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function inferKindFromUrl(url: string): MediaViewerKind {
  const clean = url.split('?')[0] ?? url;
  if (/\.(mp4|mov|m4v|webm|m3u8)$/i.test(clean)) return 'video';
  return 'image';
}

export default function MediaViewer({ kind, url, onRequestClose }: MediaViewerProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video | null>(null);

  const resolvedKind = useMemo(() => {
    if (kind === 'image' || kind === 'video') return kind;
    return inferKindFromUrl(url);
  }, [kind, url]);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    // Reset image state when url/kind changes
    setImageLoaded(false);
    setImageError(null);
  }, [resolvedKind, url]);

  useEffect(() => {
    return () => {
      // Ensure we stop playback when unmounting
      if (videoRef.current) {
        void videoRef.current.stopAsync();
      }
    };
  }, []);

  if (!url || !looksLikeHttpUrl(url)) {
    // Safety: viewer expects a resolvable URL; we don't attempt storage resolution here.
    return (
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close media viewer"
          onPress={onRequestClose}
          style={[styles.closeBtn, { top: insets.top + 12, right: 14 }]}
          hitSlop={12}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Backdrop */}
      <View style={styles.backdrop} />

      {/* Close */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close media viewer"
        onPress={onRequestClose}
        style={[styles.closeBtn, { top: insets.top + 12, right: 14 }]}
        hitSlop={12}
      >
        <Feather name="x" size={22} color="#FFFFFF" />
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        {resolvedKind === 'video' ? (
          <Video
            ref={(r) => {
              videoRef.current = r;
            }}
            source={{ uri: url }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
            isMuted={false}
            onError={(e) => {
              console.warn('[MediaViewer] video error', {
                url,
                error: (e as any)?.nativeEvent,
              });
            }}
          />
        ) : (
          <>
            {!imageLoaded ? (
              <View style={styles.loadingCenter} pointerEvents="none">
                <ActivityIndicator size={Platform.OS === 'ios' ? 'large' : 'large'} color="#FFFFFF" />
              </View>
            ) : null}
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                const msg = (e as any)?.nativeEvent?.error ? String((e as any).nativeEvent.error) : 'Image failed to load';
                setImageError(msg);
                console.warn('[MediaViewer] image error', { url, error: msg });
              }}
              accessibilityLabel="Image"
            />
            {imageError ? (
              <View style={styles.errorOverlay} pointerEvents="none" />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

