import React, { createContext, useContext, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

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

export default function LeaderboardsScreen() {
  const { mode, colors } = useTheme();
  const [category, setCategory] = useState<'streamers' | 'gifters'>('streamers');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all'>('weekly');

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

  const title = category === 'streamers' ? 'Top Streamers' : 'Top Gifters';
  const scoreLabel = category === 'streamers' ? 'Diamonds' : 'Coins';

  const top3 = useMemo(() => {
    const base =
      category === 'streamers'
        ? [
            { id: 's1', name: 'Aurora', handle: '@aurora', score: '128.4K' },
            { id: 's2', name: 'Nova', handle: '@nova', score: '104.9K' },
            { id: 's3', name: 'Vega', handle: '@vega', score: '97.2K' },
          ]
        : [
            { id: 'g1', name: 'WhaleKing', handle: '@whaleking', score: '310.0K' },
            { id: 'g2', name: 'Spark', handle: '@spark', score: '264.5K' },
            { id: 'g3', name: 'LunaGift', handle: '@lunagift', score: '231.9K' },
          ];

    return base;
  }, [category]);

  const rows = useMemo(() => {
    const seed =
      category === 'streamers'
        ? [
            'Kai',
            'Mila',
            'Jade',
            'Skye',
            'Zion',
            'Rey',
            'Ivy',
            'Axel',
            'Sage',
            'Luca',
            'Nico',
            'June',
            'Rory',
            'Aria',
            'Tess',
            'Finn',
            'Ari',
          ]
        : [
            'BigTipper',
            'GifterOne',
            'Coins4Days',
            'HypeTrain',
            'GoldenHand',
            'GiftStorm',
            'DiamondFan',
            'Cheers',
            'SupporterX',
            'CrownBuyer',
            'Boost',
            'Rocket',
            'Rainmaker',
            'Patron',
            'StarSender',
            'KingPin',
            'Velvet',
          ];

    return seed.slice(0, 15).map((name, idx) => {
      const rank = idx + 4;
      const handle = `@${name.toLowerCase()}`;
      const scoreBase = category === 'streamers' ? 86_000 : 210_000;
      const score = scoreBase - idx * (category === 'streamers' ? 3_700 : 8_400);
      const scoreText =
        score >= 1000 ? `${(score / 1000).toFixed(1)}K` : `${Math.max(score, 0)}`;
      const trend = idx % 3 === 0 ? 'up' : idx % 3 === 1 ? 'down' : 'flat';
      return { id: `${category}-${idx}`, rank, name, handle, score: scoreText, trend };
    });
  }, [category]);

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
            <Text style={[styles.subtitle, { color: themed.mutedText }]}>Daily, weekly, and all-time rankings</Text>
          </View>
          <TouchableOpacity style={[styles.headerAction, { backgroundColor: themed.segmentBg, borderColor: themed.cardBorder }]} activeOpacity={0.8}>
            <Ionicons name="information-circle-outline" size={22} color={themed.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>Category</Text>
          <View style={[styles.segment, { backgroundColor: themed.segmentBg, borderColor: themed.cardBorder }]}>
            <SegmentButton
              label="Streamers"
              icon="videocam"
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
                  {timeframe === 'daily' ? 'Daily' : timeframe === 'weekly' ? 'Weekly' : 'All-time'}
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
                label="All"
                isActive={timeframe === 'all'}
                onPress={() => setTimeframe('all')}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themed.text }]}>{title}</Text>
            <Text style={[styles.sectionMeta, { color: themed.mutedText }]}>
              {timeframe === 'daily' ? 'Today' : timeframe === 'weekly' ? 'This week' : 'All-time'}
            </Text>
          </View>

          <View style={styles.podiumRow}>
            <PodiumSpot
              place={2}
              name={top3[1]?.name ?? '—'}
              handle={top3[1]?.handle ?? '—'}
              score={top3[1]?.score ?? '—'}
              scoreLabel={scoreLabel}
              accent="#94a3b8"
              size="small"
            />
            <PodiumSpot
              place={1}
              name={top3[0]?.name ?? '—'}
              handle={top3[0]?.handle ?? '—'}
              score={top3[0]?.score ?? '—'}
              scoreLabel={scoreLabel}
              accent="#fbbf24"
              size="large"
            />
            <PodiumSpot
              place={3}
              name={top3[2]?.name ?? '—'}
              handle={top3[2]?.handle ?? '—'}
              score={top3[2]?.score ?? '—'}
              scoreLabel={scoreLabel}
              accent="#f59e0b"
              size="small"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: themed.text }]}>Rankings</Text>
            <Text style={[styles.sectionMeta, { color: themed.mutedText }]}>Placeholder data</Text>
          </View>

          <View style={[styles.listHeaderRow, { borderBottomColor: themed.cardBorder }]}>
            <Text style={[styles.listHeaderText, styles.colRank, { color: themed.mutedText }]}>#</Text>
            <Text style={[styles.listHeaderText, styles.colUser, { color: themed.mutedText }]}>User</Text>
            <Text style={[styles.listHeaderText, styles.colScore, { color: themed.mutedText }]}>{scoreLabel}</Text>
          </View>

          {rows.map((r, idx) => (
            <LeaderboardRow
              key={r.id}
              rank={r.rank}
              name={r.name}
              handle={r.handle}
              score={r.score}
              trend={r.trend as 'up' | 'down' | 'flat'}
              isLast={idx === rows.length - 1}
            />
          ))}
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
  size: 'small' | 'large';
}) {
  const themed = useLeaderboardTheme();
  const isWinner = props.place === 1;
  const avatarSize = props.size === 'large' ? 56 : 44;
  const cardPad = props.size === 'large' ? 14 : 12;

  return (
    <View style={[styles.podiumSpot, { backgroundColor: themed.podiumBg, borderColor: themed.cardBorder }, isWinner && styles.podiumSpotWinner]}>
      <View style={[styles.podiumBadge, { backgroundColor: props.accent }]}>
        <Text style={styles.podiumBadgeText}>{props.place}</Text>
      </View>

      <View
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: themed.avatarBg, borderColor: themed.cardBorder },
        ]}
      >
        <Text style={[styles.avatarText, { color: themed.avatarText }]}>{getInitials(props.name)}</Text>
      </View>

      <View style={[styles.podiumInfo, { paddingHorizontal: cardPad }]}>
        <View style={styles.podiumNameRow}>
          {isWinner ? <Ionicons name="ribbon" size={14} color="#fbbf24" /> : null}
          <Text style={[styles.podiumName, { color: themed.text }]} numberOfLines={1}>
            {props.name}
          </Text>
        </View>
        <Text style={[styles.podiumHandle, { color: themed.mutedText }]} numberOfLines={1}>
          {props.handle}
        </Text>
        <View style={styles.podiumScoreRow}>
          <Ionicons
            name={props.scoreLabel === 'Coins' ? 'cash-outline' : 'diamond-outline'}
            size={14}
            color={themed.text}
          />
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
  isLast: boolean;
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
        <View style={[styles.avatarSmall, { backgroundColor: themed.avatarBg, borderColor: themed.cardBorder }]}>
          <Text style={[styles.avatarSmallText, { color: themed.avatarText }]}>{getInitials(props.name)}</Text>
        </View>
        <View style={styles.userText}>
          <Text style={[styles.userName, { color: themed.text }]} numberOfLines={1}>
            {props.name}
          </Text>
          <Text style={[styles.userHandle, { color: themed.mutedText }]} numberOfLines={1}>
            {props.handle}
          </Text>
        </View>
      </View>

      <View style={[styles.scoreCell, styles.colScore]}>
        <Ionicons name={trendIcon as any} size={14} color={trendColor} />
        <Text style={[styles.scoreText, { color: themed.text }]}>{props.score}</Text>
      </View>
    </View>
  );
}

function getInitials(name: string) {
  const cleaned = (name || '').trim();
  if (!cleaned) return '—';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : '') ?? '';
  return (first + last).toUpperCase() || '—';
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
  },
  podiumNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    maxWidth: 110,
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
});
