import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface PressKitItem {
  id: string;
  title: string;
  type: 'bio' | 'photo' | 'rider' | 'press_release' | 'media' | 'other';
  file_url?: string;
  description?: string;
  file_size?: string; // e.g., '2.4 MB'
  file_type?: string; // e.g., 'PDF', 'JPG', 'ZIP'
}

interface PressKitSectionProps {
  items: PressKitItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: PressKitItem) => void;
  onDelete?: (itemId: string) => void;
  onDownload?: (item: PressKitItem) => void;
}

/**
 * PressKitSection - Displays press kit materials (Musician profile type)
 * 
 * Features:
 * - List of downloadable press materials
 * - File type and size indicators
 * - Direct download for visitors
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 */
export function PressKitSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  onDownload,
}: PressKitSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getIconForType = (type: PressKitItem['type']): string => {
    switch (type) {
      case 'bio':
        return '📝';
      case 'photo':
        return '📷';
      case 'rider':
        return '📋';
      case 'press_release':
        return '📰';
      case 'media':
        return '🎬';
      default:
        return '📄';
    }
  };

  const getColorForType = (type: PressKitItem['type']): string => {
    switch (type) {
      case 'bio':
        return '#8B5CF6';
      case 'photo':
        return '#F59E0B';
      case 'rider':
        return '#10B981';
      case 'press_release':
        return '#3B82F6';
      case 'media':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Press Kit</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyTitle}>No Press Kit Materials</Text>
          <Text style={styles.emptyDescription}>
            Add bios, photos, riders, and other materials for media and venues
          </Text>
          <Pressable style={styles.ctaButton} onPress={onAdd}>
            <Text style={styles.ctaButtonText}>Add Materials</Text>
          </Pressable>
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
      <View style={styles.header}>
        <Text style={styles.title}>Press Kit</Text>
        {isOwner && (
          <Pressable onPress={onAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.listContainer}>
        {items.map((item) => (
          <View key={item.id} style={styles.pressKitItem}>
            {/* Icon & Type */}
            <View style={styles.itemMain}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getColorForType(item.type) + '20' },
                ]}
              >
                <Text style={styles.icon}>{getIconForType(item.type)}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                {item.description && (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                {/* File metadata */}
                <View style={styles.metadata}>
                  {item.file_type && (
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataText}>{item.file_type}</Text>
                    </View>
                  )}
                  {item.file_size && (
                    <View style={styles.metadataBadge}>
                      <Text style={styles.metadataText}>{item.file_size}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Download Button for visitors */}
            {!isOwner && item.file_url && (
              <Pressable
                style={styles.downloadButton}
                onPress={() => onDownload?.(item)}
              >
                <Text style={styles.downloadIcon}>⬇</Text>
              </Pressable>
            )}

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
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;

  return StyleSheet.create({
    container: {
      paddingVertical: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
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
    listContainer: {
      paddingHorizontal: 16,
    },
    pressKitItem: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    itemMain: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    icon: {
      fontSize: 24,
    },
    itemInfo: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    itemDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    metadata: {
      flexDirection: 'row',
      gap: 8,
    },
    metadataBadge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    metadataText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    downloadButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    downloadIcon: {
      fontSize: 18,
      color: '#fff',
    },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 10,
      marginTop: 8,
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
      marginHorizontal: 16,
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
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

