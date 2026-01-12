import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { loadLiveBrowseFilters, saveLiveBrowseFilters, type BrowseGenderFilter } from '../lib/liveBrowsePreferences';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';

const SPECIAL_FILTERS = ['Trending', 'Featured', 'Rooms', 'Battles'] as const;
const CATEGORY_FILTERS = ['IRL', 'Music', 'Gaming', 'Comedy', 'Just Chatting'] as const;
const GENDER_FILTERS = ['All', 'Men', 'Women'] as const;

type MockStream = {
  id: string;
  name: string;
  title: string;
  viewers: string;
  category: (typeof CATEGORY_FILTERS)[number];
  gender: Exclude<BrowseGenderFilter, 'All'>;
};

const MOCK_TRENDING_STREAMS: MockStream[] = [
  { id: 't-1', name: 'Ava', title: 'Chill vibes', viewers: '2.4K', category: 'Just Chatting', gender: 'Women' },
  { id: 't-2', name: 'Jules', title: 'Just chatting', viewers: '1.8K', category: 'Just Chatting', gender: 'Men' },
  { id: 't-3', name: 'Nova', title: 'Ranked grind', viewers: '1.5K', category: 'Gaming', gender: 'Women' },
  { id: 't-4', name: 'Kai', title: 'Acoustic set', viewers: '1.1K', category: 'Music', gender: 'Men' },
  { id: 't-5', name: 'Miles', title: 'Late night chat', viewers: '987', category: 'IRL', gender: 'Men' },
  { id: 't-6', name: 'Finn', title: 'Highlights', viewers: '842', category: 'Gaming', gender: 'Men' },
];

export default function TrendingScreen() {
  const navigation = useNavigation<any>();
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const profileId = user?.id ?? 'anon';

  const [selectedSpecial, setSelectedSpecial] = useState<(typeof SPECIAL_FILTERS)[number]>('Trending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<BrowseGenderFilter>('All');
  const [search, setSearch] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const navigateToLiveTV = () => {
    navigation.navigate('Tabs', { screen: 'LiveTV' });
  };

  useEffect(() => {
    let mounted = true;
    if (loading) return;
    loadLiveBrowseFilters('trending', profileId)
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
    saveLiveBrowseFilters('trending', profileId, {
      gender: selectedGender,
      category: selectedCategory,
      special: selectedSpecial,
    });
  }, [hydrated, loading, profileId, selectedCategory, selectedGender, selectedSpecial]);

  const filteredStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_TRENDING_STREAMS.filter((s) => {
      const matchesGender = selectedGender === 'All' ? true : s.gender === selectedGender;
      const matchesCategory = selectedCategory === 'All' ? true : s.category === selectedCategory;
      const matchesSearch = !q ? true : `${s.name} ${s.title}`.toLowerCase().includes(q);
      // Special filter currently only affects selection UI; keep behavior stable while data stays mock.
      const matchesSpecial = true;
      return matchesGender && matchesCategory && matchesSearch && matchesSpecial;
    });
  }, [search, selectedCategory, selectedGender, selectedSpecial]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Trending</Text>
            <View style={styles.headerLivePill}>
              <View style={styles.liveDot} />
              <Text style={styles.headerLivePillText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={COLORS.textSecondary} />
            <TextInput
              placeholder="Search trending streams..."
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
            <View style={[styles.sectionDot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>

          <View style={styles.streamsList}>
            {filteredStreams.map((stream) => (
              <View key={stream.id} style={styles.streamCard}>
                <View style={styles.streamThumb}>
                  <View style={styles.streamThumbInner}>
                    <View style={styles.streamThumbTopRow}>
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>

                      <View style={styles.viewerBadge}>
                        <Feather name="eye" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.viewerBadgeText}>{stream.viewers}</Text>
                      </View>
                    </View>

                    <View style={styles.streamThumbBottomRow}>
                      <View style={styles.trendingBadge}>
                        <Text style={styles.trendingBadgeText}>🔥 Trending</Text>
                      </View>
                      <View style={styles.thumbMark}>
                        <Text style={styles.thumbMarkText}>📺</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.streamCardContent}>
                  <Text numberOfLines={1} style={styles.streamName}>
                    {stream.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.streamTitle}>
                    {stream.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={navigateToLiveTV}
          style={({ pressed }) => [styles.liveTVButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <View style={styles.liveTVButtonContent}>
            <Feather name="tv" size={20} color="white" />
            <Text style={styles.liveTVButtonText}>View All on LiveTV</Text>
          </View>
          <Feather name="chevron-right" size={20} color="white" />
        </Pressable>

        <View style={styles.infoCard}>
          <Feather name="info" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Trending shows the hottest streams right now. Tap "View All on LiveTV" to explore more.
          </Text>
        </View>
      </ScrollView>
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

const GRID_GUTTER = 12;
const GRID_SIDE_PADDING = 16;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    paddingTop: 12,
    paddingBottom: 120,
  },

  header: {
    paddingHorizontal: GRID_SIDE_PADDING,
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
    paddingHorizontal: GRID_SIDE_PADDING,
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
    paddingHorizontal: GRID_SIDE_PADDING,
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
    paddingHorizontal: GRID_SIDE_PADDING,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GRID_SIDE_PADDING,
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

  streamsList: {
    paddingHorizontal: GRID_SIDE_PADDING,
    gap: GRID_GUTTER,
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
    aspectRatio: 16 / 9,
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

  trendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  trendingBadgeText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 11,
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

  liveTVButton: {
    marginHorizontal: GRID_SIDE_PADDING,
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTVButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveTVButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },

  infoCard: {
    marginHorizontal: GRID_SIDE_PADDING,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    lineHeight: 16,
  },

  pressed: {
    opacity: 0.85,
  },
});

