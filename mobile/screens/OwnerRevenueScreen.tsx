// Mobile Owner Panel Parity: Revenue + Feature Flags
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerRevenue' | 'OwnerCoinsRevenue'>;

// ============================================================================
// Types
// ============================================================================

interface RevenueStats {
  gross: number;
  net: number;
  refunds: number;
  chargebacks: number;
}

interface TopCreator {
  id: string;
  username: string;
  revenue: number;
  gifts_received: number;
}

interface TopStream {
  id: string;
  streamer_username: string;
  room_name: string;
  revenue: number;
  duration_minutes: number;
}

interface CoinPack {
  id: string;
  price_usd: number;
  coins_awarded: number;
  is_active: boolean;
  platform: 'web' | 'mobile';
}

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  is_active: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_REVENUE_STATS: RevenueStats = {
  gross: 45280.5,
  net: 31696.35,
  refunds: 1250.0,
  chargebacks: 340.0,
};

const MOCK_TOP_CREATORS: TopCreator[] = [
  { id: '1', username: 'streamer1', revenue: 12450.0, gifts_received: 1542 },
  { id: '2', username: 'streamer2', revenue: 8920.5, gifts_received: 982 },
  { id: '3', username: 'streamer3', revenue: 6780.25, gifts_received: 756 },
];

const MOCK_TOP_STREAMS: TopStream[] = [
  {
    id: '1',
    streamer_username: 'streamer1',
    room_name: 'Epic Stream Session',
    revenue: 3420.0,
    duration_minutes: 180,
  },
  {
    id: '2',
    streamer_username: 'streamer2',
    room_name: 'Late Night Vibes',
    revenue: 2890.5,
    duration_minutes: 240,
  },
];

const MOCK_COIN_PACKS: CoinPack[] = [
  { id: '1', price_usd: 5, coins_awarded: 350, is_active: true, platform: 'web' },
  { id: '2', price_usd: 10, coins_awarded: 700, is_active: true, platform: 'web' },
  { id: '3', price_usd: 25, coins_awarded: 1750, is_active: true, platform: 'web' },
  { id: '4', price_usd: 50, coins_awarded: 3500, is_active: true, platform: 'web' },
  { id: '5', price_usd: 100, coins_awarded: 7000, is_active: true, platform: 'web' },
  { id: '6', price_usd: 5, coins_awarded: 250, is_active: true, platform: 'mobile' },
  { id: '7', price_usd: 10, coins_awarded: 500, is_active: true, platform: 'mobile' },
];

const MOCK_GIFT_TYPES: GiftType[] = [
  { id: 1, name: 'Rose', coin_cost: 10, is_active: true },
  { id: 2, name: 'Heart', coin_cost: 50, is_active: true },
  { id: 3, name: 'Diamond', coin_cost: 100, is_active: true },
  { id: 4, name: 'Crown', coin_cost: 500, is_active: true },
  { id: 5, name: 'Legendary', coin_cost: 50000, is_active: true },
];

// ============================================================================
// Component
// ============================================================================

export function OwnerRevenueScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<'overview' | 'economy'>('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Economy Control State
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>(MOCK_COIN_PACKS);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>(MOCK_GIFT_TYPES);
  const [platformTakePercent, setPlatformTakePercent] = useState('30');
  const [payoutThreshold, setPayoutThreshold] = useState('50');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCoinPackToggle = useCallback((id: string) => {
    setCoinPacks((prev) =>
      prev.map((pack) => (pack.id === id ? { ...pack, is_active: !pack.is_active } : pack))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleGiftToggle = useCallback((id: number) => {
    setGiftTypes((prev) =>
      prev.map((gift) => (gift.id === id ? { ...gift, is_active: !gift.is_active } : gift))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveChanges = useCallback(() => {
    // TODO: Wire to API
    console.log('Save changes:', {
      coinPacks,
      giftTypes,
      platformTakePercent,
      payoutThreshold,
    });
    setHasUnsavedChanges(false);
  }, [coinPacks, giftTypes, platformTakePercent, payoutThreshold]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // ============================================================================
  // Tab: Revenue Overview
  // ============================================================================

  const renderOverviewTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Stats Cards */}
      <StatCard
        theme={theme}
        label="Gross Revenue"
        value={formatCurrency(MOCK_REVENUE_STATS.gross)}
        iconName="dollar-sign"
        iconColor="#10b981"
        trend="+12.5%"
      />
      <StatCard
        theme={theme}
        label="Net Revenue"
        value={formatCurrency(MOCK_REVENUE_STATS.net)}
        iconName="trending-up"
        iconColor="#8b5cf6"
        subtitle="After platform take"
      />
      <StatCard
        theme={theme}
        label="Refunds"
        value={formatCurrency(MOCK_REVENUE_STATS.refunds)}
        iconName="trending-down"
        iconColor="#f59e0b"
      />
      <StatCard
        theme={theme}
        label="Chargebacks"
        value={formatCurrency(MOCK_REVENUE_STATS.chargebacks)}
        iconName="alert-triangle"
        iconColor="#ef4444"
      />

      {/* Date Range Selector */}
      <View style={styles.dateRangeCard}>
        <View style={styles.dateRangeHeader}>
          <Feather name="calendar" size={18} color={theme.colors.textMuted} />
          <Text style={styles.dateRangeLabel}>Date Range</Text>
        </View>
        <View style={styles.segmentedControl}>
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.segmentButton, dateRange === range && styles.segmentButtonActive]}
              onPress={() => setDateRange(range)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  dateRange === range && styles.segmentButtonTextActive,
                ]}
              >
                {range === '7d'
                  ? '7d'
                  : range === '30d'
                  ? '30d'
                  : range === '90d'
                  ? '90d'
                  : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Top Creators */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Creators by Revenue</Text>
        {MOCK_TOP_CREATORS.map((creator, index) => (
          <View key={creator.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>{creator.username[0].toUpperCase()}</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{creator.username}</Text>
              <Text style={styles.listItemSubtitle}>{formatNumber(creator.gifts_received)} gifts</Text>
            </View>
            <Text style={styles.listItemValue}>{formatCurrency(creator.revenue)}</Text>
          </View>
        ))}
      </View>

      {/* Top Streams */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Streams by Revenue</Text>
        {MOCK_TOP_STREAMS.map((stream, index) => (
          <View key={stream.id} style={[styles.listItem, index > 0 && styles.listItemBorder]}>
            <Feather name="video" size={20} color={theme.colors.accent} />
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{stream.room_name}</Text>
              <Text style={styles.listItemSubtitle}>
                @{stream.streamer_username} · {stream.duration_minutes}m
              </Text>
            </View>
            <Text style={styles.listItemValue}>{formatCurrency(stream.revenue)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // ============================================================================
  // Tab: Economy Control
  // ============================================================================

  const renderEconomyTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <View style={styles.warningBanner}>
          <Feather name="alert-triangle" size={20} color="#f59e0b" />
          <View style={styles.warningBannerContent}>
            <Text style={styles.warningBannerTitle}>Unsaved Changes</Text>
            <Text style={styles.warningBannerText}>
              You have modified economy settings. Tap Save to apply changes.
            </Text>
          </View>
        </View>
      )}

      {/* Coin Packs - Web */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Coin Packs - Web Platform</Text>
        <Text style={styles.sectionSubtitle}>Stripe payments</Text>
        {coinPacks
          .filter((pack) => pack.platform === 'web')
          .map((pack, index) => (
            <View
              key={pack.id}
              style={[styles.toggleItem, index > 0 && styles.toggleItemBorder]}
            >
              <Feather name="package" size={20} color={theme.colors.accent} />
              <View style={styles.toggleItemContent}>
                <Text style={styles.toggleItemTitle}>
                  {formatCurrency(pack.price_usd)} = {formatNumber(pack.coins_awarded)} coins
                </Text>
                <Text style={styles.toggleItemSubtitle}>
                  {(pack.coins_awarded / pack.price_usd).toFixed(0)} coins per dollar
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, pack.is_active && styles.toggleActive]}
                onPress={() => handleCoinPackToggle(pack.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    pack.is_active && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
          ))}
      </View>

      {/* Coin Packs - Mobile */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Coin Packs - Mobile Platform</Text>
        <Text style={styles.sectionSubtitle}>In-app purchases</Text>
        {coinPacks
          .filter((pack) => pack.platform === 'mobile')
          .map((pack, index) => (
            <View
              key={pack.id}
              style={[styles.toggleItem, index > 0 && styles.toggleItemBorder]}
            >
              <Feather name="smartphone" size={20} color={theme.colors.accent} />
              <View style={styles.toggleItemContent}>
                <Text style={styles.toggleItemTitle}>
                  {formatCurrency(pack.price_usd)} = {formatNumber(pack.coins_awarded)} coins
                </Text>
                <Text style={styles.toggleItemSubtitle}>
                  {(pack.coins_awarded / pack.price_usd).toFixed(0)} coins per dollar
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, pack.is_active && styles.toggleActive]}
                onPress={() => handleCoinPackToggle(pack.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    pack.is_active && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
          ))}
      </View>

      {/* Gift Catalog */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Gift Catalog</Text>
        <Text style={styles.sectionSubtitle}>Manage gift types and coin costs</Text>
        {giftTypes.map((gift, index) => (
          <View
            key={gift.id}
            style={[styles.toggleItem, index > 0 && styles.toggleItemBorder]}
          >
            <Feather name="gift" size={20} color={theme.colors.accent} />
            <View style={styles.toggleItemContent}>
              <Text style={styles.toggleItemTitle}>{gift.name}</Text>
              <Text style={styles.toggleItemSubtitle}>{formatNumber(gift.coin_cost)} coins</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, gift.is_active && styles.toggleActive]}
              onPress={() => handleGiftToggle(gift.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.toggleThumb,
                  gift.is_active && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Platform Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Platform Settings</Text>
        <Text style={styles.sectionSubtitle}>Configure revenue splits and payouts</Text>

        {/* Platform Take % */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Platform Take (%)</Text>
          <TextInput
            style={styles.input}
            value={platformTakePercent}
            onChangeText={(text) => {
              setPlatformTakePercent(text);
              setHasUnsavedChanges(true);
            }}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.inputHelper}>
            <Feather name="info" size={14} color={theme.colors.textMuted} />
            <Text style={styles.inputHelperText}>
              Streamer receives {100 - Number(platformTakePercent || 0)}%
            </Text>
          </View>
        </View>

        {/* Payout Threshold */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Payout Threshold (USD)</Text>
          <TextInput
            style={styles.input}
            value={payoutThreshold}
            onChangeText={(text) => {
              setPayoutThreshold(text);
              setHasUnsavedChanges(true);
            }}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.inputHelper}>
            <Feather name="info" size={14} color={theme.colors.textMuted} />
            <Text style={styles.inputHelperText}>Minimum balance to request payout</Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, !hasUnsavedChanges && styles.saveButtonDisabled]}
        onPress={handleSaveChanges}
        disabled={!hasUnsavedChanges}
        activeOpacity={0.7}
      >
        <Feather name="save" size={18} color="#fff" />
        <Text style={styles.saveButtonText}>
          {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
        </Text>
      </TouchableOpacity>

      {!hasUnsavedChanges && (
        <Text style={styles.disabledNote}>Wiring coming soon</Text>
      )}
    </ScrollView>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <PageShell
      title="Coins & Revenue"
      left={
        <Button
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        />
      }
      contentStyle={styles.container}
    >
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Revenue Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'economy' && styles.tabActive]}
          onPress={() => setActiveTab('economy')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'economy' && styles.tabTextActive]}>
            Economy Control
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'economy' && renderEconomyTab()}
        </>
      )}
    </PageShell>
  );
}

// ============================================================================
// StatCard Component
// ============================================================================

function StatCard({
  theme,
  label,
  value,
  iconName,
  iconColor,
  trend,
  subtitle,
}: {
  theme: ThemeDefinition;
  label: string;
  value: string;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
  trend?: string;
  subtitle?: string;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
          <Feather name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardLabel}>{label}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
          {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
          {trend && <Text style={styles.statCardTrend}>{trend}</Text>}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    mutedText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },

    // Tab Bar
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.tokens.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.tokens.borderSubtle,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.accent,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    tabTextActive: {
      color: theme.colors.accent,
    },

    // Tab Content
    tabContent: {
      padding: 16,
      paddingBottom: 32,
    },

    // Stat Card
    statCard: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...theme.elevations.card,
    },
    statCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statCardContent: {
      flex: 1,
    },
    statCardLabel: {
      fontSize: 13,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    statCardValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    statCardSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    statCardTrend: {
      fontSize: 12,
      color: '#10b981',
      marginTop: 2,
      fontWeight: '600',
    },

    // Date Range Card
    dateRangeCard: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...theme.elevations.card,
    },
    dateRangeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    dateRangeLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: theme.tokens.backgroundSecondary,
      borderRadius: 8,
      padding: 4,
      gap: 4,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
      minHeight: 44,
      justifyContent: 'center',
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    segmentButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    segmentButtonTextActive: {
      color: '#fff',
    },

    // Section Card
    sectionCard: {
      backgroundColor: theme.tokens.backgroundPrimary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      ...theme.elevations.card,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      marginBottom: 16,
    },

    // List Items
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      minHeight: 56,
    },
    listItemBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.tokens.borderSubtle,
    },
    creatorAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.tokens.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    creatorAvatarText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    listItemContent: {
      flex: 1,
    },
    listItemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    listItemSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    listItemValue: {
      fontSize: 14,
      fontWeight: '700',
      color: '#10b981',
    },

    // Warning Banner
    warningBanner: {
      backgroundColor: '#f59e0b20',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      gap: 12,
      borderWidth: 1,
      borderColor: '#f59e0b40',
    },
    warningBannerContent: {
      flex: 1,
    },
    warningBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    warningBannerText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    // Toggle Items
    toggleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      minHeight: 56,
    },
    toggleItemBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.tokens.borderSubtle,
    },
    toggleItemContent: {
      flex: 1,
    },
    toggleItemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    toggleItemSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    // Toggle Switch
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.tokens.borderSubtle,
      padding: 2,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: '#10b981',
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
      ...theme.elevations.card,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end',
    },

    // Input Group
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.tokens.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.tokens.borderSubtle,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      minHeight: 48,
    },
    inputHelper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    inputHelperText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    // Save Button
    saveButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 56,
      marginTop: 8,
      ...theme.elevations.card,
    },
    saveButtonDisabled: {
      backgroundColor: theme.tokens.borderSubtle,
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    disabledNote: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
    },
  });
}

