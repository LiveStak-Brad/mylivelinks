// Owner Panel Data Hook - Type Definitions and Stub Implementation
// This is a placeholder hook that will be wired to Supabase by other agents

import { useState, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  totalCreators: number;
  activeStreams: number;
  totalRevenue: number;
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
}

export interface UseOwnerPanelDataReturn {
  data: OwnerPanelData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
};

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
      // TODO: Wire to Supabase
      // This is a stub - other agents will implement actual data fetching
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Return empty data structure
      setData(MOCK_DATA);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
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
