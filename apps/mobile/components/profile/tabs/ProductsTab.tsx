import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import ModuleEmptyState from '../ModuleEmptyState';

interface ProductsTabProps {
  profileId: string;
  isOwnProfile?: boolean;
  onAddItem?: () => void;
  colors: any;
}

interface PortfolioItem {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  media_type: 'image' | 'video' | 'link';
  media_url: string;
  thumbnail_url?: string | null;
  sort_order?: number | null;
}

export default function ProductsTab({ profileId, isOwnProfile = false, onAddItem, colors }: ProductsTabProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolioItems();
  }, [profileId]);

  const loadPortfolioItems = async () => {
    try {
      // Query table directly since RPC may not be deployed
      const { data, error } = await supabase
        .from('profile_portfolio')
        .select('id, title, subtitle, description, media_type, media_url, thumbnail_url, sort_order')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true });

      if (error) {
        // Table might not exist yet - gracefully handle
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[ProductsTab] Table not found, skipping');
          setItems([]);
          return;
        }
        throw error;
      }
      
      setItems(data || []);
    } catch (error: any) {
      // Gracefully handle missing table
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_portfolio')) {
        console.log('[ProductsTab] Table not found, skipping');
        setItems([]);
      } else {
        console.error('Error loading portfolio items:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: PortfolioItem) => {
    if (item.media_type === 'link' && item.media_url) {
      Linking.openURL(item.media_url).catch(err => 
        console.error('Failed to open link:', err)
      );
    }
  };

  const getMediaIcon = (mediaType: string): keyof typeof Feather.glyphMap => {
    switch (mediaType) {
      case 'video': return 'video';
      case 'link': return 'link';
      default: return 'image';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    if (!isOwnProfile) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Feather name="briefcase" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No products or portfolio items yet
          </Text>
        </View>
      );
    }
    
    return (
      <ModuleEmptyState
        icon="briefcase"
        title="No Portfolio Items Yet"
        description="Showcase your products, work samples, or portfolio pieces here."
        ctaLabel="Add Portfolio Item"
        onCtaPress={onAddItem}
        colors={colors}
      />
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleItemPress(item)}
        >
          {(item.media_type === 'image' || item.thumbnail_url) && (
            <Image
              source={{ uri: item.thumbnail_url || item.media_url }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <View style={[styles.mediaTypeBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Feather name={getMediaIcon(item.media_type)} size={14} color={colors.primary} />
              </View>
              {item.title && (
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
              )}
            </View>
            {item.subtitle && (
              <Text style={[styles.itemSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            {item.description && (
              <Text style={[styles.itemDescription, { color: colors.text }]} numberOfLines={3}>
                {item.description}
              </Text>
            )}
            {item.media_type === 'link' && (
              <View style={styles.linkIndicator}>
                <Feather name="external-link" size={14} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Open Link</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 180,
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  mediaTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 38,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 38,
  },
  linkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 38,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
