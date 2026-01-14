import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type TrackResult = {
  id: string;
  title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  profile_id: string;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SearchMusicScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTracks = useCallback(async (term: string) => {
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
        .from('profile_music_tracks')
        .select('id, title, artist_name, duration_seconds, profile_id')
        .or(`title.ilike.${likePattern},artist_name.ilike.${likePattern}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setResults((data as TrackResult[]) || []);
    } catch (err: any) {
      console.error('[SearchMusicScreen] Search error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTracks(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchTracks]);

  const trimmed = query.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Music</Text>
              <Text style={styles.subtitle}>Search tracks and audio from MyLiveLinks.</Text>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={18} color="#6B7280" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search songs, artists, or keywords"
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {trimmed.length > 0 ? (
                  <Pressable
                    onPress={() => setQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    hitSlop={10}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Filter row (static; mirrors web “Nearby + Following Only + Filters” intent) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              <View style={styles.filterPill}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.filterPillText}>Nearby</Text>
              </View>
              <View style={styles.filterPill}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text style={styles.filterPillText}>Following only</Text>
              </View>
              <View style={styles.filterPill}>
                <Ionicons name="filter-outline" size={14} color="#6B7280" />
                <Text style={styles.filterPillText}>Filters</Text>
              </View>
            </ScrollView>

            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.emptyTitle}>Searching...</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
                </View>
                <Text style={styles.emptyTitle}>Search failed</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
              </View>
            ) : !hasSearched ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="musical-notes-outline" size={22} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>Start typing to search</Text>
                <Text style={styles.emptySubtitle}>
                  Try "acoustic", "live", or an artist name.
                </Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={22} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No music results</Text>
                <Text style={styles.emptySubtitle}>Try different keywords or remove filters.</Text>
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Reset search"
                  style={({ pressed }) => [styles.emptyActionBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="refresh-outline" size={16} color="#111827" />
                  <Text style={styles.emptyActionText}>Reset</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.resultsHeaderRow}>
                <Text style={styles.resultsHeaderText}>Results</Text>
                <View style={styles.resultsCountPill}>
                  <Text style={styles.resultsCountText}>{results.length}</Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => navigation.navigate('ProfileViewScreen' as never, { profileId: item.profile_id } as never)}
              accessibilityRole="button"
              accessibilityLabel={`Track: ${item.title} by ${item.artist_name || 'Unknown'}`}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardLeft}>
                <View style={styles.artwork}>
                  <Ionicons name="musical-note" size={18} color="#8B5CF6" />
                </View>
              </View>

              <View style={styles.cardMid}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artist_name || 'Unknown Artist'}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.duration}>{formatDuration(item.duration_seconds)}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  separator: {
    height: 10,
  },

  header: {
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },

  searchContainer: {
    paddingBottom: 10,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtersRow: {
    paddingBottom: 10,
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 10,
  },
  resultsHeaderText: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  resultsCountPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resultsCountText: {
    color: '#6B7280',
    fontWeight: '900',
    fontSize: 12,
  },

  emptyState: {
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  emptyActionText: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 13,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardLeft: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
    borderColor: 'rgba(139, 92, 246, 0.20)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMid: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  trackArtist: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  duration: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
  },

  pressed: {
    opacity: 0.88,
  },
});
