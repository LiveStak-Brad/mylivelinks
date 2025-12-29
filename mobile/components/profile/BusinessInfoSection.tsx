import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export type BusinessInfoData = {
  business_description?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  location_or_service_area?: string | null;
  hours_text?: string | null;
};

type Props = {
  data: BusinessInfoData | null;
  isOwner: boolean;
  onEdit?: () => void;
  cardOpacity?: number;
};

export function BusinessInfoSection({ data, isOwner, onEdit, cardOpacity = 0.95 }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  const hasAny =
    !!data &&
    Boolean(
      (data.business_description && data.business_description.trim()) ||
        (data.website_url && data.website_url.trim()) ||
        (data.contact_email && data.contact_email.trim()) ||
        (data.contact_phone && data.contact_phone.trim()) ||
        (data.location_or_service_area && data.location_or_service_area.trim()) ||
        (data.hours_text && data.hours_text.trim())
    );

  if (!hasAny) {
    if (!isOwner) return null;
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>💼 Business Info</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💼</Text>
            <Text style={styles.emptyTitle}>No Business Info Yet</Text>
            <Text style={styles.emptyDescription}>
              Add your business description and contact details. Visitors won&apos;t see placeholders.
            </Text>
            <Pressable style={styles.ctaButton} onPress={onEdit}>
              <Text style={styles.ctaButtonText}>Add Business Description (Edit)</Text>
            </Pressable>
            <Pressable style={styles.ctaButtonSecondary} onPress={onEdit}>
              <Text style={styles.ctaButtonText}>Add Website / Email / Phone / Location/Service Area</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>💼 Business Info</Text>
          {isOwner && (
            <Pressable onPress={onEdit} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {!!data?.business_description && (
          <Text style={styles.bodyText}>{String(data.business_description)}</Text>
        )}

        {!!data?.hours_text && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Hours</Text>
            <Text style={styles.rowValue}>{String(data.hours_text)}</Text>
          </View>
        )}

        {!!data?.location_or_service_area && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Location / Service Area</Text>
            <Text style={styles.rowValue}>{String(data.location_or_service_area)}</Text>
          </View>
        )}

        {!!data?.website_url && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Website</Text>
            <Text style={styles.rowValue}>{String(data.website_url)}</Text>
          </View>
        )}

        {!!data?.contact_email && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{String(data.contact_email)}</Text>
          </View>
        )}

        {!!data?.contact_phone && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{String(data.contact_phone)}</Text>
          </View>
        )}
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
    editButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
    },
    editButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    card: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 0,
      paddingBottom: 14,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
      gap: 10,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    row: {
      gap: 4,
      paddingHorizontal: 16,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    rowValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
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
    ctaButtonSecondary: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ctaButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
  });
}


