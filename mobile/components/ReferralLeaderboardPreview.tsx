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
import {
  getMockReferralLeaderboard,
  formatReferralCount,
  type LeaderboardEntry,
} from '../../lib/referralMockData';
import { ThemeDefinition } from '../contexts/ThemeContext';

interface ReferralLeaderboardPreviewProps {
  showCurrentUser?: boolean;
  onViewFull?: () => void;
  theme: ThemeDefinition;
}

export function ReferralLeaderboardPreview({
  showCurrentUser = false,
  onViewFull,
  theme,
}: ReferralLeaderboardPreviewProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading mock data
    const timer = setTimeout(() => {
      setEntries(getMockReferralLeaderboard(showCurrentUser));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [showCurrentUser]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
        return theme.isDark ? '#6B7280' : '#9CA3AF';
    }
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>🏆</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Top Referrers</Text>
          <Text style={styles.subtitle}>This month's leading members</Text>
        </View>
      </View>

      {/* Leaderboard List */}
      <View style={styles.list}>
        {entries.map((entry, index) => {
          const isCurrentUser = entry.isCurrentUser;
          const isGap = showCurrentUser && index === 5;

          if (isGap) {
            return (
              <View key="gap" style={styles.gap}>
                <Text style={styles.gapText}>...</Text>
              </View>
            );
          }

          return (
            <View
              key={`${entry.rank}-${entry.username}`}
              style={[
                styles.entryCard,
                isCurrentUser && styles.entryCardHighlighted,
              ]}
            >
              {/* Rank */}
              <View style={styles.rankContainer}>
                {getRankIcon(entry.rank) ? (
                  <Text style={styles.rankIconText}>
                    {getRankIcon(entry.rank)}
                  </Text>
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
              {entry.avatarUrl && (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: entry.avatarUrl }}
                    style={[
                      styles.avatar,
                      isCurrentUser && styles.avatarHighlighted,
                    ]}
                  />
                </View>
              )}

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
            </View>
          );
        })}
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
      backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
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
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.isDark ? '#374151' : '#E5E7EB',
    },
    entryCardHighlighted: {
      backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
      borderColor: theme.isDark ? '#9333EA' : '#A855F7',
      borderWidth: 2,
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
      borderColor: theme.isDark ? '#4B5563' : '#D1D5DB',
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
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
    },
    encouragementText: {
      fontSize: 12,
      color: theme.isDark ? '#BFDBFE' : '#1E40AF',
      lineHeight: 18,
      textAlign: 'center',
    },
    encouragementBold: {
      fontWeight: '700',
    },
  });
}

