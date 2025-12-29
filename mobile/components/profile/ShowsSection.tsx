import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface ShowItem {
  id: string;
  title: string;
  venue?: string;
  location?: string;
  date?: string; // e.g., 'Dec 31, 2024'
  time?: string; // e.g., '8:00 PM'
  poster_url?: string;
  ticket_link?: string;
  status?: 'upcoming' | 'sold_out' | 'past';
}

interface ShowsSectionProps {
  items: ShowItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ShowItem) => void;
  onDelete?: (itemId: string) => void;
  onGetTickets?: (item: ShowItem) => void;
  cardOpacity?: number; // User-selected opacity (from profile settings)
}

/**
 * ShowsSection - Displays live shows/events (Musician/Comedian profile types)
 * 
 * Features:
 * - List of upcoming and past shows
 * - Venue, date, time information
 * - Ticket links for visitors
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 */
export function ShowsSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  onGetTickets,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: ShowsSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>Shows & Events</Text>
          <View style={styles.emptyState}>
            <Ionicons name="calendar" size={48} color={theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Shows Listed</Text>
            <Text style={styles.emptyDescription}>
              Let your fans know when and where to see you perform
            </Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Show</Text>
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
          <Text style={styles.title}>Shows & Events</Text>
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
            <View key={item.id} style={styles.showCard}>
            {/* Poster/Image */}
            {item.poster_url && (
              <View style={styles.posterContainer}>
                <Image
                  source={{ uri: item.poster_url }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
                {item.status === 'sold_out' && (
                  <View style={styles.soldOutBadge}>
                    <Text style={styles.soldOutText}>SOLD OUT</Text>
                  </View>
                )}
              </View>
            )}

            {/* Show Info */}
            <View style={styles.showContent}>
              {/* Date Badge */}
              {item.date && (
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  {item.time && (
                    <Text style={styles.timeText}>{item.time}</Text>
                  )}
                </View>
              )}

              <Text style={styles.showTitle} numberOfLines={2}>
                {item.title}
              </Text>

              {item.venue && (
                <Text style={styles.venueText} numberOfLines={1}>
                  📍 {item.venue}
                </Text>
              )}

              {item.location && (
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location}
                </Text>
              )}

              {/* Status Badge */}
              {item.status && (
                <View style={[
                  styles.statusBadge,
                  item.status === 'upcoming' && styles.upcomingBadge,
                  item.status === 'sold_out' && styles.soldOutStatusBadge,
                  item.status === 'past' && styles.pastBadge,
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'past' && styles.pastStatusText,
                  ]}>
                    {item.status === 'upcoming' && '🎫 Upcoming'}
                    {item.status === 'sold_out' && '⛔ Sold Out'}
                    {item.status === 'past' && 'Past Event'}
                  </Text>
                </View>
              )}

              {/* Get Tickets Button for visitors */}
              {!isOwner && item.ticket_link && item.status === 'upcoming' && (
                <Pressable
                  style={styles.ticketButton}
                  onPress={() => onGetTickets?.(item)}
                >
                  <Text style={styles.ticketButtonText}>Get Tickets</Text>
                </Pressable>
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
    showCard: {
      width: 260,
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
    posterContainer: {
      width: '100%',
      aspectRatio: 3 / 4, // Typical poster ratio
      backgroundColor: theme.colors.surface,
      position: 'relative',
    },
    posterImage: {
      width: '100%',
      height: '100%',
    },
    soldOutBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#EF4444',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    soldOutText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    showContent: {
      padding: 14,
    },
    dateBadge: {
      backgroundColor: theme.colors.highlight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 10,
      alignSelf: 'flex-start',
    },
    dateText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    timeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    showTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
      lineHeight: 20,
    },
    venueText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    locationText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    upcomingBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    soldOutStatusBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    pastBadge: {
      backgroundColor: theme.colors.surface,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#22C55E',
    },
    pastStatusText: {
      color: theme.colors.textMuted,
    },
    ticketButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
    },
    ticketButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
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

