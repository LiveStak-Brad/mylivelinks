import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand } from '../theme/colors';

const TAB_BAR_SAFE_PADDING = 96;

type HomeProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_mll_pro: boolean;
};

type RecommendedProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_live: boolean;
};

type ComingSoonRoom = {
  id: string;
  name: string;
  subtitle: string | null;
  status: string;
  category: string | null;
  image_url: string | null;
  banner_url: string | null;
  fallback_gradient: string | null;
  current_interest_count: number | null;
  effective_interest_threshold: number | null;
};

type TrendingStream = {
  stream_id: number;
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  trending_score: number | null;
};

type LiveRoom = {
  id: string;
  slug: string;
  name: string;
  current_viewer_count: number;
  current_streamer_count: number;
};

type NewTeam = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  approved_member_count: number | null;
  created_at: string | null;
};

function getInitials(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + second).toUpperCase();
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { mode, colors } = useTheme();
  const navigation = useNavigation();

  const stylesVars = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      mutedText: (colors as any).subtleText ?? colors.mutedText,
      onBrand: (colors as any).tabIconActive ?? colors.text,
      primary: (brand as any).primary ?? brand.pink,
      isDark: mode === 'dark',
    }),
    [colors, mode]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  function SectionTitle({ children }: { children: string }) {
    return <Text style={styles.sectionTitle}>{children}</Text>;
  }

  function Card({ children }: { children: React.ReactNode }) {
    return <View style={styles.card}>{children}</View>;
  }

  function PrimaryButton({ label, onPress }: { label: string; onPress?: () => void }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>{label}</Text>
      </Pressable>
    );
  }

  function OutlineButton({ label, onPress }: { label: string; onPress?: () => void }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
        <Text style={styles.outlineButtonText}>{label}</Text>
      </Pressable>
    );
  }

  function Pill({ label }: { label: string }) {
    return (
      <View style={styles.pill}>
        <Text style={styles.pillText}>{label}</Text>
      </View>
    );
  }

  function IconPill({ iconName, label }: { iconName: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
    return (
      <View style={styles.iconPill}>
        <Ionicons name={iconName} size={14} color="#FFFFFF" />
        <Text style={styles.iconPillText}>{label}</Text>
      </View>
    );
  }

  function SquareTile({
    title,
    subtitle,
    imageUrl,
    size = 120,
    width,
    height,
    showText = true,
    imageResizeMode = 'cover',
    useBackdrop = false,
  }: {
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    size?: number;
    width?: number;
    height?: number;
    showText?: boolean;
    imageResizeMode?: React.ComponentProps<typeof Image>['resizeMode'];
    useBackdrop?: boolean;
  }) {
    const initials = useMemo(() => getInitials(title), [title]);
    const w = width ?? size;
    const h = height ?? size;

    return (
      <View style={[styles.squareTile, { width: w, height: h }]}>
        {imageUrl ? (
          <>
            {useBackdrop ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.squareTileBackdropImage}
                resizeMode="cover"
                blurRadius={18}
              />
            ) : null}
            <Image source={{ uri: imageUrl }} style={styles.squareTileImage} resizeMode={imageResizeMode} />
            <View style={styles.squareTileOverlay} />
          </>
        ) : (
          <View style={styles.squareTileFallbackCenter}>
            <Text style={styles.squareTileFallbackText}>{initials}</Text>
          </View>
        )}
        <View style={styles.squareTileContent}>
          <View style={styles.squareTileBadgeRow}>
            <Pill label="NEW" />
          </View>
          {showText ? (
            <View style={styles.squareTileBody}>
              <Text numberOfLines={2} style={styles.squareTileTitle}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.squareTileSubtitle}>{subtitle}</Text> : null}
            </View>
          ) : (
            <View />
          )}
        </View>
      </View>
    );
  }

  function QuickAction({
    icon,
    iconColor,
    label,
    overline,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    label: string;
    overline?: string;
  }) {
    return (
      <View style={styles.quickAction}>
        {overline ? <Text style={styles.quickActionOverline}>{overline}</Text> : null}
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={styles.quickActionLabel}>{label}</Text>
      </View>
    );
  }

  const [refreshing, setRefreshing] = useState(false);

  const [myProfile, setMyProfile] = useState<HomeProfile | null>(null);
  const [myProfileLoading, setMyProfileLoading] = useState(true);
  const [myProfileError, setMyProfileError] = useState<string | null>(null);

  const [recommendedProfiles, setRecommendedProfiles] = useState<RecommendedProfile[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const [comingSoonRooms, setComingSoonRooms] = useState<ComingSoonRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomsActionError, setRoomsActionError] = useState<string | null>(null);
  const [interestedRoomIds, setInterestedRoomIds] = useState<Set<string>>(new Set());
  const [roomInterestBusyIds, setRoomInterestBusyIds] = useState<Set<string>>(new Set());

  const [trendingStreams, setTrendingStreams] = useState<TrendingStream[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [liveRoomsLoading, setLiveRoomsLoading] = useState(true);
  const [liveRoomsError, setLiveRoomsError] = useState<string | null>(null);

  const [newTeams, setNewTeams] = useState<NewTeam[]>([]);
  const [newTeamsLoading, setNewTeamsLoading] = useState(true);
  const [newTeamsError, setNewTeamsError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (!user) return null;
    return myProfile?.display_name || myProfile?.username || null;
  }, [myProfile?.display_name, myProfile?.username, user]);

  const loadMyProfile = useCallback(async (userId: string) => {
    setMyProfileLoading(true);
    setMyProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_mll_pro')
      .eq('id', userId)
      .single();

    if (error) {
      setMyProfile(null);
      setMyProfileError(error.message);
      setMyProfileLoading(false);
      return;
    }

    setMyProfile(data ?? null);
    setMyProfileLoading(false);
  }, []);

  const loadRecommendedProfiles = useCallback(async (userId: string) => {
    setRecommendedLoading(true);
    setRecommendedError(null);

    try {
      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId);

      if (followingError) {
        setRecommendedProfiles([]);
        setRecommendedError(followingError.message);
        setRecommendedLoading(false);
        return;
      }

      const followingIds: string[] = (following ?? [])
        .map((f: any) => String(f.followee_id))
        .filter(Boolean);
      const excludedSet = new Set<string>([userId, ...followingIds]);
      console.log('[home] recommended: followingIds=', followingIds.length);

      if (followingIds.length === 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, follower_count, is_live')
          .not('username', 'is', null)
          .neq('id', userId)
          .order('follower_count', { ascending: false })
          .limit(20);

        if (error) {
          setRecommendedProfiles([]);
          setRecommendedError(error.message);
          setRecommendedLoading(false);
          return;
        }

        // Final safety filter: never show self (and if follows somehow got cached, exclude those too)
        const cleaned = (((data as any) ?? []) as RecommendedProfile[]).filter((p) => !excludedSet.has(String(p.id)));
        console.log('[home] recommended: final=', cleaned.length);
        setRecommendedProfiles(cleaned);
        setRecommendedLoading(false);
        return;
      }

      const { data: similarFollows, error: similarError } = await supabase
        .from('follows')
        .select('followee_id')
        .in('follower_id', followingIds)
        .neq('followee_id', userId)
        // NOTE: we also do a client-side filter below to avoid "not in" edge cases with UUID formatting
        .limit(500);

      if (similarError) {
        setRecommendedProfiles([]);
        setRecommendedError(similarError.message);
        setRecommendedLoading(false);
        return;
      }

      const followCounts = new Map<string, number>();
      (similarFollows ?? []).forEach((f: any) => {
        const id = String(f.followee_id);
        if (!id) return;
        if (excludedSet.has(id)) return; // exclude already-followed + self
        followCounts.set(id, (followCounts.get(id) || 0) + 1);
      });

      const recommendedIds = Array.from(followCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      recommendedIds.forEach((id) => excludedSet.add(id));

      const popularQuery = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, follower_count, is_live')
        .not('username', 'is', null)
        .neq('id', userId)
        .order('follower_count', { ascending: false })
        .limit(30);

      const { data: popularRaw, error: popularError } = await popularQuery;

      if (popularError) {
        setRecommendedProfiles([]);
        setRecommendedError(popularError.message);
        setRecommendedLoading(false);
        return;
      }

      const { data: recommended, error: recommendedError } =
        recommendedIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, follower_count, is_live')
              .in('id', recommendedIds)
          : { data: [], error: null };

      if (recommendedError) {
        setRecommendedProfiles([]);
        setRecommendedError(recommendedError.message);
        setRecommendedLoading(false);
        return;
      }

      const popular = (((popularRaw as any) ?? []) as RecommendedProfile[]).filter((p) => !excludedSet.has(String(p.id)));
      const combined: RecommendedProfile[] = [
        ...(((recommended as any[]) ?? []) as any[]),
        ...(((popular as any[]) ?? []) as any[]),
      ].filter(Boolean);

      // Final safety filter: never show self or already-followed (prevents "I still see it" when following everyone)
      const filtered = combined.filter((p) => !excludedSet.has(String(p.id)));
      if (filtered.length === 0) {
        setRecommendedProfiles([]);
        console.log('[home] recommended: final=0 (hiding)');
        setRecommendedLoading(false);
        return;
      }

      filtered.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return Number(b.follower_count || 0) - Number(a.follower_count || 0);
      });

      setRecommendedProfiles(filtered.slice(0, 20));
      console.log('[home] recommended: final=', Math.min(filtered.length, 20));
      setRecommendedLoading(false);
    } catch (e: any) {
      setRecommendedProfiles([]);
      setRecommendedError(e?.message || 'Failed to load recommended profiles');
      setRecommendedLoading(false);
    }
  }, []);

  const loadComingSoonRooms = useCallback(async (userId: string) => {
    setRoomsLoading(true);
    setRoomsError(null);
    setRoomsActionError(null);

    const { data, error } = await supabase
      .from('v_rooms_effective')
      .select(
        'id, name, subtitle, status, category, image_url, banner_url, fallback_gradient, current_interest_count, effective_interest_threshold'
      )
      .in('status', ['interest', 'opening_soon'])
      .order('display_order', { ascending: true })
      .limit(25);

    if (error) {
      setComingSoonRooms([]);
      setRoomsError(error.message);
      setRoomsLoading(false);
      return;
    }

    const rooms = ((data as any) ?? []) as ComingSoonRoom[];
    setComingSoonRooms(rooms);

    // Load current user's interested rooms for this list
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length > 0) {
      const { data: interests, error: interestError } = await supabase
        .from('room_interest')
        .select('room_id')
        .eq('profile_id', userId)
        .in('room_id', roomIds);

      if (interestError) {
        // Don't fail the whole section; just surface an inline note
        setRoomsActionError(interestError.message);
        setInterestedRoomIds(new Set());
      } else {
        const ids = new Set<string>((interests ?? []).map((i: any) => String(i.room_id)).filter(Boolean));
        setInterestedRoomIds(ids);
      }
    } else {
      setInterestedRoomIds(new Set());
    }

    setRoomsLoading(false);
  }, []);

  const toggleRoomInterest = useCallback(
    async (roomId: string, nextInterested: boolean) => {
      if (!user) return;
      setRoomsActionError(null);

      setRoomInterestBusyIds((prev) => {
        const next = new Set(prev);
        next.add(roomId);
        return next;
      });

      // Optimistic UI
      setInterestedRoomIds((prev) => {
        const next = new Set(prev);
        if (nextInterested) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
      setComingSoonRooms((prev) =>
        prev.map((r) => {
          if (r.id !== roomId) return r;
          const prevCount = Number(r.current_interest_count ?? 0);
          const nextCount = Math.max(prevCount + (nextInterested ? 1 : -1), 0);
          return { ...r, current_interest_count: nextCount };
        })
      );

      try {
        if (nextInterested) {
          const { error } = await supabase.from('room_interest').insert({ room_id: roomId, profile_id: user.id });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('room_interest')
            .delete()
            .eq('room_id', roomId)
            .eq('profile_id', user.id);
          if (error) throw error;
        }
      } catch (e: any) {
        // Revert optimistic UI
        setRoomsActionError(e?.message || 'Failed to update interest');
        setInterestedRoomIds((prev) => {
          const next = new Set(prev);
          if (nextInterested) next.delete(roomId);
          else next.add(roomId);
          return next;
        });
        setComingSoonRooms((prev) =>
          prev.map((r) => {
            if (r.id !== roomId) return r;
            const prevCount = Number(r.current_interest_count ?? 0);
            const nextCount = Math.max(prevCount + (nextInterested ? -1 : 1), 0);
            return { ...r, current_interest_count: nextCount };
          })
        );
      } finally {
        setRoomInterestBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      }
    },
    [user]
  );

  const loadTrendingStreams = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError(null);

    const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', { p_limit: 5, p_offset: 0 });

    if (error) {
      setTrendingStreams([]);
      setTrendingError(error.message);
      setTrendingLoading(false);
      return;
    }

    setTrendingStreams((data as any) ?? []);
    setTrendingLoading(false);
  }, []);

  const loadLiveRooms = useCallback(async () => {
    setLiveRoomsLoading(true);
    setLiveRoomsError(null);

    const { data, error } = await supabase.rpc('rpc_get_live_rooms');

    if (error) {
      setLiveRooms([]);
      setLiveRoomsError(error.message);
      setLiveRoomsLoading(false);
      return;
    }

    setLiveRooms((data as any) ?? []);
    setLiveRoomsLoading(false);
  }, []);

  const loadNewTeams = useCallback(async () => {
    setNewTeamsLoading(true);
    setNewTeamsError(null);

    // Prefer the discovery ordering RPC (same ordering rule used on web)
    const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_get_teams_discovery_ordered', {
      p_limit: 10,
      p_offset: 0,
    });

    if (!rpcError) {
      setNewTeams((rpcData as any) ?? []);
      setNewTeamsLoading(false);
      return;
    }

    // Fallback: simple "newest teams" query if RPC isn't available
    const { data, error } = await supabase
      .from('teams')
      .select('id, slug, name, description, icon_url, banner_url, approved_member_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      setNewTeams([]);
      setNewTeamsError(rpcError.message || error.message);
      setNewTeamsLoading(false);
      return;
    }

    setNewTeams((data as any) ?? []);
    setNewTeamsLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) return;
    await Promise.allSettled([
      loadMyProfile(user.id),
      loadRecommendedProfiles(user.id),
      loadComingSoonRooms(user.id),
      loadTrendingStreams(),
      loadLiveRooms(),
      loadNewTeams(),
    ]);
  }, [loadComingSoonRooms, loadLiveRooms, loadMyProfile, loadNewTeams, loadRecommendedProfiles, loadTrendingStreams, user]);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [loadAll, user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll, user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={[styles.container, { paddingTop: 12 }]}>
          <Card>
            <Text style={styles.sectionTitle}>Signed out</Text>
            <Text style={styles.placeholderHint}>Please sign in to see your home feed.</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_SAFE_PADDING }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        {/* MLL PRO Hero */}
        <View style={styles.container}>
          <Card>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroTitle}>
                {displayName ? `Welcome back, ${displayName}.` : 'Welcome back.'}
              </Text>
              <View style={styles.heroBadgePlaceholder}>
                {myProfile?.avatar_url ? (
                  <Image source={{ uri: myProfile.avatar_url }} style={styles.heroAvatar} />
                ) : (
                  <Text style={styles.heroBadgePlaceholderText}>
                    {getInitials(myProfile?.display_name || myProfile?.username || user.email || 'You')}
                  </Text>
                )}
              </View>
            </View>
            {myProfile?.is_mll_pro ? (
              <Text style={styles.heroBody}>Thanks for being a PRO — welcome back!</Text>
            ) : (
              <>
                <Text style={styles.heroBody}>Interested in becoming an MLL PRO?</Text>
                <View style={styles.heroButtonsRow}>
                  <PrimaryButton label="Apply for MLL PRO" onPress={() => navigation.navigate('MllProApplyScreen' as never)} />
                  <OutlineButton label="What is MLL PRO?" onPress={() => navigation.navigate('MllProScreen' as never)} />
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Section 1: Teams Banner */}
        <View style={styles.container}>
          <Card>
            <View style={styles.teamsHeaderRow}>
              <View style={styles.teamsTitleRow}>
                <Text style={styles.teamsTitle}>TEAMS</Text>
                <IconPill iconName="sparkles" label="New" />
              </View>
              <Text style={styles.teamsTagline}>My Team. My People. My Community.</Text>
              <Text style={styles.teamsSubtext}>
                Create communities around shared ideas. Chat, posts, lives, group gifting.
              </Text>
            </View>

            <View style={styles.teamsButtonsRow}>
              <PrimaryButton label="Create a Team" onPress={() => navigation.navigate('TeamsSetupScreen' as never)} />
              <OutlineButton label="Visit Teams" onPress={() => navigation.navigate('TeamsScreen' as never)} />
            </View>
          </Card>
        </View>

        {/* New Teams */}
        <View style={styles.container}>
          <Text style={styles.kicker}>New Teams</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamsHorizontalRow}>
            {newTeamsLoading ? (
              <>
                <View style={styles.teamsTileWrap}>
                  <SquareTile title="Loading…" size={156} showText={false} />
                  <Text style={styles.tileCaption} numberOfLines={1}>
                    Loading…
                  </Text>
                  <Text style={styles.teamMembersCaption} numberOfLines={1}>
                    —
                  </Text>
                </View>
                <View style={styles.teamsTileWrap}>
                  <SquareTile title="Loading…" size={156} showText={false} />
                  <Text style={styles.tileCaption} numberOfLines={1}>
                    Loading…
                  </Text>
                  <Text style={styles.teamMembersCaption} numberOfLines={1}>
                    —
                  </Text>
                </View>
                <View style={styles.teamsTileWrap}>
                  <SquareTile title="Loading…" size={156} showText={false} />
                  <Text style={styles.tileCaption} numberOfLines={1}>
                    Loading…
                  </Text>
                  <Text style={styles.teamMembersCaption} numberOfLines={1}>
                    —
                  </Text>
                </View>
              </>
            ) : newTeamsError ? (
              <View style={{ paddingHorizontal: 4, paddingVertical: 10 }}>
                <Text style={styles.placeholderHint}>Error: {newTeamsError}</Text>
              </View>
            ) : newTeams.length === 0 ? (
              <View style={{ paddingHorizontal: 4, paddingVertical: 10 }}>
                <Text style={styles.placeholderHint}>No items yet</Text>
              </View>
            ) : (
              newTeams.map((t) => {
                const imageUrl = t.icon_url || t.banner_url || null;
                const membersLabel =
                  t.approved_member_count != null ? `${Number(t.approved_member_count)} members` : '—';
                return (
                  <View key={t.id} style={styles.teamsTileWrap}>
                    <SquareTile title={t.name} imageUrl={imageUrl} size={156} showText={false} imageResizeMode="stretch" />
                    <Text style={styles.tileCaption} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={styles.teamMembersCaption} numberOfLines={1}>
                      {membersLabel}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Section 2: Referral Network */}
        <View style={styles.container}>
          <Card>
            <View style={styles.referralBadge}>
              <Ionicons name="people" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.referralTitle}>Build Your Network</Text>
            <Text style={styles.referralBody}>
              Invite friends and grow together. Every referral is tracked, and quality connections matter.
            </Text>
            <View style={styles.referralHintRow}>
              <Ionicons name="sparkles" size={14} color={mode === 'dark' ? 'rgba(255,255,255,0.85)' : colors.text} />
              <Text style={styles.referralHintText}>Top referrers unlock perks 👀</Text>
            </View>

            <PrimaryButton label="Get My Invite Link" onPress={() => navigation.navigate('ReferralsScreen' as never)} />

            <View style={styles.referralGrid}>
              <View style={styles.referralGridItem}>
                <View style={styles.referralGridIcon}>
                  <Ionicons name="trending-up" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.referralGridText}>
                  <Text style={styles.referralGridTitle}>Track Growth</Text>
                  <Text style={styles.referralGridSubtitle}>Real-time analytics</Text>
                </View>
              </View>
              <View style={styles.referralGridItem}>
                <View style={styles.referralGridIcon}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.referralGridText}>
                  <Text style={styles.referralGridTitle}>Earn Rewards</Text>
                  <Text style={styles.referralGridSubtitle}>Quality matters</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Section 2.5: Live Feature Highlight */}
        <View style={styles.container}>
          <Card>
            <Text style={styles.kickerTight}>Live feature</Text>
            <Text style={styles.liveTitle}>Live is happening</Text>
            <Text style={styles.liveBody}>
              Join Live Central to go live together, or start your own Solo Live stream!
            </Text>
            <Text style={styles.liveSubbody}>
              Discover live rooms on LiveTV. Trending and Discovery help streams get seen.
            </Text>

            <View style={styles.liveButtonsRow}>
              <PrimaryButton label="Watch Live" onPress={() => navigation.navigate('Tabs' as never, { screen: 'LiveTV' } as never)} />
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Tabs' as never, { screen: 'Go Live' } as never)} style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}>
                <Text style={styles.textLinkText}>Go Live in Live Central</Text>
              </Pressable>
            </View>

            <View style={styles.liveMiniCard}>
              <View style={styles.liveMiniCardHeader}>
                <View style={styles.liveMiniCardHeaderLeft}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveMiniCardHeaderTitle}>Live Central</Text>
                </View>
                <Text style={styles.liveMiniCardHeaderRight}>Group room</Text>
              </View>
              <View style={styles.liveVideoPlaceholder}>
                <Text style={styles.liveVideoPlaceholderText}>
                  {trendingLoading || liveRoomsLoading
                    ? 'Loading live…'
                    : trendingError || liveRoomsError
                      ? 'Live preview unavailable'
                      : trendingStreams[0]?.username
                        ? `Top live: @${trendingStreams[0].username}`
                        : liveRooms.length > 0
                          ? `${liveRooms.length} live rooms now`
                          : 'No live items yet'}
                </Text>
              </View>
              <View style={styles.liveMiniCardFooter}>
                <View style={styles.liveAvatars}>
                  <View style={styles.liveAvatar} />
                  <View style={styles.liveAvatar} />
                  <View style={styles.liveAvatar} />
                </View>
                <Text style={styles.liveMiniCardFooterText}>
                  {liveRoomsLoading
                    ? 'Updating…'
                    : liveRoomsError
                      ? 'Live rooms unavailable'
                      : liveRooms.length > 0
                        ? `${liveRooms.length} live rooms`
                        : 'No live rooms yet'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Main Content Section */}
        {recommendedLoading || recommendedError || recommendedProfiles.length > 0 ? (
          <View style={styles.container}>
            <Card>
              <SectionTitle>Recommended for You</SectionTitle>
              <View style={styles.placeholderRow}>
                {recommendedLoading ? (
                  <>
                    <View style={styles.profilePill} />
                    <View style={styles.profilePill} />
                    <View style={styles.profilePill} />
                    <View style={styles.profilePill} />
                  </>
                ) : recommendedError ? null : (
                  recommendedProfiles.slice(0, 8).map((p) => (
                    <View key={p.id} style={styles.profilePill}>
                      {p.avatar_url ? (
                        <Image source={{ uri: p.avatar_url }} style={styles.profilePillImage} />
                      ) : (
                        <Text style={styles.profilePillInitial}>{getInitials(p.display_name || p.username)}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
              {recommendedLoading ? (
                <Text style={styles.placeholderHint}>Loading…</Text>
              ) : recommendedError ? (
                <Text style={styles.placeholderHint}>Error: {recommendedError}</Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        <View style={styles.container}>
          <Card>
            <SectionTitle>Coming Soon Rooms</SectionTitle>
            <View style={styles.placeholderRoom}>
              {roomsLoading ? (
                <Text style={styles.placeholderRoomText}>Loading…</Text>
              ) : roomsError ? (
                <Text style={styles.placeholderRoomText}>Error: {roomsError}</Text>
              ) : comingSoonRooms.length === 0 ? (
                <Text style={styles.placeholderRoomText}>No items yet</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ width: '100%' }}
                  contentContainerStyle={styles.roomsHorizontalRow}
                >
                  {comingSoonRooms.slice(0, 10).map((room) => {
                    const interested = Number(room.current_interest_count ?? 0);
                    const imageUrl = room.image_url || room.banner_url || null;
                    const isInterested = interestedRoomIds.has(room.id);
                    const busy = roomInterestBusyIds.has(room.id);

                    return (
                      <View key={room.id} style={styles.roomsTileWrap}>
                        <SquareTile
                          title={room.name}
                          subtitle={room.subtitle || undefined}
                          imageUrl={imageUrl}
                          width={260}
                          height={156}
                          imageResizeMode="contain"
                          useBackdrop
                        />
                        <Text style={styles.tileCaption} numberOfLines={1}>
                          {room.name}
                        </Text>
                        <Text style={styles.teamMembersCaption} numberOfLines={1}>
                          {interested} interested
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() => toggleRoomInterest(room.id, !isInterested)}
                          style={({ pressed }) => [
                            styles.roomInterestButton,
                            isInterested ? styles.roomInterestButtonActive : styles.roomInterestButtonInactive,
                            (pressed || busy) && styles.pressed,
                          ]}
                        >
                          <Text style={styles.roomInterestButtonText}>{isInterested ? 'Interested' : "I'm interested"}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
            {roomsActionError ? <Text style={styles.placeholderHint}>Note: {roomsActionError}</Text> : null}
          </Card>
        </View>

        {/* Quick Actions CTA */}
        <View style={styles.container}>
          <Card>
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <View style={styles.ctaButtonsRow}>
              <PrimaryButton label="Complete Your Profile" onPress={() => navigation.navigate('ProfileViewScreen' as never, { profileId: user?.id } as never)} />
              <OutlineButton label="Browse Live Streams" onPress={() => navigation.navigate('Tabs' as never, { screen: 'LiveTV' } as never)} />
            </View>
          </Card>
        </View>

        {/* Coming Soon Email Signup */}
        <View style={styles.container}>
          <Card>
            <View style={styles.emailTitleRow}>
              <View style={styles.emailIconCircle}>
                <MaterialCommunityIcons name="cellphone" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.emailTitle}>Email updates</Text>
            </View>
            <Text style={styles.emailSubtext}>No items yet.</Text>

            <View style={styles.emailFormRow}>
            <TextInput
                editable={false}
                placeholder="you@email.com"
                placeholderTextColor={mode === 'dark' ? 'rgba(255,255,255,0.5)' : colors.mutedText}
                style={styles.emailInput}
              />
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.notifyButton, pressed && styles.pressed]}>
                <Text style={styles.notifyButtonText}>Notify me</Text>
              </Pressable>
            </View>

            <Text style={styles.emailFinePrint}>No spam. Unsubscribe anytime.</Text>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLinksRow}>
            <Pressable onPress={() => navigation.navigate('MllProScreen' as never)}>
              <Text style={styles.footerLinkStrong}>MLL PRO</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Safety &amp; Policies</Text>
            </Pressable>
          </View>
          <View style={styles.footerLinksWrap}>
            <Pressable onPress={() => navigation.navigate('TermsScreen' as never)}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PrivacyScreen' as never)}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Community Guidelines</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Payments &amp; Virtual Currency Policy</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Fraud &amp; Chargeback Policy</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Creator Earnings &amp; Payout Policy</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Dispute Resolution &amp; Arbitration</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('PoliciesScreen' as never)}>
              <Text style={styles.footerLink}>Account Enforcement &amp; Termination Policy</Text>
            </Pressable>
          </View>
          <Text style={styles.footerCopy}>© 2026 MyLiveLinks. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type StylesVars = {
  bg: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
  onBrand: string;
  primary: string;
  isDark: boolean;
};

function createStyles(stylesVars: StylesVars) {
  const isDark = stylesVars.isDark;
  const softCardBg = isDark ? 'rgba(255,255,255,0.08)' : stylesVars.card;
  const softCardBorder = isDark ? 'rgba(255,255,255,0.14)' : stylesVars.border;
  const softText = isDark ? '#FFFFFF' : stylesVars.text;
  const softMuted = isDark ? 'rgba(255,255,255,0.7)' : stylesVars.mutedText;

  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingTop: 12,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  card: {
    borderRadius: 16,
    backgroundColor: softCardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: softCardBorder,
    padding: 16,
  },

  sectionTitle: {
    color: softText,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },

  kicker: {
    color: softMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  kickerTight: {
    color: softMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kickerCenter: {
    color: softMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  primaryButton: {
    backgroundColor: stylesVars.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.9)' : stylesVars.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    color: softText,
    fontSize: 14,
    fontWeight: '800',
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EC4899',
  },
  iconPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  heroTitle: {
    flex: 1,
    color: softText,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroBadgePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgePlaceholderText: {
    color: softText,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  heroBody: {
    color: isDark ? 'rgba(255,255,255,0.82)' : stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  heroButtonsRow: {
    gap: 10,
  },

  teamsHeaderRow: {
    gap: 6,
    marginBottom: 12,
  },
  teamsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamsTitle: {
    color: softText,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  teamsTagline: {
    color: softMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  teamsSubtext: {
    color: softMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  teamsButtonsRow: {
    gap: 10,
  },

  horizontalRow: {
    paddingHorizontal: 4,
    gap: 12,
  },
  roomsHorizontalRow: {
    paddingHorizontal: 4,
    gap: 8,
  },
  teamsHorizontalRow: {
    paddingHorizontal: 4,
    gap: 8,
  },
  tileWrap: {
    width: 120,
  },
  teamsTileWrap: {
    width: 156,
  },
  roomsTileWrap: {
    width: 260,
  },
  squareTile: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    position: 'relative',
  },
  squareTileContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  squareTileImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  squareTileBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.55,
    borderRadius: 14,
  },
  squareTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
  },
  squareTileFallbackCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareTileFallbackText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  squareTileBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  squareTileBody: {
    gap: 4,
  },
  squareTileTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  squareTileSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
  },
  tileCaption: {
    marginTop: 6,
    color: isDark ? 'rgba(255,255,255,0.9)' : stylesVars.text,
    fontSize: 11,
    fontWeight: '700',
  },
  teamMembersCaption: {
    marginTop: 2,
    color: softMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  roomInterestButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
  },
  roomInterestButtonInactive: {
    backgroundColor: stylesVars.primary,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : stylesVars.border,
  },
  roomInterestButtonActive: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : stylesVars.card,
    borderColor: isDark ? 'rgba(255,255,255,0.24)' : stylesVars.border,
  },
  roomInterestButtonText: {
    color: isDark ? '#FFFFFF' : stylesVars.text,
    fontSize: 12,
    fontWeight: '900',
  },

  referralBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  referralTitle: {
    color: softText,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  referralBody: {
    color: isDark ? 'rgba(255,255,255,0.9)' : stylesVars.text,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  referralHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  referralHintText: {
    color: softMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  referralGrid: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    gap: 12,
  },
  referralGridItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  referralGridIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralGridText: {
    flex: 1,
    gap: 2,
  },
  referralGridTitle: {
    color: softText,
    fontSize: 12,
    fontWeight: '800',
  },
  referralGridSubtitle: {
    color: softMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  liveTitle: {
    color: softText,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  liveBody: {
    color: isDark ? 'rgba(255,255,255,0.82)' : stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  liveSubbody: {
    color: softMuted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  liveButtonsRow: {
    gap: 10,
    marginBottom: 14,
  },
  textLink: {
    paddingVertical: 6,
  },
  textLinkText: {
    color: isDark ? 'rgba(255,255,255,0.85)' : stylesVars.primary,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  liveMiniCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 14,
    gap: 10,
  },
  liveMiniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveMiniCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#EF4444',
  },
  liveMiniCardHeaderTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  liveMiniCardHeaderRight: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
  },
  liveVideoPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveVideoPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '800',
  },
  liveMiniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveAvatars: {
    flexDirection: 'row',
    gap: 6,
  },
  liveAvatar: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  liveMiniCardFooterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '800',
  },

  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  quickGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  quickAction: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 64,
    gap: 2,
  },
  quickActionOverline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickActionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  cashOutRing: {
    width: 32,
    height: 32,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 4,
  },

  placeholderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profilePill: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePillImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  profilePillInitial: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 20,
    fontWeight: '900',
  },
  placeholderHint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderRoom: {
    minHeight: 292,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderRoomText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '800',
  },
  roomsList: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 12,
  },
  roomLine: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '800',
  },

  ctaTitle: {
    color: softText,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaButtonsRow: {
    gap: 10,
  },

  emailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  emailTitle: {
    color: softText,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  emailSubtext: {
    color: softMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  emailFormRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.18)' : stylesVars.border,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : stylesVars.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: softText,
    fontSize: 14,
    fontWeight: '800',
  },
  notifyButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FF5AAE',
    minWidth: 98,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  emailFinePrint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : stylesVars.border,
    color: softMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  footer: {
    marginTop: 6,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : stylesVars.border,
    gap: 10,
  },
  footerLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  footerLinksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  footerLinkStrong: {
    color: isDark ? '#C084FC' : stylesVars.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  footerLink: {
    color: softMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  footerCopy: {
    color: softMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  });
}

