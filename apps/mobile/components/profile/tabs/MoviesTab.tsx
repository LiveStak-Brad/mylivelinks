import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type MovieItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  releaseYear?: number;
  thumbnailUrl?: string;
  publishedAt: string;
};

interface MoviesTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
}

export default function MoviesTab({ profileId, colors, isOwnProfile = false }: MoviesTabProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movies, setMovies] = useState<MovieItem[]>([]);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // API endpoint: GET /api/profile/:profileId/movies
      // Will be implemented by web team
      setMovies([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleMoviePress = useCallback((item: MovieItem) => {
    navigation.navigate('LongFormPlayerScreen', {
      contentId: item.id,
      contentType: 'movie',
      title: item.title,
    });
  }, [navigation]);

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
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
          <Ionicons name="film-outline" size={32} color="#EC4899" />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Movies Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
          {isOwnProfile ? 'Upload your first movie or film' : 'Movies and films will appear here when available'}
        </Text>
        {isOwnProfile && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'movie' })}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Movie</Text>
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
            { backgroundColor: colors.surface, borderColor: colors.border },
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

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EC4899',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
