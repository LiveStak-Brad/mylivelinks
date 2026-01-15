import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface PortfolioSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  onAddItem?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface PortfolioItem {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  media_type: 'image' | 'video' | 'link';
  media_url: string;
  thumbnail_url?: string | null;
}

export default function PortfolioSection({
  profileId,
  isOwnProfile,
  onAddItem,
  colors,
  cardStyle,
}: PortfolioSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [profileId]);

  const loadItems = async () => {
    try {
      // Query table directly since RPC may not be deployed
      const { data, error } = await supabase
        .from('profile_portfolio')
        .select('id, title, subtitle, media_type, media_url, thumbnail_url, sort_order')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true })
        .limit(4);

      if (error) {
        // Table might not exist yet - gracefully handle
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[PortfolioSection] Table not found, skipping');
          setItems([]);
          return;
        }
        throw error;
      }
      setItems(data || []);
    } catch (error: any) {
      // Gracefully handle missing table
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_portfolio')) {
        console.log('[PortfolioSection] Table not found, skipping');
        setItems([]);
      } else {
        console.error('Error loading portfolio:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: PortfolioItem) => {
    if (item.media_type === 'link' && item.media_url) {
      Linking.openURL(item.media_url).catch(console.error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="briefcase" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Portfolio</Text>
        </View>
        {isOwnProfile && onAddItem && (
          <Pressable onPress={onAddItem} style={styles.addButton}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.primary }]}>Add</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No portfolio items yet
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.itemCard, { borderColor: colors.border }]}
              onPress={() => handleItemPress(item)}
            >
              {(item.thumbnail_url || item.media_type === 'image') && (
                <Image
                  source={{ uri: item.thumbnail_url || item.media_url }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              )}
              {item.title && (
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 100,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    padding: 8,
  },
});
