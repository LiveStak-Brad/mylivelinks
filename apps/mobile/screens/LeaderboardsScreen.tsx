import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MllProBadge from '../components/shared/MllProBadge';
import TopLeaderBadge from '../components/shared/TopLeaderBadge';
import { useTopLeaders, getLeaderType } from '../hooks/useTopLeaders';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../state/AuthContext';
import { supabase } from '../lib/supabase';

// Owner profile IDs to exclude from leaderboards
const OWNER_PROFILE_IDS = [
  '2b4a1178-3c39-4179-94ea-314dd824a818',
  '0b47a2d7-43fb-4d38-b321-2d5d0619aabf',
];

const SCREEN_WIDTH = Dimensions.get('window').width;

// Theme context for helper components
type LeaderboardTheme = {
  bg: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  cardBg: string;
  cardBorder: string;
  segmentBg: string;
  avatarBg: string;
  avatarText: string;
  podiumBg: string;
};

const LeaderboardThemeContext = createContext<LeaderboardTheme | null>(null);

function useLeaderboardTheme(): LeaderboardTheme {
  const ctx = useContext(LeaderboardThemeContext);
  if (!ctx) {
    // Fallback to dark theme
    return {
      bg: '#0B0B0F',
      surface: '#12121A',
      text: '#fff',
      mutedText: '#9ca3af',
      border: '#2a2a2a',
      cardBg: '#1a1a1a',
      cardBorder: '#2a2a2a',
      segmentBg: '#0a0a0a',
      avatarBg: '#111827',
      avatarText: '#fff',
      podiumBg: '#0a0a0a',
    };
  }
  return ctx;
}

type LeaderboardEntry = {
  profile_id: string;
  username: string;
  avatar_url: string | null;
  is_live: boolean;
  is_mll_pro: boolean;
  gifter_level: number;
  metric_value: number;
  rank: number;
};

type ReferralEntry = {
  profile_id: string;
  username: string;
  avatar_url: string | null;
  joined: number;
  active: number;
  last_activity_at: string | null;
};

export default function LeaderboardsScreen() {
  const { mode, colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute();
  const params = route.params as { tab?: 'referrals' } | undefined;
  
  const [mainTab, setMainTab] = useState<'gifts' | 'referrals'>(params?.tab === 'referrals' ? 'referrals' : 'gifts');
  const [category, setCategory] = useState<'streamers' | 'gifters'>('gifters');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'alltime'>('weekly');
  
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [referralData, setReferralData] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.tab === 'referrals') {
      setMainTab('referrals');
    }
  }, [params]);

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      cardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      cardBorder: mode === 'dark' ? '#2a2a2a' : colors.border,
      segmentBg: mode === 'dark' ? '#0a0a0a' : colors.surface,
      avatarBg: mode === 'dark' ? '#111827' : 'rgba(124, 58, 237, 0.12)',
      avatarText: mode === 'dark' ? '#fff' : colors.text,
      podiumBg: mode === 'dark' ? '#0a0a0a' : colors.surface,
    }),
    [mode, colors]
  );

  const loadGiftsLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const type = category === 'streamers' ? 'top_streamers' : 'top_gifters';
    const period = timeframe === 'alltime' ? 'alltime' : timeframe;
    
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .rpc('get_leaderboard', { 
        p_type: type, 
        p_period: period, 
        p_limit: 100,
        p_room_id: null 
      });
    
    if (leaderboardError) {
      console.error('[Leaderboards] Error loading:', leaderboardError);
      setError(leaderboardError.message);
      setData([]);
    } else {
      setData((leaderboardData as any) || []);
    }
    
    setLoading(false);
  }, [category, timeframe]);

  const loadReferralsLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Query referral_rollups and manually join with profiles
    // Exclude owner profile IDs from leaderboard
    let query = supabase
      .from('referral_rollups')
      .select('referrer_profile_id, referral_count, activation_count, last_activity_at')
      .order('activation_count', { ascending: false })
      .order('referral_count', { ascending: false })
      .limit(100);
    
    // Exclude owner IDs
    for (const ownerId of OWNER_PROFILE_IDS) {
      query = query.neq('referrer_profile_id', ownerId);
    }
    
    const { data: rollups, error: rollupsError } = await query;
    
    if (rollupsError) {
      console.error('[Leaderboards] Error loading referrals:', rollupsError);
      setError(rollupsError.message);
      setReferralData([]);
      setLoading(false);
      return;
    }
    
    if (!rollups || rollups.length === 0) {
      setReferralData([]);
      setLoading(false);
      return;
    }
    
    // Fetch profile data for all referrers
    const profileIds = rollups.map((r: any) => r.referrer_profile_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', profileIds);
    
    if (profilesError) {
      console.error('[Leaderboards] Error loading profiles:', profilesError);
    }
    
    // Create a map of profiles for quick lookup
    const profileMap = new Map();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, p);
    });
    
    // Transform to match expected format
    // Note: Rankings are by active members (activation_count), not total signups
    const transformed = rollups.map((r: any) => {
      const profile = profileMap.get(r.referrer_profile_id);
      return {
        profile_id: r.referrer_profile_id,
        username: profile?.username || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        joined: r.activation_count || 0, // Show active count as primary metric
        active: r.activation_count || 0,
        last_activity_at: r.last_activity_at,
      };
    });
    
    setReferralData(transformed);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mainTab === 'gifts') {
      loadGiftsLeaderboard();
    } else {
      loadReferralsLeaderboard();
    }
  }, [mainTab, loadGiftsLeaderboard, loadReferralsLeaderboard]);

  const title = mainTab === 'referrals' ? 'Top Referrers' : (category === 'streamers' ? 'Top Earners' : 'Top Gifters');
  const scoreLabel = mainTab === 'referrals' ? 'Active' : (category === 'streamers' ? 'Diamonds' : 'Coins');

  const top3 = useMemo(() => {
    const sourceData = mainTab === 'referrals' ? referralData : data;
    if (!sourceData || sourceData.length === 0) return [];
    
    return sourceData.slice(0, 3).map((entry, idx) => {
      if (mainTab === 'referrals') {
        const refEntry = entry as ReferralEntry;
        return {
          id: refEntry.profile_id,
          name: refEntry.username || 'Unknown',
          handle: '',
          score: formatNumber(refEntry.active),
          avatar_url: refEntry.avatar_url,
          rank: idx + 1,
        };
      } else {
        const lbEntry = entry as LeaderboardEntry;
        return {
          id: lbEntry.profile_id,
          name: lbEntry.username || 'Unknown',
          handle: '',
          score: formatNumber(lbEntry.metric_value),
          avatar_url: lbEntry.avatar_url,
          rank: lbEntry.rank,
          is_live: lbEntry.is_live,
          is_mll_pro: lbEntry.is_mll_pro,
        };
      }
    });
  }, [data, referralData, mainTab]);

  const rows = useMemo(() => {
    const sourceData = mainTab === 'referrals' ? referralData : data;
    if (!sourceData || sourceData.length === 0) return [];
    
    return sourceData.slice(3).map((entry) => {
      if (mainTab === 'referrals') {
        const refEntry = entry as ReferralEntry;
        const rank = referralData.indexOf(refEntry) + 1;
        return {
          id: refEntry.profile_id,
          rank,
          name: refEntry.username || 'Unknown',
          handle: '',
          score: formatNumber(refEntry.active),
          avatar_url: refEntry.avatar_url,
          trend: 'flat' as const,
        };
      } else {
        const lbEntry = entry as LeaderboardEntry;
        return {
          id: lbEntry.profile_id,
          rank: lbEntry.rank,
          name: lbEntry.username || 'Unknown',
          handle: '',
          score: formatNumber(lbEntry.metric_value),
          avatar_url: lbEntry.avatar_url,
          trend: 'flat' as const,
          is_live: lbEntry.is_live,
          is_mll_pro: lbEntry.is_mll_pro,
        };
      }
    });
  }, [data, referralData, mainTab]);

  return (
    <LeaderboardThemeContext.Provider value={themed}>
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="trophy" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: themed.text }]}>Leaderboards</Text>
            <Text style={[styles.subtitle, { color: themed.mutedText }]}>
              {mainTab === 'gifts' ? 'Top gifters and earners' : 'Top referrers'}
            </Text>
          </View>
        </View>

        {/* Main Tabs: Gifts vs Referrals */}
        <View style={[styles.mainTabsContainer, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'gifts' && styles.mainTabActive]}
            onPress={() => setMainTab('gifts')}
            activeOpacity={0.8}
          >
            <Ionicons name="gift" size={18} color={mainTab === 'gifts' ? '#fff' : themed.mutedText} />
            <Text style={[styles.mainTabText, mainTab === 'gifts' && styles.mainTabTextActive, { color: mainTab === 'gifts' ? '#fff' : themed.mutedText }]}>
              Gifts & Earnings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, mainTab === 'referrals' && styles.mainTabActive]}
            onPress={() => setMainTab('referrals')}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={18} color={mainTab === 'referrals' ? '#fff' : themed.mutedText} />
            <Text style={[styles.mainTabText, mainTab === 'referrals' && styles.mainTabTextActive, { color: mainTab === 'referrals' ? '#fff' : themed.mutedText }]}>
              Referrals
            </Text>
          </TouchableOpacity>
        </View>

        {mainTab === 'gifts' && (
          <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: themed.text }]}>Category</Text>
            <View style={[styles.segment, { backgroundColor: themed.segmentBg, borderColor: themed.cardBorder }]}>
              <SegmentButton
                label="Earners"
                icon="diamond-outline"
                isActive={category === 'streamers'}
                onPress={() => setCategory('streamers')}
              />
              <SegmentButton
                label="Gifters"
                icon="gift"
                isActive={category === 'gifters'}
                onPress={() => setCategory('gifters')}
              />
            </View>

            <View style={styles.filtersRow}>
              <View style={styles.filtersTitle}>
                <Text style={[styles.filtersTitleText, { color: themed.text }]}>Timeframe</Text>
                <View style={[styles.pill, { backgroundColor: themed.segmentBg, borderColor: themed.cardBorder }]}>
                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                  <Text style={[styles.pillText, { color: themed.mutedText }]}>
                    {timeframe === 'daily' ? 'Daily' : timeframe === 'weekly' ? 'Weekly' : timeframe === 'monthly' ? 'Monthly' : 'All-time'}
                  </Text>
                </View>
              </View>
              <View style={[styles.segmentSmall, { backgroundColor: themed.segmentBg, borderColor: themed.cardBorder }]}>
                <SegmentButtonSmall
                  label="Daily"
                  isActive={timeframe === 'daily'}
                  onPress={() => setTimeframe('daily')}
                />
                <SegmentButtonSmall
                  label="Weekly"
                  isActive={timeframe === 'weekly'}
                  onPress={() => setTimeframe('weekly')}
                />
                <SegmentButtonSmall
                  label="Monthly"
                  isActive={timeframe === 'monthly'}
                  onPress={() => setTimeframe('monthly')}
                />
                <SegmentButtonSmall
                  label="All"
                  isActive={timeframe === 'alltime'}
                  onPress={() => setTimeframe('alltime')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Top 3 - Full Screen Width */}
        <View style={styles.topThreeContainer}>
          <View style={styles.topThreeHeader}>
            <Text style={[styles.topThreeTitle, { color: themed.text }]}>{title}</Text>
            {mainTab === 'gifts' ? (
              <Text style={[styles.topThreeMeta, { color: themed.mutedText }]}>
                {timeframe === 'daily' ? 'Today' : timeframe === 'weekly' ? 'This week' : timeframe === 'monthly' ? 'This month' : 'All-time'}
              </Text>
            ) : (
              <Text style={[styles.topThreeMeta, { color: themed.mutedText }]}>
                By active members
              </Text>
            )}
          </View>

          {loading ? (
            <View style={[styles.loadingContainer, { backgroundColor: themed.cardBg }]}>
              <Text style={[styles.loadingText, { color: themed.mutedText }]}>Loading...</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorContainer, { backgroundColor: themed.cardBg }]}>
              <Text style={[styles.errorText, { color: '#ef4444' }]}>Error: {error}</Text>
            </View>
          ) : top3.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: themed.cardBg }]}>
              <Text style={[styles.emptyText, { color: themed.mutedText }]}>No data yet</Text>
            </View>
          ) : (
            <View style={styles.podiumRow}>
              <PodiumSpot
                place={2}
                name={top3[1]?.name ?? '—'}
                handle={top3[1]?.handle ?? '—'}
                score={top3[1]?.score ?? '—'}
                scoreLabel={scoreLabel}
                accent="#94a3b8"
                avatarUrl={top3[1]?.avatar_url}
                isLive={top3[1]?.is_live}
              />
              <PodiumSpot
                place={1}
                name={top3[0]?.name ?? '—'}
                handle={top3[0]?.handle ?? '—'}
                score={top3[0]?.score ?? '—'}
                scoreLabel={scoreLabel}
                accent="#fbbf24"
                avatarUrl={top3[0]?.avatar_url}
                isLive={top3[0]?.is_live}
              />
              <PodiumSpot
                place={3}
                name={top3[2]?.name ?? '—'}
                handle={top3[2]?.handle ?? '—'}
                score={top3[2]?.score ?? '—'}
                scoreLabel={scoreLabel}
                accent="#f59e0b"
                avatarUrl={top3[2]?.avatar_url}
                isLive={top3[2]?.is_live}
              />
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themed.text }]}>Rankings</Text>
            <Text style={[styles.sectionMeta, { color: themed.mutedText }]}>
              {loading ? 'Loading...' : `${rows.length} users`}
            </Text>
          </View>

          <View style={[styles.listHeaderRow, { borderBottomColor: themed.cardBorder }]}>
            <Text style={[styles.listHeaderText, styles.colRank, { color: themed.mutedText }]}>#</Text>
            <Text style={[styles.listHeaderText, styles.colUser, { color: themed.mutedText }]}>User</Text>
            <Text style={[styles.listHeaderText, styles.colScore, { color: themed.mutedText }]}>{scoreLabel}</Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 20 }}>
              <Text style={[styles.placeholderHint, { color: themed.mutedText }]}>Loading rankings...</Text>
            </View>
          ) : error ? (
            <View style={{ paddingVertical: 20 }}>
              <Text style={[styles.placeholderHint, { color: '#ef4444' }]}>Error loading data</Text>
            </View>
          ) : rows.length === 0 ? (
            <View style={{ paddingVertical: 20 }}>
              <Text style={[styles.placeholderHint, { color: themed.mutedText }]}>No rankings yet</Text>
            </View>
          ) : (
            rows.map((r, idx) => (
              <LeaderboardRow
                key={r.id}
                rank={r.rank}
                name={r.name}
                handle={r.handle}
                score={r.score}
                trend={r.trend as 'up' | 'down' | 'flat'}
                avatarUrl={r.avatar_url}
                isLive={r.is_live}
                isMllPro={r.is_mll_pro}
                isLast={idx === rows.length - 1}
                profileId={r.id}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </LeaderboardThemeContext.Provider>
  );
}

function SegmentButton(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentBtn, props.isActive && styles.segmentBtnActive]}
      onPress={props.onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={props.icon}
        size={16}
        color={props.isActive ? '#fff' : '#9ca3af'}
      />
      <Text style={[styles.segmentBtnText, props.isActive && styles.segmentBtnTextActive]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function SegmentButtonSmall(props: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.segmentBtnSmall, props.isActive && styles.segmentBtnSmallActive]}
      onPress={props.onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.segmentBtnSmallText, props.isActive && styles.segmentBtnSmallTextActive]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function PodiumSpot(props: {
  place: 1 | 2 | 3;
  name: string;
  handle: string;
  score: string;
  scoreLabel: string;
  accent: string;
  avatarUrl?: string | null;
  isLive?: boolean;
}) {
  const themed = useLeaderboardTheme();
  const isWinner = props.place === 1;
  const avatarSize = isWinner ? 72 : 56;
  const cardPad = isWinner ? 8 : 6;

  return (
    <View style={[styles.podiumSpot, { backgroundColor: themed.podiumBg, borderColor: themed.cardBorder }, isWinner && styles.podiumSpotWinner]}>
      <View style={[styles.podiumBadge, { backgroundColor: props.accent }]}>
        <Text style={styles.podiumBadgeText}>{props.place}</Text>
      </View>

      <View style={{ position: 'relative' }}>
        <View
          style={[
            styles.avatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themed.avatarBg, borderColor: themed.cardBorder },
          ]}
        >
          {props.avatarUrl ? (
            <Image source={{ uri: props.avatarUrl }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
          ) : (
            <Text style={[styles.avatarText, { color: themed.avatarText, fontSize: isWinner ? 24 : 18 }]}>{getInitials(props.name)}</Text>
          )}
        </View>
        {props.isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
          </View>
        )}
      </View>

      <View style={[styles.podiumInfo, { paddingHorizontal: cardPad }]}>
        <View style={styles.podiumNameRow}>
          <Text 
            style={[styles.podiumName, { color: themed.text }]} 
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {props.name}
          </Text>
        </View>
        {props.handle ? (
          <Text style={[styles.podiumHandle, { color: themed.mutedText }]} numberOfLines={1}>
            {props.handle}
          </Text>
        ) : null}
        <View style={styles.podiumScoreRow}>
          <Text style={[styles.podiumScore, { color: themed.text }]}>
            {props.score} {props.scoreLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LeaderboardRow(props: {
  rank: number;
  name: string;
  handle: string;
  score: string;
  trend: 'up' | 'down' | 'flat';
  avatarUrl?: string | null;
  isLive?: boolean;
  isMllPro?: boolean;
  isLast: boolean;
  profileId?: string;
}) {
  const themed = useLeaderboardTheme();
  const trendIcon =
    props.trend === 'up' ? 'caret-up' : props.trend === 'down' ? 'caret-down' : 'remove';
  const trendColor =
    props.trend === 'up' ? '#22c55e' : props.trend === 'down' ? '#ef4444' : themed.mutedText;

  return (
    <View style={[styles.row, { borderBottomColor: themed.cardBorder }, props.isLast && styles.rowLast]}>
      <Text style={[styles.rank, styles.colRank, { color: themed.text }]}>{props.rank}</Text>

      <View style={[styles.userCell, styles.colUser]}>
        <View style={{ position: 'relative' }}>
          <View style={[styles.avatarSmall, { backgroundColor: themed.avatarBg, borderColor: themed.cardBorder }]}>
            {props.avatarUrl ? (
              <Image source={{ uri: props.avatarUrl }} style={styles.avatarSmallImage} />
            ) : (
              <Text style={[styles.avatarSmallText, { color: themed.avatarText }]}>{getInitials(props.name)}</Text>
            )}
          </View>
          {props.isLive && (
            <View style={styles.liveIndicatorSmall}>
              <View style={styles.liveDotSmall} />
            </View>
          )}
        </View>
        <View style={styles.userText}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: themed.text }]} numberOfLines={1}>
              {props.name}
            </Text>
            {props.isMllPro && <MllProBadge size="sm" />}
            <LeaderBadgeInRow profileId={props.profileId} />
          </View>
          {props.handle ? (
            <Text style={[styles.userHandle, { color: themed.mutedText }]} numberOfLines={1}>
              {props.handle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.scoreCell, styles.colScore]}>
        <Ionicons name={trendIcon as any} size={14} color={trendColor} />
        <Text style={[styles.scoreText, { color: themed.text }]}>{props.score}</Text>
      </View>
    </View>
  );
}

function LeaderBadgeInRow({ profileId }: { profileId?: string }) {
  const leaders = useTopLeaders();
  const leaderType = getLeaderType(profileId, leaders);
  if (!leaderType) return null;
  return <TopLeaderBadge type={leaderType} size="sm" />;
}

function getInitials(name: string) {
  const cleaned = (name || '').trim();
  if (!cleaned) return '—';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : '') ?? '';
  return (first + last).toUpperCase() || '—';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 4,
    gap: 6,
    marginTop: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#8b5cf6',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
  },
  segmentBtnTextActive: {
    color: '#fff',
  },
  filtersRow: {
    marginTop: 14,
    gap: 10,
  },
  filtersTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  segmentSmall: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 4,
    gap: 6,
  },
  segmentBtnSmall: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnSmallActive: {
    backgroundColor: '#374151',
  },
  segmentBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  segmentBtnSmallTextActive: {
    color: '#fff',
  },
  podiumRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  podiumSpot: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  podiumSpotWinner: {
    borderColor: '#fbbf24',
  },
  podiumBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  podiumBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  avatar: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  podiumInfo: {
    marginTop: 10,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  podiumNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    paddingHorizontal: 4,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    flexShrink: 1,
    textAlign: 'center',
  },
  podiumHandle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  podiumScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  podiumScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9ca3af',
  },
  colRank: {
    width: 34,
  },
  colUser: {
    flex: 1,
  },
  colScore: {
    width: 110,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rank: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e5e7eb',
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  userHandle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
  scoreCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e5e7eb',
    textAlign: 'right',
  },
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 8,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  mainTabActive: {
    backgroundColor: '#8b5cf6',
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mainTabTextActive: {
    color: '#fff',
  },
  topThreeContainer: {
    marginBottom: 16,
  },
  topThreeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  topThreeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  topThreeMeta: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveIndicatorSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  avatarSmallImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  placeholderHint: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
