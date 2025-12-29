// Mobile Owner Panel Parity: Revenue + Feature Flags
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerPanel'>;

type OverviewResponse = {
  totals?: {
    users?: number;
    live_streams_active?: number;
    gifts_sent_24h?: number;
    pending_reports?: number;
  };
};

export function OwnerPanelScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/overview', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load overview (${res.status})`);
      }
      setData((res.data || null) as OverviewResponse | null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load owner overview');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals ?? {};

  return (
    <PageShell
      title="Owner Panel"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StatCard theme={theme} label="Total Users" value={Number(totals.users ?? 0)} iconName="users" iconColor="#8b5cf6" />
          <StatCard theme={theme} label="Active Streams" value={Number(totals.live_streams_active ?? 0)} iconName="video" iconColor="#3b82f6" />
          <StatCard theme={theme} label="Gifts Sent (24h)" value={Number(totals.gifts_sent_24h ?? 0)} iconName="gift" iconColor="#ec4899" />
          <StatCard theme={theme} label="Pending Reports" value={Number(totals.pending_reports ?? 0)} iconName="alert-circle" iconColor="#ef4444" />
          
          {/* Reports Section */}
          <View style={styles.actionCard}>
            <Feather name="alert-triangle" size={24} color="#ef4444" />
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Reports & Moderation</Text>
              <Text style={styles.actionCardText}>Review and manage user reports</Text>
            </View>
            <Button 
              title="View" 
              variant="primary" 
              onPress={() => navigation.navigate('OwnerReports')} 
              style={styles.actionButton}
            />
          </View>
          
          {/* Live Ops Section */}
          <View style={styles.actionCard}>
            <Feather name="activity" size={24} color="#ef4444" />
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Live Operations</Text>
              <Text style={styles.actionCardText}>Monitor and manage active live streams</Text>
            </View>
            <Button 
              title="View" 
              variant="primary" 
              onPress={() => navigation.navigate('LiveOps')} 
              style={styles.actionButton}
            />
          </View>
          
          {/* Referrals Section */}
          <View style={styles.actionCard}>
            <Feather name="link" size={24} color="#8b5cf6" />
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Global Referrals</Text>
              <Text style={styles.actionCardText}>View platform-wide referral analytics</Text>
            </View>
            <Button 
              title="View" 
              variant="primary" 
              onPress={() => navigation.navigate('OwnerReferrals')} 
              style={styles.actionButton}
            />
          </View>
          
          {/* Coins & Revenue Section */}
          <View style={styles.actionCard}>
            <Feather name="dollar-sign" size={24} color="#10b981" />
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Coins & Revenue</Text>
              <Text style={styles.actionCardText}>Manage economy and view revenue analytics</Text>
            </View>
            <Button 
              title="View" 
              variant="primary" 
              onPress={() => navigation.navigate('OwnerCoinsRevenue')} 
              style={styles.actionButton}
            />
          </View>
          
          {/* Feature Flags Section */}
          <View style={styles.actionCard}>
            <Feather name="toggle-right" size={24} color="#3b82f6" />
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Feature Flags</Text>
              <Text style={styles.actionCardText}>Control platform features and kill switches</Text>
            </View>
            <Button 
              title="View" 
              variant="primary" 
              onPress={() => navigation.navigate('OwnerFeatureFlags')} 
              style={styles.actionButton}
            />
          </View>
          
          {/* Placeholder for future sections */}
          <View style={styles.placeholderSection}>
            <Feather name="settings" size={32} color={theme.colors.textMuted} />
            <Text style={styles.placeholderText}>Additional admin tools coming soon</Text>
            <Text style={styles.placeholderSubtext}>User management, content moderation, and more</Text>
          </View>
        </ScrollView>
      )}
    </PageShell>
  );
}

function StatCard({ 
  theme, 
  label, 
  value, 
  iconName, 
  iconColor 
}: { 
  theme: ThemeDefinition;
  label: string; 
  value: number; 
  iconName: keyof typeof Feather.glyphMap; 
  iconColor: string;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
          <Feather name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardValue}>{value.toLocaleString()}</Text>
        </View>
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
      gap: 12,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 16,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
    },
    cardLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    cardValue: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    placeholderSection: {
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.cardAlt,
      gap: 10,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    placeholderSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 16,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    actionCardContent: {
      flex: 1,
      gap: 4,
    },
    actionCardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    actionCardText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    actionButton: {
      paddingHorizontal: 16,
      height: 36,
    },
  });
}
