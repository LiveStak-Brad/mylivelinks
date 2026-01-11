import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type MockLiveStream = {
  id: string;
  name: string;
  handle: string;
  title: string;
  viewers: string;
  badge: 'Trending' | 'Featured' | 'Sponsored';
};

const FILTERS = ['All', 'Trending', 'Featured', 'Sponsored', 'Rooms', 'Battles'] as const;
type Filter = (typeof FILTERS)[number];

const MOCK_STREAMS: MockLiveStream[] = [
  { id: 'sl-1', name: 'Ava', handle: '@ava', title: 'Chill vibes', viewers: '2.4K', badge: 'Trending' },
  { id: 'sl-2', name: 'Miles', handle: '@miles', title: 'Late night chat', viewers: '987', badge: 'Featured' },
  { id: 'sl-3', name: 'Nova', handle: '@nova', title: 'Ranked grind', viewers: '1.5K', badge: 'Trending' },
  { id: 'sl-4', name: 'Kai', handle: '@kai', title: 'Acoustic set', viewers: '1.1K', badge: 'Sponsored' },
  { id: 'sl-5', name: 'Sage', handle: '@sage', title: 'IRL walk', viewers: '76', badge: 'Trending' },
  { id: 'sl-6', name: 'Luna', handle: '@luna', title: 'Comedy bits', viewers: '321', badge: 'Featured' },
  { id: 'sl-7', name: 'Jules', handle: '@jules', title: 'Just chatting', viewers: '1.8K', badge: 'Trending' },
  { id: 'sl-8', name: 'Remy', handle: '@remy', title: 'Cozy gaming', viewers: '640', badge: 'Sponsored' },
];

export default function SearchLiveScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    // UI-only: local filtering over mock data for web-parity “search live results intent”.
    const filteredByFilter =
      activeFilter === 'All'
        ? MOCK_STREAMS
        : activeFilter === 'Rooms' || activeFilter === 'Battles'
          ? []
          : MOCK_STREAMS.filter((s) => s.badge === activeFilter);

    if (!normalizedQuery) return filteredByFilter;

    return filteredByFilter.filter((s) => {
      const haystack = `${s.name} ${s.handle} ${s.title}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, normalizedQuery]);

  const renderStreamCard = ({ item }: { item: MockLiveStream }) => {
    return (
      <View style={styles.streamCardOuter}>
        <View style={styles.streamCard}>
          <View style={styles.streamThumb}>
            <View style={styles.streamThumbInner}>
              <View style={styles.streamThumbTopRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>

                <View style={styles.viewerBadge}>
                  <Feather name="eye" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.viewerBadgeText}>{item.viewers}</Text>
                </View>
              </View>

              <View style={styles.streamThumbBottomRow}>
                <View style={[styles.primaryBadge, badgeStyle(item.badge)]}>
                  <Text style={styles.primaryBadgeText}>{item.badge}</Text>
                </View>
                <View style={styles.thumbMark}>
                  <Text style={styles.thumbMarkText}>📺</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.streamCardContent}>
            <View style={styles.streamNameRow}>
              <Text numberOfLines={1} style={styles.streamName}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={styles.streamHandle}>
                {item.handle}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.streamTitle}>
              {item.title}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.root} onPress={Keyboard.dismiss}>
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderStreamCard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={styles.headerTopRow}>
                  <Text style={styles.headerTitle}>Search Live</Text>
                  <View style={styles.headerLivePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.headerLivePillText}>LIVE</Text>
                  </View>
                </View>

                <View style={styles.searchRow}>
                  <Feather name="search" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search live streams or @username"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {query.length > 0 ? (
                    <Pressable
                      onPress={() => setQuery('')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      hitSlop={10}
                      style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
                    >
                      <Feather name="x" size={16} color={COLORS.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                {FILTERS.map((label) => {
                  const selected = label === activeFilter;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setActiveFilter(label)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.filterPill,
                        selected ? styles.filterPillSelected : styles.filterPillUnselected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.filterPillText, selected ? styles.filterPillTextSelected : styles.filterPillTextUnselected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {results.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Feather name="search" size={22} color={COLORS.textSecondary} />
                  </View>
                  <Text style={styles.emptyTitle}>No live results</Text>
                  <Text style={styles.emptySubtitle}>
                    Try a different search, or switch filters to discover what’s live right now.
                  </Text>

                  <View style={styles.emptyActions}>
                    <Pressable
                      onPress={() => {
                        setQuery('');
                        setActiveFilter('All');
                      }}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.emptyActionButton, pressed && styles.pressed]}
                    >
                      <Feather name="refresh-ccw" size={16} color={COLORS.text} />
                      <Text style={styles.emptyActionText}>Reset</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.resultsHeaderRow}>
                  <Text style={styles.resultsHeaderText}>Live results</Text>
                  <View style={styles.resultsCountPill}>
                    <Text style={styles.resultsCountText}>{results.length}</Text>
                  </View>
                </View>
              )}
            </View>
          }
        />
      </Pressable>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: '#0B0B0F',
  card: '#12121A',
  card2: '#14141F',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5F6FA',
  textSecondary: 'rgba(245,246,250,0.65)',
  primary: '#7C3AED',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#A855F7',
};

function badgeStyle(badge: MockLiveStream['badge']) {
  if (badge === 'Trending') return styles.badgeTrending;
  if (badge === 'Featured') return styles.badgeFeatured;
  return styles.badgeSponsored;
}

const GRID_GUTTER = 12;
const GRID_SIDE_PADDING = 16;
const CARD_SIDE_PADDING = GRID_GUTTER / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  listContent: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 120,
  },

  header: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(239,68,68,0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerLivePillText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
    borderWidth: 1,
  },

  filtersRow: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    gap: 10,
    paddingBottom: 10,
  },
  filterPill: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  filterPillUnselected: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  filterPillText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
  },
  filterPillTextSelected: {
    color: 'white',
  },
  filterPillTextUnselected: {
    color: COLORS.text,
  },

  resultsHeaderRow: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 2,
  },
  resultsHeaderText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  resultsCountPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resultsCountText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },

  emptyState: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    paddingTop: 22,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 320,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 13,
  },

  streamCardOuter: {
    flex: 1,
    paddingHorizontal: CARD_SIDE_PADDING,
    marginBottom: GRID_GUTTER,
  },
  streamCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  streamThumb: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  streamThumbInner: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  streamThumbTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  streamThumbBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(239,68,68,0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.red,
  },
  liveBadgeText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },

  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewerBadgeText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 11,
  },

  primaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBadgeText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 11,
  },
  badgeTrending: {
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  badgeFeatured: {
    backgroundColor: 'rgba(245,158,11,0.85)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  badgeSponsored: {
    backgroundColor: 'rgba(168,85,247,0.85)',
    borderColor: 'rgba(168,85,247,0.25)',
  },

  thumbMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMarkText: {
    fontSize: 22,
    opacity: 0.6,
  },

  streamCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  streamNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streamName: {
    flexShrink: 1,
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 15,
  },
  streamHandle: {
    flexShrink: 1,
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  streamTitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },

  pressed: {
    opacity: 0.85,
  },
});
