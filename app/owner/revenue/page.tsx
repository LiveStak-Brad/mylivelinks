'use client';

import { useState } from 'react';
import OwnerPanelShell from '@/components/owner/OwnerPanelShell';
import Card, { CardHeader } from '@/components/owner/ui-kit/Card';
import StatCard from '@/components/owner/ui-kit/StatCard';
import Table, { TableBadge } from '@/components/owner/ui-kit/Table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Coins,
  Gift,
  Calendar,
  Save,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
  avatar_url: string | null;
  revenue: number;
  gifts_received: number;
}

interface TopStream {
  id: string;
  streamer_username: string;
  room_name: string;
  revenue: number;
  duration_minutes: number;
  started_at: string;
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
// Mock Data (placeholder for actual API calls)
// ============================================================================

const MOCK_REVENUE_STATS: RevenueStats = {
  gross: 45280.5,
  net: 31696.35,
  refunds: 1250.0,
  chargebacks: 340.0,
};

const MOCK_TOP_CREATORS: TopCreator[] = [
  {
    id: '1',
    username: 'streamer1',
    avatar_url: null,
    revenue: 12450.0,
    gifts_received: 1542,
  },
  {
    id: '2',
    username: 'streamer2',
    avatar_url: null,
    revenue: 8920.5,
    gifts_received: 982,
  },
  {
    id: '3',
    username: 'streamer3',
    avatar_url: null,
    revenue: 6780.25,
    gifts_received: 756,
  },
];

const MOCK_TOP_STREAMS: TopStream[] = [
  {
    id: '1',
    streamer_username: 'streamer1',
    room_name: 'Epic Stream Session',
    revenue: 3420.0,
    duration_minutes: 180,
    started_at: '2025-12-28T18:00:00Z',
  },
  {
    id: '2',
    streamer_username: 'streamer2',
    room_name: 'Late Night Vibes',
    revenue: 2890.5,
    duration_minutes: 240,
    started_at: '2025-12-28T22:00:00Z',
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

export default function RevenueOwnerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'economy'>('overview');
  const [loading, setLoading] = useState(false);

  // Economy Control State
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>(MOCK_COIN_PACKS);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>(MOCK_GIFT_TYPES);
  const [platformTakePercent, setPlatformTakePercent] = useState(30);
  const [payoutThreshold, setPayoutThreshold] = useState(50);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Date Range Filter (UI only)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCoinPackToggle = (id: string) => {
    setCoinPacks((prev) =>
      prev.map((pack) =>
        pack.id === id ? { ...pack, is_active: !pack.is_active } : pack
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleGiftToggle = (id: number) => {
    setGiftTypes((prev) =>
      prev.map((gift) =>
        gift.id === id ? { ...gift, is_active: !gift.is_active } : gift
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    // TODO: Wire to API
    console.log('Save changes:', {
      coinPacks,
      giftTypes,
      platformTakePercent,
      payoutThreshold,
    });
    setHasUnsavedChanges(false);
  };

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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Revenue"
          value={formatCurrency(MOCK_REVENUE_STATS.gross)}
          icon={DollarSign}
          trend={{ value: 12.5, direction: 'up', label: 'vs last period' }}
        />
        <StatCard
          title="Net Revenue"
          value={formatCurrency(MOCK_REVENUE_STATS.net)}
          icon={TrendingUp}
          subtitle="After platform take"
        />
        <StatCard
          title="Refunds"
          value={formatCurrency(MOCK_REVENUE_STATS.refunds)}
          icon={TrendingDown}
          trend={{ value: 2.1, direction: 'down', label: 'vs last period' }}
        />
        <StatCard
          title="Chargebacks"
          value={formatCurrency(MOCK_REVENUE_STATS.chargebacks)}
          icon={AlertTriangle}
        />
      </div>

      {/* Filters Toolbar */}
      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === '7d'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground hover:bg-accent-hover'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === '30d'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground hover:bg-accent-hover'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('90d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === '90d'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground hover:bg-accent-hover'
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground hover:bg-accent-hover'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Creators by Revenue */}
        <Card>
          <CardHeader title="Top Creators by Revenue" />
          <Table
            columns={[
              {
                key: 'username',
                header: 'Creator',
                render: (row: TopCreator) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground">
                      {row.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{row.username}</span>
                  </div>
                ),
              },
              {
                key: 'gifts',
                header: 'Gifts',
                align: 'right',
                render: (row: TopCreator) => (
                  <span className="text-muted-foreground">{formatNumber(row.gifts_received)}</span>
                ),
              },
              {
                key: 'revenue',
                header: 'Revenue',
                align: 'right',
                render: (row: TopCreator) => (
                  <span className="font-semibold text-success">
                    {formatCurrency(row.revenue)}
                  </span>
                ),
              },
            ]}
            data={MOCK_TOP_CREATORS}
            keyExtractor={(row) => row.id}
            emptyMessage="No creator data available"
          />
        </Card>

        {/* Top Streams by Revenue */}
        <Card>
          <CardHeader title="Top Streams by Revenue" />
          <Table
            columns={[
              {
                key: 'stream',
                header: 'Stream',
                render: (row: TopStream) => (
                  <div>
                    <p className="font-medium text-foreground">{row.room_name}</p>
                    <p className="text-xs text-muted-foreground">@{row.streamer_username}</p>
                  </div>
                ),
              },
              {
                key: 'duration',
                header: 'Duration',
                align: 'right',
                render: (row: TopStream) => (
                  <span className="text-muted-foreground">{row.duration_minutes}m</span>
                ),
              },
              {
                key: 'revenue',
                header: 'Revenue',
                align: 'right',
                render: (row: TopStream) => (
                  <span className="font-semibold text-success">
                    {formatCurrency(row.revenue)}
                  </span>
                ),
              },
            ]}
            data={MOCK_TOP_STREAMS}
            keyExtractor={(row) => row.id}
            emptyMessage="No stream data available"
          />
        </Card>
      </div>
    </div>
  );

  // ============================================================================
  // Tab: Economy Control
  // ============================================================================

  const renderEconomyTab = () => (
    <div className="space-y-6">
      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-warning/10 border border-warning rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">Unsaved Changes</p>
              <p className="text-xs text-muted-foreground">
                You have modified economy settings. Click Save to apply changes.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveChanges}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      )}

      {/* Coin Packs Section */}
      <Card>
        <CardHeader
          title="Coin Packs"
          subtitle="Manage coin pack pricing and availability"
        />
        <div className="space-y-4">
          {/* Web Packs */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Web Platform (Stripe)</h4>
            <div className="space-y-2">
              {coinPacks
                .filter((pack) => pack.platform === 'web')
                .map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Coins className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(pack.price_usd)} = {formatNumber(pack.coins_awarded)} coins
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pack.coins_awarded / pack.price_usd).toFixed(0)} coins per dollar
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCoinPackToggle(pack.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pack.is_active ? 'bg-success' : 'bg-muted'
                      }`}
                      title={pack.is_active ? 'Active' : 'Disabled'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pack.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Mobile Packs */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Mobile Platform (IAP)</h4>
            <div className="space-y-2">
              {coinPacks
                .filter((pack) => pack.platform === 'mobile')
                .map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Coins className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(pack.price_usd)} = {formatNumber(pack.coins_awarded)} coins
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pack.coins_awarded / pack.price_usd).toFixed(0)} coins per dollar
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCoinPackToggle(pack.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pack.is_active ? 'bg-success' : 'bg-muted'
                      }`}
                      title={pack.is_active ? 'Active' : 'Disabled'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pack.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Gift Catalog Section */}
      <Card>
        <CardHeader
          title="Gift Catalog"
          subtitle="Manage gift types and coin costs"
        />
        <div className="space-y-2">
          {giftTypes.map((gift) => (
            <div
              key={gift.id}
              className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Gift className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{gift.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(gift.coin_cost)} coins
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleGiftToggle(gift.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  gift.is_active ? 'bg-success' : 'bg-muted'
                }`}
                title={gift.is_active ? 'Active' : 'Disabled'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    gift.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Platform Settings Section */}
      <Card>
        <CardHeader
          title="Platform Settings"
          subtitle="Configure revenue splits and payout thresholds"
        />
        <div className="space-y-4">
          {/* Platform Take % */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Platform Take (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max="100"
                value={platformTakePercent}
                onChange={(e) => {
                  setPlatformTakePercent(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-32 px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Streamer receives {100 - platformTakePercent}%</span>
              </div>
            </div>
          </div>

          {/* Payout Threshold */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Payout Threshold (USD)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                step="10"
                value={payoutThreshold}
                onChange={(e) => {
                  setPayoutThreshold(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-32 px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Minimum balance to request payout</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveChanges}
          disabled={!hasUnsavedChanges}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          title={!hasUnsavedChanges ? 'No changes to save' : 'Save all economy changes'}
        >
          <Save className="w-5 h-5" />
          {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <OwnerPanelShell>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Coins & Revenue</h1>
          <p className="text-muted-foreground">
            Monitor platform revenue and manage economy settings
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Revenue Overview
          </button>
          <button
            onClick={() => setActiveTab('economy')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'economy'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Economy Control
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'economy' && renderEconomyTab()}
          </>
        )}
      </div>
    </OwnerPanelShell>
  );
}

