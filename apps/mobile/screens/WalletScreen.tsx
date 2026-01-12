import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

interface CoinPack {
  sku: string;
  pack_name: string;
  usd_amount: number;
  coins_awarded: number;
  description?: string;
}

const COIN_PACKS: CoinPack[] = [
  { sku: 'pack_1', pack_name: 'Starter', usd_amount: 1, coins_awarded: 100, description: 'Get started' },
  { sku: 'pack_2', pack_name: 'Popular', usd_amount: 5, coins_awarded: 550, description: 'Best value' },
  { sku: 'pack_3', pack_name: 'Premium', usd_amount: 10, coins_awarded: 1200, description: 'Most popular' },
  { sku: 'pack_4', pack_name: 'Super', usd_amount: 20, coins_awarded: 2500, description: 'Great deal' },
  { sku: 'pack_5', pack_name: 'Mega', usd_amount: 50, coins_awarded: 6500, description: 'Big spender' },
  { sku: 'pack_6', pack_name: 'Ultimate', usd_amount: 100, coins_awarded: 14000, description: 'Maximum value' },
];

export default function WalletScreen() {
  const { mode, colors } = useTheme();
  const [coinBalance] = useState(0);
  const [diamondBalance] = useState(0);

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      subtleText: (colors as any).subtleText ?? colors.mutedText,
      border: colors.border,
      cardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      cardBorder: mode === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
      coinGlow: mode === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)',
      diamondGlow: mode === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.15)',
      coinBorder: mode === 'dark' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.5)',
      diamondBorder: mode === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.5)',
      packCardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      packCardBorder: mode === 'dark' ? '#333' : colors.border,
    }),
    [mode, colors]
  );

  const renderPackCard = (pack: CoinPack) => {
    return (
      <TouchableOpacity 
        key={pack.sku}
        style={[styles.packCard, { backgroundColor: themed.packCardBg, borderColor: themed.packCardBorder }]}
        disabled={true}
      >
        <Text style={[styles.packName, { color: themed.mutedText }]}>{pack.pack_name}</Text>
        <Text style={styles.packPrice}>${pack.usd_amount.toLocaleString()}</Text>
        <Text style={[styles.packCoins, { color: themed.text }]}>{pack.coins_awarded.toLocaleString()} 🪙</Text>
        {pack.description && (
          <Text style={[styles.packDescription, { color: themed.subtleText }]}>{pack.description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💼</Text>
          <View>
            <Text style={[styles.headerTitle, { color: themed.text }]}>Wallet</Text>
            <Text style={[styles.headerSubtitle, { color: themed.mutedText }]}>Manage your coins and earnings</Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <View style={[styles.balanceCard, { backgroundColor: themed.cardBg, borderColor: themed.coinBorder }]}>
            <View style={[styles.balanceGlow, { backgroundColor: themed.coinGlow }]} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>🪙</Text>
                <Text style={[styles.balanceLabel, { color: themed.mutedText }]}>Coins</Text>
              </View>
              <Text style={styles.balanceAmount}>{coinBalance.toLocaleString()}</Text>
              <Text style={[styles.balanceDescription, { color: themed.subtleText }]}>For sending gifts</Text>
            </View>
          </View>
          
          <View style={[styles.balanceCard, { backgroundColor: themed.cardBg, borderColor: themed.diamondBorder }]}>
            <View style={[styles.balanceGlow, { backgroundColor: themed.diamondGlow }]} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>💎</Text>
                <Text style={[styles.balanceLabel, { color: themed.mutedText }]}>Diamonds</Text>
              </View>
              <Text style={[styles.balanceAmount, styles.diamondAmount]}>{diamondBalance.toLocaleString()}</Text>
              <Text style={[styles.balanceDescription, { color: themed.subtleText }]}>≈ ${(diamondBalance / 100).toFixed(2)} USD</Text>
            </View>
          </View>
        </View>

        <View style={styles.packsSection}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>💰 Purchase Coins</Text>
          <Text style={[styles.sectionSubtitle, { color: themed.mutedText }]}>Get coins to support your favorite creators with gifts</Text>
          
          <View style={styles.packsGrid}>
            {COIN_PACKS.map(renderPackCard)}
          </View>
          
          <Text style={[styles.securePayment, { color: themed.subtleText }]}>Secure payments via Stripe</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  headerIcon: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  balanceSection: {
    gap: 16,
    marginBottom: 24,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  balanceContent: {
    position: 'relative',
    zIndex: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceEmoji: {
    fontSize: 20,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  diamondAmount: {
    color: '#a855f7',
  },
  balanceDescription: {
    fontSize: 12,
  },
  packsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  packsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  packCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
  },
  packName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 4,
  },
  packCoins: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  packDescription: {
    fontSize: 10,
  },
  securePayment: {
    fontSize: 10,
    textAlign: 'center',
  },
});
