import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchAuthed } from '../lib/api';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/overview', { method: 'GET' });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(body?.error || `Failed to load overview (${res.status})`);
      }
      setData(body as OverviewResponse);
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
          <ActivityIndicator size="large" color="#5E9BFF" />
          <Text style={styles.mutedText}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <StatCard label="Total Users" value={Number(totals.users ?? 0)} icon="👥" />
          <StatCard label="Active Streams" value={Number(totals.live_streams_active ?? 0)} icon="📺" />
          <StatCard label="Gifts Sent (24h)" value={Number(totals.gifts_sent_24h ?? 0)} icon="🎁" />
          <StatCard label="Pending Reports" value={Number(totals.pending_reports ?? 0)} icon="🚨" />
        </ScrollView>
      )}
    </PageShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>
        {icon} {value.toLocaleString()}
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
  cardLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '800',
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
});
