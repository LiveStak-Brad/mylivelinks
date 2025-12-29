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

function StatCard({ label, value, iconName, iconColor }: { label: string; value: number; iconName: string; iconColor: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.cardValue}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mutedText: {
    color: '#bdbdbd',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '800',
  },
  cardValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});
