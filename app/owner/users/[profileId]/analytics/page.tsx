'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  BarChart3,
  Wallet,
  Gift,
  Gem,
  Radio,
  Award,
  RefreshCw,
  ArrowLeft,
  Coins,
  TrendingUp,
  Users,
  Heart,
  ShoppingCart,
  Banknote,
  Shield,
  ExternalLink,
} from 'lucide-react';

import {
  KpiCard,
  AnalyticsChart,
  TopUsersTable,
  DataTable,
  DateRangePicker,
  TierProgressCard,
  getDateRangeFromPreset,
  type DateRange,
  type TopUser,
  type DataTableColumn,
} from '@/components/analytics';
import GifterBadge from '@/components/gifter/GifterBadge';

type AnalyticsTab = 'overview' | 'wallet' | 'gifting' | 'earnings' | 'streams' | 'badges';

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

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  email?: string;
  created_at?: string;
}

const tabs: { id: AnalyticsTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'gifting', label: 'Gifting', icon: Gift },
  { id: 'earnings', label: 'Earnings', icon: Gem },
  { id: 'streams', label: 'Streams', icon: Radio },
  { id: 'badges', label: 'Badges', icon: Award },
];

export default function AdminUserAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params?.profileId as string;
  
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('30d'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user profile data
  useEffect(() => {
    if (!profileId) return;
    
    (async () => {
      try {
        const res = await fetch(`/api/admin/users?search=${profileId}`);
        if (res.ok) {
          const { users } = await res.json();
          const user = users?.find((u: any) => u.id === profileId);
          if (user) {
            setUserProfile(user);
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    })();
  }, [profileId]);

  const loadData = useCallback(async () => {
    if (!profileId) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      const rangeParam = dateRange.preset === 'all' ? 'all' : 
                         dateRange.preset === '7d' ? '7d' : 
                         dateRange.preset === '90d' ? '90d' : '30d';
      
      const res = await fetch(`/api/user-analytics?profileId=${profileId}&range=${rangeParam}`, {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          router.push('/owner');
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
      console.error('[Admin Analytics] Error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId, dateRange, router]);

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
      render: (row) => <span className="text-gray-400">{formatDate(row.date)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const typeColors: Record<string, string> = {
          coin_purchase: 'bg-green-500/20 text-green-400',
          coin_spend_gift: 'bg-pink-500/20 text-pink-400',
          diamond_earn: 'bg-cyan-500/20 text-cyan-400',
          diamond_debit_cashout: 'bg-yellow-500/20 text-yellow-400',
        };
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[row.type] || 'bg-gray-500/20 text-gray-400'}`}>
            {row.note}
          </span>
        );
      },
    },
    {
      key: 'coinsDelta',
      header: 'Coins',
      align: 'right',
      render: (row) => {
        if (row.coinsDelta === 0) return <span className="text-gray-500">—</span>;
        const isPositive = row.coinsDelta > 0;
        return (
          <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
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
        if (row.diamondsDelta === 0) return <span className="text-gray-500">—</span>;
        const isPositive = row.diamondsDelta > 0;
        return (
          <span className={isPositive ? 'text-cyan-400' : 'text-red-400'}>
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
      render: (row) => <span className="text-gray-300">{formatDate(row.date)}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => <span className="text-white font-medium">{formatDuration(row.duration)}</span>,
    },
    {
      key: 'peakViewers',
      header: 'Peak Viewers',
      align: 'right',
      render: (row) => <span className="text-purple-400">{row.peakViewers.toLocaleString()}</span>,
    },
    {
      key: 'totalViews',
      header: 'Total Views',
      align: 'right',
      render: (row) => <span className="text-gray-300">{row.totalViews.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/owner')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.display_name || userProfile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {(userProfile?.display_name || userProfile?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    {userProfile?.display_name || userProfile?.username || 'User'} Analytics
                  </h1>
                  <p className="text-sm text-gray-400">
                    @{userProfile?.username || profileId.substring(0, 8)}... • Admin View
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {userProfile && (
                <button
                  onClick={() => router.push(`/${userProfile.username}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">View Profile</span>
                </button>
              )}
              
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              
              <button
                onClick={loadData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto scrollbar-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-gray-900 text-white border-t border-l border-r border-gray-700'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Admin Notice */}
      <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3">
        <p className="text-red-400 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="font-medium">Admin View:</span>
          <span className="text-red-300">You are viewing full analytics for this user.</span>
        </p>
      </div>

      {/* Content */}
      <main className="p-4 md:p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard
                title="Coins Balance"
                value={data?.overview.coinsBalance || 0}
                icon={<Coins className="w-5 h-5 text-yellow-400" />}
                loading={loading}
              />
              <KpiCard
                title="Diamonds Balance"
                value={data?.overview.diamondsBalance || 0}
                icon={<Gem className="w-5 h-5 text-cyan-400" />}
                loading={loading}
              />
              <KpiCard
                title="Total Spent"
                value={data?.overview.totalCoinsSpent || 0}
                icon={<TrendingUp className="w-5 h-5 text-pink-400" />}
                subtitle="Coins gifted"
                loading={loading}
              />
              <KpiCard
                title="Gifts Received"
                value={data?.overview.totalGiftsReceived || 0}
                icon={<Gift className="w-5 h-5 text-purple-400" />}
                loading={loading}
              />
              <KpiCard
                title="Diamonds Earned"
                value={data?.overview.lifetimeDiamondsEarned || 0}
                icon={<Gem className="w-5 h-5 text-green-400" />}
                loading={loading}
              />
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Followers"
                value={data?.overview.followerCount || 0}
                icon={<Users className="w-5 h-5 text-purple-400" />}
                loading={loading}
              />
              <KpiCard
                title="Following"
                value={data?.overview.followingCount || 0}
                icon={<Heart className="w-5 h-5 text-pink-400" />}
                loading={loading}
              />
              <KpiCard
                title="Gifts Sent"
                value={data?.overview.totalGiftsSent || 0}
                icon={<Gift className="w-5 h-5 text-orange-400" />}
                loading={loading}
              />
              <KpiCard
                title="Streams"
                value={data?.streams.totalSessions || 0}
                icon={<Radio className="w-5 h-5 text-red-400" />}
                loading={loading}
              />
            </div>
            
            {/* Gifter Badge */}
            {data?.gifterStatus && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    Gifter Status
                  </h3>
                  <GifterBadge 
                    tier_key={data.gifterStatus.tierKey} 
                    level={data.gifterStatus.level} 
                    size="lg" 
                  />
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ 
                      backgroundColor: `${data.gifterStatus.tierColor}20`,
                      border: `2px solid ${data.gifterStatus.tierColor}50`,
                    }}
                  >
                    {data.gifterStatus.tierIcon}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{data.gifterStatus.tierName}</p>
                    <p className="text-sm text-gray-400">
                      Level {data.gifterStatus.level} • {data.gifterStatus.progressPct}% to next level
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${data.gifterStatus.progressPct}%`,
                      backgroundColor: data.gifterStatus.tierColor,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Coins Spent Over Time"
                data={data?.charts.coinsSpentOverTime || []}
                type="area"
                colors={{ primary: '#eab308' }}
                loading={loading}
              />
              <AnalyticsChart
                title="Diamonds Earned Over Time"
                data={data?.charts.diamondsEarnedOverTime || []}
                type="area"
                colors={{ primary: '#06b6d4' }}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/20 rounded-xl border border-yellow-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Coins className="w-6 h-6 text-yellow-400" />
                    Coins Balance
                  </h3>
                </div>
                <p className="text-4xl font-bold text-yellow-400 mb-2">
                  🪙 {(data?.wallet.coinsBalance || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  Available for gifting
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Gem className="w-6 h-6 text-cyan-400" />
                    Diamonds Balance
                  </h3>
                </div>
                <p className="text-4xl font-bold text-cyan-400 mb-2">
                  💎 {(data?.wallet.diamondsBalance || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  ≈ ${(data?.wallet.diamondsUsd || 0).toFixed(2)} USD (cashout value)
                </p>
              </div>
            </div>
            
            {/* Transaction History */}
            <DataTable
              title="Transaction History"
              subtitle="Full ledger for this user"
              columns={transactionColumns}
              data={data?.transactions || []}
              loading={loading}
              keyExtractor={(row) => row.id}
              emptyMessage="No transactions"
              maxRows={50}
            />
          </div>
        )}

        {/* Gifting Tab */}
        {activeTab === 'gifting' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Gifts Sent"
                value={data?.gifting.giftsSentCount || 0}
                icon={<Gift className="w-5 h-5 text-pink-400" />}
                loading={loading}
              />
              <KpiCard
                title="Coins Spent"
                value={data?.gifting.totalCoinsSpent || 0}
                icon={<Coins className="w-5 h-5 text-yellow-400" />}
                loading={loading}
              />
              <KpiCard
                title="Avg Gift"
                value={data?.gifting.avgGiftSize || 0}
                icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                subtitle="coins per gift"
                loading={loading}
              />
              <KpiCard
                title="Biggest Gift"
                value={data?.gifting.biggestGift || 0}
                icon={<Award className="w-5 h-5 text-cyan-400" />}
                subtitle="coins"
                loading={loading}
              />
            </div>
            
            <AnalyticsChart
              title="Coins Spent Over Time"
              data={data?.charts.coinsSpentOverTime || []}
              type="area"
              colors={{ primary: '#ec4899' }}
              loading={loading}
            />
            
            <TopUsersTable
              title="Top Creators Supported"
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
                if (user) router.push(`/owner/users/${id}/analytics`);
              }}
            />
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Diamonds Earned"
                value={data?.earnings.diamondsEarned || 0}
                icon={<Gem className="w-5 h-5 text-cyan-400" />}
                subtitle="this period"
                loading={loading}
              />
              <KpiCard
                title="Outstanding"
                value={data?.earnings.diamondsOutstanding || 0}
                icon={<Wallet className="w-5 h-5 text-green-400" />}
                subtitle="available to cash out"
                loading={loading}
              />
              <KpiCard
                title="Gifts Received"
                value={data?.earnings.giftsReceivedCount || 0}
                icon={<Gift className="w-5 h-5 text-pink-400" />}
                loading={loading}
              />
              <KpiCard
                title="Avg Gift"
                value={data?.earnings.avgGiftReceived || 0}
                icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                subtitle="diamonds"
                loading={loading}
              />
            </div>
            
            <AnalyticsChart
              title="Diamonds Earned Over Time"
              data={data?.charts.diamondsEarnedOverTime || []}
              type="area"
              colors={{ primary: '#06b6d4' }}
              loading={loading}
            />
            
            <TopUsersTable
              title="Top Supporters"
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
              onUserClick={(id) => router.push(`/owner/users/${id}/analytics`)}
            />
          </div>
        )}

        {/* Streams Tab */}
        {activeTab === 'streams' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Live Sessions"
                value={data?.streams.totalSessions || 0}
                icon={<Radio className="w-5 h-5 text-red-400" />}
                loading={loading}
              />
              <KpiCard
                title="Total Time"
                value={formatDuration(data?.streams.totalMinutes || 0)}
                icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
                loading={loading}
              />
              <KpiCard
                title="Avg Viewers"
                value={data?.streams.avgViewers || 0}
                icon={<Users className="w-5 h-5 text-purple-400" />}
                loading={loading}
              />
              <KpiCard
                title="Peak Viewers"
                value={data?.streams.peakViewers || 0}
                icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                loading={loading}
              />
            </div>
            
            <DataTable
              title="Stream Sessions"
              columns={streamColumns}
              data={data?.streams.sessions || []}
              loading={loading}
              keyExtractor={(row) => row.id}
              emptyMessage="No streams in this period"
            />
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && data?.gifterStatus && (
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
        )}
        
        {activeTab === 'badges' && !data?.gifterStatus && !loading && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Gifter Status</h3>
            <p className="text-gray-400">
              This user hasn't sent any gifts yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}






