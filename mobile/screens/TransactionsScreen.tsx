import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

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
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuthed('/api/transactions?limit=50&offset=0', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load transactions (${res.status})`);
      }
      setTransactions(Array.isArray(res.data?.transactions) ? (res.data.transactions as Tx[]) : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthed]);

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
    if (loading || error) return null;
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
          <ActivityIndicator size="large" color={theme.colors.accent} />
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

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      padding: 12,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    rowLeft: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    rowSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    rowAmount: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
    },
  });
}

