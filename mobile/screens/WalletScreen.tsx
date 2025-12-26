import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAuthed } from '../lib/api';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type WalletResponse = {
  coin_balance: number;
  diamond_balance: number;
  diamond_usd: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export function WalletScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetchAuthed('/api/wallet', { method: 'GET' });
      const data = (await resp.json().catch(() => ({}))) as any;

      if (!resp.ok) {
        throw new Error(data?.error || `Failed to load wallet (${resp.status})`);
      }

      setWallet({
        coin_balance: Number(data?.coin_balance ?? 0),
        diamond_balance: Number(data?.diamond_balance ?? 0),
        diamond_usd: Number(data?.diamond_usd ?? 0),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallet');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell
      title="Wallet"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5E9BFF" />
          <Text style={styles.mutedText}>Loading wallet…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : !wallet ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No wallet data.</Text>
          <Button title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Coins</Text>
            <Text style={styles.cardValue}>🪙 {wallet.coin_balance}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Diamonds</Text>
            <Text style={styles.cardValue}>💎 {wallet.diamond_balance}</Text>
            <Text style={styles.cardSubValue}>${wallet.diamond_usd.toFixed(2)} USD</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coming Soon</Text>
            <Button title="Purchase Coins (Coming Soon)" variant="secondary" onPress={() => {}} disabled />
            <Button title="Cash Out Diamonds (Coming Soon)" variant="secondary" onPress={() => {}} disabled />
          </View>
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 16,
  },
  cardLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    marginBottom: 8,
  },
  cardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  cardSubValue: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 6,
  },
  section: {
    marginTop: 8,
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  disabledButtonText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  mutedText: {
    color: '#9aa0a6',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
});
