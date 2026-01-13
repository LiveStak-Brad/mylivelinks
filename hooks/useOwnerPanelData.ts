/**
 * ============================================================================
 * OWNER PANEL DATA HOOK
 * ============================================================================
 * 
 * ⚠️ DO NOT MODIFY without testing against the owner dashboard UI at /owner
 * 
 * This hook fetches data from /api/owner/summary and maps it to UI types.
 * 
 * Key mappings (API → UI):
 * - stats.users_total → totalUsers
 * - stats.users_new_24h → usersNew24h
 * - stats.users_active_24h → dailyActiveUsers
 * - stats.gifts_today_count → giftsTodayCount
 * - stats.gifts_today_coins → giftsTodayCoins
 * - stats.reports_pending → pendingReports
 * - stats.revenue_today_usd_cents → revenueTodayUsdCents
 * - system_health.services.livekit.token_success_rate → tokenSuccessRate
 * - system_health.services.livekit.avg_join_time_ms → avgJoinTime
 * 
 * If you change any field names, update BOTH the API route AND this hook.
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import type { OwnerSummaryResponse } from '@/lib/ownerPanel';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  totalCreators: number;
  activeStreams: number;
  pendingReports: number;
  giftsTodayCount: number;
  giftsTodayCoins: number;
  totalRevenue: number;
  usersNew24h: number;
  dailyActiveUsers: number;
  revenueTodayUsdCents: number;
  revenue30dUsdCents: number;
  trends: {
    users: { value: number; direction: 'up' | 'down' };
    creators: { value: number; direction: 'up' | 'down' };
    streams: { value: number; direction: 'up' | 'down' };
    revenue: { value: number; direction: 'up' | 'down' };
  };
}

export interface LiveStream {
  id: string;
  roomName: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string | null;
  streamerAvatarUrl: string | null;
  viewerCount: number;
  startedAt: string;
  isAdultContent: boolean;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
  isVerified: boolean;
  coinBalance: number;
  createdAt: string;
}

export interface CreatorSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isAdultVerified: boolean;
  canStream: boolean;
  earningsBalance: number;
  totalStreamTime: number;
  followersCount: number;
}

export interface Report {
  id: string;
  reportType: 'user' | 'content' | 'stream';
  reportReason: string;
  reportDetails: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reporterUsername: string | null;
  targetUsername: string | null;
  createdAt: string;
}

export interface RevenueStats {
  totalRevenue: number;
  totalCoins: number;
  totalDiamonds: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topSpenders: Array<{
    userId: string;
    username: string;
    totalSpent: number;
  }>;
}

// Revenue Overview Stats (for /owner/revenue page)
export interface RevenueOverview {
  gross: number;
  net: number;
  refunds: number;
  chargebacks: number;
  trends: {
    gross: { value: number; direction: 'up' | 'down' };
    net: { value: number; direction: 'up' | 'down' };
  };
}

// Top Creators by Revenue
export interface TopCreatorRevenue {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  revenue: number;
  giftsReceived: number;
  streamsCount: number;
}

// Top Streams by Revenue
export interface TopStreamRevenue {
  id: string;
  streamerId: string;
  streamerUsername: string;
  roomName: string;
  revenue: number;
  durationMinutes: number;
  viewerCount: number;
  startedAt: string;
}

// Coin Pack Configuration
export interface CoinPack {
  id: string;
  sku: string;
  platform: 'web' | 'ios' | 'android';
  priceUsd: number;
  coinsAwarded: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Gift Type Configuration
export interface GiftTypeFull {
  id: number;
  name: string;
  coinCost: number;
  tier: number;
  iconUrl: string | null;
  animationUrl: string | null;
  isActive: boolean;
  displayOrder: number;
}

// Economy Settings
export interface EconomySettings {
  platformTakePercent: number;
  payoutThresholdUsd: number;
  minCoinPurchase: number;
  maxCoinPurchase: number;
  giftingEnabled: boolean;
  payoutsEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'purchase' | 'gift' | 'withdrawal' | 'refund';
  amount: number;
  coinAmount: number | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

export interface AnalyticsData {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  totalStreamTime: number;
  avgConcurrentViewers: number;
  peakViewers: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  category: 'core' | 'monetization' | 'social';
  lastChangedBy: string | null;
  lastChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
  };
  storage: {
    status: 'healthy' | 'degraded' | 'down';
    usedSpace: number;
    totalSpace: number;
  };
  livekit: {
    status: 'healthy' | 'degraded' | 'down';
    activeRooms: number;
    totalParticipants: number;
  };
  uptime: number;
  lastChecked: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ============================================================================
// OWNER PANEL DATA HOOK
// ============================================================================

export interface OwnerPanelData {
  stats: DashboardStats | null;
  liveNow: LiveStream[];
  users: UserSummary[];
  creators: CreatorSummary[];
  reports: Report[];
  revenue: RevenueStats | null;
  revenueOverview: RevenueOverview | null;
  topCreatorsByRevenue: TopCreatorRevenue[];
  topStreamsByRevenue: TopStreamRevenue[];
  transactions: Transaction[];
  coinPacks: CoinPack[];
  giftTypes: GiftTypeFull[];
  economySettings: EconomySettings | null;
  analytics: AnalyticsData | null;
  featureFlags: FeatureFlag[];
  systemHealth: SystemHealth | null;
  auditLogs: AuditLog[];
  platformHealth: PlatformHealth | null;
  liveStreamInfo: LiveStreamInfo[];
  recentReports: ReportInfo[];
  // Analytics chart data
  giftsOverTime: ChartDataPoint[];
  usersOverTime: ChartDataPoint[];
  streamsOverTime: ChartDataPoint[];
  topCreatorsToday: TopCreatorInfo[];
  referralsToday: ReferralInfo;
}

export interface UseOwnerPanelDataReturn {
  data: OwnerPanelData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Dashboard Component Helper Types
// ============================================================================

export interface LiveStreamInfo {
  id: string;
  streamer_username: string;
  streamer_avatar: string | null;
  viewer_count: number;
  gifts_per_min: number;
  chat_per_min: number;
  region: string;
  started_at: string;
  room_name: string;
}

export interface ReportInfo {
  id: string;
  reported_user_username: string | null;
  reported_stream_id: number | null;
  report_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  status: string;
}

export interface PlatformHealth {
  api: 'ok' | 'degraded' | 'down';
  supabase: 'ok' | 'degraded' | 'down';
  livekit: 'ok' | 'degraded' | 'down';
  tokenSuccessRate: number;
  avgJoinTime: number;
}

// Analytics types for charts
export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface TopCreatorInfo {
  id: string;
  username: string;
  avatarUrl: string | null;
  giftsReceived: number;
  coinsReceived: number;
}

export interface ReferralInfo {
  clicks: number;
  signups: number;
  topReferrer: { username: string; signups: number } | null;
}

// ============================================================================
// MOCK DATA (Only used in development, removed in production)
// ============================================================================

const MOCK_DATA: OwnerPanelData = {
  stats: null,
  liveNow: [],
  users: [],
  creators: [],
  reports: [],
  revenue: null,
  revenueOverview: null,
  topCreatorsByRevenue: [],
  topStreamsByRevenue: [],
  transactions: [],
  coinPacks: [],
  giftTypes: [],
  economySettings: null,
  analytics: null,
  featureFlags: [],
  systemHealth: null,
  auditLogs: [],
  platformHealth: null,
  liveStreamInfo: [],
  recentReports: [],
  giftsOverTime: [],
  usersOverTime: [],
  streamsOverTime: [],
  topCreatorsToday: [],
  referralsToday: { clicks: 0, signups: 0, topReferrer: null },
};

function coerceServiceStatus(v: unknown): 'ok' | 'degraded' | 'down' {
  const s = String(v ?? '').toLowerCase();
  if (s === 'ok') return 'ok';
  if (s === 'down') return 'down';
  return 'degraded';
}

function mapSummaryToOwnerPanelData(res: OwnerSummaryResponse): OwnerPanelData {
  if (!res.ok) return MOCK_DATA;

  const stats = res.data.stats;
  const systemHealth = res.data.system_health;

  const apiStatus: PlatformHealth['api'] = 'ok';
  const supabaseStatus: PlatformHealth['supabase'] = coerceServiceStatus(systemHealth?.services?.database?.status);
  const livekitStatus: PlatformHealth['livekit'] = coerceServiceStatus(systemHealth?.services?.livekit?.status);

  // Get LiveKit metrics from system_health if available
  const livekitService = systemHealth?.services?.livekit;
  const tokenSuccessRate = typeof livekitService?.token_success_rate === 'number' ? livekitService.token_success_rate : 0;
  const avgJoinTime = typeof livekitService?.avg_join_time_ms === 'number' ? livekitService.avg_join_time_ms : 0;

  const platformHealth: PlatformHealth = {
    api: apiStatus,
    supabase: supabaseStatus,
    livekit: livekitStatus,
    tokenSuccessRate,
    avgJoinTime,
  };

  const liveStreamInfo: LiveStreamInfo[] = (res.data.live_streams?.items ?? []).map((s) => ({
    id: String(s.stream_id ?? ''),
    streamer_username: String(s.host_username ?? 'unknown'),
    streamer_avatar: s.host_avatar_url ?? null,
    viewer_count: Number(s.viewer_count ?? 0),
    gifts_per_min: 0,
    chat_per_min: 0,
    region: 'all',
    started_at: s.started_at,
    room_name: String(s.title ?? s.room_slug ?? 'Unknown room'),
  }));

  const recentReports: ReportInfo[] = (res.data.reports?.items ?? []).map((r) => ({
    id: String(r.id ?? ''),
    reported_user_username: r.reported_user?.username ?? null,
    reported_stream_id: null,
    report_type: String(r.report_type ?? 'unknown'),
    severity: 'medium',
    created_at: r.created_at,
    status: String(r.status ?? 'pending'),
  }));

  const mappedStats: DashboardStats = {
    totalUsers: Number(stats.users_total ?? 0),
    totalCreators: Number(stats.profiles_total ?? 0),
    activeStreams: Number(stats.streams_live ?? 0),
    pendingReports: Number(stats.reports_pending ?? 0),
    giftsTodayCount: Number(stats.gifts_today_count ?? 0),
    giftsTodayCoins: Number(stats.gifts_today_coins ?? 0),
    totalRevenue: Number(stats.revenue_30d_usd_cents ?? 0),
    usersNew24h: Number(stats.users_new_24h ?? 0),
    dailyActiveUsers: Number(stats.users_active_24h ?? 0),
    revenueTodayUsdCents: Number(stats.revenue_today_usd_cents ?? 0),
    revenue30dUsdCents: Number(stats.revenue_30d_usd_cents ?? 0),
    trends: {
      users: { value: 0, direction: 'up' },
      creators: { value: 0, direction: 'up' },
      streams: { value: 0, direction: 'up' },
      revenue: { value: 0, direction: 'up' },
    },
  };

  // Map analytics time series data
  const giftsOverTime: ChartDataPoint[] = (res.data.gifts_over_time ?? []).map((p) => ({
    date: p.date,
    value: Number(p.value ?? 0),
  }));

  const usersOverTime: ChartDataPoint[] = (res.data.users_over_time ?? []).map((p) => ({
    date: p.date,
    value: Number(p.value ?? 0),
  }));

  const streamsOverTime: ChartDataPoint[] = (res.data.streams_over_time ?? []).map((p) => ({
    date: p.date,
    value: Number(p.value ?? 0),
  }));

  const topCreatorsToday: TopCreatorInfo[] = (res.data.top_creators_today ?? []).map((c) => ({
    id: c.profile_id,
    username: c.username,
    avatarUrl: c.avatar_url ?? null,
    giftsReceived: Number(c.gifts_received ?? 0),
    coinsReceived: Number(c.coins_received ?? 0),
  }));

  const referralsData = res.data.referrals_today;
  const referralsToday: ReferralInfo = {
    clicks: Number(referralsData?.clicks_today ?? 0),
    signups: Number(referralsData?.signups_today ?? 0),
    topReferrer: referralsData?.top_referrer ?? null,
  };

  return {
    ...MOCK_DATA,
    stats: mappedStats,
    platformHealth,
    liveStreamInfo,
    recentReports,
    giftsOverTime,
    usersOverTime,
    streamsOverTime,
    topCreatorsToday,
    referralsToday,
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * useOwnerPanelData Hook
 * 
 * This is a STUB implementation. Other agents will wire this to Supabase.
 * Returns typed interfaces for all Owner Panel modules.
 * 
 * @returns {UseOwnerPanelDataReturn} - Data, loading state, error state, and refetch function
 */
export function useOwnerPanelData(): UseOwnerPanelDataReturn {
  const [data, setData] = useState<OwnerPanelData>(MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/owner/summary', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch owner summary (${response.status})`);
      }

      const json = (await response.json()) as OwnerSummaryResponse;

      if (!json.ok) {
        throw new Error(json.error?.message || 'Failed to fetch owner summary');
      }

      setData(mapSummaryToOwnerPanelData(json));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
