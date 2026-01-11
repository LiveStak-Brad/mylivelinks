import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type VideoPlaceholder = {
  id: string;
  title: string;
  duration: string;
};

const VIDEO_PLACEHOLDERS: VideoPlaceholder[] = [
  { id: 'v1', title: 'Behind the scenes: battle prep', duration: '12:34' },
  { id: 'v2', title: 'Top gifts recap (weekly)', duration: '08:10' },
  { id: 'v3', title: 'Duet moments you missed', duration: '03:21' },
  { id: 'v4', title: 'Live highlight: clutch comeback', duration: '01:07' },
  { id: 'v5', title: 'Creator spotlight: night session', duration: '19:42' },
  { id: 'v6', title: 'Quick tips: go live faster', duration: '00:58' },
  { id: 'v7', title: 'Battle highlights: 3v3 chaos', duration: '06:45' },
  { id: 'v8', title: 'First-time streamer mistakes', duration: '10:03' },
  { id: 'v9', title: 'Best reactions (today)', duration: '04:59' },
  { id: 'v10', title: 'Editing a clip in under a minute', duration: '01:00' },
  { id: 'v11', title: 'Crowd favorites: MVP moments', duration: '07:12' },
  { id: 'v12', title: 'Late-night vibes: highlight reel', duration: '14:06' },
];

export default function SearchVideosScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');

  const numColumns = width >= 420 ? 3 : 2;
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return VIDEO_PLACEHOLDERS;
    return VIDEO_PLACEHOLDERS.filter((v) => v.title.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

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
        data={filtered}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.thumbnail}>
              <Ionicons name="play" size={18} color="#FFFFFF" style={styles.playIcon} />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.cardTitle}>
              {item.title}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="videocam" size={44} color="#8B5CF6" />
            <Text style={styles.emptyTitle}>
              {normalizedQuery ? 'No videos found' : 'Search videos'}
            </Text>
            <Text style={styles.emptyDescription}>
              {normalizedQuery
                ? 'Try a different keyword or check spelling.'
                : 'Type a title, creator, or moment you want to rewatch.'}
            </Text>
          </View>
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
