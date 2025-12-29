import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface FeaturedItem {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  type?: 'video' | 'link' | 'post';
}

interface FeaturedSectionProps {
  items: FeaturedItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: FeaturedItem) => void;
  onDelete?: (itemId: string) => void;
  cardOpacity?: number; // User-selected opacity (from profile settings)
}

/**
 * FeaturedSection - Displays featured content for all profile types
 * 
 * Features:
 * - Horizontal scrollable grid of featured items
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 * - View-only mode for visitors
 */
export function FeaturedSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: FeaturedSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>Featured</Text>
          <View style={styles.emptyState}>
            <Ionicons name="star" size={48} color={theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Featured Content</Text>
            <Text style={styles.emptyDescription}>
              Showcase your best work by adding featured content
            </Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Featured Content</Text>
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
          <Text style={styles.title}>Featured</Text>
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
          <View key={item.id} style={styles.itemCard}>
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
              {item.thumbnail_url ? (
                <Image
                  source={{ uri: item.thumbnail_url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbnailFallback}>
                  <Ionicons 
                    name={item.type === 'video' ? 'videocam' : item.type === 'link' ? 'link' : 'document-text'} 
                    size={48} 
                    color={theme.colors.textMuted} 
                  />
                </View>
              )}
              {item.type && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {item.type === 'video' ? 'VIDEO' : item.type === 'link' ? 'LINK' : 'POST'}
                  </Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description}
                </Text>
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
      paddingBottom: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: 12,
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
    itemCard: {
      width: 240,
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
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(94, 155, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbnailFallbackIcon: {
      fontSize: 40,
      opacity: 0.5,
    },
    typeBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    typeBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    itemContent: {
      padding: 12,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
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

