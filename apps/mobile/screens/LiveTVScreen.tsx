import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { loadLiveBrowseFilters, saveLiveBrowseFilters, type BrowseGenderFilter } from '../lib/liveBrowsePreferences';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand, darkPalette, lightPalette } from '../theme/colors';

type LiveTVStreamApi = {
  id: string;
  slug?: string;
  streamer_display_name: string;
  streamer_profile_id?: string;
  thumbnail_url: string | null;
  total_views: number;
  viewer_count?: number;
  category: string | null;
  stream_type?: string | null;
  badges?: Array<'Trending' | 'Featured' | 'Sponsored'>;
  gender?: 'Men' | 'Women';
  trendingRank?: number;
};

type LiveTVRoomApi = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  room_type: string;
  icon_url: string | null;
  banner_url: string | null;
  viewer_count: number;
  streamer_count: number;
  category: string;
  gender?: 'Men' | 'Women';
};

type LiveTVStreamCard = {
  id: string;
  slug?: string;
  name: string;
  title: string;
  thumbnailUrl: string | null;
  viewersText: string;
  badge?: 'Trending' | 'Featured' | 'Sponsored';
  category: string | null;
  gender?: 'Men' | 'Women';
};

type LiveTVRoomCard = {
  id: string;
  name: string;
  imageUrl: string | null;
  viewersText: string;
};

const SPECIAL_FILTERS = ['Trending', 'Featured', 'Rooms', 'Battles'] as const;
const CATEGORY_FILTERS = ['IRL', 'Music', 'Gaming', 'Comedy', 'Just Chatting'] as const;
const GENDER_FILTERS = ['All', 'Men', 'Women'] as const;

const API_BASE_URL = 'https://www.mylivelinks.com';
const LIVETV_STREAMS_URL = `${API_BASE_URL}/api/livetv/streams`;
const LIVETV_ROOMS_URL = `${API_BASE_URL}/api/livetv/rooms`;

function toAbsoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

function formatCompactCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(value));
}

export default function LiveTVScreen() {
  const navigation = useNavigation<any>();
  const { user, loading } = useAuth();
  const { mode, colors } = useTheme();
  const profileId = user?.id ?? 'anon';

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      card2: (colors as any).surface2 ?? colors.surface,
      border: colors.border,
      text: colors.text,
      textSecondary: (colors as any).subtleText ?? colors.mutedText,
      primary: (brand as any).primary ?? brand.pink,
      red: colors.danger,
      amber: colors.warning,
      overlay: colors.overlay,
      chipBg: mode === 'dark' ? 'rgba(255,255,255,0.04)' : lightPalette.slate100,
    }),
    [colors, mode]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const [selectedSpecial, setSelectedSpecial] = useState<(typeof SPECIAL_FILTERS)[number]>('Trending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<BrowseGenderFilter>('All');
  const [search, setSearch] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [streams, setStreams] = useState<LiveTVStreamApi[]>([]);
  const [rooms, setRooms] = useState<LiveTVRoomApi[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [failedThumbsById, setFailedThumbsById] = useState<Record<string, true>>({});
  const [failedRoomImagesById, setFailedRoomImagesById] = useState<Record<string, true>>({});

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

  const loadStreams = useCallback(async () => {
    try {
      setStreamsLoading(true);
      const res = await fetch(LIVETV_STREAMS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load streams: ${res.status}`);
      const json = await res.json();
      const next = Array.isArray(json?.streams) ? (json.streams as LiveTVStreamApi[]) : [];
      setStreams(next);
    } catch (err) {
      console.error('[LiveTVScreen] loadStreams error:', err);
      setStreams([]);
    } finally {
      setStreamsLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const res = await fetch(LIVETV_ROOMS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load rooms: ${res.status}`);
      const json = await res.json();
      const next = Array.isArray(json?.rooms) ? (json.rooms as LiveTVRoomApi[]) : [];
      setRooms(next);
    } catch (err) {
      console.error('[LiveTVScreen] loadRooms error:', err);
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStreams();
      void loadRooms();
    }, [loadRooms, loadStreams])
  );

  const streamCards = useMemo((): LiveTVStreamCard[] => {
    // Web parity: prefer active viewer_count if > 0, else fall back to total_views.
    return (streams || []).map((s) => {
      const active = Number(s.viewer_count ?? 0);
      const fallback = Number(s.total_views ?? 0);
      const displayCount = active > 0 ? active : fallback;

      const badges = Array.isArray(s.badges) ? s.badges : [];
      const primaryBadge = badges.find((b) => b === 'Trending' || b === 'Featured' || b === 'Sponsored');

      return {
        id: String(s.id),
        slug: s.slug,
        name: s.streamer_display_name || s.slug || String(s.id),
        title: s.slug ? `@${s.slug}` : 'Live now',
        thumbnailUrl: toAbsoluteUrl(s.thumbnail_url),
        viewersText: formatCompactCount(displayCount),
        badge: primaryBadge,
        category: s.category ?? null,
        gender: s.gender,
      };
    });
  }, [streams]);

  const roomCards = useMemo((): LiveTVRoomCard[] => {
    return (rooms || []).map((r) => ({
      id: String(r.id),
      name: r.name || r.slug || String(r.id),
      imageUrl: toAbsoluteUrl(r.banner_url || r.icon_url || null),
      viewersText: formatCompactCount(Number(r.viewer_count ?? 0)),
    }));
  }, [rooms]);

  const filteredStreams = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Web parity: "Trending" shows all streams (already trending-sorted by API),
    // "Featured" filters to streams with Featured badge, "Battles" filters to category === 'Battles',
    // "Rooms" is a rooms-only mode.
    const bySpecial =
      selectedSpecial === 'Rooms'
        ? []
        : selectedSpecial === 'Featured'
          ? streamCards.filter((s) => (s.badge ? s.badge === 'Featured' : false))
          : selectedSpecial === 'Battles'
            ? streamCards.filter((s) => s.category === 'Battles')
            : streamCards;

    return bySpecial.filter((s) => {
      const matchesGender = selectedGender === 'All' ? true : s.gender === selectedGender;
      const matchesCategory = selectedCategory === 'All' ? true : s.category === selectedCategory;
      const matchesSearch = !q ? true : `${s.name} ${s.title}`.toLowerCase().includes(q);
      return matchesGender && matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, selectedGender, selectedSpecial, streamCards]);

  const renderStreamCard = ({ item }: { item: LiveTVStreamCard }) => {
    const imageFailed = !!failedThumbsById[item.id];
    return (
      <View style={styles.streamCardOuter}>
        <Pressable
          onPress={() => navigation.navigate('LiveUserScreen', { username: item.slug || item.id, streamId: item.id })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.streamCard, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.streamThumb}>
            {item.thumbnailUrl && !imageFailed ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.streamThumbImage}
                resizeMode="cover"
                onError={() => setFailedThumbsById((prev) => ({ ...prev, [item.id]: true }))}
              />
            ) : null}
            <View style={styles.streamThumbInner}>
              <View style={styles.streamThumbTopRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>

                <View style={styles.viewerBadge}>
                  <Feather name="eye" size={12} color={stylesVars.textSecondary} />
                  <Text style={styles.viewerBadgeText}>{item.viewersText}</Text>
                </View>
              </View>

              <View style={styles.streamThumbBottomRow}>
                {item.badge ? (
                  <View
                    style={[
                      styles.primaryBadge,
                      item.badge === 'Trending'
                        ? styles.badgeTrending
                        : item.badge === 'Featured'
                          ? styles.badgeFeatured
                          : styles.badgeSponsored,
                    ]}
                  >
                    <Text style={styles.primaryBadgeText}>{item.badge}</Text>
                  </View>
                ) : (
                  <View />
                )}
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
        </Pressable>
      </View>
    );
  };

  const listEmpty = useMemo(() => {
    if (streamsLoading) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="loader" size={22} color={stylesVars.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Loading LiveTV…</Text>
          <Text style={styles.emptySubtitle}>Fetching live streams from the backend.</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Feather name="tv" size={22} color={stylesVars.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No streams available</Text>
        <Text style={styles.emptySubtitle}>Check back soon for live content.</Text>
      </View>
    );
  }, [streamsLoading, stylesVars.textSecondary]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredStreams}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderStreamCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
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
                    placeholderTextColor={stylesVars.textSecondary}
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
                <Feather name="search" size={16} color={stylesVars.textSecondary} />
                <TextInput
                  placeholder="Search..."
                  placeholderTextColor={stylesVars.textSecondary}
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
                <View style={[styles.sectionDot, { backgroundColor: stylesVars.primary }]} />
                <Text style={styles.sectionTitle}>Live Rooms</Text>
              </View>

              {!roomsLoading && roomCards.length > 0 && (selectedSpecial === 'Trending' || selectedSpecial === 'Rooms') ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomsRail}>
                  {roomCards.map((room) => (
                    <View key={room.id} style={styles.roomCard}>
                      <View style={styles.roomThumb}>
                        {room.imageUrl && !failedRoomImagesById[room.id] ? (
                          <Image
                            source={{ uri: room.imageUrl }}
                            style={styles.roomThumbImage}
                            resizeMode="cover"
                            onError={() => setFailedRoomImagesById((prev) => ({ ...prev, [room.id]: true }))}
                          />
                        ) : null}
                        <View style={styles.roomThumbInner}>
                          <View style={styles.roomTopRow}>
                            <View style={styles.viewerBadge}>
                              <Feather name="eye" size={12} color={stylesVars.textSecondary} />
                              <Text style={styles.viewerBadgeText}>{room.viewersText}</Text>
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
              ) : null}
            </View>

            <View style={[styles.section, styles.sectionTightBottom]}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: stylesVars.red }]} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const GRID_GUTTER = 12;
const GRID_SIDE_PADDING = 16;
const CARD_SIDE_PADDING = GRID_GUTTER / 2;

type StylesVars = {
  bg: string;
  card: string;
  card2: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  red: string;
  amber: string;
  overlay: string;
  chipBg: string;
};

function createStyles(COLORS: StylesVars) {
  return StyleSheet.create({
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
  roomThumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
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
  streamThumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
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
  });
}

