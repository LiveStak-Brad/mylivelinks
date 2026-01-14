import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showComingSoon } from '../lib/showComingSoon';

export default function SearchMusicScreen() {
  const [query, setQuery] = useState('');

  type MockTrack = {
    id: string;
    title: string;
    artist: string;
    duration: string;
  };

  const MOCK_TRACKS: MockTrack[] = useMemo(
    () => [
      { id: 'm-1', title: 'Neon Skyline', artist: 'Kai Rivera', duration: '3:12' },
      { id: 'm-2', title: 'Late Night Drive', artist: 'Ava Patel', duration: '2:48' },
      { id: 'm-3', title: 'Glow Up Anthem', artist: 'Nova', duration: '4:05' },
      { id: 'm-4', title: 'Acoustic Sunday', artist: 'Miles Hart', duration: '3:41' },
      { id: 'm-5', title: 'City Lights (Live)', artist: 'Jordan Kim', duration: '2:59' },
      { id: 'm-6', title: 'Midnight Loop', artist: 'Sage', duration: '3:33' },
      { id: 'm-7', title: 'Soft Focus', artist: 'Luna', duration: '2:27' },
      { id: 'm-8', title: 'Studio Warmup', artist: 'Remy', duration: '1:56' },
    ],
    []
  );

  // UI-only: we only switch between empty state and mocked results.
  const trimmed = query.trim();
  const results = trimmed.length === 0 ? [] : MOCK_TRACKS;

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

            {trimmed.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="musical-notes-outline" size={22} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>Start typing to search</Text>
                <Text style={styles.emptySubtitle}>
                  Try “acoustic”, “live”, or an artist name. Results shown here are a UI mock.
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
              onPress={() => showComingSoon('Music player')}
              accessibilityRole="button"
              accessibilityLabel={`Track: ${item.title} by ${item.artist}`}
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
                  {item.artist}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.duration}>{item.duration}</Text>
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
