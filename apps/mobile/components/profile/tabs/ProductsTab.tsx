import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import ModuleEmptyState from '../ModuleEmptyState';
import ShopItemModal from '../ShopItemModal';

interface ProductsTabProps {
  profileId: string;
  isOwnProfile?: boolean;
  onAddItem?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
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
  media_items?: MediaItem[]; // Multiple photos/videos
}

// Shop Item Card Component - displays first media item with play button for videos
function ShopItemCard({ 
  item, 
  cardBg, 
  cardRadius, 
  colors, 
  onPress,
  getMediaIcon,
}: { 
  item: PortfolioItem; 
  cardBg: string; 
  cardRadius: number; 
  colors: any; 
  onPress: () => void;
  getMediaIcon: (type: string) => keyof typeof Feather.glyphMap;
}) {
  const mediaItems = item.media_items || [];
  const hasMultipleMedia = mediaItems.length > 1;
  const firstMedia = mediaItems[0] || null;
  const isVideo = firstMedia?.type === 'video' || item.media_type === 'video';
  const imageUrl = firstMedia?.thumbnail_url || firstMedia?.url || item.thumbnail_url || item.media_url;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius }]}
      onPress={onPress}
    >
      {/* Media Section */}
      {(item.media_type !== 'link' || item.thumbnail_url || mediaItems.length > 0) && imageUrl && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          
          {/* Play Button Overlay for Videos */}
          {isVideo && (
            <View style={styles.playButtonOverlay}>
              <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
                <Feather name="play" size={24} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Multiple Media Indicator */}
          {hasMultipleMedia && (
            <View style={styles.multiMediaBadge}>
              <Feather name="layers" size={12} color="#FFFFFF" />
              <Text style={styles.multiMediaText}>{mediaItems.length}</Text>
            </View>
          )}

          {/* Video/Image Badge */}
          {firstMedia && (
            <View style={[styles.mediaBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Feather name={firstMedia.type === 'video' ? 'video' : 'image'} size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
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
          <Text style={[styles.itemSubtitle, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
        {item.description && (
          <Text style={[styles.itemDescription, { color: colors.mutedText }]} numberOfLines={2}>
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
  );
}


export default function ProductsTab({ profileId, isOwnProfile = false, onAddItem, colors, cardStyle }: ProductsTabProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;

  const loadPortfolioItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_portfolio')
        .select('id, title, subtitle, description, media_type, media_url, thumbnail_url, sort_order')
        .eq('profile_id', profileId)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[ProductsTab] Table not found, skipping');
          setItems([]);
          return;
        }
        throw error;
      }
      
      setItems(data || []);
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_portfolio')) {
        console.log('[ProductsTab] Table not found, skipping');
        setItems([]);
      } else {
        console.error('Error loading portfolio items:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadPortfolioItems();
  }, [loadPortfolioItems]);

  const navigation = useNavigation<any>();

  const handleAddItem = () => {
    setShowAddModal(true);
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
        <View style={[styles.emptyContainer, { backgroundColor: cardBg }]}>
          <Feather name="shopping-bag" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No products or portfolio items yet
          </Text>
        </View>
      );
    }
    
    return (
      <>
        <ModuleEmptyState
          icon="shopping-bag"
          title="No Shop Items Yet"
          description="Add your shop links or individual product links here."
          ctaLabel="Shop"
          onCtaPress={handleAddItem}
          colors={colors}
          cardStyle={cardStyle}
        />
        <ShopItemModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={loadPortfolioItems}
          profileId={profileId}
          editingItem={editingItem}
          colors={colors}
        />
      </>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      {/* Add Button for owners - pill style */}
      {isOwnProfile && (
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.creatorStudioPill, { backgroundColor: colors.primary }]}
            onPress={handleAddItem}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.creatorStudioPillText}>Shop</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.container}>
        {items.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            cardBg={cardBg}
            cardRadius={cardRadius}
            colors={colors}
            onPress={() => handleItemPress(item)}
            getMediaIcon={getMediaIcon}
          />
        ))}
      </View>

      {/* Shop Item Modal */}
      <ShopItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={loadPortfolioItems}
        profileId={profileId}
        editingItem={editingItem}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    padding: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  creatorStudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creatorStudioPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    gap: 12,
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
  mediaContainer: {
    position: 'relative',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mediaBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  multiMediaBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  multiMediaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
