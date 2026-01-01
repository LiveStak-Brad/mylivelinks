import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

type BlockedUser = {
  blocked_id: string;
  created_at: string;
  reason: string | null;
  blocked_profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function BlockedUsersScreen({ navigation }: Props) {
  const { session } = useAuthContext();
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      setError('Offline mode: Supabase is not configured.');
      setRows([]);
      return;
    }
    if (!userId) {
      setLoading(false);
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: e } = await supabase
        .from('blocks')
        .select(
          `
          blocked_id,
          created_at,
          reason,
          blocked_profile:profiles!blocks_blocked_id_fkey(username, display_name, avatar_url)
        `
        )
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (e) throw e;

      type RawBlockedUser = Omit<BlockedUser, 'blocked_profile'> & {
        blocked_profile: BlockedUser['blocked_profile'] | Array<NonNullable<BlockedUser['blocked_profile']>> | null;
      };

      const normalized = ((data ?? []) as unknown as RawBlockedUser[]).map((row) => {
        const blocked_profile = Array.isArray(row.blocked_profile)
          ? row.blocked_profile[0] ?? null
          : row.blocked_profile ?? null;

        return {
          ...row,
          blocked_profile,
        } as BlockedUser;
      });

      setRows(normalized.filter((r) => !!r.blocked_profile));
    } catch (e: any) {
      setError(e?.message || 'Failed to load blocked users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUnblock = useCallback(
    async (blockedId: string) => {
      const client = supabase;
      if (!supabaseConfigured) {
        Alert.alert('Offline mode', 'Supabase is not configured.');
        return;
      }
      if (!userId) return;

      Alert.alert('Unblock user?', 'Are you sure you want to unblock this user?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setUnblocking(blockedId);
            try {
              const rpc = await (client.rpc as any)('unblock_user', {
                p_blocker_id: userId,
                p_blocked_id: blockedId,
              });

              if (rpc?.error) {
                const del = await client
                  .from('blocks')
                  .delete()
                  .eq('blocker_id', userId)
                  .eq('blocked_id', blockedId);
                if (del.error) throw del.error;
              }

              setRows((prev) => prev.filter((r) => r.blocked_id !== blockedId));
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to unblock user');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]);
    },
    [userId]
  );

  return (
    <PageShell
      title="Blocked Users"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {!userId ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Please log in to view blocked users.</Text>
          <Button title="Go to Login" onPress={() => navigation.getParent()?.navigate?.('Auth')} />
        </View>
      ) : loading ? (
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
          <Text style={styles.mutedText}>No blocked users.</Text>
          <Button title="Refresh" onPress={() => void load()} variant="secondary" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.map((r) => (
            <View key={r.blocked_id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.blocked_profile?.display_name || r.blocked_profile?.username || 'Unknown'}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  @{r.blocked_profile?.username || 'unknown'}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  Blocked on {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <Button
                title={unblocking === r.blocked_id ? '...' : 'Unblock'}
                variant="secondary"
                onPress={() => void handleUnblock(r.blocked_id)}
                disabled={unblocking === r.blocked_id}
                style={styles.unblockButton}
              />
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
    fontWeight: '900',
  },
  rowSubtitle: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  rowMeta: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  unblockButton: {
    height: 36,
    paddingHorizontal: 12,
  },
});
