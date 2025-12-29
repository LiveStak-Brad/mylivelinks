import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export type PortfolioMediaType = 'image' | 'video' | 'link';

export interface PortfolioItem {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  media_type: PortfolioMediaType;
  media_url: string;
  thumbnail_url?: string | null;
}

interface PortfolioSectionProps {
  items: PortfolioItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: PortfolioItem) => void;
  onDelete?: (itemId: string) => void;
  onOpen?: (item: PortfolioItem) => void; // open media/link
  cardOpacity?: number;
}

/**
 * PortfolioSection - Displays portfolio items (Business + Creator)
 *
 * Supports:
 * - image/video/link media types (from stored URLs)
 * - owner add/edit/delete
 * - visitor tap-to-open for videos/links (and images)
 */
export function PortfolioSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  onOpen,
  cardOpacity = 0.95,
}: PortfolioSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>🎨 Portfolio</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎨</Text>
            <Text style={styles.emptyTitle}>No Portfolio Items</Text>
            <Text style={styles.emptyDescription}>Work samples and projects will appear here</Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Portfolio Item</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Empty state for visitors (hide section)
  if (items.length === 0) return null;

  const mediaLabel = (t: PortfolioMediaType) => (t === 'image' ? 'IMAGE' : t === 'video' ? 'VIDEO' : 'LINK');
  const mediaEmoji = (t: PortfolioMediaType) => (t === 'image' ? '🖼️' : t === 'video' ? '🎥' : '🔗');

  const resolveThumb = (it: PortfolioItem) => {
    if (it.media_type === 'image') return it.media_url;
    return it.thumbnail_url || null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionCard}>
        <View style={styles.header}>
          <Text style={styles.title}>🎨 Portfolio</Text>
          {isOwner && (
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {items.map((it) => {
            const thumb = resolveThumb(it);
            return (
              <Pressable
                key={it.id}
                style={styles.card}
              onPress={() => {
                if (isOwner) return;
                onOpen?.(it);
              }}
            >
              <View style={styles.imageContainer}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackIcon}>{mediaEmoji(it.media_type)}</Text>
                  </View>
                )}

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {mediaEmoji(it.media_type)} {mediaLabel(it.media_type)}
                  </Text>
                </View>
              </View>

              <View style={styles.content}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {it.title?.trim?.() ? it.title : 'Untitled'}
                </Text>
                {!!it.subtitle && (
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {String(it.subtitle)}
                  </Text>
                )}
                {!!it.description && (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {String(it.description)}
                  </Text>
                )}

                {!isOwner && (it.media_type === 'video' || it.media_type === 'link') && (
                  <View style={styles.openRow}>
                    <Text style={styles.openText}>Open →</Text>
                  </View>
                )}
              </View>

              {isOwner && (
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={() => onEdit?.(it)}>
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete?.(it.id)}>
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, cardOpacity: number) {
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
    card: {
      width: 240,
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
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
    imageContainer: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: theme.colors.surface,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(94, 155, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageFallbackIcon: {
      fontSize: 42,
      opacity: 0.6,
    },
    badge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    content: {
      padding: 12,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
      lineHeight: 19,
    },
    itemSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    itemDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    openRow: {
      paddingTop: 10,
      alignItems: 'flex-start',
    },
    openText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accent,
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
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    deleteButton: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    deleteButtonText: {
      color: theme.colors.danger,
    },
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
      opacity: 0.6,
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




