/**
 * EducationTab - Education Content Profile Tab (Mobile)
 * 
 * Displays tutorials, courses, and educational content.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

type EducationItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  publishedAt: string;
  tags?: string[];
  topic?: string;
};

interface EducationTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function EducationTab({ profileId, colors, isOwnProfile = false, cardStyle }: EducationTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<EducationItem[]>([]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: 'education',
        p_limit: 50,
        p_offset: 0,
      });
      
      if (rpcError) {
        console.error('Error fetching education content:', rpcError);
        setContent([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setContent([]);
        return;
      }
      
      const formatDuration = (seconds: number): string => {
        if (!seconds || seconds <= 0) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      };
      
      const transformedContent: EducationItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled',
        description: item.description || '',
        duration: formatDuration(item.duration_seconds || 0),
        category: item.category || 'Tutorial',
        publishedAt: item.created_at,
        tags: item.tags || [],
      }));
      
      setContent(transformedContent);
    } catch (e: any) {
      setError(e?.message || 'Failed to load education content');
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleItemPress = useCallback((item: EducationItem) => {
    // TODO: Implement modal player like PlaylistsTab
    console.log('Education item pressed:', item.id);
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedText} />
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={fetchContent}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="school-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Education Content Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first tutorial or course' : 'Tutorials and courses will appear here'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'education' })}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary }, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Creator Studio</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={content}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.itemCard,
            { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.itemThumb, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Ionicons name="school" size={24} color="#3B82F6" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.mutedText }]}>
              {item.duration} • {item.category}
            </Text>
            {/* Topics/Tags */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 2).map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 2 && (
                  <Text style={[styles.tagMore, { color: colors.mutedText }]}>+{item.tags.length - 2}</Text>
                )}
              </View>
            )}
          </View>
          <Ionicons name="play-circle-outline" size={28} color={colors.mutedText} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EC4899',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  tagMore: {
    fontSize: 10,
    fontWeight: '500',
  },

  pressed: { opacity: 0.85 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
