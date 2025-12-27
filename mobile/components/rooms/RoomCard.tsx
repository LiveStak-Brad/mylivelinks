import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

interface Room {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_live: boolean;
  viewer_count: number;
  category: string | null;
  tags: string[];
}

interface RoomCardProps {
  room: Room;
  onPress: (room: Room) => void;
}

/**
 * RoomCard - Mobile room card component matching web design
 * 
 * Web reference: components/rooms/RoomCard.tsx and app/rooms/page.tsx
 * 
 * Features:
 * - 16:9 aspect ratio thumbnail
 * - LIVE badge (top-left, red, pulsing dot)
 * - Viewer count badge (top-right, when live)
 * - Room title (bold, 1 line)
 * - Description (muted, 2 lines)
 * - Category badge
 * - Tap to open room
 */
export function RoomCard({ room, onPress }: RoomCardProps) {
  const [imageError, setImageError] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(room)}
      activeOpacity={0.85}
    >
      {/* Thumbnail Container (16:9 aspect ratio) */}
      <View style={styles.thumbnailContainer}>
        {room.thumbnail_url && !imageError ? (
          <Image
            source={{ uri: room.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Text style={styles.thumbnailFallbackIcon}>📹</Text>
          </View>
        )}

        {/* LIVE Badge - Top Left */}
        {room.is_live && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Viewer Count Badge - Top Right */}
        {room.is_live && room.viewer_count > 0 && (
          <View style={styles.viewerBadge}>
            <Text style={styles.viewerIcon}>👥</Text>
            <Text style={styles.viewerText}>{room.viewer_count}</Text>
          </View>
        )}

        {/* Hover overlay effect (subtle on mobile) */}
        <View style={styles.thumbnailOverlay} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Room Title */}
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {room.display_name}
        </Text>

        {/* Description */}
        {room.description && (
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {room.description}
          </Text>
        )}

        {/* Category/Tags */}
        {(room.category || room.tags?.length > 0) && (
          <View style={styles.badges}>
            {room.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{room.category}</Text>
              </View>
            )}
            {room.tags?.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
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
      flex: 1,
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginHorizontal: 6,
      marginBottom: 12,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    thumbnailContainer: {
      width: '100%',
      aspectRatio: 16 / 9, // 16:9 aspect ratio like web
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
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(94, 155, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbnailFallbackIcon: {
      fontSize: 48,
      opacity: 0.3,
    },
    thumbnailOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0)',
    },
    liveBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#dc2626', // red-600
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
      // Note: Animated pulse would need Animated API in actual usage
    },
    liveText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    viewerBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      gap: 4,
    },
    viewerIcon: {
      fontSize: 12,
    },
    viewerText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    content: {
      padding: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 8,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    categoryBadge: {
      backgroundColor: theme.mode === 'light' ? theme.colors.surface : 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryText: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: '600',
    },
    tagBadge: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },
  });
}
