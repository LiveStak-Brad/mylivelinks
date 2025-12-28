/**
 * ReferralProgress Component - Mobile
 * 
 * WEB PARITY: components/ReferralProgress.tsx
 * Shows user's referral metrics and progress
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  getMockReferralStats,
  getReferralEncouragementMessage,
  type ReferralStats,
} from '../../lib/referralMockData';
import { ThemeDefinition } from '../contexts/ThemeContext';

interface ReferralProgressProps {
  onViewLeaderboard?: () => void;
  theme: ThemeDefinition;
}

export function ReferralProgress({
  onViewLeaderboard,
  theme,
}: ReferralProgressProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading mock data
    const timer = setTimeout(() => {
      setStats(getMockReferralStats());
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!stats) return null;

  const encouragementMessage = getReferralEncouragementMessage(stats);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Your Referrals</Text>
          <Text style={styles.subtitle}>{encouragementMessage}</Text>
        </View>
        
        {/* Current Rank Badge */}
        {stats.currentRank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankLabel}>YOUR RANK</Text>
            <Text style={styles.rankNumber}>#{stats.currentRank}</Text>
            <Text style={styles.rankTotal}>of {stats.totalReferrers}</Text>
          </View>
        )}
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Invites Sent */}
        <View style={[styles.metricCard, styles.metricCardBlue]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>✉️</Text>
            <Text style={[styles.metricLabel, styles.metricLabelBlue]}>
              INVITES SENT
            </Text>
          </View>
          <Text style={[styles.metricValue, styles.metricValueBlue]}>
            {stats.invitesSent}
          </Text>
          <Text style={[styles.metricSubtext, styles.metricSubtextBlue]}>
            {stats.inviteClicks} clicks
          </Text>
        </View>

        {/* Users Joined */}
        <View style={[styles.metricCard, styles.metricCardGreen]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>👥</Text>
            <Text style={[styles.metricLabel, styles.metricLabelGreen]}>
              USERS JOINED
            </Text>
          </View>
          <Text style={[styles.metricValue, styles.metricValueGreen]}>
            {stats.usersJoined}
          </Text>
          <Text style={[styles.metricSubtext, styles.metricSubtextGreen]}>
            {stats.inviteClicks > 0
              ? `${((stats.usersJoined / stats.inviteClicks) * 100).toFixed(1)}% conversion`
              : 'No clicks yet'}
          </Text>
        </View>

        {/* Active Users */}
        <View style={[styles.metricCard, styles.metricCardPurple]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>🎯</Text>
            <Text style={[styles.metricLabel, styles.metricLabelPurple]}>
              ACTIVE USERS
            </Text>
          </View>
          <Text style={[styles.metricValue, styles.metricValuePurple]}>
            {stats.activeUsers}
          </Text>
          <Text style={[styles.metricSubtext, styles.metricSubtextPurple]}>
            {stats.usersJoined > 0
              ? `${((stats.activeUsers / stats.usersJoined) * 100).toFixed(0)}% active rate`
              : 'No users yet'}
          </Text>
        </View>

        {/* Progress Score */}
        <View style={[styles.metricCard, styles.metricCardOrange]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>📈</Text>
            <Text style={[styles.metricLabel, styles.metricLabelOrange]}>
              TOTAL SCORE
            </Text>
          </View>
          <Text style={[styles.metricValue, styles.metricValueOrange]}>
            {stats.invitesSent + stats.usersJoined * 5 + stats.activeUsers * 10}
          </Text>
          <Text style={[styles.metricSubtext, styles.metricSubtextOrange]}>
            Combined metric
          </Text>
        </View>
      </View>

      {/* CTA Buttons */}
      <View style={styles.ctaContainer}>
        <Pressable style={styles.primaryButton}>
          {({ pressed }) => (
            <View style={[styles.buttonContent, pressed && styles.buttonPressed]}>
              <Text style={styles.primaryButtonText}>
                📤 Share Your Referral Link
              </Text>
            </View>
          )}
        </Pressable>
        
        {onViewLeaderboard && (
          <Pressable
            style={styles.secondaryButton}
            onPress={onViewLeaderboard}
          >
            {({ pressed }) => (
              <View style={[styles.buttonContent, pressed && styles.buttonPressed]}>
                <Text style={styles.secondaryButtonText}>
                  View Full Leaderboard
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={styles.disclaimerBold}>Note:</Text> Rankings and stats are for 
          engagement purposes only. No guaranteed rewards. Quality referrals matter more 
          than quantity.
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
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 16,
      paddingBottom: 8,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    rankBadge: {
      backgroundColor: '#8B5CF6',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      marginLeft: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    rankLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      letterSpacing: 0.5,
    },
    rankNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginVertical: 2,
    },
    rankTotal: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
    },
    metricCard: {
      width: '48%',
      margin: '1%',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    metricCardBlue: {
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
    },
    metricCardGreen: {
      backgroundColor: theme.isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4',
      borderColor: theme.isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
    },
    metricCardPurple: {
      backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
      borderColor: theme.isDark ? 'rgba(168, 85, 247, 0.3)' : '#E9D5FF',
    },
    metricCardOrange: {
      backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
      borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA',
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    metricIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    metricLabelBlue: {
      color: theme.isDark ? '#93C5FD' : '#1E40AF',
    },
    metricLabelGreen: {
      color: theme.isDark ? '#86EFAC' : '#15803D',
    },
    metricLabelPurple: {
      color: theme.isDark ? '#D8B4FE' : '#7C3AED',
    },
    metricLabelOrange: {
      color: theme.isDark ? '#FED7AA' : '#C2410C',
    },
    metricValue: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    metricValueBlue: {
      color: theme.isDark ? '#DBEAFE' : '#1E3A8A',
    },
    metricValueGreen: {
      color: theme.isDark ? '#DCFCE7' : '#14532D',
    },
    metricValuePurple: {
      color: theme.isDark ? '#F3E8FF' : '#581C87',
    },
    metricValueOrange: {
      color: theme.isDark ? '#FFEDD5' : '#7C2D12',
    },
    metricSubtext: {
      fontSize: 11,
      marginTop: 2,
    },
    metricSubtextBlue: {
      color: theme.isDark ? '#93C5FD' : '#2563EB',
    },
    metricSubtextGreen: {
      color: theme.isDark ? '#86EFAC' : '#16A34A',
    },
    metricSubtextPurple: {
      color: theme.isDark ? '#D8B4FE' : '#9333EA',
    },
    metricSubtextOrange: {
      color: theme.isDark ? '#FED7AA' : '#EA580C',
    },
    ctaContainer: {
      padding: 16,
      gap: 12,
    },
    primaryButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    secondaryButton: {
      backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.isDark ? '#6B7280' : '#D1D5DB',
    },
    buttonContent: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    disclaimer: {
      margin: 16,
      marginTop: 8,
      padding: 12,
      backgroundColor: theme.isDark ? 'rgba(250, 204, 21, 0.15)' : '#FEF3C7',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(250, 204, 21, 0.3)' : '#FDE68A',
    },
    disclaimerText: {
      fontSize: 12,
      color: theme.isDark ? '#FEF08A' : '#854D0E',
      lineHeight: 18,
    },
    disclaimerBold: {
      fontWeight: '700',
    },
  });
}

