import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, Modal, PageShell } from '../components/ui';
import { LegalFooter } from '../components/LegalFooter';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { getRuntimeEnv } from '../lib/env';

type WalletResponse = {
  coin_balance: number;
  diamond_balance: number;
  diamond_usd: number;
};

type CoinPack = {
  sku: string;
  price_id: string;
  usd_amount: number;
  coins_awarded: number;
  pack_name: string;
  description?: string | null;
  is_vip: boolean;
  vip_tier: number | null;
};

type ConnectStatus = {
  hasAccount: boolean;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  onboardingComplete?: boolean;
  country?: string;
  disabledReason?: string;
  fromCache?: boolean;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export function WalletScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);

  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [checkoutLoadingSku, setCheckoutLoadingSku] = useState<string | null>(null);

  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [cashoutLoading, setCashoutLoading] = useState(false);

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

  const loadPacks = useCallback(async () => {
    setPacksLoading(true);
    try {
      // Public endpoint (no auth)
      const baseUrl = (getRuntimeEnv('EXPO_PUBLIC_API_URL') || 'https://www.mylivelinks.com').replace(/\/+$/, '');
      const resp = await fetch(`${baseUrl}/api/coins/packs`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await resp.json().catch(() => null);
      const list = Array.isArray(data?.packs) ? (data.packs as CoinPack[]) : [];
      setPacks(list);
    } catch (e) {
      setPacks([]);
    } finally {
      setPacksLoading(false);
    }
  }, []);

  const loadConnectStatus = useCallback(async () => {
    setConnectLoading(true);
    try {
      const res = await fetchAuthed('/api/connect/status', { method: 'GET' });
      if (!res.ok) {
        throw new Error(res.message || 'Failed to load payout status');
      }
      setConnectStatus((res.data || null) as ConnectStatus | null);
    } catch {
      setConnectStatus(null);
    } finally {
      setConnectLoading(false);
    }
  }, [fetchAuthed]);

  const ensurePacks = useCallback(async () => {
    if (packsLoading) return;
    if (packs.length > 0) return;
    await loadPacks();
  }, [loadPacks, packs.length, packsLoading]);

  const openPacks = useCallback(async () => {
    await ensurePacks();
    setShowPacksModal(true);
  }, [ensurePacks]);

  const startCheckout = useCallback(
    async (pack: CoinPack) => {
      setCheckoutLoadingSku(pack.sku);
      try {
        const res = await fetchAuthed(
          '/api/coins/create-checkout',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId: pack.price_id, packSku: pack.sku }),
          }
        );

        if (!res.ok) {
          throw new Error(res.message || 'Failed to start checkout');
        }

        const url = String((res.data as any)?.url || '');
        if (!url) {
          throw new Error('No checkout URL returned');
        }

        setShowPacksModal(false);
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          throw new Error('Unable to open checkout URL');
        }
        await Linking.openURL(url);
      } catch (e: any) {
        Alert.alert('Purchase failed', e?.message || 'Failed to start purchase');
      } finally {
        setCheckoutLoadingSku(null);
      }
    },
    [fetchAuthed]
  );

  const startConnectOnboarding = useCallback(async () => {
    setConnectLoading(true);
    try {
      const res = await fetchAuthed('/api/connect/onboard', { method: 'POST' });
      if (!res.ok) {
        throw new Error(res.message || 'Failed to start Stripe Connect');
      }
      const url = String((res.data as any)?.url || '');
      if (!url) {
        throw new Error('No onboarding URL returned');
      }
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('Unable to open onboarding URL');
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Setup failed', e?.message || 'Failed to start Stripe Connect');
    } finally {
      setConnectLoading(false);
    }
  }, [fetchAuthed]);

  const requestCashout = useCallback(async () => {
    setCashoutLoading(true);
    try {
      const res = await fetchAuthed(
        '/api/cashout/request',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        throw new Error(res.message || 'Cashout failed');
      }

      const amountUsd = Number((res.data as any)?.amountUsd ?? 0);
      Alert.alert('Cashout requested', amountUsd > 0 ? `Success! $${amountUsd.toFixed(2)} is being transferred.` : 'Success!');
      await load();
      await loadConnectStatus();
    } catch (e: any) {
      Alert.alert('Cashout failed', e?.message || 'Failed to cash out');
    } finally {
      setCashoutLoading(false);
    }
  }, [fetchAuthed, load, loadConnectStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadConnectStatus();
  }, [loadConnectStatus]);

  return (
    <PageShell
      title="Wallet"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <View style={styles.body}>
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
          {/* Coins Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.warning + '20' }]}>
                <Feather name="circle" size={20} color={theme.colors.warning} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardLabel}>Coins</Text>
                <Text style={styles.cardValue}>{wallet.coin_balance.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtext}>Use coins to send gifts to streamers</Text>
          </View>

          {/* Diamonds Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Feather name="gift" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardLabel}>Diamonds</Text>
                <Text style={styles.cardValue}>{wallet.diamond_balance.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtext}>
              Diamonds from gifts · ${wallet.diamond_usd.toFixed(2)} USD
            </Text>
          </View>

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <Button 
              title="Purchase Coins" 
              variant="secondary" 
              onPress={() => void openPacks()}
            />
            <Button
              title={
                connectLoading
                  ? 'Checking payout status…'
                  : !connectStatus?.hasAccount
                    ? 'Set Up Stripe Connect'
                    : connectStatus?.payoutsEnabled
                      ? 'Cash Out Diamonds'
                      : 'Complete Stripe Setup'
              }
              variant="secondary"
              onPress={() => {
                if (!connectStatus?.hasAccount || !connectStatus?.payoutsEnabled) {
                  void startConnectOnboarding();
                  return;
                }
                void requestCashout();
              }}
              disabled={connectLoading || cashoutLoading}
              loading={cashoutLoading}
            />
            <Button
              title="View Transactions"
              variant="secondary"
              onPress={() => navigation.navigate('Transactions')}
            />
            <Button
              title="View Analytics"
              variant="secondary"
              onPress={() => navigation.navigate('MyAnalytics')}
            />
          </View>

          <Modal visible={showPacksModal} onRequestClose={() => setShowPacksModal(false)}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buy Coins</Text>
              <Pressable onPress={() => setShowPacksModal(false)} hitSlop={12}>
                <Feather name="x" size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {packsLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.mutedText}>Loading packs…</Text>
              </View>
            ) : packs.length === 0 ? (
              <View style={styles.modalCenter}>
                <Text style={styles.mutedText}>No packs available.</Text>
                <Button title="Close" variant="secondary" onPress={() => setShowPacksModal(false)} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.packsList} showsVerticalScrollIndicator={false}>
                {packs.map((p) => (
                  <View key={p.sku} style={styles.packRow}>
                    <View style={styles.packLeft}>
                      <Text style={styles.packName} numberOfLines={1}>
                        {p.pack_name}
                      </Text>
                      <Text style={styles.packMeta} numberOfLines={2}>
                        {p.coins_awarded.toLocaleString()} coins · ${Number(p.usd_amount || 0).toFixed(2)}
                      </Text>
                    </View>
                    <Button
                      title={checkoutLoadingSku === p.sku ? 'Starting…' : 'Buy'}
                      onPress={() => void startCheckout(p)}
                      loading={checkoutLoadingSku === p.sku}
                      disabled={!!checkoutLoadingSku}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </Modal>
          </View>
        )}
      </View>

      <LegalFooter />
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    body: {
      flex: 1,
      padding: 16,
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
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderText: {
      flex: 1,
    },
    cardLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 2,
    },
    cardValue: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    cardSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
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
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    modalCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    packsList: {
      gap: 10,
      paddingBottom: 6,
    },
    packRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    packLeft: {
      flex: 1,
    },
    packName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 3,
    },
    packMeta: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
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

