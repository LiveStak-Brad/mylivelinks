import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerCoinsRevenue'>;

type TabType = 'revenue' | 'economy';

type DateRangePreset = '7d' | '30d' | '90d' | 'all';

type CoinPack = {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  is_active: boolean;
};

type GiftType = {
  id: string;
  name: string;
  coin_cost: number;
  is_active: boolean;
};

type RevenueData = {
  grossRevenue: number;
  netRevenue: number;
  totalGiftsSent: number;
  activeCreators: number;
  topCreators: Array<{
    username: string;
    avatar_url: string | null;
    revenue: number;
  }>;
};

export function OwnerCoinsRevenueScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  
  // Revenue data
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  
  // Economy control data (UI-only placeholders)
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([
    { id: '1', name: '$5 Pack', coins: 350, price_usd: 5, is_active: true },
    { id: '2', name: '$10 Pack', coins: 700, price_usd: 10, is_active: true },
    { id: '3', name: '$25 Pack', coins: 1750, price_usd: 25, is_active: true },
    { id: '4', name: '$50 Pack', coins: 3500, price_usd: 50, is_active: true },
    { id: '5', name: '$100 Pack', coins: 7000, price_usd: 100, is_active: true },
  ]);
  
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([
    { id: '1', name: 'Rose', coin_cost: 10, is_active: true },
    { id: '2', name: 'Heart', coin_cost: 50, is_active: true },
    { id: '3', name: 'Diamond', coin_cost: 500, is_active: true },
    { id: '4', name: 'Crown', coin_cost: 1000, is_active: true },
  ]);
  
  const [platformTake, setPlatformTake] = useState('30');
  const [payoutThreshold, setPayoutThreshold] = useState('50');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      // For now, mock data
      setRevenueData({
        grossRevenue: 12345,
        netRevenue: 8641,
        totalGiftsSent: 567,
        activeCreators: 45,
        topCreators: [
          { username: 'creator1', avatar_url: null, revenue: 1200 },
          { username: 'creator2', avatar_url: null, revenue: 950 },
          { username: 'creator3', avatar_url: null, revenue: 780 },
        ],
      });
    } catch (e: any) {
      console.error('Failed to load coins & revenue data:', e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveEconomy = () => {
    Alert.alert(
      'Not Implemented',
      'Economy control wiring coming soon. This is a UI-only placeholder for now.',
      [{ text: 'OK' }]
    );
  };

  const toggleCoinPack = (id: string) => {
    setCoinPacks((prev) =>
      prev.map((pack) => (pack.id === id ? { ...pack, is_active: !pack.is_active } : pack))
    );
  };

  const toggleGiftType = (id: string) => {
    setGiftTypes((prev) =>
      prev.map((gift) => (gift.id === id ? { ...gift, is_active: !gift.is_active } : gift))
    );
  };

  const renderDateRangePicker = () => {
    const options: Array<{ value: DateRangePreset; label: string }> = [
      { value: '7d', label: '7 Days' },
      { value: '30d', label: '30 Days' },
      { value: '90d', label: '90 Days' },
      { value: 'all', label: 'All Time' },
    ];

    return (
      <View style={styles.dateRangePicker}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.dateRangeButton,
              dateRange === option.value && styles.dateRangeButtonActive,
            ]}
            onPress={() => setDateRange(option.value)}
          >
            <Text
              style={[
                styles.dateRangeButtonText,
                dateRange === option.value && styles.dateRangeButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRevenueTab = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.mutedText}>Loading revenue data…</Text>
        </View>
      );
    }

    const data = revenueData ?? {
      grossRevenue: 0,
      netRevenue: 0,
      totalGiftsSent: 0,
      activeCreators: 0,
      topCreators: [],
    };

    return (
      <ScrollView
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
        }
      >
        {renderDateRangePicker()}

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Feather name="dollar-sign" size={20} color="#10b981" />
            <Text style={styles.kpiLabel}>Gross Revenue</Text>
            <Text style={styles.kpiValue}>${data.grossRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Feather name="trending-up" size={20} color="#8b5cf6" />
            <Text style={styles.kpiLabel}>Net Revenue</Text>
            <Text style={styles.kpiValue}>${data.netRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Feather name="gift" size={20} color="#ec4899" />
            <Text style={styles.kpiLabel}>Total Gifts</Text>
            <Text style={styles.kpiValue}>{data.totalGiftsSent.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Feather name="users" size={20} color="#3b82f6" />
            <Text style={styles.kpiLabel}>Active Creators</Text>
            <Text style={styles.kpiValue}>{data.activeCreators}</Text>
          </View>
        </View>

        {/* Top Creators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Creators</Text>
          {data.topCreators.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No creator data yet</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {data.topCreators.map((creator, idx) => (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.avatar} />
                    <Text style={styles.listItemText}>{creator.username}</Text>
                  </View>
                  <Text style={styles.listItemValue}>${creator.revenue.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderEconomyTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Coin Packs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coin Packs</Text>
          <View style={styles.list}>
            {coinPacks.map((pack) => (
              <View key={pack.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Feather name="package" size={20} color={theme.colors.accent} />
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemText}>{pack.name}</Text>
                    <Text style={styles.listItemSubtext}>
                      {pack.coins.toLocaleString()} coins • ${pack.price_usd}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pack.is_active}
                  onValueChange={() => toggleCoinPack(pack.id)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                  thumbColor={theme.colors.cardSurface}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Gift Catalog */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gift Catalog</Text>
          <View style={styles.list}>
            {giftTypes.map((gift) => (
              <View key={gift.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Feather name="gift" size={20} color={theme.colors.accent} />
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemText}>{gift.name}</Text>
                    <Text style={styles.listItemSubtext}>{gift.coin_cost} coins</Text>
                  </View>
                </View>
                <Switch
                  value={gift.is_active}
                  onValueChange={() => toggleGiftType(gift.id)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                  thumbColor={theme.colors.cardSurface}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Platform Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Settings</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Platform Take (%)</Text>
            <TextInput
              style={styles.input}
              value={platformTake}
              onChangeText={setPlatformTake}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.inputHelper}>Platform's share of gift revenue (default: 30%)</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payout Threshold ($)</Text>
            <TextInput
              style={styles.input}
              value={payoutThreshold}
              onChangeText={setPayoutThreshold}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.inputHelper}>Minimum balance required for payout (default: $50)</Text>
          </View>
        </View>

        {/* Save Button (disabled) */}
        <TouchableOpacity
          style={[styles.saveButton, styles.saveButtonDisabled]}
          onPress={handleSaveEconomy}
        >
          <Feather name="alert-circle" size={16} color={theme.colors.textMuted} />
          <Text style={styles.saveButtonTextDisabled}>Save (Wiring Coming Soon)</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <PageShell
      title="Coins & Revenue"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'revenue' && styles.tabActive]}
          onPress={() => setActiveTab('revenue')}
        >
          <Feather name="bar-chart-2" size={18} color={activeTab === 'revenue' ? theme.colors.accent : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'revenue' && styles.tabTextActive]}>Revenue Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'economy' && styles.tabActive]}
          onPress={() => setActiveTab('economy')}
        >
          <Feather name="settings" size={18} color={activeTab === 'economy' ? theme.colors.accent : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'economy' && styles.tabTextActive]}>Economy Control</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'revenue' ? renderRevenueTab() : renderEconomyTab()}
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
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
      padding: 24,
    },
    mutedText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    tabSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      padding: 4,
      margin: 16,
      marginBottom: 0,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.cardSurface,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    tabTextActive: {
      color: theme.colors.accent,
    },
    tabContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 16,
    },
    dateRangePicker: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    dateRangeButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    dateRangeButtonActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    dateRangeButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    dateRangeButtonTextActive: {
      color: '#ffffff',
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    kpiCard: {
      flex: 1,
      minWidth: '45%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    kpiLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardAlt,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    list: {
      gap: 8,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    listItemInfo: {
      flex: 1,
      gap: 4,
    },
    listItemText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    listItemSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    listItemValue: {
      color: theme.colors.accent,
      fontSize: 15,
      fontWeight: '900',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.border,
    },
    inputGroup: {
      gap: 8,
      marginBottom: 16,
    },
    inputLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    inputHelper: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      marginTop: 8,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.cardAlt,
      opacity: 0.6,
    },
    saveButtonTextDisabled: {
      color: theme.colors.textMuted,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}

