import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

type MediaType = 'Video' | 'Photo' | 'GIF' | 'Audio' | 'Doc';

type MediaItem = {
  id: string;
  title: string;
  type: MediaType;
  thumbnailUri?: string;
};

// UI-only placeholders: provides the intended “Search → Media” results layout without wiring up APIs.
const MEDIA_PLACEHOLDERS: MediaItem[] = [
  { id: 'm1', title: 'Battle recap (highlight)', type: 'Video' },
  { id: 'm2', title: 'Creator promo shot', type: 'Photo' },
  { id: 'm3', title: 'Funny reaction loop', type: 'GIF' },
  { id: 'm4', title: 'Intro track (short)', type: 'Audio' },
  { id: 'm5', title: 'Stream schedule', type: 'Doc' },
  { id: 'm6', title: 'Top gifts moment', type: 'Video' },
  { id: 'm7', title: 'Behind the scenes', type: 'Photo' },
  { id: 'm8', title: 'Quick meme', type: 'GIF' },
  { id: 'm9', title: 'Voice note snippet', type: 'Audio' },
  { id: 'm10', title: 'Brand kit', type: 'Doc' },
];

export default function SearchMediaScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');

  const numColumns = width >= 420 ? 3 : 2;
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return MEDIA_PLACEHOLDERS;
    return MEDIA_PLACEHOLDERS.filter((m) => {
      const haystack = `${m.title} ${m.type}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

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
          data={filtered}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.gridContent,
            filtered.length === 0 ? styles.gridContentEmpty : null,
          ]}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.type}: ${item.title}`}
              onPress={() => {}}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.thumbnail}>
                {item.thumbnailUri ? (
                  <Image
                    source={{ uri: item.thumbnailUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Text style={styles.thumbnailPlaceholderText}>
                      {typeMark(item.type)}
                    </Text>
                  </View>
                )}

                <View style={[styles.typeBadge, typeBadgeStyle(item.type)]}>
                  <Text style={styles.typeBadgeText}>{item.type}</Text>
                </View>
              </View>

              <Text numberOfLines={2} style={styles.cardTitle}>
                {item.title}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState query={query} />}
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

function EmptyState({ query }: { query: string }) {
  const q = query.trim();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText} accessibilityElementsHidden>
          🔎
        </Text>
      </View>
      <Text style={styles.emptyTitle}>{q ? 'No media found' : 'Search media'}</Text>
      <Text style={styles.emptyBody}>
        {q
          ? `Try a different keyword for “${q}”.`
          : 'Type a title or media type (video, photo, gif) to see results.'}
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
