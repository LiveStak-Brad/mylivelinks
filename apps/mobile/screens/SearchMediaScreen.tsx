import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type MediaType = 'Video' | 'Photo';

type MediaItem = {
  id: string;
  text_content: string;
  media_url: string;
  author_id: string;
};

function getMediaType(url: string): MediaType {
  const lower = url.toLowerCase();
  if (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm') || lower.includes('video')) {
    return 'Video';
  }
  return 'Photo';
}

export default function SearchMediaScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const numColumns = width >= 420 ? 3 : 2;

  const searchMedia = useCallback(async (term: string) => {
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
        .from('posts')
        .select('id, text_content, media_url, author_id')
        .not('media_url', 'is', null)
        .ilike('text_content', likePattern)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setResults((data as MediaItem[]) || []);
    } catch (err: any) {
      console.error('[SearchMediaScreen] Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMedia(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchMedia]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.root} onPress={Keyboard.dismiss}>
        <View style={styles.header}>
          <Text style={styles.title}>Media</Text>
          <Text style={styles.subtitle}>Search photos, videos, GIFs, and more</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon} accessibilityElementsHidden>
            🔎
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search media..."
            placeholderTextColor={stylesVars.mutedText}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search media input"
          />
          {query.trim().length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
              onPress={() => setQuery('')}
              hitSlop={10}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={results}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.gridContent,
            results.length === 0 ? styles.gridContentEmpty : null,
          ]}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => {
            const mediaType = getMediaType(item.media_url);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${mediaType}: ${item.text_content || 'Media'}`}
                onPress={() => navigation.navigate('ProfileViewScreen' as never, { profileId: item.author_id } as never)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.thumbnail}>
                  <Image
                    source={{ uri: item.media_url }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <View style={[styles.typeBadge, typeBadgeStyle(mediaType)]}>
                    <Text style={styles.typeBadgeText}>{mediaType}</Text>
                  </View>
                </View>

                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.text_content || 'Media'}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState query={query} loading={loading} error={error} hasSearched={hasSearched} />}
        />
      </Pressable>
    </SafeAreaView>
  );
}

function typeMark(type: MediaType) {
  if (type === 'Video') return '▶';
  if (type === 'Photo') return '▣';
  if (type === 'GIF') return 'GIF';
  if (type === 'Audio') return '♪';
  return 'DOC';
}

function typeBadgeStyle(type: MediaType) {
  if (type === 'Video') return styles.badgeVideo;
  if (type === 'Photo') return styles.badgePhoto;
  if (type === 'GIF') return styles.badgeGif;
  if (type === 'Audio') return styles.badgeAudio;
  return styles.badgeDoc;
}

function EmptyState({ query, loading, error, hasSearched }: { query: string; loading?: boolean; error?: string | null; hasSearched?: boolean }) {
  const q = query.trim();
  
  if (loading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.emptyTitle}>Searching...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>⚠️</Text>
        </View>
        <Text style={styles.emptyTitle}>Search failed</Text>
        <Text style={styles.emptyBody}>{error}</Text>
      </View>
    );
  }
  
  if (!hasSearched) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText} accessibilityElementsHidden>
            🔎
          </Text>
        </View>
        <Text style={styles.emptyTitle}>Search media</Text>
        <Text style={styles.emptyBody}>
          Type a keyword to find photos and videos.
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText} accessibilityElementsHidden>
          🔎
        </Text>
      </View>
      <Text style={styles.emptyTitle}>No media found</Text>
      <Text style={styles.emptyBody}>
        {`Try a different keyword for "${q}".`}
      </Text>
    </View>
  );
}

const stylesVars = {
  bg: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
};

const GRID_GUTTER = 12;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  root: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: stylesVars.mutedText,
  },

  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchIcon: {
    fontSize: 16,
    color: stylesVars.mutedText,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: stylesVars.text,
    paddingVertical: 10,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  clearButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: stylesVars.mutedText,
    marginTop: -2,
  },

  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gridContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  gridRow: {
    gap: GRID_GUTTER,
  },
  card: {
    flexGrow: 1,
    flex: 1,
    marginBottom: GRID_GUTTER,
  },
  thumbnail: {
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 20,
    fontWeight: '900',
    color: stylesVars.mutedText,
    opacity: 0.85,
    letterSpacing: 0.6,
  },
  typeBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  badgeVideo: {
    backgroundColor: 'rgba(79,70,229,0.92)',
    borderColor: 'rgba(79,70,229,0.30)',
  },
  badgePhoto: {
    backgroundColor: 'rgba(16,185,129,0.92)',
    borderColor: 'rgba(16,185,129,0.30)',
  },
  badgeGif: {
    backgroundColor: 'rgba(245,158,11,0.92)',
    borderColor: 'rgba(245,158,11,0.30)',
  },
  badgeAudio: {
    backgroundColor: 'rgba(37,99,235,0.92)',
    borderColor: 'rgba(37,99,235,0.30)',
  },
  badgeDoc: {
    backgroundColor: 'rgba(100,116,139,0.92)',
    borderColor: 'rgba(100,116,139,0.30)',
  },

  cardTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: stylesVars.text,
    lineHeight: 18,
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIconText: {
    fontSize: 18,
    color: stylesVars.mutedText,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: stylesVars.text,
    marginBottom: 6,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: stylesVars.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },

  pressed: {
    opacity: 0.9,
  },
});
