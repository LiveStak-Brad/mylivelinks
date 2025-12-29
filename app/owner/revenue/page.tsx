'use client';

import { useEffect, useRef, useState } from 'react';
import { OwnerPanelShell } from '@/components/owner/OwnerPanelShell';
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
  coins: number;
  gifts_received: number;
}

interface TopStream {
  id: string;
  streamer_username: string;
  room_name: string;
  coins: number;
  duration_minutes: number;
  started_at: string;
}

interface CoinPack {
  id: number;
  sku: string | null;
  name: string;
  price_usd: number;
  coins: number;
  is_active: boolean;
  platform: 'web' | 'mobile';
}

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  is_active: boolean;
}

type AdminOk<T> = { ok: true; reqId: string; data: T };
type AdminErr = { ok: false; reqId: string; error: { message: string } };

type RevenueOverviewApi = {
  window_start_at: string;
  window_end_at: string;
  currency: 'USD';
  gross_usd_cents: number;
  net_usd_cents: number;
  daily: Array<{ day: string; gross_usd_cents: number; net_usd_cents: number }>;
  top_creators: Array<{
    profile_id: string;
    username: string | null;
    avatar_url: string | null;
    gifts_received_count: number;
    gifts_received_coins: number;
  }>;
  top_streams: Array<{
    stream_id: string;
    gifts_received_count: number;
    gifts_received_coins: number;
  }>;
};

type EconomyApi = {
  coin_packs: Array<{
    id: number;
    sku: string | null;
    name: string;
    platform: 'web' | 'mobile' | string;
    coins: number;
    price_usd: number;
    is_active: boolean;
  }>;
  gift_types: Array<{
    id: number;
    name: string;
    coin_cost: number;
    is_active: boolean;
  }>;
  platform_settings: {
    take_percent: number;
    payout_threshold_cents: number;
  };
};

function dateRangeToWindow(range: '7d' | '30d' | '90d' | 'all') {
  const end = new Date();
  const start = new Date(
    range === '7d'
      ? Date.now() - 7 * 24 * 60 * 60 * 1000
      : range === '30d'
        ? Date.now() - 30 * 24 * 60 * 60 * 1000
        : range === '90d'
          ? Date.now() - 90 * 24 * 60 * 60 * 1000
          : Date.now() - 365 * 24 * 60 * 60 * 1000
  );
  return { start, end };
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================================
// Component
// ============================================================================

export default function RevenueOwnerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'economy'>('overview');
  const [loading, setLoading] = useState(true);

  const [revenueStats, setRevenueStats] = useState<RevenueStats>({ gross: 0, net: 0, refunds: 0, chargebacks: 0 });
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [topStreams, setTopStreams] = useState<TopStream[]>([]);

  // Economy Control State
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [platformTakePercent, setPlatformTakePercent] = useState(30);
  const [payoutThreshold, setPayoutThreshold] = useState(50);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const baseCoinPacksRef = useRef<CoinPack[]>([]);
  const baseGiftTypesRef = useRef<GiftType[]>([]);
  const baseSettingsRef = useRef<{ platformTakePercent: number; payoutThreshold: number }>({
    platformTakePercent: 30,
    payoutThreshold: 50,
  });

  // Date Range Filter (UI only)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const loadEconomy = async () => {
    const res = await fetch('/api/admin/economy', { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load economy (${res.status})`);
    const json = (await res.json()) as AdminOk<EconomyApi> | AdminErr;
    if (!json.ok) throw new Error(json.error?.message || 'Failed to load economy');

    const d = json.data;
    const packs: CoinPack[] = (d.coin_packs ?? [])
      .filter((p) => p && (p.platform === 'web' || p.platform === 'mobile'))
      .map((p) => ({
        id: Number(p.id),
        sku: p.sku ?? null,
        name: String(p.name ?? ''),
        platform: p.platform === 'mobile' ? 'mobile' : 'web',
        coins: safeNumber(p.coins),
        price_usd: safeNumber(p.price_usd),
        is_active: p.is_active === true,
      }));

    const gifts: GiftType[] = (d.gift_types ?? []).map((g) => ({
      id: Number(g.id),
      name: String(g.name ?? ''),
      coin_cost: safeNumber(g.coin_cost),
      is_active: g.is_active === true,
    }));

    const takePercent = safeNumber(d.platform_settings?.take_percent);
    const payoutThresholdCents = safeNumber(d.platform_settings?.payout_threshold_cents);

    setCoinPacks(packs);
    setGiftTypes(gifts);
    setPlatformTakePercent(takePercent);
    setPayoutThreshold(Math.round(payoutThresholdCents / 100));

    baseCoinPacksRef.current = packs;
    baseGiftTypesRef.current = gifts;
    baseSettingsRef.current = {
      platformTakePercent: takePercent,
      payoutThreshold: Math.round(payoutThresholdCents / 100),
    };
  };

  const loadRevenue = async (range: '7d' | '30d' | '90d' | 'all') => {
    const { start, end } = dateRangeToWindow(range);
    const qs = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
    const res = await fetch(`/api/admin/revenue/overview?${qs}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load revenue (${res.status})`);
    const json = (await res.json()) as AdminOk<RevenueOverviewApi> | AdminErr;
    if (!json.ok) throw new Error(json.error?.message || 'Failed to load revenue');

    const d = json.data;
    setRevenueStats({
      gross: safeNumber(d.gross_usd_cents) / 100,
      net: safeNumber(d.net_usd_cents) / 100,
      refunds: 0,
      chargebacks: 0,
    });

    setTopCreators(
      (d.top_creators ?? []).map((c) => ({
        id: String(c.profile_id),
        username: c.username ?? 'unknown',
        avatar_url: c.avatar_url ?? null,
        coins: safeNumber(c.gifts_received_coins),
        gifts_received: safeNumber(c.gifts_received_count),
      }))
    );

    setTopStreams(
      (d.top_streams ?? []).map((s) => ({
        id: String(s.stream_id),
        streamer_username: 'unknown',
        room_name: `Stream ${String(s.stream_id).slice(0, 8)}`,
        coins: safeNumber(s.gifts_received_coins),
        duration_minutes: 0,
        started_at: new Date().toISOString(),
      }))
    );
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadEconomy(), loadRevenue(dateRange)]);
      } catch (e) {
        console.error('[Owner Revenue] load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadRevenue(dateRange);
      } catch (e) {
        console.error('[Owner Revenue] revenue reload failed:', e);
      }
    })();
  }, [dateRange]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCoinPackToggle = (id: string) => {
    setCoinPacks((prev) =>
      prev.map((pack) =>
        String(pack.id) === id ? { ...pack, is_active: !pack.is_active } : pack
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
    void (async () => {
      setLoading(true);
      try {
        const basePacks = baseCoinPacksRef.current;
        const baseGifts = baseGiftTypesRef.current;
        const baseSettings = baseSettingsRef.current;

        const changedPacks = coinPacks.filter((p) => {
          const before = basePacks.find((b) => b.id === p.id);
          return !before || before.is_active !== p.is_active;
        });

        const changedGifts = giftTypes.filter((g) => {
          const before = baseGifts.find((b) => b.id === g.id);
          return !before || before.is_active !== g.is_active;
        });

        const settingsChanged =
          baseSettings.platformTakePercent !== platformTakePercent || baseSettings.payoutThreshold !== payoutThreshold;

        if (settingsChanged) {
          const res = await fetch('/api/admin/economy/platform-settings', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              take_percent: platformTakePercent,
              payout_threshold_cents: Math.round(payoutThreshold * 100),
            }),
          });
          if (!res.ok) throw new Error(`Failed to update platform settings (${res.status})`);
        }

        await Promise.all(
          changedPacks.map(async (p) => {
            const res = await fetch('/api/admin/economy/coin-pack', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: p.id,
                sku: p.sku,
                name: p.name,
                platform: p.platform,
                coins: p.coins,
                price_usd: p.price_usd,
                is_active: p.is_active,
              }),
            });
            if (!res.ok) throw new Error(`Failed to update coin pack (${res.status})`);
          })
        );

        await Promise.all(
          changedGifts.map(async (g) => {
            const res = await fetch('/api/admin/economy/gift-type', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: g.id,
                name: g.name,
                coin_cost: g.coin_cost,
                is_active: g.is_active,
              }),
            });
            if (!res.ok) throw new Error(`Failed to update gift type (${res.status})`);
          })
        );

        await loadEconomy();
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error('[Owner Revenue] save failed:', e);
      } finally {
        setLoading(false);
      }
    })();
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
          value={formatCurrency(revenueStats.gross)}
          icon={DollarSign}
          trend={{ value: 12.5, direction: 'up', label: 'vs last period' }}
        />
        <StatCard
          title="Net Revenue"
          value={formatCurrency(revenueStats.net)}
          icon={TrendingUp}
          subtitle="After platform take"
        />
        <StatCard
          title="Refunds"
          value={formatCurrency(revenueStats.refunds)}
          icon={TrendingDown}
          trend={{ value: 2.1, direction: 'down', label: 'vs last period' }}
        />
        <StatCard
          title="Chargebacks"
          value={formatCurrency(revenueStats.chargebacks)}
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
                header: 'Coins',
                align: 'right',
                render: (row: TopCreator) => (
                  <span className="font-semibold text-success">{formatNumber(row.coins)}</span>
                ),
              },
            ]}
            data={topCreators}
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
                header: 'Coins',
                align: 'right',
                render: (row: TopStream) => (
                  <span className="font-semibold text-success">{formatNumber(row.coins)}</span>
                ),
              },
            ]}
            data={topStreams}
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
                          {formatCurrency(pack.price_usd)} = {formatNumber(pack.coins)} coins
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pack.coins / pack.price_usd).toFixed(0)} coins per dollar
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCoinPackToggle(String(pack.id))}
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

