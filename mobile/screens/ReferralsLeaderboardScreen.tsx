import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageHeader, PageShell } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ReferralsLeaderboard'>;

type Range = '7d' | '30d' | 'all';
type ApiItem = {
  profile_id: string;
  username: string;
  avatar_url: string | null;
  joined: number;
  active: number;
  rank: number;
};

export function ReferralsLeaderboardScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const apiBaseUrl = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_API_URL || 'https://mylivelinks.com';
    return raw.replace(/\/+$/, '');
  }, []);

  const [range, setRange] = useState<Range>('7d');
  const [items, setItems] = useState<ApiItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigateToProfile = useCallback(
    (username: string) => {
      const uname = String(username || '').trim();
      if (!uname) return;
      navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Profile', params: { username: uname } });
    },
    [navigation]
  );

  const fetchPage = useCallback(
    async (opts: { cursor?: string | null; mode: 'replace' | 'append' }) => {
      const cursorParam = opts.cursor ? `&cursor=${encodeURIComponent(opts.cursor)}` : '';
      const url = `${apiBaseUrl}/api/referrals/leaderboard?range=${encodeURIComponent(range)}&limit=25${cursorParam}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      const rows = res.ok && Array.isArray((json as any)?.items) ? ((json as any).items as any[]) : [];
      const mapped: ApiItem[] = rows.map((r: any) => ({
        profile_id: String(r?.profile_id ?? ''),
        username: String(r?.username ?? ''),
        avatar_url: r?.avatar_url ? String(r.avatar_url) : null,
        joined: Number(r?.joined ?? 0),
        active: Number(r?.active ?? 0),
        rank: Number(r?.rank ?? 0),
      }));

      const nc = typeof (json as any)?.next_cursor === 'string' ? String((json as any).next_cursor) : null;
      setNextCursor(nc);
      setItems((prev) => (opts.mode === 'replace' ? mapped : [...prev, ...mapped]));
    },
    [apiBaseUrl, range]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        await fetchPage({ mode: 'replace', cursor: null });
      } catch (err) {
        console.warn('[referrals] Failed to load leaderboard:', err);
        if (mounted) {
          setItems([]);
          setNextCursor(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPage({ mode: 'replace', cursor: null });
    } catch (err) {
      console.warn('[referrals] refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const onLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage({ mode: 'append', cursor: nextCursor });
    } catch (err) {
      console.warn('[referrals] loadMore failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, nextCursor]);

  const RangeTabs = (
    <View style={styles.tabs}>
      {(['7d', '30d', 'all'] as Range[]).map((r) => {
        const active = range === r;
        return (
          <Pressable
            key={r}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : null,
              pressed ? styles.tabPressed : null,
            ]}
            onPress={() => {
              setRange(r);
              // fetchPage will re-run via useEffect dependency because range is used inside fetchPage
            }}
          >
            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
              {r === 'all' ? 'All' : r.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      onNavigateHome={() => navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Home' })}
      onNavigateToProfile={navigateToProfile}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      <PageHeader icon="award" iconColor="#f59e0b" title="Referral Leaderboard" />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading leaderboard…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.rank}-${item.profile_id}`}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={onLoadMore}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>Leaderboard</Text>
                <Text style={styles.noteText}>
                  Sorted by active referrals, then total joined. Tap a row to open the profile.
                </Text>
                <Text style={styles.noteTextMuted}>
                  Ranges: 7d uses joined/activated counts in the last 7 days; 30d uses last 30 days; All is all-time.
                </Text>
              </View>
              {RangeTabs}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
              onPress={() => navigateToProfile(item.username)}
              disabled={!item.username}
            >
              <View style={styles.rankCol}>
                <Text style={styles.rankText}>#{item.rank}</Text>
              </View>
              <View style={styles.userCol}>
                <Text style={styles.username} numberOfLines={1}>
                  {item.username || 'Unknown'}
                </Text>
                <Text style={styles.subText} numberOfLines={1}>
                  Joined: {item.joined} • Active: {item.active}
                </Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={styles.footerText}>Loading more…</Text>
              </View>
            ) : !nextCursor ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>End of leaderboard</Text>
              </View>
            ) : (
              <View style={styles.footer} />
            )
          }
        />
      )}
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
      gap: 12,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 24,
      gap: 10,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    headerBlock: {
      gap: 12,
    },
    section: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    noteCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: Math.max(2, cardShadow.elevation - 1),
    },
    noteTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 6,
    },
    noteText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    noteTextMuted: {
      color: theme.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      flex: 1,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.mode === 'dark' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.12)',
    },
    tabPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    tabTextActive: {
      color: theme.colors.accent,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: Math.max(1, cardShadow.elevation - 2),
    },
    rowPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    rankCol: {
      width: 54,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    rankText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    userCol: {
      flex: 1,
      gap: 3,
    },
    username: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    subText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    footer: {
      paddingTop: 12,
      paddingBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 24,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}


