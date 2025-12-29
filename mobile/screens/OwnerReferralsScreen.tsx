import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerReferrals'>;

type ReferralOverviewData = {
  totals: {
    clicks: number;
    signups: number;
    activations: number;
    activation_rate: number;
  };
  leaderboard: Array<{
    rank: number;
    profile_id: string;
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    clicks: number;
    signups: number;
    activations: number;
  }>;
  recent_activity: Array<{
    id: string | number;
    type: 'click' | 'signup' | 'activation';
    referrer_username: string;
    referrer_avatar_url: string | null;
    referred_username: string | null;
    referred_avatar_url: string | null;
    created_at: string;
    event_type: string;
  }>;
};

export function OwnerReferralsScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReferralOverviewData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/referrals/overview', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load referrals data (${res.status})`);
      }
      setData((res.data || null) as ReferralOverviewData | null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load referrals data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals ?? { clicks: 0, signups: 0, activations: 0, activation_rate: 0 };
  const leaderboard = data?.leaderboard ?? [];
  const recentActivity = data?.recent_activity ?? [];

  return (
    <PageShell
      title="Global Referrals"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading referrals data…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
        >
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <KPICard
              theme={theme}
              label="Total Clicks"
              value={totals.clicks.toLocaleString()}
              iconName="users"
              iconColor="#3b82f6"
            />
            <KPICard
              theme={theme}
              label="Total Signups"
              value={totals.signups.toLocaleString()}
              iconName="user-plus"
              iconColor="#8b5cf6"
            />
            <KPICard
              theme={theme}
              label="Activated"
              value={totals.activations.toLocaleString()}
              iconName="user-check"
              iconColor="#10b981"
            />
            <KPICard
              theme={theme}
              label="Activation Rate"
              value={`${totals.activation_rate.toFixed(1)}%`}
              iconName="trending-up"
              iconColor="#f59e0b"
            />
          </View>

          {/* Top Referrers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="award" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Top Referrers</Text>
            </View>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No referral data yet</Text>
              </View>
            ) : (
              <View style={styles.leaderboardContainer}>
                {leaderboard.slice(0, 10).map((user) => (
                  <LeaderboardRow key={user.profile_id} user={user} theme={theme} />
                ))}
              </View>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="activity" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="activity" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            ) : (
              <View style={styles.activityContainer}>
                {recentActivity.slice(0, 20).map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} theme={theme} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </PageShell>
  );
}

function KPICard({
  theme,
  label,
  value,
  iconName,
  iconColor,
}: {
  theme: ThemeDefinition;
  label: string;
  value: string;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconCircle, { backgroundColor: iconColor + '20' }]}>
        <Feather name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function LeaderboardRow({
  user,
  theme,
}: {
  user: ReferralOverviewData['leaderboard'][0];
  theme: ThemeDefinition;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getRankColor = () => {
    if (user.rank === 1) return '#fbbf24';
    if (user.rank === 2) return '#d1d5db';
    if (user.rank === 3) return '#fb923c';
    return theme.colors.textMuted;
  };

  return (
    <View style={styles.leaderboardRow}>
      <Text style={[styles.rank, { color: getRankColor() }]}>#{user.rank}</Text>
      <Image
        source={{ uri: user.avatar_url || '/no-profile-pic.png' }}
        style={styles.avatar}
      />
      <View style={styles.leaderboardInfo}>
        <Text style={styles.username} numberOfLines={1}>
          {user.display_name || user.username}
        </Text>
        {user.display_name && (
          <Text style={styles.handle} numberOfLines={1}>
            @{user.username}
          </Text>
        )}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.clicks}</Text>
          <Text style={styles.statLabel}>Clicks</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.signups}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{user.activations}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>
    </View>
  );
}

function ActivityRow({
  activity,
  theme,
}: {
  activity: ReferralOverviewData['recent_activity'][0];
  theme: ThemeDefinition;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getActivityIcon = (): [keyof typeof Feather.glyphMap, string] => {
    switch (activity.type) {
      case 'click':
        return ['users', '#3b82f6'];
      case 'signup':
        return ['user-plus', '#8b5cf6'];
      case 'activation':
        return ['user-check', '#10b981'];
      default:
        return ['activity', theme.colors.textMuted];
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'click':
        return `${activity.referrer_username} received a click`;
      case 'signup':
        return `${activity.referred_username || 'Someone'} joined via ${activity.referrer_username}`;
      case 'activation':
        return `${activity.referred_username || 'Someone'} activated (${activity.referrer_username})`;
      default:
        return 'Unknown activity';
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const [iconName, iconColor] = getActivityIcon();

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: iconColor + '20' }]}>
        <Feather name={iconName} size={16} color={iconColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={2}>
          {getActivityText()}
        </Text>
        <Text style={styles.activityTime}>{timeAgo(activity.created_at)}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    mutedText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    scroll: {
      paddingBottom: 24,
      gap: 16,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    kpiCard: {
      flex: 1,
      minWidth: '45%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    kpiIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    kpiLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
      textAlign: 'center',
    },
    kpiValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    section: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    leaderboardContainer: {
      padding: 12,
      gap: 8,
    },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    rank: {
      fontSize: 14,
      fontWeight: '900',
      width: 30,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.border,
    },
    leaderboardInfo: {
      flex: 1,
      minWidth: 0,
    },
    username: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    handle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    stats: {
      flexDirection: 'row',
      gap: 12,
    },
    stat: {
      alignItems: 'center',
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    activityContainer: {
      padding: 12,
      gap: 8,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activityIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityContent: {
      flex: 1,
      gap: 4,
    },
    activityText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    activityTime: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
  });
}

