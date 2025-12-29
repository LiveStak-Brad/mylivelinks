import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface ScheduleItem {
  id: string;
  title: string;
  day_of_week?: string; // e.g., 'Monday', 'Tuesday'
  time?: string; // e.g., '8:00 PM EST'
  description?: string;
  recurring?: boolean;
}

interface ScheduleSectionProps {
  items: ScheduleItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ScheduleItem) => void;
  onDelete?: (itemId: string) => void;
  cardOpacity?: number; // User-selected opacity (from profile settings)
}

/**
 * ScheduleSection - Displays streaming schedule (Streamer profile type)
 * 
 * Features:
 * - List of scheduled streams
 * - Day/time display
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 */
export function ScheduleSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: ScheduleSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>Stream Schedule</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Schedule Set</Text>
            <Text style={styles.emptyDescription}>
              Let your followers know when you'll be streaming
            </Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Schedule</Text>
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
          <Text style={styles.title}>Stream Schedule</Text>
          {isOwner && (
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.listContainer}>
        {items.map((item) => (
          <View key={item.id} style={styles.scheduleItem}>
            <View style={styles.scheduleItemHeader}>
              <View style={styles.scheduleTimeBadge}>
                <Text style={styles.dayText}>{item.day_of_week || 'TBD'}</Text>
                {item.time && <Text style={styles.timeText}>{item.time}</Text>}
              </View>
              {item.recurring && (
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringText}>🔁 Recurring</Text>
                </View>
              )}
            </View>

            <Text style={styles.scheduleTitle}>{item.title}</Text>
            
            {item.description && (
              <Text style={styles.scheduleDescription} numberOfLines={2}>
                {item.description}
              </Text>
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
    listContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    scheduleItem: {
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(94, 155, 255, 0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 12,
    },
    scheduleItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    scheduleTimeBadge: {
      backgroundColor: theme.colors.highlight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 2,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    timeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    recurringBadge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    recurringText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    scheduleTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    scheduleDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
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
      marginTop: 8,
      marginBottom: 16,
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(94, 155, 255, 0.05)',
      borderRadius: 12,
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

