import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type WalletResponse = {
  coin_balance: number;
  diamond_balance: number;
  diamond_usd: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export function WalletScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetchAuthed('/api/wallet', { method: 'GET' });
      if (!resp.ok) {
        throw new Error(resp.message || `Failed to load wallet (${resp.status})`);
      }

      setWallet({
        coin_balance: Number(resp.data?.coin_balance ?? 0),
        diamond_balance: Number(resp.data?.diamond_balance ?? 0),
        diamond_usd: Number(resp.data?.diamond_usd ?? 0),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallet');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAuthed]);

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
          <ActivityIndicator size="large" color={theme.colors.accent} />
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

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    content: {
      gap: 12,
    },
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 16,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    cardLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginBottom: 8,
    },
    cardValue: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    cardSubValue: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: 6,
    },
    section: {
      marginTop: 8,
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 12,
    },
    mutedText: {
      color: theme.colors.textMuted,
    },
    errorText: {
      color: theme.colors.danger,
      textAlign: 'center',
    },
  });
}

