import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface MerchandiseSectionProps {
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

interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  image_url?: string;
  purchase_url?: string;
}

export default function MerchandiseSection({
  profileId,
  isOwnProfile,
  onAddItem,
  colors,
  cardStyle,
}: MerchandiseSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [profileId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_merch')
        .select('id, name, description, price, image_url, purchase_url')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[MerchandiseSection] Table not found, skipping');
          setItems([]);
          return;
        }
        throw error;
      }
      setItems(data || []);
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_merch')) {
        console.log('[MerchandiseSection] Table not found, skipping');
        setItems([]);
      } else {
        console.error('Error loading merchandise:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: MerchItem) => {
    if (item.purchase_url) {
      Linking.openURL(item.purchase_url).catch(console.error);
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
          <Feather name="shopping-bag" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Merchandise</Text>
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
            No merchandise yet
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
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.price && (
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                )}
              </View>
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
  itemInfo: {
    padding: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
