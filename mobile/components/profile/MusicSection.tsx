import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface MusicItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  cover_url?: string;
  duration?: string; // e.g., '3:45'
  release_date?: string;
  streaming_links?: {
    spotify?: string;
    apple_music?: string;
    youtube?: string;
  };
}

interface MusicSectionProps {
  items: MusicItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: MusicItem) => void;
  onDelete?: (itemId: string) => void;
  onPlay?: (item: MusicItem) => void;
  cardOpacity?: number; // User-selected opacity (from profile settings)
}

/**
 * MusicSection - Displays music tracks (Musician profile type)
 * 
 * Features:
 * - Horizontal scroll of album art/tracks
 * - Duration and release info
 * - Streaming platform links
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 */
export function MusicSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  onPlay,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: MusicSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>Music</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyTitle}>No Music Added</Text>
            <Text style={styles.emptyDescription}>
              Share your tracks, albums, and singles with your fans
            </Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Music</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Empty state for visitors (hide section)
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCard}>
        <View style={styles.header}>
          <Text style={styles.title}>Music</Text>
          {isOwner && (
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item) => (
            <View key={item.id} style={styles.musicCard}>
            {/* Album Art */}
            <Pressable
              style={styles.coverContainer}
              onPress={() => onPlay?.(item)}
            >
              {item.cover_url ? (
                <Image
                  source={{ uri: item.cover_url }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverFallback}>
                  <Text style={styles.coverFallbackIcon}>🎶</Text>
                </View>
              )}
              
              {/* Play button overlay */}
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
              </View>

              {/* Duration badge */}
              {item.duration && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              )}
            </Pressable>

            {/* Track Info */}
            <View style={styles.musicContent}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title}
              </Text>
              
              {item.artist && (
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.artist}
                </Text>
              )}

              {item.album && (
                <Text style={styles.albumName} numberOfLines={1}>
                  {item.album}
                </Text>
              )}

              {/* Streaming Links */}
              {item.streaming_links && Object.keys(item.streaming_links).length > 0 && (
                <View style={styles.streamingLinks}>
                  {item.streaming_links.spotify && (
                    <View style={styles.streamingBadge}>
                      <Text style={styles.streamingIcon}>🟢</Text>
                    </View>
                  )}
                  {item.streaming_links.apple_music && (
                    <View style={styles.streamingBadge}>
                      <Text style={styles.streamingIcon}>🍎</Text>
                    </View>
                  )}
                  {item.streaming_links.youtube && (
                    <View style={styles.streamingBadge}>
                      <Text style={styles.streamingIcon}>▶️</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Owner Actions */}
            {isOwner && (
              <View style={styles.actions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onEdit?.(item)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => onDelete?.(item.id)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, cardOpacity: number = 0.95) {
  const cardShadow = theme.elevations.card;

  return StyleSheet.create({
    container: {
      paddingVertical: 20,
      paddingHorizontal: 16,
    },
    sectionCard: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    addButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    musicCard: {
      width: 180,
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity, // Apply user-selected opacity
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    coverContainer: {
      width: '100%',
      aspectRatio: 1, // Square album art
      backgroundColor: theme.colors.surface,
      position: 'relative',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverFallback: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(94, 155, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverFallbackIcon: {
      fontSize: 48,
      opacity: 0.5,
    },
    playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    playButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    playIcon: {
      fontSize: 20,
      color: theme.colors.accent,
      marginLeft: 4,
    },
    durationBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    durationText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    musicContent: {
      padding: 12,
    },
    trackTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    artistName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    albumName: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    streamingLinks: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    streamingBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    streamingIcon: {
      fontSize: 14,
    },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      padding: 8,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    deleteButton: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    deleteButtonText: {
      color: theme.colors.danger,
    },
    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(94, 155, 255, 0.05)',
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 16,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
      opacity: 0.5,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    ctaButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    ctaButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

