import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchAuthed } from '../lib/api';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Analytics = {
  overview?: {
    coinsBalance?: number;
    diamondsBalance?: number;
    totalCoinsSpent?: number;
    totalGiftsReceived?: number;
    lifetimeDiamondsEarned?: number;
    totalGiftsSent?: number;
    followerCount?: number;
    followingCount?: number;
  };
  wallet?: {
    coinsBalance?: number;
    diamondsBalance?: number;
    diamondsUsd?: number;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyAnalytics'>;

export function MyAnalyticsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/user-analytics?range=30d', { method: 'GET' });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(body?.error || `Failed to load analytics (${res.status})`);
      }
      setData(body as Analytics);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = data?.overview ?? {};
  const wallet = data?.wallet ?? {};

  const kpis = useMemo(
    () => [
      { label: 'Coins', value: Number(wallet.coinsBalance ?? overview.coinsBalance ?? 0), icon: '🪙' },
      { label: 'Diamonds', value: Number(wallet.diamondsBalance ?? overview.diamondsBalance ?? 0), icon: '💎' },
      { label: 'Followers', value: Number(overview.followerCount ?? 0), icon: '👥' },
      { label: 'Following', value: Number(overview.followingCount ?? 0), icon: '➡️' },
    ],
    [overview.coinsBalance, overview.diamondsBalance, overview.followerCount, overview.followingCount, wallet.coinsBalance, wallet.diamondsBalance]
  );

  return (
    <PageShell
      title="Analytics"
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
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No analytics data.</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {kpis.map((k) => (
              <View key={k.label} style={styles.card}>
                <Text style={styles.cardLabel}>{k.label}</Text>
                <Text style={styles.cardValue}>
                  {k.icon} {k.value.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <MetricRow label="Total Coins Spent" value={Number(overview.totalCoinsSpent ?? 0)} icon="🧾" />
            <MetricRow label="Total Gifts Sent" value={Number(overview.totalGiftsSent ?? 0)} icon="🎁" />
            <MetricRow label="Total Gifts Received" value={Number(overview.totalGiftsReceived ?? 0)} icon="📥" />
            <MetricRow label="Lifetime Diamonds Earned" value={Number(overview.lifetimeDiamondsEarned ?? 0)} icon="💠" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet</Text>
            <MetricRow label="Diamonds (USD)" value={Number(wallet.diamondsUsd ?? 0)} icon="$" isMoney />
          </View>
        </ScrollView>
      )}
    </PageShell>
  );
}

function MetricRow({ label, value, icon, isMoney = false }: { label: string; value: number; icon: string; isMoney?: boolean }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {icon} {label}
      </Text>
      <Text style={styles.metricValue}>{isMoney ? `$${value.toFixed(2)}` : value.toLocaleString()}</Text>
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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
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
  section: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: {
    flex: 1,
    color: '#bdbdbd',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
