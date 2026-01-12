import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

type AnalyticsTab = 'overview' | 'wallet' | 'gifting' | 'earnings' | 'streams' | 'badges' | 'settings';

export default function MyAnalyticsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Ionicons name="bar-chart" size={24} color="#3b82f6" />
            <Text style={styles.title}>My Analytics</Text>
          </View>
          <TouchableOpacity style={styles.dateRangeButton}>
            <Text style={styles.dateRangeText}>{dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : dateRange === '90d' ? '90 Days' : 'All Time'}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Track your activity, earnings, and stats</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <TabButton icon="apps" label="Overview" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} />
        <TabButton icon="wallet" label="Wallet" active={activeTab === 'wallet'} onPress={() => setActiveTab('wallet')} />
        <TabButton icon="gift" label="Gifting" active={activeTab === 'gifting'} onPress={() => setActiveTab('gifting')} />
        <TabButton icon="diamond" label="Earnings" active={activeTab === 'earnings'} onPress={() => setActiveTab('earnings')} />
        <TabButton icon="radio" label="Streams" active={activeTab === 'streams'} onPress={() => setActiveTab('streams')} />
        <TabButton icon="trophy" label="Badges" active={activeTab === 'badges'} onPress={() => setActiveTab('badges')} />
        <TabButton icon="settings" label="Settings" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'gifting' && <GiftingTab />}
        {activeTab === 'earnings' && <EarningsTab />}
        {activeTab === 'streams' && <StreamsTab />}
        {activeTab === 'badges' && <BadgesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? '#3b82f6' : '#666'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function KpiCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: any; subtitle?: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Ionicons name={icon} size={20} color="#3b82f6" />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function OverviewTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Coins Balance" value={12500} icon="cash" />
        <KpiCard title="Diamonds Balance" value={850} icon="diamond" />
        <KpiCard title="Total Spent" value={45000} icon="trending-up" subtitle="Coins gifted" />
        <KpiCard title="Gifts Received" value={1234} icon="gift" />
        <KpiCard title="Diamonds Earned" value={3200} icon="trending-up" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gifter Rank & Badge</Text>
        <View style={styles.badgeCard}>
          <View style={styles.badgeIcon}>
            <Text style={styles.badgeEmoji}>🏆</Text>
          </View>
          <View style={styles.badgeInfo}>
            <Text style={styles.badgeTier}>Gold Tier</Text>
            <Text style={styles.badgeLevel}>Level 15 • 65% to next level</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '65%' }]} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coins Spent Over Time</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diamonds Earned Over Time</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="trending-up" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
        </View>
      </View>
    </View>
  );
}

function WalletTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.walletCards}>
        <View style={[styles.walletCard, styles.coinsCard]}>
          <View style={styles.walletHeader}>
            <Ionicons name="cash" size={24} color="#f59e0b" />
            <Text style={styles.walletTitle}>Coins Balance</Text>
          </View>
          <Text style={styles.walletAmount}>🪙 12,500</Text>
          <TouchableOpacity style={styles.walletButton}>
            <Ionicons name="cart" size={16} color="#fff" />
            <Text style={styles.walletButtonText}>Buy More Coins</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.walletCard, styles.diamondsCard]}>
          <View style={styles.walletHeader}>
            <Ionicons name="diamond" size={24} color="#3b82f6" />
            <Text style={styles.walletTitle}>Diamonds Balance</Text>
          </View>
          <Text style={styles.walletAmount}>💎 850</Text>
          <Text style={styles.walletUsd}>≈ $42.50 USD</Text>
          <TouchableOpacity style={[styles.walletButton, styles.walletButtonSecondary]}>
            <Ionicons name="cash-outline" size={16} color="#333" />
            <Text style={[styles.walletButtonText, styles.walletButtonTextSecondary]}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Text style={styles.sectionSubtitle}>Last 50 transactions</Text>
        <TransactionRow date="Jan 10, 3:45 PM" type="Coin Purchase" coins={+5000} diamonds={0} />
        <TransactionRow date="Jan 10, 2:30 PM" type="Gift Sent" coins={-500} diamonds={0} />
        <TransactionRow date="Jan 9, 8:15 PM" type="Diamond Earned" coins={0} diamonds={+250} />
        <TransactionRow date="Jan 9, 6:00 PM" type="Gift Sent" coins={-1000} diamonds={0} />
        <TransactionRow date="Jan 8, 4:20 PM" type="Diamond Earned" coins={0} diamonds={+150} />
      </View>
    </View>
  );
}

function TransactionRow({ date, type, coins, diamonds }: { date: string; type: string; coins: number; diamonds: number }) {
  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionDate}>{date}</Text>
        <Text style={styles.transactionType}>{type}</Text>
      </View>
      <View style={styles.transactionRight}>
        {coins !== 0 && (
          <Text style={[styles.transactionAmount, coins > 0 ? styles.positive : styles.negative]}>
            {coins > 0 ? '+' : ''}{coins.toLocaleString()} 🪙
          </Text>
        )}
        {diamonds !== 0 && (
          <Text style={[styles.transactionAmount, diamonds > 0 ? styles.positive : styles.negative]}>
            {diamonds > 0 ? '+' : ''}{diamonds.toLocaleString()} 💎
          </Text>
        )}
      </View>
    </View>
  );
}

function GiftingTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Gifts Sent" value={456} icon="gift" />
        <KpiCard title="Coins Spent" value={45000} icon="cash" />
        <KpiCard title="Avg Gift" value={98} icon="trending-up" subtitle="coins per gift" />
        <KpiCard title="Biggest Gift" value={5000} icon="trophy" subtitle="coins" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coins Spent Over Time</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Creators You've Supported</Text>
        <UserRow username="@streamer1" displayName="Top Streamer" value="15,000 🪙" subtitle="120 gifts" />
        <UserRow username="@creator2" displayName="Popular Creator" value="8,500 🪙" subtitle="75 gifts" />
        <UserRow username="@artist3" displayName="Music Artist" value="6,200 🪙" subtitle="45 gifts" />
      </View>
    </View>
  );
}

function EarningsTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Diamonds Earned" value={3200} icon="diamond" subtitle="this period" />
        <KpiCard title="Outstanding" value={850} icon="wallet" subtitle="available to cash out" />
        <KpiCard title="Gifts Received" value={1234} icon="gift" />
        <KpiCard title="Avg Gift" value={260} icon="trending-up" subtitle="diamonds" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diamonds Earned Over Time</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="trending-up" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Top Supporters</Text>
        <UserRow username="@supporter1" displayName="Top Fan" value="25,000 🪙" subtitle="200 gifts" badge="🏆" />
        <UserRow username="@fan2" displayName="Loyal Viewer" value="12,000 🪙" subtitle="95 gifts" badge="🥈" />
        <UserRow username="@viewer3" displayName="Regular Supporter" value="8,500 🪙" subtitle="60 gifts" badge="🥉" />
      </View>
    </View>
  );
}

function StreamsTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Live Sessions" value={45} icon="radio" />
        <KpiCard title="Total Time" value="32h 15m" icon="time" />
        <KpiCard title="Avg Viewers" value={127} icon="people" />
        <KpiCard title="Peak Viewers" value={458} icon="trending-up" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stream Sessions</Text>
        <StreamRow date="Jan 10, 8:00 PM" duration="2h 15m" peak={245} views={1234} />
        <StreamRow date="Jan 9, 7:30 PM" duration="1h 45m" peak={189} views={892} />
        <StreamRow date="Jan 8, 9:00 PM" duration="3h 00m" peak={458} views={2156} />
        <StreamRow date="Jan 7, 8:15 PM" duration="1h 30m" peak={156} views={678} />
      </View>
    </View>
  );
}

function StreamRow({ date, duration, peak, views }: { date: string; duration: string; peak: number; views: number }) {
  return (
    <View style={styles.streamRow}>
      <Text style={styles.streamDate}>{date}</Text>
      <View style={styles.streamStats}>
        <Text style={styles.streamDuration}>{duration}</Text>
        <Text style={styles.streamPeak}>👁 {peak}</Text>
        <Text style={styles.streamViews}>{views.toLocaleString()} views</Text>
      </View>
    </View>
  );
}

function BadgesTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.tierCard}>
        <View style={styles.tierHeader}>
          <View style={styles.tierIconLarge}>
            <Text style={styles.tierEmoji}>🏆</Text>
          </View>
          <View style={styles.tierInfo}>
            <Text style={styles.tierName}>Gold Tier</Text>
            <Text style={styles.tierLevel}>Level 15</Text>
          </View>
        </View>
        
        <View style={styles.tierProgress}>
          <Text style={styles.tierProgressLabel}>Progress to Level 16</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '65%' }]} />
          </View>
          <Text style={styles.tierProgressText}>65% • 3,500 more coins needed</Text>
        </View>

        <View style={styles.tierStats}>
          <View style={styles.tierStat}>
            <Text style={styles.tierStatLabel}>Lifetime Coins</Text>
            <Text style={styles.tierStatValue}>45,000 🪙</Text>
          </View>
          <View style={styles.tierStat}>
            <Text style={styles.tierStatLabel}>Next Milestone</Text>
            <Text style={styles.tierStatValue}>50,000 🪙</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Tiers</Text>
        <TierRow tier="Diamond" level="20+" emoji="💎" locked={true} />
        <TierRow tier="Platinum" level="16-19" emoji="⭐" locked={true} />
        <TierRow tier="Gold" level="11-15" emoji="🏆" locked={false} current={true} />
        <TierRow tier="Silver" level="6-10" emoji="🥈" locked={false} />
        <TierRow tier="Bronze" level="1-5" emoji="🥉" locked={false} />
      </View>
    </View>
  );
}

function TierRow({ tier, level, emoji, locked, current }: { tier: string; level: string; emoji: string; locked: boolean; current?: boolean }) {
  return (
    <View style={[styles.tierRowItem, current && styles.tierRowCurrent]}>
      <View style={styles.tierRowLeft}>
        <Text style={styles.tierRowEmoji}>{emoji}</Text>
        <View>
          <Text style={styles.tierRowName}>{tier}</Text>
          <Text style={styles.tierRowLevel}>Level {level}</Text>
        </View>
      </View>
      {current && <Text style={styles.tierRowBadge}>Current</Text>}
      {locked && <Ionicons name="lock-closed" size={20} color="#999" />}
    </View>
  );
}

function SettingsTab() {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        <SettingToggle label="Show Gifter Badge" description="Display your gifter tier badge on your profile" enabled={true} />
        <SettingToggle label="Public Follower Count" description="Show follower/following counts on your profile" enabled={true} />
        <SettingToggle label="Show Gift Stats" description="Display total gifts received publicly" enabled={false} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Export</Text>
        <Text style={styles.settingDescription}>Download a copy of your analytics data</Text>
        <TouchableOpacity style={styles.exportButton} disabled>
          <Text style={styles.exportButtonText}>Export Data (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SettingToggle({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={[styles.toggle, enabled && styles.toggleActive]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
      </View>
    </View>
  );
}

function UserRow({ username, displayName, value, subtitle, badge }: { username: string; displayName: string; value: string; subtitle: string; badge?: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{displayName[0]}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userUsername}>{username}</Text>
      </View>
      <View style={styles.userRight}>
        {badge && <Text style={styles.userBadge}>{badge}</Text>}
        <Text style={styles.userValue}>{value}</Text>
        <Text style={styles.userSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTier: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  badgeLevel: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  walletCards: {
    gap: 16,
    marginBottom: 24,
  },
  walletCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  coinsCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  diamondsCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  walletUsd: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  walletButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  walletButtonTextSecondary: {
    color: '#333',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  userUsername: {
    fontSize: 12,
    color: '#666',
  },
  userRight: {
    alignItems: 'flex-end',
  },
  userBadge: {
    fontSize: 16,
    marginBottom: 2,
  },
  userValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  userSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  streamRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  streamDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
    marginBottom: 6,
  },
  streamStats: {
    flexDirection: 'row',
    gap: 16,
  },
  streamDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  streamPeak: {
    fontSize: 14,
    color: '#666',
  },
  streamViews: {
    fontSize: 14,
    color: '#999',
  },
  tierCard: {
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  tierIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierEmoji: {
    fontSize: 32,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  tierLevel: {
    fontSize: 16,
    color: '#666',
  },
  tierProgress: {
    marginBottom: 20,
  },
  tierProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  tierProgressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  tierStats: {
    flexDirection: 'row',
    gap: 16,
  },
  tierStat: {
    flex: 1,
  },
  tierStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  tierStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  tierRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  tierRowCurrent: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  tierRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierRowEmoji: {
    fontSize: 24,
  },
  tierRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  tierRowLevel: {
    fontSize: 12,
    color: '#666',
  },
  tierRowBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  exportButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
});
