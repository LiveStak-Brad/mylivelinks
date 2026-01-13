import React from 'react';
import { View, Text, StyleSheet, Pressable, Share, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ReferralStats } from '../../types/profile';
import { supabase } from '../../lib/supabase';

interface ReferralNetworkSectionProps {
  profileId: string;
  colors: any;
}

export default function ReferralNetworkSection({
  profileId,
  colors,
}: ReferralNetworkSectionProps) {
  const [stats, setStats] = React.useState<ReferralStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadReferralStats();
  }, [profileId]);

  const loadReferralStats = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('claimed_at')
        .eq('referrer_profile_id', profileId);

      if (referralsError) throw referralsError;

      // All referrals in this table are already claimed/converted
      const totalReferrals = referrals?.length || 0;
      const activeConversions = totalReferrals;
      const pendingConversions = 0;

      setStats({
        total_referrals: totalReferrals,
        active_conversions: activeConversions,
        pending_conversions: pendingConversions,
        referral_code: profile.username,
        referral_url: `https://www.mylivelinks.com/join?ref=${profile.username}`,
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!stats) return;
    try {
      await Share.share({
        message: `Join me on MyLiveLinks! ${stats.referral_url}`,
        url: stats.referral_url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  // Show meaningful progress: clicks vs conversions
  const progressPercent = stats.total_referrals > 0 ? 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="users" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Referral Network</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {stats.total_referrals}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            Conversions
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.pending_conversions}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            Pending
          </Text>
        </View>
      </View>

      {stats.total_referrals > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedText }]}>
            {stats.total_referrals} successful referral{stats.total_referrals !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <Pressable onPress={handleShare} style={[styles.shareButton, { backgroundColor: colors.primary }]}>
        <Feather name="share-2" size={16} color="#fff" />
        <Text style={styles.shareButtonText}>Share Link</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
