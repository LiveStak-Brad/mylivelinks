import React, { useState } from 'react';
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
  const { colors } = useTheme();
  const [coinBalance] = useState(0);
  const [diamondBalance] = useState(0);

  const renderPackCard = (pack: CoinPack) => {
    return (
      <TouchableOpacity 
        key={pack.sku}
        style={styles.packCard}
        disabled={true}
      >
        <Text style={styles.packName}>{pack.pack_name}</Text>
        <Text style={styles.packPrice}>${pack.usd_amount.toLocaleString()}</Text>
        <Text style={styles.packCoins}>{pack.coins_awarded.toLocaleString()} 🪙</Text>
        {pack.description && (
          <Text style={styles.packDescription}>{pack.description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💼</Text>
          <View>
            <Text style={styles.headerTitle}>Wallet</Text>
            <Text style={styles.headerSubtitle}>Manage your coins and earnings</Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>🪙</Text>
                <Text style={styles.balanceLabel}>Coins</Text>
              </View>
              <Text style={styles.balanceAmount}>{coinBalance.toLocaleString()}</Text>
              <Text style={styles.balanceDescription}>For sending gifts</Text>
            </View>
          </View>
          
          <View style={[styles.balanceCard, styles.diamondCard]}>
            <View style={[styles.balanceGlow, styles.diamondGlow]} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>💎</Text>
                <Text style={styles.balanceLabel}>Diamonds</Text>
              </View>
              <Text style={[styles.balanceAmount, styles.diamondAmount]}>{diamondBalance.toLocaleString()}</Text>
              <Text style={styles.balanceDescription}>≈ ${(diamondBalance / 100).toFixed(2)} USD</Text>
            </View>
          </View>
        </View>

        <View style={styles.packsSection}>
          <Text style={styles.sectionTitle}>💰 Purchase Coins</Text>
          <Text style={styles.sectionSubtitle}>Get coins to support your favorite creators with gifts</Text>
          
          <View style={styles.packsGrid}>
            {COIN_PACKS.map(renderPackCard)}
          </View>
          
          <Text style={styles.securePayment}>Secure payments via Stripe</Text>
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
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  balanceSection: {
    gap: 16,
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  diamondCard: {
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  balanceGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 75,
  },
  diamondGlow: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
    color: '#999',
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
    color: '#666',
  },
  packsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  packName: {
    fontSize: 11,
    color: '#999',
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
    color: '#fff',
    marginBottom: 4,
  },
  packDescription: {
    fontSize: 10,
    color: '#666',
  },
  securePayment: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});

