import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface Stream {
  id: string;
  slug: string;
  streamer_display_name: string;
  thumbnail_url: string | null;
  viewer_count: number;
  category: string | null;
  tags: ('Featured' | 'Sponsored' | 'New' | 'Nearby')[];
}

interface StreamCardProps {
  stream: Stream;
  onPress: (stream: Stream) => void;
}

/**
 * StreamCard - LiveTV stream card component
 * 
 * Premium discovery card for LiveTV with:
 * - 16:9 aspect ratio thumbnail
 * - Streamer display name
 * - Viewer count
 * - Tag badges (Featured/Sponsored/New/Nearby)
 * - Category label
 * - TikTok/Kik-level polish
 */
export function StreamCard({ stream, onPress }: StreamCardProps) {
  const [imageError, setImageError] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getBadgeStyle = (tag: string) => {
    switch (tag) {
      case 'Featured':
        return { bg: '#f59e0b', text: '⭐ Featured' };
      case 'Sponsored':
        return { bg: '#8b5cf6', text: '💎 Sponsored' };
      case 'New':
        return { bg: '#10b981', text: '✨ New' };
      case 'Nearby':
        return { bg: '#3b82f6', text: '📍 Nearby' };
      default:
        return null;
    }
  };

  const primaryTag = stream.tags?.[0];
  const badgeInfo = primaryTag ? getBadgeStyle(primaryTag) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(stream)}
      activeOpacity={0.85}
    >
      {/* Thumbnail Container (16:9 aspect ratio) */}
      <View style={styles.thumbnailContainer}>
        {stream.thumbnail_url && !imageError ? (
          <Image
            source={{ uri: stream.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Text style={styles.thumbnailFallbackIcon}>📺</Text>
          </View>
        )}

        {/* Primary Tag Badge - Top Right */}
        {badgeInfo && (
          <View style={[styles.tagBadge, { backgroundColor: badgeInfo.bg }]}>
            <Text style={styles.tagBadgeText}>{badgeInfo.text}</Text>
          </View>
        )}

        {/* Viewer Count Badge - Bottom Right */}
        {stream.viewer_count > 0 && (
          <View style={styles.viewerBadge}>
            <Text style={styles.viewerIcon}>👁</Text>
            <Text style={styles.viewerText}>
              {stream.viewer_count >= 1000 
                ? `${(stream.viewer_count / 1000).toFixed(1)}K` 
                : stream.viewer_count}
            </Text>
          </View>
        )}

        {/* Gradient overlay for text readability */}
        <View style={styles.gradientOverlay} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Streamer Display Name */}
        <Text style={styles.streamerName} numberOfLines={1} ellipsizeMode="tail">
          {stream.streamer_display_name}
        </Text>

        {/* Category Label */}
        {stream.category && (
          <View style={styles.categoryContainer}>
            <View style={styles.categoryDot} />
            <Text style={styles.categoryText} numberOfLines={1}>
              {stream.category}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;

  return StyleSheet.create({
    card: {
      width: 280, // Fixed width for horizontal scroll
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginRight: 12,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    thumbnailContainer: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: theme.colors.surface,
      position: 'relative',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    thumbnailFallback: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(94, 155, 255, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbnailFallbackIcon: {
      fontSize: 56,
      opacity: 0.4,
    },
    gradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: 'transparent',
    },
    tagBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    tagBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    viewerBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    viewerIcon: {
      fontSize: 13,
    },
    viewerText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      padding: 14,
      gap: 6,
    },
    streamerName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    categoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
    categoryText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
  });
}

