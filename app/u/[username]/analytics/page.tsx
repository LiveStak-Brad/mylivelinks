'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  BarChart3,
  ArrowLeft,
  Users,
  Heart,
  Gift,
  Award,
  Lock,
  ExternalLink,
  RefreshCw,
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
  type DataTableColumn,
} from '@/components/analytics';
import GifterBadge from '@/components/gifter/GifterBadge';

type AnalyticsTab = 'overview' | 'gifting' | 'earnings' | 'badges';

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

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export default function UserAnalyticsPage() {
  const router = useRouter();
  const params = useParams<{ username?: string }>();
  const username = params?.username ?? '';
  if (!username) return null;
  
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('30d'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // First, load the profile to get the ID
  useEffect(() => {
    if (!username) return;
    
    (async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', username)
        .single();
      
      if (profileError || !profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }
      
      setProfile(profileData);
    })();
  }, [username]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      const rangeParam = dateRange.preset === 'all' ? 'all' : 
                         dateRange.preset === '7d' ? '7d' : 
                         dateRange.preset === '90d' ? '90d' : '30d';
      
      const res = await fetch(`/api/user-analytics?profileId=${profile.id}&range=${rangeParam}`, {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        throw new Error('Failed to load analytics');
      }
      
      const analyticsData = await res.json();
      setData(analyticsData);
      
      // If this is their own profile, redirect to /me/analytics
      if (analyticsData.isOwnProfile) {
        router.replace('/me/analytics');
        return;
      }
    } catch (err: any) {
      console.error('[Analytics] Error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, dateRange, router]);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [loadData, profile]);

  // Public-only tabs for viewing other users
  const tabs: { id: AnalyticsTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'badges', label: 'Badges', icon: Award },
  ];

  if (error === 'Profile not found') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">This user doesn't exist or has been removed.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {(profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {profile?.display_name || profile?.username || 'User'} Stats
                  </h1>
                  <p className="text-sm text-gray-400">
                    @{profile?.username || 'loading'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => profile && router.push(`/${profile.username}`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">View Profile</span>
              </button>
              
              <button
                onClick={loadData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6">
        {error && error !== 'Profile not found' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}
        
        {/* Private Data Notice */}
        {data && !data.canViewPrivate && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Limited View</p>
              <p className="text-sm text-yellow-200/70">
                You're seeing public stats only. Wallet balances and detailed analytics are private.
              </p>
            </div>
          </div>
        )}

        {/* Overview Tab - Public Stats */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Public KPIs */}
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
                title="Gifts Received"
                value={data?.overview.totalGiftsReceived || 0}
                icon={<Gift className="w-5 h-5 text-cyan-400" />}
                loading={loading}
              />
              <KpiCard
                title="Streams"
                value={data?.streams.totalSessions || 0}
                icon={<BarChart3 className="w-5 h-5 text-green-400" />}
                loading={loading}
              />
            </div>
            
            {/* Gifter Badge Display */}
            {data?.gifterStatus && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Gifter Status
                </h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ 
                      backgroundColor: `${data.gifterStatus.tierColor}20`,
                      border: `2px solid ${data.gifterStatus.tierColor}50`,
                    }}
                  >
                    {data.gifterStatus.tierIcon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-white">{data.gifterStatus.tierName}</h2>
                      <GifterBadge 
                        tier_key={data.gifterStatus.tierKey} 
                        level={data.gifterStatus.level} 
                        size="md" 
                      />
                    </div>
                    <p className="text-sm text-gray-400">
                      Global Level {data.gifterStatus.level}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Top Supporters (Public) */}
            {data?.earnings.topGifters && data.earnings.topGifters.length > 0 && (
              <TopUsersTable
                title="Top Supporters"
                users={data.earnings.topGifters.slice(0, 5).map(g => ({
                  id: g.id,
                  username: g.username,
                  displayName: g.displayName,
                  avatarUrl: g.avatarUrl,
                  primaryValue: g.totalCoins,
                  secondaryValue: g.giftCount,
                  badge: <GifterBadge tier_key={g.tierKey} level={1} size="sm" showLevel={false} />,
                }))}
                columns={{
                  primary: { label: 'Coins', suffix: ' 🪙' },
                  secondary: { label: 'Gifts' },
                }}
                loading={loading}
                maxRows={5}
              />
            )}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && data?.gifterStatus && (
          <div className="max-w-2xl">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ 
                    backgroundColor: `${data.gifterStatus.tierColor}20`,
                    border: `3px solid ${data.gifterStatus.tierColor}50`,
                  }}
                >
                  {data.gifterStatus.tierIcon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{data.gifterStatus.tierName}</h2>
                    <GifterBadge 
                      tier_key={data.gifterStatus.tierKey} 
                      level={data.gifterStatus.level} 
                      size="lg" 
                    />
                  </div>
                  <p className="text-gray-400">
                    Global Level {data.gifterStatus.level} • {data.gifterStatus.isDiamond ? 'Diamond Tier' : `Level ${data.gifterStatus.levelInTier} of ${data.gifterStatus.tierLevelMax}`}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{data.gifterStatus.progressPct}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${data.gifterStatus.progressPct}%`,
                      backgroundColor: data.gifterStatus.tierColor,
                    }}
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                This user has achieved the {data.gifterStatus.tierName} tier by supporting creators on MyLiveLinks!
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'badges' && !data?.gifterStatus && !loading && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center max-w-2xl">
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Badges Yet</h3>
            <p className="text-gray-400">
              This user hasn't earned any gifter badges yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}







