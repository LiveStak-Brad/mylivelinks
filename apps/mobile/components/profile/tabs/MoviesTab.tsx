/**
 * MoviesTab - Movies Content Profile Tab (Mobile)
 * 
 * Displays movie/film content.
 * 
 * REAL DATA: Fetches from creator_studio_items via get_public_creator_studio_items RPC
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

type MovieItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  releaseYear?: number;
  thumbnailUrl?: string;
  publishedAt: string;
  tags?: string[];
  category?: string;
};

interface MoviesTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function MoviesTab({ profileId, colors, isOwnProfile = false, cardStyle }: MoviesTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  
  // Apply card style
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const [error, setError] = useState<string | null>(null);
  const [movies, setMovies] = useState<MovieItem[]>([]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_creator_studio_items', {
        p_profile_id: profileId,
        p_item_type: 'movie',
        p_limit: 50,
        p_offset: 0,
      });
      
      if (rpcError) {
        console.error('Error fetching movies:', rpcError);
        setMovies([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setMovies([]);
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
      
      const transformedMovies: MovieItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled',
        description: item.description || '',
        duration: formatDuration(item.duration_seconds || 0),
        thumbnailUrl: item.thumb_url || item.artwork_url,
        publishedAt: item.created_at,
        tags: item.tags || [],
      }));
      
      setMovies(transformedMovies);
    } catch (e: any) {
      setError(e?.message || 'Failed to load movies');
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleMoviePress = useCallback((item: MovieItem) => {
    // TODO: Implement modal player like PlaylistsTab
    console.log('Movie pressed:', item.id);
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
          onPress={fetchMovies}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (movies.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="film-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Movies Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first movie or film' : 'Movies and films will appear here when available'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'movie' })}
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
      data={movies}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleMoviePress(item)}
          style={({ pressed }) => [
            styles.movieCard,
            { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.movieIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
            <Ionicons name="film" size={24} color="#EC4899" />
          </View>
          <View style={styles.movieInfo}>
            <Text style={[styles.movieTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.movieMeta, { color: colors.mutedText }]}>
              {item.duration}{item.releaseYear ? ` • ${item.releaseYear}` : ''}
            </Text>
            {/* Tags/Categories */}
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
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 240,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  movieIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    gap: 4,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  movieMeta: {
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9333EA',
  },
  tagMore: {
    fontSize: 10,
    fontWeight: '500',
  },

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
