/**
 * PodcastsTab - Podcasts Content Profile Tab (Mobile)
 * 
 * Displays podcast episodes.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

type PodcastItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  episodeNumber?: number;
  publishedAt: string;
};

interface PodcastsTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function PodcastsTab({ profileId, colors, isOwnProfile = false, cardStyle }: PodcastsTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const [error, setError] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);

  const fetchPodcasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: 'podcast',
        p_limit: 50,
        p_offset: 0,
      });
      
      if (rpcError) {
        console.error('Error fetching podcasts:', rpcError);
        setPodcasts([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setPodcasts([]);
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
      
      const transformedPodcasts: PodcastItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled',
        description: item.description || '',
        duration: formatDuration(item.duration_seconds || 0),
        episodeNumber: item.episode_number,
        publishedAt: item.created_at,
      }));
      
      setPodcasts(transformedPodcasts);
    } catch (e: any) {
      setError(e?.message || 'Failed to load podcasts');
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const handlePodcastPress = useCallback((item: PodcastItem) => {
    // TODO: Implement modal player like PlaylistsTab
    console.log('Podcast pressed:', item.id);
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
          onPress={fetchPodcasts}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (podcasts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="mic-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Podcasts Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first podcast episode' : 'Podcasts will appear here when available'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'podcast' })}
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
      data={podcasts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handlePodcastPress(item)}
          style={({ pressed }) => [
            styles.podcastCard,
            { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.podcastIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
            <Ionicons name="mic" size={24} color="#EC4899" />
          </View>
          <View style={styles.podcastInfo}>
            <Text style={[styles.podcastTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.podcastMeta, { color: colors.mutedText }]}>
              {item.duration} • {new Date(item.publishedAt).toLocaleDateString()}
            </Text>
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
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  podcastIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastInfo: {
    flex: 1,
    gap: 4,
  },
  podcastTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  podcastMeta: {
    fontSize: 12,
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
