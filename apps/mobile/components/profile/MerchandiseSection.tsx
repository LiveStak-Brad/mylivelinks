import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import MerchandiseItemModal from './MerchandiseItemModal';

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
  price_cents?: number;
  image_url?: string;
  url?: string;
}

// Provider card component
function ProviderCard({ 
  name, 
  description, 
  url, 
  gradientColors, 
  colors 
}: { 
  name: string; 
  description: string; 
  url: string; 
  gradientColors: string; 
  colors: any;
}) {
  return (
    <View style={[styles.providerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.providerHeader}>
        <View style={[styles.providerLogo, { backgroundColor: gradientColors }]}>
          <Text style={styles.providerLogoText}>{name.charAt(0)}</Text>
        </View>
        <Text style={[styles.providerName, { color: colors.text }]}>{name}</Text>
      </View>
      <Text style={[styles.providerDesc, { color: colors.mutedText }]}>{description}</Text>
      <Pressable 
        onPress={() => Linking.openURL(url).catch(console.error)}
        style={styles.providerLink}
      >
        <Text style={[styles.providerLinkText, { color: colors.primary }]}>Set up on {name}</Text>
        <Feather name="external-link" size={12} color={colors.primary} />
      </Pressable>
    </View>
  );
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MerchItem | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_profile_merch', { p_profile_id: profileId });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          console.log('[MerchandiseSection] RPC not found, skipping');
          setItems([]);
          return;
        }
        throw error;
      }
      setItems(Array.isArray(data) ? data : []);
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
  }, [profileId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleItemPress = (item: MerchItem) => {
    if (item.url) {
      Linking.openURL(item.url).catch(console.error);
    }
  };

  const navigation = useNavigation<any>();

  const handleAddItem = () => {
    navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'merch' });
  };

  const handleModalSave = () => {
    loadItems();
  };

  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return null;
    return `$${(priceCents / 100).toFixed(2)}`;
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

  // Empty state for owner
  if (items.length === 0 && isOwnProfile) {
    return (
      <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="shopping-bag" size={20} color={colors.primary} />
            <Text style={[styles.title, { color: textColor }]}>Merchandise</Text>
          </View>
        </View>

        <View style={styles.emptyStateContainer}>
          <Feather name="shopping-bag" size={48} color={colors.mutedText} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Merch Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
            Add products so fans can support you.
          </Text>
          <Text style={[styles.helperText, { color: colors.mutedText }]}>
            Merchandise is sold through third-party platforms. Create your merch externally and link it here.
          </Text>
          
          <Pressable 
            onPress={handleAddItem} 
            style={[styles.addMerchButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.addMerchButtonText}>Merch</Text>
          </Pressable>

          {/* Recommended Providers */}
          <View style={[styles.providersSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.providersLabel, { color: colors.mutedText }]}>RECOMMENDED PROVIDERS</Text>
            <View style={styles.providersGrid}>
              <ProviderCard
                name="Spring"
                description="Best for creators · No upfront cost · Handles production & shipping"
                url="https://www.spri.ng"
                gradientColors="#9333ea"
                colors={colors}
              />
              <ProviderCard
                name="Shopify"
                description="Best for full brand stores · Requires setup · Maximum control"
                url="https://www.shopify.com"
                gradientColors="#16a34a"
                colors={colors}
              />
            </View>
          </View>
        </View>

        {/* Add/Edit Modal */}
        <MerchandiseItemModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleModalSave}
          profileId={profileId}
          editingItem={editingItem}
          colors={colors}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="shopping-bag" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Merchandise</Text>
        </View>
        {isOwnProfile && (
          <Pressable onPress={handleAddItem} style={[styles.addPillButton, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addPillText}>Merch</Text>
          </Pressable>
        )}
      </View>

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
              {item.price_cents && (
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {formatPrice(item.price_cents)}
                </Text>
              )}
              <Pressable 
                style={[styles.viewProductButton, { backgroundColor: colors.primary }]}
                onPress={() => handleItemPress(item)}
              >
                <Text style={styles.viewProductText}>View Product</Text>
                <Feather name="external-link" size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Disclaimer footer */}
      <View style={[styles.disclaimerContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.disclaimerText, { color: colors.mutedText }]}>
          Merchandise is sold by third-party providers. MyLiveLinks does not handle payments, shipping, or customer support.
        </Text>
      </View>

      {/* Add/Edit Modal */}
      {isOwnProfile && (
        <MerchandiseItemModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleModalSave}
          profileId={profileId}
          editingItem={editingItem}
          colors={colors}
        />
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
  addPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addPillText: {
    color: '#FFFFFF',
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
  viewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  viewProductText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  addMerchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  addMerchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  providersSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    width: '100%',
  },
  providersLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  providersGrid: {
    gap: 12,
  },
  providerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  providerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLogoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  providerDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  providerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  disclaimerText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
