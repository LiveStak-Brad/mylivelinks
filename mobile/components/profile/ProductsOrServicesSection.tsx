import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

export interface ProductOrServiceItem {
  id: string;
  name: string;
  description?: string;
  price?: string; // e.g., '$99.99' or 'From $50'
  image_url?: string;
  category?: string;
  link?: string; // External product/service link
  availability?: 'available' | 'out_of_stock' | 'coming_soon';
}

interface ProductsOrServicesSectionProps {
  items: ProductOrServiceItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ProductOrServiceItem) => void;
  onDelete?: (itemId: string) => void;
  onViewDetails?: (item: ProductOrServiceItem) => void;
  cardOpacity?: number; // User-selected opacity (from profile settings)
}

/**
 * ProductsOrServicesSection - Displays products/services (Business profile type)
 * 
 * Features:
 * - Grid of products/services with images
 * - Price and availability display
 * - Category tags
 * - Empty state with CTA for owners
 * - Edit/Delete actions for owners
 * - View details for visitors
 */
export function ProductsOrServicesSection({
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  onViewDetails,
  cardOpacity = 0.95, // Default opacity to match profile cards
}: ProductsOrServicesSectionProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme, cardOpacity), [theme, cardOpacity]);

  // Empty state for owners
  if (items.length === 0 && isOwner) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Products & Services</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>No Products or Services</Text>
          <Text style={styles.emptyDescription}>
            Showcase what you offer to your customers
          </Text>
          <Pressable style={styles.ctaButton} onPress={onAdd}>
            <Text style={styles.ctaButtonText}>Add Product/Service</Text>
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
        <Text style={styles.title}>Products & Services</Text>
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
          <Pressable
            key={item.id}
            style={styles.productCard}
            onPress={() => !isOwner && onViewDetails?.(item)}
          >
            {/* Product Image */}
            <View style={styles.imageContainer}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.imageFallbackIcon}>📦</Text>
                </View>
              )}

              {/* Availability Badge */}
              {item.availability === 'out_of_stock' && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
                </View>
              )}
              {item.availability === 'coming_soon' && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
              )}

              {/* Category Badge */}
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}
            </View>

            {/* Product Info */}
            <View style={styles.productContent}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>

              {item.description && (
                <Text style={styles.productDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Price */}
              {item.price && (
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
              )}

              {/* View Details Button for visitors */}
              {!isOwner && item.link && (
                <View style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>View Details →</Text>
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, cardOpacity: number = 0.95) {
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
    scrollContent: {
      paddingHorizontal: 16,
      gap: 12,
    },
    productCard: {
      width: 220,
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
    imageContainer: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: theme.colors.surface,
      position: 'relative',
    },
    productImage: {
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
      fontSize: 48,
      opacity: 0.5,
    },
    outOfStockBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.95)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    outOfStockText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    comingSoonBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(139, 92, 246, 0.95)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    comingSoonText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    categoryBadge: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    productContent: {
      padding: 12,
    },
    productName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 6,
      lineHeight: 19,
    },
    productDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      marginBottom: 10,
    },
    priceContainer: {
      marginBottom: 8,
    },
    priceText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.accent,
    },
    viewDetailsButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    viewDetailsText: {
      fontSize: 13,
      fontWeight: '600',
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
    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 40,
      marginHorizontal: 16,
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity, // Apply user-selected opacity
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

