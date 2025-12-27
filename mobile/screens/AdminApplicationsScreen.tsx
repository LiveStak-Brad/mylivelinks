import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminApplications'>;

type Application = {
  id: string;
  profile_id?: string;
  status?: string;
  created_at?: string;
  profile?: {
    username?: string;
    display_name?: string | null;
  } | null;
};

type ApplicationsResponse = {
  applications?: Application[];
  source?: string;
};

export function AdminApplicationsScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Application[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuthed('/api/admin/applications?status=all&limit=50&offset=0', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || `Failed to load applications (${res.status})`);
      }
      const parsed = (res.data || {}) as ApplicationsResponse;
      setRows(Array.isArray(parsed.applications) ? parsed.applications : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load applications');
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
      title="Applications"
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
          <Text style={styles.mutedText}>No applications.</Text>
          <Button title="Refresh" onPress={() => void load()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.map((app) => (
            <View key={app.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                @{String(app.profile?.username || 'unknown')}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                Status: {String(app.status || 'unknown')}
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
