import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://www.mylivelinks.com';

type AnalyticsTab = 'overview' | 'wallet' | 'gifting' | 'earnings' | 'streams' | 'badges' | 'settings';

interface AnalyticsData {
  overview: {
    coinsBalance: number;
    diamondsBalance: number;
    totalCoinsSpent: number;
    totalGiftsReceived: number;
    lifetimeDiamondsEarned: number;
    totalGiftsSent: number;
  };
  wallet: {
    coinsBalance: number;
    diamondsBalance: number;
    diamondsUsd: number;
  };
  gifting: {
    giftsSentCount: number;
    totalCoinsSpent: number;
    avgGiftSize: number;
    biggestGift: number;
    topCreatorsGifted: Array<{
      id: string;
      username: string;
      displayName: string;
      totalCoins: number;
      giftCount: number;
    }>;
  };
  earnings: {
    diamondsEarned: number;
    diamondsOutstanding: number;
    giftsReceivedCount: number;
    avgGiftReceived: number;
    topGifters: Array<{
      id: string;
      username: string;
      displayName: string;
      totalCoins: number;
      giftCount: number;
      tierKey: string;
    }>;
  };
  streams: {
    totalSessions: number;
    totalMinutes: number;
    avgViewers: number;
    peakViewers: number;
    sessions: Array<{
      id: string;
      date: string;
      duration: number;
      peakViewers: number;
      totalViews: number;
    }>;
  };
  gifterStatus: {
    tierKey: string;
    tierName: string;
    tierIcon: string;
    level: number;
    progressPct: number;
    lifetimeCoins: number;
    nextLevelCoins: number;
  } | null;
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    coinsDelta: number;
    diamondsDelta: number;
    note: string;
  }>;
}

const emptyAnalytics: AnalyticsData = {
  overview: { coinsBalance: 0, diamondsBalance: 0, totalCoinsSpent: 0, totalGiftsReceived: 0, lifetimeDiamondsEarned: 0, totalGiftsSent: 0 },
  wallet: { coinsBalance: 0, diamondsBalance: 0, diamondsUsd: 0 },
  gifting: { giftsSentCount: 0, totalCoinsSpent: 0, avgGiftSize: 0, biggestGift: 0, topCreatorsGifted: [] },
  earnings: { diamondsEarned: 0, diamondsOutstanding: 0, giftsReceivedCount: 0, avgGiftReceived: 0, topGifters: [] },
  streams: { totalSessions: 0, totalMinutes: 0, avgViewers: 0, peakViewers: 0, sessions: [] },
  gifterStatus: null,
  transactions: [],
};

async function fetchAnalytics(range: string): Promise<AnalyticsData> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.warn('[analytics] No auth token');
      return emptyAnalytics;
    }
    const res = await fetch(`${API_BASE_URL}/api/user-analytics?range=${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error('[analytics] API error:', res.status);
      return emptyAnalytics;
    }
    return res.json();
  } catch (err) {
    console.error('[analytics] fetch error:', err);
    return emptyAnalytics;
  }
}

export default function MyAnalyticsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAnalytics(dateRange).then((data) => {
      if (!cancelled) {
        setAnalytics(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [dateRange]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Ionicons name="bar-chart" size={24} color={colors.link} />
            <Text style={[styles.title, { color: colors.text }]}>My Analytics</Text>
          </View>
          <TouchableOpacity style={[styles.dateRangeButton, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.dateRangeText, { color: colors.text }]}>{dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : dateRange === '90d' ? '90 Days' : 'All Time'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Track your activity, earnings, and stats</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <TabButton icon="apps" label="Overview" active={activeTab === 'overview'} onPress={() => setActiveTab('overview')} colors={colors} />
        <TabButton icon="wallet" label="Wallet" active={activeTab === 'wallet'} onPress={() => setActiveTab('wallet')} colors={colors} />
        <TabButton icon="gift" label="Gifting" active={activeTab === 'gifting'} onPress={() => setActiveTab('gifting')} colors={colors} />
        <TabButton icon="diamond" label="Earnings" active={activeTab === 'earnings'} onPress={() => setActiveTab('earnings')} colors={colors} />
        <TabButton icon="radio" label="Streams" active={activeTab === 'streams'} onPress={() => setActiveTab('streams')} colors={colors} />
        <TabButton icon="trophy" label="Badges" active={activeTab === 'badges'} onPress={() => setActiveTab('badges')} colors={colors} />
        <TabButton icon="settings" label="Settings" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} colors={colors} />
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.link} />
            <Text style={[styles.loadingText, { color: colors.mutedText }]}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab colors={colors} data={analytics} />}
            {activeTab === 'wallet' && <WalletTab colors={colors} data={analytics} />}
            {activeTab === 'gifting' && <GiftingTab colors={colors} data={analytics} />}
            {activeTab === 'earnings' && <EarningsTab colors={colors} data={analytics} />}
            {activeTab === 'streams' && <StreamsTab colors={colors} data={analytics} />}
            {activeTab === 'badges' && <BadgesTab colors={colors} data={analytics} />}
            {activeTab === 'settings' && <SettingsTab colors={colors} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, active, onPress, colors }: { icon: any; label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[styles.tab, active && [styles.tabActive, { borderBottomColor: colors.link }]]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? colors.link : colors.mutedText} />
      <Text style={[styles.tabLabel, { color: colors.mutedText }, active && { color: colors.link }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function KpiCard({ title, value, icon, subtitle, colors }: { title: string; value: string | number; icon: any; subtitle?: string; colors: any }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <View style={styles.kpiHeader}>
        <Ionicons name={icon} size={20} color={colors.link} />
        <Text style={[styles.kpiTitle, { color: colors.mutedText }]}>{title}</Text>
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      {subtitle && <Text style={[styles.kpiSubtitle, { color: colors.subtleText }]}>{subtitle}</Text>}
    </View>
  );
}

function OverviewTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  const gs = data.gifterStatus;
  const tierEmoji = gs?.tierIcon || '🥉';
  const tierName = gs?.tierName || 'Starter';
  const level = gs?.level ?? 1;
  const progressPct = gs?.progressPct ?? 0;

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Coins Balance" value={data.overview.coinsBalance} icon="cash" colors={colors} />
        <KpiCard title="Diamonds Balance" value={data.overview.diamondsBalance} icon="diamond" colors={colors} />
        <KpiCard title="Total Spent" value={data.overview.totalCoinsSpent} icon="trending-up" subtitle="Coins gifted" colors={colors} />
        <KpiCard title="Gifts Received" value={data.overview.totalGiftsReceived} icon="gift" colors={colors} />
        <KpiCard title="Diamonds Earned" value={data.overview.lifetimeDiamondsEarned} icon="trending-up" colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gifter Rank & Badge</Text>
        <View style={styles.badgeCard}>
          <View style={[styles.badgeIcon, { backgroundColor: colors.surface2 }]}>
            <Text style={styles.badgeEmoji}>{tierEmoji}</Text>
          </View>
          <View style={styles.badgeInfo}>
            <Text style={[styles.badgeTier, { color: colors.text }]}>{tierName}</Text>
            <Text style={[styles.badgeLevel, { color: colors.mutedText }]}>Level {level} • {Math.round(progressPct)}% to next level</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Coins Spent Over Time</Text>
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Ionicons name="bar-chart" size={48} color={colors.subtleText} />
          <Text style={[styles.chartPlaceholderText, { color: colors.subtleText }]}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Diamonds Earned Over Time</Text>
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Ionicons name="trending-up" size={48} color={colors.subtleText} />
          <Text style={[styles.chartPlaceholderText, { color: colors.subtleText }]}>Chart visualization</Text>
        </View>
      </View>
    </View>
  );
}

function WalletTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.walletCards}>
        <View style={[styles.walletCard, styles.coinsCard]}>
          <View style={styles.walletHeader}>
            <Ionicons name="cash" size={24} color="#f59e0b" />
            <Text style={[styles.walletTitle, { color: colors.text }]}>Coins Balance</Text>
          </View>
          <Text style={styles.walletAmount}>🪙 {data.wallet.coinsBalance.toLocaleString()}</Text>
          <TouchableOpacity style={styles.walletButton}>
            <Ionicons name="cart" size={16} color="#fff" />
            <Text style={styles.walletButtonText}>Buy More Coins</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.walletCard, styles.diamondsCard]}>
          <View style={styles.walletHeader}>
            <Ionicons name="diamond" size={24} color="#a855f7" />
            <Text style={[styles.walletTitle, { color: colors.text }]}>Diamonds Balance</Text>
          </View>
          <Text style={[styles.walletAmount, styles.diamondAmount]}>💎 {data.wallet.diamondsBalance.toLocaleString()}</Text>
          <Text style={[styles.walletUsd, { color: colors.mutedText }]}>≈ ${data.wallet.diamondsUsd.toFixed(2)} USD</Text>
          <TouchableOpacity style={[styles.walletButton, styles.walletButtonSecondary, { backgroundColor: colors.surface2 }]}>
            <Ionicons name="cash-outline" size={16} color={colors.text} />
            <Text style={[styles.walletButtonText, styles.walletButtonTextSecondary, { color: colors.text }]}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>Last 50 transactions</Text>
        {data.transactions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>No transactions yet</Text>
        ) : (
          data.transactions.slice(0, 10).map((tx) => (
            <TransactionRow
              key={tx.id}
              date={formatDate(tx.date)}
              type={tx.note}
              coins={tx.coinsDelta}
              diamonds={tx.diamondsDelta}
              colors={colors}
            />
          ))
        )}
      </View>
    </View>
  );
}

function TransactionRow({ date, type, coins, diamonds, colors }: { date: string; type: string; coins: number; diamonds: number; colors: any }) {
  return (
    <View style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
      <View style={styles.transactionLeft}>
        <Text style={[styles.transactionDate, { color: colors.subtleText }]}>{date}</Text>
        <Text style={[styles.transactionType, { color: colors.text }]}>{type}</Text>
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

function GiftingTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Gifts Sent" value={data.gifting.giftsSentCount} icon="gift" colors={colors} />
        <KpiCard title="Coins Spent" value={data.gifting.totalCoinsSpent} icon="cash" colors={colors} />
        <KpiCard title="Avg Gift" value={data.gifting.avgGiftSize} icon="trending-up" subtitle="coins per gift" colors={colors} />
        <KpiCard title="Biggest Gift" value={data.gifting.biggestGift} icon="trophy" subtitle="coins" colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Coins Spent Over Time</Text>
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Ionicons name="bar-chart" size={48} color={colors.subtleText} />
          <Text style={[styles.chartPlaceholderText, { color: colors.subtleText }]}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Creators You've Supported</Text>
        {data.gifting.topCreatorsGifted.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>No gifts sent yet</Text>
        ) : (
          data.gifting.topCreatorsGifted.map((creator) => (
            <UserRow
              key={creator.id}
              username={`@${creator.username}`}
              displayName={creator.displayName}
              value={`${creator.totalCoins.toLocaleString()} 🪙`}
              subtitle={`${creator.giftCount} gifts`}
              colors={colors}
            />
          ))
        )}
      </View>
    </View>
  );
}

function EarningsTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  const tierBadges: Record<string, string> = { diamond: '💎', platinum: '⭐', gold: '🏆', silver: '🥈', bronze: '🥉', starter: '' };

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Diamonds Earned" value={data.earnings.diamondsEarned} icon="diamond" subtitle="this period" colors={colors} />
        <KpiCard title="Outstanding" value={data.earnings.diamondsOutstanding} icon="wallet" subtitle="available to cash out" colors={colors} />
        <KpiCard title="Gifts Received" value={data.earnings.giftsReceivedCount} icon="gift" colors={colors} />
        <KpiCard title="Avg Gift" value={data.earnings.avgGiftReceived} icon="trending-up" subtitle="diamonds" colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Diamonds Earned Over Time</Text>
        <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Ionicons name="trending-up" size={48} color={colors.subtleText} />
          <Text style={[styles.chartPlaceholderText, { color: colors.subtleText }]}>Chart visualization</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Top Supporters</Text>
        {data.earnings.topGifters.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>No gifts received yet</Text>
        ) : (
          data.earnings.topGifters.map((gifter, idx) => (
            <UserRow
              key={gifter.id}
              username={`@${gifter.username}`}
              displayName={gifter.displayName}
              value={`${gifter.totalCoins.toLocaleString()} 🪙`}
              subtitle={`${gifter.giftCount} gifts`}
              badge={idx < 3 ? (tierBadges[gifter.tierKey] || ['🏆', '🥈', '🥉'][idx]) : undefined}
              colors={colors}
            />
          ))
        )}
      </View>
    </View>
  );
}

function StreamsTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.kpiGrid}>
        <KpiCard title="Live Sessions" value={data.streams.totalSessions} icon="radio" colors={colors} />
        <KpiCard title="Total Time" value={formatDuration(data.streams.totalMinutes)} icon="time" colors={colors} />
        <KpiCard title="Avg Viewers" value={data.streams.avgViewers} icon="people" colors={colors} />
        <KpiCard title="Peak Viewers" value={data.streams.peakViewers} icon="trending-up" colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Stream Sessions</Text>
        {data.streams.sessions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>No streams yet</Text>
        ) : (
          data.streams.sessions.slice(0, 10).map((session) => (
            <StreamRow
              key={session.id}
              date={formatDate(session.date)}
              duration={formatDuration(session.duration)}
              peak={session.peakViewers}
              views={session.totalViews}
              colors={colors}
            />
          ))
        )}
      </View>
    </View>
  );
}

function StreamRow({ date, duration, peak, views, colors }: { date: string; duration: string; peak: number; views: number; colors: any }) {
  return (
    <View style={[styles.streamRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.streamDate, { color: colors.text }]}>{date}</Text>
      <View style={styles.streamStats}>
        <Text style={[styles.streamDuration, { color: colors.link }]}>{duration}</Text>
        <Text style={[styles.streamPeak, { color: colors.mutedText }]}>👁 {peak}</Text>
        <Text style={[styles.streamViews, { color: colors.subtleText }]}>{views.toLocaleString()} views</Text>
      </View>
    </View>
  );
}

function BadgesTab({ colors, data }: { colors: any; data: AnalyticsData }) {
  const gs = data.gifterStatus;
  const tierEmoji = gs?.tierIcon || '🥉';
  const tierName = gs?.tierName || 'Starter';
  const level = gs?.level ?? 1;
  const progressPct = gs?.progressPct ?? 0;
  const lifetimeCoins = gs?.lifetimeCoins ?? 0;
  const nextLevelCoins = gs?.nextLevelCoins ?? 0;
  const coinsNeeded = Math.max(0, nextLevelCoins - lifetimeCoins);
  const currentTierKey = gs?.tierKey || 'starter';

  const tiers = [
    { key: 'diamond', tier: 'Diamond', level: '20+', emoji: '💎' },
    { key: 'platinum', tier: 'Platinum', level: '16-19', emoji: '⭐' },
    { key: 'gold', tier: 'Gold', level: '11-15', emoji: '🏆' },
    { key: 'silver', tier: 'Silver', level: '6-10', emoji: '🥈' },
    { key: 'bronze', tier: 'Bronze', level: '1-5', emoji: '🥉' },
  ];
  const tierOrder = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'starter'];
  const currentIdx = tierOrder.indexOf(currentTierKey);

  return (
    <View style={styles.tabContent}>
      <View style={[styles.tierCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <View style={styles.tierHeader}>
          <View style={[styles.tierIconLarge, { backgroundColor: colors.surface }]}>
            <Text style={styles.tierEmoji}>{tierEmoji}</Text>
          </View>
          <View style={styles.tierInfo}>
            <Text style={[styles.tierName, { color: colors.text }]}>{tierName}</Text>
            <Text style={[styles.tierLevel, { color: colors.mutedText }]}>Level {level}</Text>
          </View>
        </View>
        
        <View style={styles.tierProgress}>
          <Text style={[styles.tierProgressLabel, { color: colors.mutedText }]}>Progress to Level {level + 1}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={[styles.tierProgressText, { color: colors.subtleText }]}>{Math.round(progressPct)}% • {coinsNeeded.toLocaleString()} more coins needed</Text>
        </View>

        <View style={styles.tierStats}>
          <View style={styles.tierStat}>
            <Text style={[styles.tierStatLabel, { color: colors.mutedText }]}>Lifetime Coins</Text>
            <Text style={[styles.tierStatValue, { color: colors.text }]}>{lifetimeCoins.toLocaleString()} 🪙</Text>
          </View>
          <View style={styles.tierStat}>
            <Text style={[styles.tierStatLabel, { color: colors.mutedText }]}>Next Milestone</Text>
            <Text style={[styles.tierStatValue, { color: colors.text }]}>{nextLevelCoins.toLocaleString()} 🪙</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>All Tiers</Text>
        {tiers.map((t) => {
          const tIdx = tierOrder.indexOf(t.key);
          const isCurrent = t.key === currentTierKey;
          const isLocked = tIdx < currentIdx;
          return <TierRow key={t.key} tier={t.tier} level={t.level} emoji={t.emoji} locked={isLocked} current={isCurrent} colors={colors} />;
        })}
      </View>
    </View>
  );
}

function TierRow({ tier, level, emoji, locked, current, colors }: { tier: string; level: string; emoji: string; locked: boolean; current?: boolean; colors: any }) {
  return (
    <View style={[styles.tierRowItem, { backgroundColor: colors.surface2 }, current && [styles.tierRowCurrent, { backgroundColor: colors.surface, borderColor: colors.link }]]}>
      <View style={styles.tierRowLeft}>
        <Text style={styles.tierRowEmoji}>{emoji}</Text>
        <View>
          <Text style={[styles.tierRowName, { color: colors.text }]}>{tier}</Text>
          <Text style={[styles.tierRowLevel, { color: colors.mutedText }]}>Level {level}</Text>
        </View>
      </View>
      {current && <Text style={[styles.tierRowBadge, { color: colors.link }]}>Current</Text>}
      {locked && <Ionicons name="lock-closed" size={20} color={colors.subtleText} />}
    </View>
  );
}

function SettingsTab({ colors }: { colors: any }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy Settings</Text>
        <SettingToggle label="Show Gifter Badge" description="Display your gifter tier badge on your profile" enabled={true} colors={colors} />
        <SettingToggle label="Public Follower Count" description="Show follower/following counts on your profile" enabled={true} colors={colors} />
        <SettingToggle label="Show Gift Stats" description="Display total gifts received publicly" enabled={false} colors={colors} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Export</Text>
        <Text style={[styles.settingDescription, { color: colors.mutedText }]}>Download a copy of your analytics data</Text>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.surface2 }]} disabled>
          <Text style={[styles.exportButtonText, { color: colors.subtleText }]}>Export Data (Coming Soon)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SettingToggle({ label, description, enabled, colors }: { label: string; description: string; enabled: boolean; colors: any }) {
  return (
    <View style={[styles.settingRow, { backgroundColor: colors.surface2 }]}>
      <View style={styles.settingLeft}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.settingDescription, { color: colors.mutedText }]}>{description}</Text>
      </View>
      <View style={[styles.toggle, { backgroundColor: colors.border }, enabled && styles.toggleActive]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
      </View>
    </View>
  );
}

function UserRow({ username, displayName, value, subtitle, badge, colors }: { username: string; displayName: string; value: string; subtitle: string; badge?: string; colors: any }) {
  return (
    <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: colors.surface2 }]}>
        <Text style={[styles.userAvatarText, { color: colors.link }]}>{displayName[0]}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.userUsername, { color: colors.mutedText }]}>{username}</Text>
      </View>
      <View style={styles.userRight}>
        {badge && <Text style={styles.userBadge}>{badge}</Text>}
        <Text style={[styles.userValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.userSubtitle, { color: colors.mutedText }]}>{subtitle}</Text>
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
  diamondAmount: {
    color: '#a855f7',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 16,
    textAlign: 'center',
  },
});
