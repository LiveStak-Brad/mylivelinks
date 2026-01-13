import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WatchCaptionOverlayProps {
  username: string;
  displayName?: string;
  title?: string;
  caption: string;
  hashtags: string[];
  location?: string;
  // Handler placeholders
  onUsernamePress?: () => void;
  onHashtagPress?: (tag: string) => void;
  onLocationPress?: () => void;
}

const MAX_COLLAPSED_LENGTH = 80;

/**
 * Bottom metadata overlay with username, caption, hashtags, location.
 * Includes expand-on-tap behavior for long captions (UI only).
 * Subtle bottom gradient for readability.
 */
export default function WatchCaptionOverlay({
  username,
  displayName,
  title,
  caption,
  hashtags,
  location,
  onUsernamePress,
  onHashtagPress,
  onLocationPress,
}: WatchCaptionOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  const isLongCaption = caption.length > MAX_COLLAPSED_LENGTH;
  const displayCaption = expanded || !isLongCaption
    ? caption
    : caption.slice(0, MAX_COLLAPSED_LENGTH).trim();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Bottom gradient for readability (stacked opacity layers) */}
      <View style={styles.gradientWrapper} pointerEvents="none">
        <View style={[styles.gradientLayer, styles.gradientLayer1]} />
        <View style={[styles.gradientLayer, styles.gradientLayer2]} />
        <View style={[styles.gradientLayer, styles.gradientLayer3]} />
        <View style={[styles.gradientLayer, styles.gradientLayer4]} />
      </View>

      <View style={styles.content}>
        {/* Username + Display Name (web parity) */}
        <Pressable
          accessibilityRole="button"
          onPress={onUsernamePress}
          style={({ pressed }) => [styles.usernameRow, pressed && styles.pressed]}
        >
          <Text style={styles.username}>@{username}</Text>
          {displayName && <Text style={styles.displayName}>{displayName}</Text>}
        </Pressable>

        {/* Title - bold separate line (web parity) */}
        {title && (
          <Text style={styles.title}>{title}</Text>
        )}

        {/* Caption with expand */}
        <View style={styles.captionRow}>
          <Text style={styles.captionText}>
            {displayCaption}
            {isLongCaption && !expanded && (
              <Text style={styles.ellipsis}> ...</Text>
            )}
          </Text>
          {isLongCaption && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Show less' : 'Show more'}
              onPress={() => setExpanded((prev) => !prev)}
              style={styles.moreButton}
            >
              <Text style={styles.moreText}>{expanded ? 'less' : 'more'}</Text>
            </Pressable>
          )}
        </View>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <View style={styles.hashtagsRow}>
            {hashtags.map((tag) => (
              <Pressable
                key={tag}
                accessibilityRole="button"
                onPress={() => onHashtagPress?.(tag)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.hashtag}>#{tag}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Location (optional) */}
        {location && (
          <Pressable
            accessibilityRole="button"
            onPress={onLocationPress}
            style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
          >
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>{location}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradientWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  gradientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gradientLayer1: {
    bottom: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  gradientLayer2: {
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  gradientLayer3: {
    bottom: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gradientLayer4: {
    bottom: 0,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  captionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ellipsis: {
    color: 'rgba(255,255,255,0.7)',
  },
  moreButton: {
    marginLeft: 4,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  hashtag: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  pressed: {
    opacity: 0.7,
  },
});
