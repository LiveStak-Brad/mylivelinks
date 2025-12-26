import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchAuthed } from '../lib/api';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ModerationPanel'>;

type ReportRow = {
  id: string;
  report_type?: string;
  report_reason?: string;
  status?: string;
  created_at?: string;
};

type ReportsResponse = {
  reports?: ReportRow[];
  source?: string;
};

export function ModerationPanelScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/reports?status=all&limit=50&offset=0', { method: 'GET' });
      const body = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(body?.error || `Failed to load reports (${res.status})`);
      }
      const parsed = body as ReportsResponse;
      setReports(Array.isArray(parsed.reports) ? parsed.reports : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title="Moderation"
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
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No reports.</Text>
          <Button title="Refresh" onPress={() => void load()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {reports.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {String(r.report_reason || r.report_type || 'Report')}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                Status: {String(r.status || 'unknown')}
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
