import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ReferralStats } from '../../types/profile';

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

  // TODO: Fetch referral stats from API
  React.useEffect(() => {
    // Placeholder - will implement in Phase 2
    setLoading(false);
  }, [profileId]);

  if (loading || !stats) {
    return null;
  }

  const progressPercent = stats.total_referrals > 0 
    ? (stats.active_conversions / stats.total_referrals) * 100 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Feather name="users" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Referral Network</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.total_referrals}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            Total Referrals
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {stats.active_conversions}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>
            Active
          </Text>
        </View>
      </View>

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
          {progressPercent.toFixed(0)}% Active
        </Text>
      </View>

      <Pressable style={[styles.shareButton, { backgroundColor: colors.primary }]}>
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
