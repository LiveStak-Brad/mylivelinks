import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Linking } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  image_url?: string;
  buy_url?: string;
  is_featured?: boolean;
  sort_order?: number;
}

type Props = {
  items: MerchItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: MerchItem) => void;
  onDelete?: (itemId: string) => void;
  onMove?: (itemId: string, direction: -1 | 1) => void;
  cardOpacity?: number;
};

export function MerchSection({ items, isOwner, onAdd, onEdit, onDelete, onMove, cardOpacity = 0.95 }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>🛍️ Merchandise</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyTitle}>No Merch Yet</Text>
            <Text style={styles.emptyDescription}>Add products so fans can support you.</Text>
            <Pressable style={styles.ctaButton} onPress={onAdd}>
              <Text style={styles.ctaButtonText}>Add Merchandise</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sectionCard}>
        <View style={styles.header}>
          <Text style={styles.title}>🛍️ Merchandise</Text>
          {isOwner && (
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {items.map((item, idx) => (
            <View key={item.id} style={styles.card}>
            <View style={styles.imageContainer}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.imageFallbackIcon}>🛍️</Text>
                </View>
              )}
            </View>

            <View style={styles.content}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              {!!item.price && <Text style={styles.price}>{item.price}</Text>}
              {!!item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {!isOwner && item.buy_url ? (
                <Pressable
                  style={styles.buyButton}
                  onPress={() => {
                    void Linking.openURL(item.buy_url!);
                  }}
                >
                  <Text style={styles.buyButtonText}>Buy</Text>
                </Pressable>
              ) : null}
            </View>

            {isOwner && (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.moveButton]}
                  onPress={() => onMove?.(item.id, -1)}
                  disabled={idx === 0}
                >
                  <Text style={[styles.actionButtonText, idx === 0 ? styles.disabledText : undefined]}>◀</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.moveButton]}
                  onPress={() => onMove?.(item.id, 1)}
                  disabled={idx === items.length - 1}
                >
                  <Text style={[styles.actionButtonText, idx === items.length - 1 ? styles.disabledText : undefined]}>▶</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => onEdit?.(item)}>
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete?.(item.id)}>
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
      width: 220,
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
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.08)',
    },
    imageFallbackIcon: {
      fontSize: 40,
      opacity: 0.5,
    },
    content: {
      padding: 12,
    },
    name: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    price: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.colors.accent,
      marginBottom: 6,
    },
    description: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      marginBottom: 10,
    },
    buyButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    buyButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
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
    moveButton: {
      flex: 0.7,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    disabledText: {
      opacity: 0.35,
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


