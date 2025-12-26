import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchAuthed } from '../lib/api';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Tx = {
  id: string;
  type: 'coin_purchase' | 'gift_sent' | 'gift_received' | 'conversion' | 'cashout';
  asset: 'coin' | 'diamond' | 'usd';
  amount: number;
  direction: 'in' | 'out';
  description: string;
  created_at: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>;

export function TransactionsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuthed('/api/transactions?limit=50&offset=0', { method: 'GET' });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(body?.error || `Failed to load transactions (${res.status})`);
      }
      setTransactions(Array.isArray(body?.transactions) ? (body.transactions as Tx[]) : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }, []);

  const emptyText = useMemo(() => {
    if (loading) return null;
    if (error) return null;
    return 'No transactions yet.';
  }, [error, loading]);

  return (
    <PageShell
      title="Gifts & Transactions"
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
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{emptyText}</Text>
          <Button title="Refresh" onPress={() => void load()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {transactions.map((tx) => {
            const sign = tx.direction === 'out' ? '-' : '+';
            const asset = tx.asset === 'coin' ? '🪙' : tx.asset === 'diamond' ? '💎' : '$';
            return (
              <View key={tx.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {formatDate(tx.created_at)}
                  </Text>
                </View>
                <Text style={styles.rowAmount}>
                  {sign}
                  {Number(tx.amount || 0).toLocaleString()} {asset}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </PageShell>
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
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rowSubtitle: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  rowAmount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
