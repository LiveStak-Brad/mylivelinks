import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { loadLiveBrowseFilters, saveLiveBrowseFilters, type BrowseGenderFilter } from '../lib/liveBrowsePreferences';
import { useAuth } from '../state/AuthContext';

type MockStream = {
  id: string;
  name: string;
  title: string;
  viewers: string;
  badge: 'Trending' | 'Featured' | 'Sponsored';
  category: (typeof CATEGORY_FILTERS)[number];
  gender: Exclude<BrowseGenderFilter, 'All'>;
};

type MockRoom = {
  id: string;
  name: string;
  viewers: string;
};

const SPECIAL_FILTERS = ['Trending', 'Featured', 'Rooms', 'Battles'] as const;
const CATEGORY_FILTERS = ['IRL', 'Music', 'Gaming', 'Comedy', 'Just Chatting'] as const;
const GENDER_FILTERS = ['All', 'Men', 'Women'] as const;

const MOCK_ROOMS: MockRoom[] = [
  { id: 'room-1', name: 'Just Chatting', viewers: '1.2K' },
  { id: 'room-2', name: 'Music', viewers: '842' },
  { id: 'room-3', name: 'Gaming', viewers: '2.1K' },
  { id: 'room-4', name: 'Comedy', viewers: '503' },
  { id: 'room-5', name: 'IRL', viewers: '999' },
];

const MOCK_STREAMS: MockStream[] = [
  { id: 's-1', name: 'Ava', title: 'Chill vibes', viewers: '123', badge: 'Trending', category: 'Just Chatting', gender: 'Women' },
  { id: 's-2', name: 'Miles', title: 'Late night chat', viewers: '987', badge: 'Featured', category: 'Just Chatting', gender: 'Men' },
  { id: 's-3', name: 'Nova', title: 'Ranked grind', viewers: '452', badge: 'Trending', category: 'Gaming', gender: 'Women' },
  { id: 's-4', name: 'Kai', title: 'Acoustic set', viewers: '1.1K', badge: 'Sponsored', category: 'Music', gender: 'Men' },
  { id: 's-5', name: 'Sage', title: 'IRL walk', viewers: '76', badge: 'Trending', category: 'IRL', gender: 'Women' },
  { id: 's-6', name: 'Luna', title: 'Comedy bits', viewers: '321', badge: 'Featured', category: 'Comedy', gender: 'Women' },
  { id: 's-7', name: 'Jules', title: 'Just chatting', viewers: '2.4K', badge: 'Trending', category: 'Just Chatting', gender: 'Men' },
  { id: 's-8', name: 'Remy', title: 'Cozy gaming', viewers: '640', badge: 'Sponsored', category: 'Gaming', gender: 'Men' },
  { id: 's-9', name: 'Zoe', title: 'Music requests', viewers: '189', badge: 'Featured', category: 'Music', gender: 'Women' },
  { id: 's-10', name: 'Finn', title: 'Highlights', viewers: '555', badge: 'Trending', category: 'Gaming', gender: 'Men' },
];

export default function LiveTVScreen() {
  const { user, loading } = useAuth();
  const profileId = user?.id ?? 'anon';

  const [selectedSpecial, setSelectedSpecial] = useState<(typeof SPECIAL_FILTERS)[number]>('Trending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<BrowseGenderFilter>('All');
  const [search, setSearch] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (loading) return;
    loadLiveBrowseFilters('livetv', profileId)
      .then((prefs) => {
        if (!mounted) return;
        if (SPECIAL_FILTERS.includes(prefs.special as any)) setSelectedSpecial(prefs.special as any);
        setSelectedCategory(prefs.category || 'All');
        setSelectedGender(prefs.gender);
        setHydrated(true);
      })
      .catch(() => {
        if (!mounted) return;
        setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [loading, profileId]);

  useEffect(() => {
    if (loading || !hydrated) return;
    saveLiveBrowseFilters('livetv', profileId, {
      gender: selectedGender,
      category: selectedCategory,
      special: selectedSpecial,
    });
  }, [hydrated, loading, profileId, selectedCategory, selectedGender, selectedSpecial]);

  const filteredStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_STREAMS.filter((s) => {
      const matchesGender = selectedGender === 'All' ? true : s.gender === selectedGender;
      const matchesCategory = selectedCategory === 'All' ? true : s.category === selectedCategory;

      // Keep special filter behavior minimal but real for the labels that map to existing mock data.
      const matchesSpecial =
        selectedSpecial === 'Trending' ? s.badge === 'Trending' : selectedSpecial === 'Featured' ? s.badge === 'Featured' : true;

      const matchesSearch = !q ? true : `${s.name} ${s.title}`.toLowerCase().includes(q);
      return matchesGender && matchesCategory && matchesSpecial && matchesSearch;
    });
  }, [search, selectedCategory, selectedGender, selectedSpecial]);

  const renderStreamCard = ({ item }: { item: MockStream }) => {
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
            <Text numberOfLines={1} style={styles.streamName}>
              {item.name}
            </Text>
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
      <FlatList
        data={filteredStreams}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderStreamCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Web parity: top hero + waitlist banner */}
            <View style={styles.topPromos}>
              <View style={styles.proHeroCard}>
                <View style={styles.proHeroTopRow}>
                  <View style={styles.proHeroBadge}>
                    <Text style={styles.proHeroBadgeText}>PRO</Text>
                  </View>
                  <Text style={styles.proHeroPill}>Upgrade</Text>
                </View>
                <Text style={styles.proHeroTitle}>MLL PRO</Text>
                <Text style={styles.proHeroSubtitle}>Premium LiveTV discovery, tuned for you.</Text>
                <View style={styles.proHeroCta}>
                  <Text style={styles.proHeroCtaText}>Learn more</Text>
                  <Feather name="chevron-right" size={16} color="white" />
                </View>
              </View>

              <View style={styles.waitlistCard}>
                <View style={styles.waitlistHeaderRow}>
                  <Text style={styles.waitlistTitle}>Mobile App Waitlist</Text>
                  <View style={styles.waitlistLivePill}>
                    <Text style={styles.waitlistLivePillText}>BETA</Text>
                  </View>
                </View>
                <Text style={styles.waitlistSubtitle}>Get updates on the mobile app release.</Text>
                <View style={styles.waitlistFormRow}>
                  <TextInput
                    placeholder="Email address"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.waitlistInput}
                  />
                  <View style={styles.waitlistButton}>
                    <Text style={styles.waitlistButtonText}>Join</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>LiveTV</Text>
                <View style={styles.headerLivePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.headerLivePillText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.searchRow}>
                <Feather name="search" size={16} color={COLORS.textSecondary} />
                <TextInput
                  placeholder="Search..."
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            <View style={styles.filtersBlock}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.specialFiltersRow}
              >
                {SPECIAL_FILTERS.map((label) => {
                  const selected = label === selectedSpecial;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setSelectedSpecial(label)}
                      style={[styles.filterPill, selected ? styles.filterPillSelected : styles.filterPillUnselected]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.filterPillText, selected ? styles.filterPillTextSelected : styles.filterPillTextUnselected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryFiltersRow}
              >
                {CATEGORY_FILTERS.map((label) => {
                  const selected = label === selectedCategory;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setSelectedCategory(selected ? 'All' : label)}
                      style={[styles.categoryChip, selected ? styles.categoryChipSelected : styles.categoryChipUnselected]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[styles.categoryChipText, selected ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.genderRowOuter}>
                <View style={styles.genderRow}>
                  {GENDER_FILTERS.map((label) => {
                    const selected = label === selectedGender;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => setSelectedGender(label)}
                        style={[styles.genderButton, selected ? styles.genderButtonSelected : styles.genderButtonUnselected]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[styles.genderButtonText, selected ? styles.genderButtonTextSelected : styles.genderButtonTextUnselected]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: COLORS.purple }]} />
                <Text style={styles.sectionTitle}>Live Rooms</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomsRail}
              >
                {MOCK_ROOMS.map((room) => (
                  <View key={room.id} style={styles.roomCard}>
                    <View style={styles.roomThumb}>
                      <View style={styles.roomThumbInner}>
                        <View style={styles.roomTopRow}>
                          <View style={styles.viewerBadge}>
                            <Feather name="eye" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.viewerBadgeText}>{room.viewers}</Text>
                          </View>
                        </View>
                        <View style={styles.roomBottomRow}>
                          <Text style={styles.roomEmoji}>🎙️</Text>
                        </View>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.roomName}>
                      {room.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.section, styles.sectionTightBottom]}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: COLORS.red }]} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
            </View>
          </View>
        }
      />
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

function badgeStyle(badge: MockStream['badge']) {
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

  listContent: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 120, // prevents bottom tabs from obscuring content
  },

  topPromos: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    gap: 12,
    paddingBottom: 10,
  },
  proHeroCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  proHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proHeroBadge: {
    backgroundColor: 'rgba(124,58,237,0.20)',
    borderColor: 'rgba(124,58,237,0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proHeroBadgeText: {
    color: COLORS.text,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 11,
  },
  proHeroPill: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  proHeroTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: -0.2,
  },
  proHeroSubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  proHeroCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  proHeroCtaText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
  },

  waitlistCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  waitlistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  waitlistTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  waitlistLivePill: {
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  waitlistLivePillText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  waitlistSubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  waitlistFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitlistInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13,
  },
  waitlistButton: {
    backgroundColor: 'rgba(245,246,250,0.12)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  waitlistButtonText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 13,
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

  filtersBlock: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },

  specialFiltersRow: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    gap: 10,
  },
  filterPill: {
    minWidth: 94,
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
    fontSize: 14,
    fontWeight: '900',
  },
  filterPillTextSelected: {
    color: 'white',
  },
  filterPillTextUnselected: {
    color: COLORS.text,
  },

  categoryFiltersRow: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderColor: 'rgba(124,58,237,0.35)',
  },
  categoryChipUnselected: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryChipTextSelected: {
    color: COLORS.text,
  },
  categoryChipTextUnselected: {
    color: COLORS.textSecondary,
  },

  genderRowOuter: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
  },
  genderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: COLORS.card2,
  },
  genderButtonUnselected: {
    backgroundColor: 'transparent',
  },
  genderButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  genderButtonTextSelected: {
    color: COLORS.text,
  },
  genderButtonTextUnselected: {
    color: COLORS.textSecondary,
  },

  section: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTightBottom: {
    paddingBottom: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    marginBottom: 10,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.2,
  },

  roomsRail: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    gap: 12,
    paddingBottom: 4,
  },
  roomCard: {
    width: 210,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  roomThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  roomThumbInner: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roomBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  roomEmoji: {
    fontSize: 24,
    opacity: 0.5,
  },
  roomName: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  streamName: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 16,
  },
  streamTitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
});

