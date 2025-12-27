import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminGifts'>;

type GiftRow = {
  id: string;
  coin_amount?: number;
  sent_at?: string;
  sender?: { username?: string; display_name?: string | null } | null;
  recipient?: { username?: string; display_name?: string | null } | null;
};

type GiftsResponse = {
  gifts?: GiftRow[];
};

export function AdminGiftsScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GiftRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/gifts?limit=50&offset=0', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load gifts (${res.status})`);
      }
      const parsed = (res.data || {}) as GiftsResponse;
      setRows(Array.isArray(parsed.gifts) ? parsed.gifts : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load gifts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title="Gifts"
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
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No gifts.</Text>
          <Button title="Refresh" onPress={() => void load()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.map((g) => (
            <View key={g.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {String(g.sender?.username || 'unknown')} → {String(g.recipient?.username || 'unknown')}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                Coins: {Number(g.coin_amount ?? 0).toLocaleString()}
              </Text>
            </View>
          ))}
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
  scroll: {
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  rowSubtitle: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '700',
  },
});
