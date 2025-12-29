/**
 * ReferralLeaderboardPreview Component - Mobile
 * 
 * WEB PARITY: components/ReferralLeaderboardPreview.tsx
 * Shows top 5 referrers with optional current user position
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeDefinition } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';

type LeaderboardEntry = {
  rank: number;
  profileId?: string;
  username: string;
  avatarUrl?: string;
  referralCount: number;
  activeCount?: number;
  isCurrentUser?: boolean;
};

const formatReferralCount = (count: number) => count.toLocaleString();

interface ReferralLeaderboardPreviewProps {
  showCurrentUser?: boolean;
  onViewFull?: () => void;
  onPressEntry?: (entry: { profileId: string; username: string }) => void;
  theme: ThemeDefinition;
}

export function ReferralLeaderboardPreview({
  showCurrentUser = false,
  onViewFull,
  onPressEntry,
  theme,
}: ReferralLeaderboardPreviewProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { session } = useAuthContext();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = useMemo(() => {
    const raw = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
    return raw.replace(/\/+$/, '');
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const userId = session?.user?.id ?? null;
        const limit = showCurrentUser ? 100 : 5;
        const res = await fetch(`${apiBaseUrl}/api/referrals/leaderboard?range=all&limit=${limit}`);
        const json = await res.json().catch(() => null);
        const rows = res.ok && Array.isArray((json as any)?.items) ? (json as any).items : [];

        const top: LeaderboardEntry[] = rows.slice(0, 5).map((r: any) => ({
          rank: Number(r?.rank ?? 0),
          profileId: r?.profile_id ? String(r.profile_id) : undefined,
          username: String(r?.username ?? 'Unknown'),
          avatarUrl: r?.avatar_url ? String(r.avatar_url) : undefined,
          referralCount: Number(r?.joined ?? 0),
          activeCount: Number(r?.active ?? 0),
          isCurrentUser: userId ? String(r?.profile_id ?? '') === String(userId) : false,
        }));

        let me: LeaderboardEntry | null = null;
        if (showCurrentUser && userId) {
          const found = rows.find((r: any) => String(r?.profile_id ?? '') === String(userId));
          if (found && Number(found?.rank ?? 0) > 5) {
            me = {
              rank: Number(found?.rank ?? 0),
              profileId: found?.profile_id ? String(found.profile_id) : undefined,
              username: String(found?.username ?? 'You'),
              avatarUrl: found?.avatar_url ? String(found.avatar_url) : undefined,
              referralCount: Number(found?.joined ?? 0),
              activeCount: Number(found?.active ?? 0),
              isCurrentUser: true,
            };
          }
        }

        if (mounted) {
          setEntries(top);
          setCurrentUserEntry(me);
        }
      } catch (err) {
        console.warn('[referrals] Failed to load leaderboard (non-blocking):', err);
        if (mounted) {
          setEntries([]);
          setCurrentUserEntry(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [apiBaseUrl, session?.user?.id, showCurrentUser]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return '#EAB308'; // yellow
      case 2:
        return '#9CA3AF'; // gray
      case 3:
        return '#FB923C'; // orange
      default:
        return theme.mode === 'dark' ? '#6B7280' : '#9CA3AF';
    }
  };

  const getRankIcon = (rank: number): { name: string; color: string } | null => {
    switch (rank) {
      case 1:
        return { name: 'trophy', color: '#EAB308' };
      case 2:
        return { name: 'medal', color: '#9CA3AF' };
      case 3:
        return { name: 'ribbon', color: '#FB923C' };
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="trophy" size={24} color="#EAB308" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Top Referrers</Text>
          <Text style={styles.subtitle}>This month's leading members</Text>
        </View>
      </View>

      {/* Leaderboard List */}
      <View style={styles.list}>
        {entries.map((entry) => {
          const isCurrentUser = entry.isCurrentUser;
          const canPress = !!onPressEntry && !!entry.profileId && !!entry.username;
          return (
            <Pressable
              key={`${entry.rank}-${entry.username}`}
              style={({ pressed }) => [
                styles.entryCard,
                isCurrentUser && styles.entryCardHighlighted,
                pressed && canPress ? styles.entryCardPressed : null,
              ]}
              disabled={!canPress}
              onPress={() => {
                if (!canPress) return;
                onPressEntry?.({ profileId: String(entry.profileId), username: String(entry.username) });
              }}
            >
              {/* Rank */}
              <View style={styles.rankContainer}>
                {getRankIcon(entry.rank) ? (
                  <Ionicons 
                    name={getRankIcon(entry.rank)!.name as any} 
                    size={20} 
                    color={getRankIcon(entry.rank)!.color} 
                  />
                ) : (
                  <Text
                    style={[
                      styles.rankText,
                      { color: getRankColor(entry.rank) },
                    ]}
                  >
                    #{entry.rank}
                  </Text>
                )}
              </View>

              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <Image
                  source={getAvatarSource(entry.avatarUrl)}
                  style={[
                    styles.avatar,
                    isCurrentUser && styles.avatarHighlighted,
                  ]}
                />
              </View>

              {/* Username and Referrals */}
              <View style={styles.userInfo}>
                <View style={styles.usernameRow}>
                  <Text
                    style={styles.username}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {entry.username}
                  </Text>
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.referralsSubtext}>
                  {formatReferralCount(entry.referralCount)} referrals
                </Text>
              </View>

              {/* Referral Count Badge */}
              <View style={styles.countBadge}>
                <Text
                  style={[
                    styles.countText,
                    { color: getRankColor(entry.rank) },
                  ]}
                >
                  {formatReferralCount(entry.referralCount)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {showCurrentUser && currentUserEntry ? (
          <>
            <View style={styles.gap}>
              <Text style={styles.gapText}>...</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.entryCard,
                styles.entryCardHighlighted,
                pressed && currentUserEntry.profileId && onPressEntry ? styles.entryCardPressed : null,
              ]}
              disabled={!onPressEntry || !currentUserEntry.profileId || !currentUserEntry.username}
              onPress={() => {
                if (!onPressEntry || !currentUserEntry.profileId || !currentUserEntry.username) return;
                onPressEntry({ profileId: String(currentUserEntry.profileId), username: String(currentUserEntry.username) });
              }}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>#{currentUserEntry.rank}</Text>
              </View>
              <View style={styles.avatarContainer}>
                <Image source={getAvatarSource(currentUserEntry.avatarUrl)} style={[styles.avatar, styles.avatarHighlighted]} />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.usernameRow}>
                  <Text style={styles.username} numberOfLines={1}>
                    {currentUserEntry.username}
                  </Text>
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                </View>
                <Text style={styles.referralsSubtext}>
                  {formatReferralCount(currentUserEntry.referralCount)} referrals
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{formatReferralCount(currentUserEntry.referralCount)}</Text>
              </View>
            </Pressable>
          </>
        ) : null}
      </View>

      {/* View Full CTA */}
      {onViewFull && (
        <View style={styles.ctaContainer}>
          <Pressable style={styles.ctaButton} onPress={onViewFull}>
            {({ pressed }) => (
              <View style={[styles.ctaButtonContent, pressed && styles.ctaButtonPressed]}>
                <Text style={styles.ctaButtonText}>
                  View Full Leaderboard
                </Text>
                <Text style={styles.ctaButtonArrow}>→</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Encouragement Note */}
      <View style={styles.encouragement}>
        <Text style={styles.encouragementText}>
          💡 <Text style={styles.encouragementBold}>Pro tip:</Text> Quality 
          referrals lead to lasting engagement!
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: ThemeDefinition) {
  const isDark = theme.mode === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingBottom: 12,
    },
    headerIconContainer: {
      width: 48,
      height: 48,
      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerIcon: {
      fontSize: 24,
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    list: {
      padding: 8,
    },
    entryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
    entryCardHighlighted: {
      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
      borderColor: isDark ? '#9333EA' : '#A855F7',
      borderWidth: 2,
    },
    entryCardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    rankContainer: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankIconText: {
      fontSize: 20,
    },
    rankText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    avatarContainer: {
      marginRight: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
    },
    avatarHighlighted: {
      borderColor: '#A855F7',
      borderWidth: 2,
    },
    userInfo: {
      flex: 1,
      marginRight: 8,
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    username: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginRight: 6,
      flex: 1,
    },
    youBadge: {
      backgroundColor: '#A855F7',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    youBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    referralsSubtext: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    countBadge: {
      alignItems: 'flex-end',
    },
    countText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    gap: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    gapText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    ctaContainer: {
      padding: 16,
      paddingTop: 8,
    },
    ctaButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    ctaButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    ctaButtonPressed: {
      opacity: 0.7,
    },
    ctaButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
    },
    ctaButtonArrow: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    encouragement: {
      margin: 16,
      marginTop: 0,
      padding: 12,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
    },
    encouragementText: {
      fontSize: 12,
      color: isDark ? '#BFDBFE' : '#1E40AF',
      lineHeight: 18,
      textAlign: 'center',
    },
    encouragementBold: {
      fontWeight: '700',
    },
  });
}



