import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type VideoResult = {
  id: string;
  title: string;
  youtube_url: string | null;
  thumbnail_url: string | null;
  profile_id: string;
};

export default function SearchVideosScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const numColumns = width >= 420 ? 3 : 2;

  const searchVideos = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const likePattern = `%${trimmed.toLowerCase()}%`;
      const { data, error: err } = await supabase
        .from('profile_music_videos')
        .select('id, title, youtube_url, thumbnail_url, profile_id')
        .ilike('title', likePattern)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setResults((data as VideoResult[]) || []);
    } catch (err: any) {
      console.error('[SearchVideosScreen] Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchVideos(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchVideos]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Videos</Text>
        <Text style={styles.subtitle}>Search clips and highlights</Text>
      </View>

      <View style={styles.searchInputWrapper}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            style={styles.clearButton}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={results}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProfileViewScreen' as never, { profileId: item.profile_id } as never)}
            accessibilityRole="button"
            accessibilityLabel={`Video: ${item.title}`}
          >
            <View style={styles.thumbnail}>
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : null}
              <Ionicons name="play" size={18} color="#FFFFFF" style={styles.playIcon} />
            </View>
            <Text numberOfLines={2} style={styles.cardTitle}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.emptyTitle}>Searching...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={44} color="#EF4444" />
              <Text style={styles.emptyTitle}>Search failed</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
            </View>
          ) : !hasSearched ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam" size={44} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>Search videos</Text>
              <Text style={styles.emptyDescription}>
                Type a title or keyword to find music videos.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="videocam" size={44} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No videos found</Text>
              <Text style={styles.emptyDescription}>
                Try a different keyword or check spelling.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const GUTTER = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  searchInputWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 8,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gridRow: {
    gap: GUTTER,
  },
  card: {
    flexGrow: 1,
    flex: 1,
    marginBottom: GUTTER,
  },
  thumbnail: {
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playIcon: {
    opacity: 0.9,
  },
  durationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
