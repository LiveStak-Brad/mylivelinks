'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Wallet,
  Gift,
  Gem,
  Radio,
  Award,
  Settings,
  Coins,
  TrendingUp,
  Users,
  ShoppingCart,
  Banknote,
} from 'lucide-react';

import {
  DashboardPage,
  DashboardSection,
  KpiGrid,
  KpiCard,
  type DashboardTab,
} from '@/components/layout';
import {
  AnalyticsChart,
  TopUsersTable,
  DataTable,
  DateRangePicker,
  TierProgressCard,
  getDateRangeFromPreset,
  type DateRange,
  type DataTableColumn,
} from '@/components/analytics';
import { Button, Skeleton, Badge } from '@/components/ui';
import GifterBadge from '@/components/gifter/GifterBadge';

type AnalyticsTab = 'overview' | 'wallet' | 'gifting' | 'earnings' | 'streams' | 'badges' | 'settings';

interface AnalyticsData {
  overview: {
    coinsBalance: number;
    diamondsBalance: number;
    totalCoinsSpent: number;
    totalGiftsReceived: number;
    lifetimeDiamondsEarned: number;
    totalGiftsSent: number;
    followerCount: number;
    followingCount: number;
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
      avatarUrl: string;
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
      avatarUrl: string;
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
    tierColor: string;
    tierIcon: string;
    level: number;
    levelInTier: number;
    tierLevelMax: number;
    isDiamond: boolean;
    progressPct: number;
    lifetimeCoins: number;
    nextLevelCoins: number;
  } | null;
  charts: {
    coinsSpentOverTime: Array<{ label: string; value: number }>;
    diamondsEarnedOverTime: Array<{ label: string; value: number }>;
  };
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    coinsDelta: number;
    diamondsDelta: number;
    note: string;
  }>;
  isOwnProfile: boolean;
  canViewPrivate: boolean;
}

export default function MyAnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('30d'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const rangeParam = dateRange.preset === 'all' ? 'all' : 
                         dateRange.preset === '7d' ? '7d' : 
                         dateRange.preset === '90d' ? '90d' : '30d';
      
      const res = await fetch(`/api/user-analytics?range=${rangeParam}`, {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const body = await res.json().catch(() => null);
        const serverMsg = typeof body?.error === 'string' ? body.error : null;
        const serverDetails = typeof body?.details === 'string' ? body.details : null;
        const msg = serverMsg || `Analytics request failed (${res.status})`;
        throw new Error(serverDetails ? `${msg}: ${serverDetails}` : msg);
      }
      
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error('[Analytics] Error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const transactionColumns: DataTableColumn<AnalyticsData['transactions'][0]>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const variants: Record<string, 'success' | 'primary' | 'info' | 'warning' | 'default'> = {
          coin_purchase: 'success',
          coin_spend_gift: 'primary',
          diamond_earn: 'info',
          diamond_debit_cashout: 'warning',
        };
        return (
          <Badge variant={variants[row.type] || 'default'} size="sm">
            {row.note}
          </Badge>
        );
      },
    },
    {
      key: 'coinsDelta',
      header: 'Coins',
      align: 'right',
      render: (row) => {
        if (row.coinsDelta === 0) return <span className="text-muted-foreground">—</span>;
        const isPositive = row.coinsDelta > 0;
        return (
          <span className={isPositive ? 'text-success' : 'text-destructive'}>
            {isPositive ? '+' : ''}{row.coinsDelta.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'diamondsDelta',
      header: 'Diamonds',
      align: 'right',
      render: (row) => {
        if (row.diamondsDelta === 0) return <span className="text-muted-foreground">—</span>;
        const isPositive = row.diamondsDelta > 0;
        return (
          <span className={isPositive ? 'text-info' : 'text-destructive'}>
            {isPositive ? '+' : ''}{row.diamondsDelta.toLocaleString()}
          </span>
        );
      },
    },
  ];

  const streamColumns: DataTableColumn<AnalyticsData['streams']['sessions'][0]>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => <span className="text-foreground font-medium">{formatDuration(row.duration)}</span>,
    },
    {
      key: 'peakViewers',
      header: 'Peak Viewers',
      align: 'right',
      render: (row) => <span className="text-primary">{row.peakViewers.toLocaleString()}</span>,
    },
    {
      key: 'totalViews',
      header: 'Total Views',
      align: 'right',
      render: (row) => <span className="text-muted-foreground">{row.totalViews.toLocaleString()}</span>,
    },
  ];

  // Build tabs content
  const tabs: DashboardTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <KpiGrid columns={5}>
            <KpiCard
              title="Coins Balance"
              value={data?.overview.coinsBalance || 0}
              icon={<Coins className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Diamonds Balance"
              value={data?.overview.diamondsBalance || 0}
              icon={<Gem className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Total Spent"
              value={data?.overview.totalCoinsSpent || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              subtitle="Coins gifted"
              loading={loading}
            />
            <KpiCard
              title="Gifts Received"
              value={data?.overview.totalGiftsReceived || 0}
              icon={<Gift className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Diamonds Earned"
              value={data?.overview.lifetimeDiamondsEarned || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              loading={loading}
            />
          </KpiGrid>
          
          {/* Rank & Badge Module */}
          {data?.gifterStatus && (
            <DashboardSection title="Gifter Rank & Badge">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ 
                    backgroundColor: `hsl(var(--primary) / 0.1)`,
                  }}
                >
                  <GifterBadge 
                    tier_key={data.gifterStatus.tierKey} 
                    level={data.gifterStatus.level} 
                    size="lg" 
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{data.gifterStatus.tierName}</p>
                  <p className="text-sm text-muted-foreground">
                    Level {data.gifterStatus.level} • {data.gifterStatus.progressPct}% to next level
                  </p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${data.gifterStatus.progressPct}%` }}
                />
              </div>
            </DashboardSection>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Coins Spent Over Time"
              data={data?.charts.coinsSpentOverTime || []}
              type="area"
              colors={{ primary: 'hsl(var(--warning))' }}
              loading={loading}
            />
            <AnalyticsChart
              title="Diamonds Earned Over Time"
              data={data?.charts.diamondsEarnedOverTime || []}
              type="area"
              colors={{ primary: 'hsl(var(--info))' }}
              loading={loading}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <Wallet className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardSection className="bg-warning/5 border-warning/20">
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-6 h-6 text-warning" />
                <h3 className="text-lg font-semibold text-foreground">Coins Balance</h3>
              </div>
              <p className="text-4xl font-bold text-warning mb-4">
                🪙 {(data?.wallet.coinsBalance || 0).toLocaleString()}
              </p>
              <Button
                onClick={() => router.push('/wallet')}
                className="w-full"
                leftIcon={<ShoppingCart className="w-4 h-4" />}
              >
                Buy More Coins
              </Button>
            </DashboardSection>
            
            <DashboardSection className="bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <Gem className="w-6 h-6 text-info" />
                <h3 className="text-lg font-semibold text-foreground">Diamonds Balance</h3>
              </div>
              <p className="text-4xl font-bold text-info mb-2">
                💎 {(data?.wallet.diamondsBalance || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ≈ ${(data?.wallet.diamondsUsd || 0).toFixed(2)} USD
              </p>
              <Button
                onClick={() => router.push('/wallet')}
                variant="secondary"
                className="w-full"
                leftIcon={<Banknote className="w-4 h-4" />}
              >
                Cash Out
              </Button>
            </DashboardSection>
          </div>
          
          <DataTable
            title="Recent Transactions"
            subtitle="Last 50 transactions"
            columns={transactionColumns}
            data={data?.transactions || []}
            loading={loading}
            keyExtractor={(row) => row.id}
            emptyMessage="No transactions yet"
            maxRows={50}
          />
        </div>
      ),
    },
    {
      id: 'gifting',
      label: 'Gifting',
      icon: <Gift className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <KpiGrid columns={4}>
            <KpiCard
              title="Gifts Sent"
              value={data?.gifting.giftsSentCount || 0}
              icon={<Gift className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Coins Spent"
              value={data?.gifting.totalCoinsSpent || 0}
              icon={<Coins className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Avg Gift"
              value={data?.gifting.avgGiftSize || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              subtitle="coins per gift"
              loading={loading}
            />
            <KpiCard
              title="Biggest Gift"
              value={data?.gifting.biggestGift || 0}
              icon={<Award className="w-5 h-5" />}
              subtitle="coins"
              loading={loading}
            />
          </KpiGrid>
          
          <AnalyticsChart
            title="Coins Spent Over Time"
            data={data?.charts.coinsSpentOverTime || []}
            type="area"
            colors={{ primary: 'hsl(var(--accent))' }}
            loading={loading}
          />
          
          <TopUsersTable
            title="Top Creators You've Supported"
            users={(data?.gifting.topCreatorsGifted || []).map(c => ({
              id: c.id,
              username: c.username,
              displayName: c.displayName,
              avatarUrl: c.avatarUrl,
              primaryValue: c.totalCoins,
              secondaryValue: c.giftCount,
            }))}
            columns={{
              primary: { label: 'Coins', suffix: ' 🪙' },
              secondary: { label: 'Gifts' },
            }}
            loading={loading}
            onUserClick={(id) => {
              const user = data?.gifting.topCreatorsGifted.find(u => u.id === id);
              if (user) router.push(`/${user.username}`);
            }}
          />
        </div>
      ),
    },
    {
      id: 'earnings',
      label: 'Earnings',
      icon: <Gem className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <KpiGrid columns={4}>
            <KpiCard
              title="Diamonds Earned"
              value={data?.earnings.diamondsEarned || 0}
              icon={<Gem className="w-5 h-5" />}
              subtitle="this period"
              loading={loading}
            />
            <KpiCard
              title="Outstanding"
              value={data?.earnings.diamondsOutstanding || 0}
              icon={<Wallet className="w-5 h-5" />}
              subtitle="available to cash out"
              loading={loading}
            />
            <KpiCard
              title="Gifts Received"
              value={data?.earnings.giftsReceivedCount || 0}
              icon={<Gift className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Avg Gift"
              value={data?.earnings.avgGiftReceived || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              subtitle="diamonds"
              loading={loading}
            />
          </KpiGrid>
          
          <AnalyticsChart
            title="Diamonds Earned Over Time"
            data={data?.charts.diamondsEarnedOverTime || []}
            type="area"
            colors={{ primary: 'hsl(var(--info))' }}
            loading={loading}
          />
          
          <TopUsersTable
            title="Your Top Supporters"
            users={(data?.earnings.topGifters || []).map(g => ({
              id: g.id,
              username: g.username,
              displayName: g.displayName,
              avatarUrl: g.avatarUrl,
              primaryValue: g.totalCoins,
              secondaryValue: g.giftCount,
              badge: <GifterBadge tier_key={g.tierKey} level={1} size="sm" showLevel={false} />,
            }))}
            columns={{
              primary: { label: 'Coins Given', suffix: ' 🪙' },
              secondary: { label: 'Gifts' },
            }}
            loading={loading}
            onUserClick={(id) => {
              const user = data?.earnings.topGifters.find(u => u.id === id);
              if (user) router.push(`/${user.username}`);
            }}
          />
        </div>
      ),
    },
    {
      id: 'streams',
      label: 'Streams',
      icon: <Radio className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <KpiGrid columns={4}>
            <KpiCard
              title="Live Sessions"
              value={data?.streams.totalSessions || 0}
              icon={<Radio className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Total Time"
              value={formatDuration(data?.streams.totalMinutes || 0)}
              icon={<BarChart3 className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Avg Viewers"
              value={data?.streams.avgViewers || 0}
              icon={<Users className="w-5 h-5" />}
              loading={loading}
            />
            <KpiCard
              title="Peak Viewers"
              value={data?.streams.peakViewers || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              loading={loading}
            />
          </KpiGrid>
          
          <DataTable
            title="Stream Sessions"
            columns={streamColumns}
            data={data?.streams.sessions || []}
            loading={loading}
            keyExtractor={(row) => row.id}
            emptyMessage="No streams in this period"
          />
        </div>
      ),
    },
    {
      id: 'badges',
      label: 'Badges & Rank',
      icon: <Award className="w-4 h-4" />,
      content: data?.gifterStatus ? (
        <TierProgressCard
          tierKey={data.gifterStatus.tierKey}
          tierName={data.gifterStatus.tierName}
          tierColor={data.gifterStatus.tierColor}
          tierIcon={data.gifterStatus.tierIcon}
          level={data.gifterStatus.level}
          levelInTier={data.gifterStatus.levelInTier}
          tierLevelMax={data.gifterStatus.tierLevelMax}
          isDiamond={data.gifterStatus.isDiamond}
          progressPct={data.gifterStatus.progressPct}
          lifetimeCoins={data.gifterStatus.lifetimeCoins}
          nextLevelCoins={data.gifterStatus.nextLevelCoins}
          loading={loading}
        />
      ) : !loading ? (
        <DashboardSection className="text-center py-12">
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Gifter Status Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start sending gifts to earn your first tier badge!
          </p>
          <Button onClick={() => router.push('/room/live-central')}>
            Find Streamers to Support
          </Button>
        </DashboardSection>
      ) : (
        <Skeleton className="h-64 w-full rounded-xl" />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <DashboardSection title="Privacy Settings">
            <div className="space-y-4">
              <PrivacyToggle
                label="Show Gifter Badge"
                description="Display your gifter tier badge on your profile"
                defaultChecked
              />
              <PrivacyToggle
                label="Public Follower Count"
                description="Show follower/following counts on your profile"
                defaultChecked
              />
              <PrivacyToggle
                label="Show Gift Stats"
                description="Display total gifts received publicly"
                defaultChecked
              />
            </div>
          </DashboardSection>
          
          <DashboardSection title="Data Export">
            <p className="text-sm text-muted-foreground mb-4">
              Download a copy of your analytics data
            </p>
            <Button variant="secondary" disabled>
              Export Data (Coming Soon)
            </Button>
          </DashboardSection>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage
      title="My Analytics"
      description="Track your activity, earnings, and stats"
      icon={<BarChart3 className="w-6 h-6" />}
      tabs={tabs}
      defaultTab="overview"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as AnalyticsTab)}
      onRefresh={loadData}
      isRefreshing={refreshing}
      isLoading={loading}
      error={error}
      headerActions={
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      }
    />
  );
}

// Privacy toggle component
function PrivacyToggle({ 
  label, 
  description, 
  defaultChecked 
}: { 
  label: string; 
  description: string; 
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  
  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-muted'}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}
