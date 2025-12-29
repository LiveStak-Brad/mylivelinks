'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  DollarSign,
  Coins,
  Gem,
  TrendingUp,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Wallet,
  Users,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Banknote,
  PiggyBank,
  ShieldAlert,
} from 'lucide-react';

import {
  KpiCard,
  AnalyticsChart,
  TopUsersTable,
  DateRangePicker,
  getDateRangeFromPreset,
  type DateRange,
  type ChartDataPoint,
  type TopUser,
} from '@/components/analytics';

type AnalyticsTab = 'overview' | 'coins-diamonds' | 'stripe-revenue' | 'payout-exposure';

interface AnalyticsData {
  // Overview KPIs
  grossCoinSales: number;
  stripeFees: number;
  refunds: number;
  chargebacks: number;
  netRevenue: number;
  coinsSold: number;
  coinsInCirculation: number;
  diamondsOutstanding: number;
  cashoutExposure: number;
  
  // Coins & Diamonds
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  totalCoinsBurned: number;
  totalDiamondsMinted: number;
  totalDiamondsCashedOut: number;
  
  // Stripe
  totalChargesCount: number;
  totalChargesUsd: number;
  totalStripeFees: number;
  refundsTotal: number;
  disputesTotal: number;
  netAfterStripe: number;
  
  // Charts
  revenueOverTime: ChartDataPoint[];
  coinFlowOverTime: ChartDataPoint[];
  circulationOverTime: ChartDataPoint[];
  coinPurchaseVsSpent: ChartDataPoint[];
  diamondMintedVsCashedOut: ChartDataPoint[];
  
  // Top users
  topCoinBuyers: TopUser[];
  topDiamondEarners: TopUser[];
  
  // Stripe events
  stripeEvents: StripeEvent[];
}

interface StripeEvent {
  id: string;
  date: string;
  amount: number;
  fees: number;
  net: number;
  status: 'succeeded' | 'failed' | 'refunded' | 'disputed';
  type: 'charge' | 'refund' | 'dispute';
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('30d'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [includeTestData, setIncludeTestData] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    
    // TODO: Replace with actual API call
    // const res = await fetch(`/api/admin/analytics?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}&includeTest=${includeTestData}`);
    // const data = await res.json();

    try {
      const res = await fetch(
        `/api/admin/analytics?start=${encodeURIComponent(dateRange.start.toISOString())}&end=${encodeURIComponent(dateRange.end.toISOString())}&includeTest=${includeTestData ? 'true' : 'false'}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Analytics request failed (${res.status})`);
      }

      const apiData = (await res.json()) as AnalyticsData;
      setData(apiData);
    } catch (err) {
      console.error('[Owner Analytics] Failed to load data:', err);
      setData(null);
    }
    
    setLoading(false);
    setRefreshing(false);
  }, [dateRange, includeTestData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs: { id: AnalyticsTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'coins-diamonds', label: 'Coins & Diamonds', icon: Coins },
    { id: 'stripe-revenue', label: 'Stripe & Revenue', icon: CreditCard },
    { id: 'payout-exposure', label: 'Payout Exposure', icon: ShieldAlert },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Monetization Analytics
          </h1>
          <p className="text-muted-foreground">
            Coins, Diamonds, Revenue & Payouts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Test data toggle */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeTestData}
              onChange={(e) => setIncludeTestData(e.target.checked)}
              className="rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary"
            />
            Include test data
          </label>
          
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Gross Coin Sales"
                value={formatCurrency(data?.grossCoinSales ?? 0)}
                icon={<DollarSign className="w-5 h-5 text-green-400" />}
                variant="success"
                loading={loading}
              />
              <KpiCard
                title="Stripe Fees"
                value={formatCurrency(data?.stripeFees ?? 0)}
                icon={<CreditCard className="w-5 h-5 text-blue-400" />}
                variant="info"
                loading={loading}
                subtitle="~2.9% + $0.30"
              />
              <KpiCard
                title="Refunds & Chargebacks"
                value={formatCurrency((data?.refunds ?? 0) + (data?.chargebacks ?? 0))}
                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                variant="danger"
                loading={loading}
              />
              <KpiCard
                title="Net Revenue"
                value={formatCurrency(data?.netRevenue ?? 0)}
                icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                variant="default"
                loading={loading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Coins Sold"
                value={data?.coinsSold ?? 0}
                icon={<Coins className="w-5 h-5 text-yellow-400" />}
                loading={loading}
              />
              <KpiCard
                title="Coins in Circulation"
                value={data?.coinsInCirculation ?? 0}
                icon={<PiggyBank className="w-5 h-5 text-orange-400" />}
                loading={loading}
                subtitle="Liability"
              />
              <KpiCard
                title="Diamonds Outstanding"
                value={data?.diamondsOutstanding ?? 0}
                icon={<Gem className="w-5 h-5 text-cyan-400" />}
                loading={loading}
              />
              <KpiCard
                title="Cashout Exposure"
                value={formatCurrency(data?.cashoutExposure ?? 0)}
                icon={<Wallet className="w-5 h-5 text-red-400" />}
                variant="warning"
                loading={loading}
                subtitle="If all diamonds cashed out"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Gross vs Net Revenue"
                data={data?.revenueOverTime ?? []}
                type="area"
                colors={{ primary: '#22c55e', secondary: '#a855f7' }}
                legend={{ primary: 'Gross', secondary: 'Net' }}
                valuePrefix="$"
                loading={loading}
              />
              <AnalyticsChart
                title="Coins: Purchased vs Spent"
                data={data?.coinFlowOverTime ?? []}
                type="line"
                colors={{ primary: '#eab308', secondary: '#f97316' }}
                legend={{ primary: 'Purchased', secondary: 'Spent' }}
                loading={loading}
              />
            </div>
            
            <AnalyticsChart
              title="Coins in Circulation Over Time"
              data={data?.circulationOverTime ?? []}
              type="area"
              colors={{ primary: '#f97316' }}
              loading={loading}
              height={180}
            />

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopUsersTable
                title="Top Coin Buyers"
                users={data?.topCoinBuyers ?? []}
                columns={{
                  primary: { label: 'USD Spent', prefix: '$' },
                  secondary: { label: 'Coins', suffix: ' coins' },
                }}
                loading={loading}
                maxRows={5}
              />
              <TopUsersTable
                title="Top Diamond Earners"
                users={data?.topDiamondEarners ?? []}
                columns={{
                  primary: { label: 'Diamonds', suffix: ' 💎' },
                  secondary: { label: 'Est. USD', prefix: '$' },
                }}
                loading={loading}
                maxRows={5}
              />
            </div>
          </div>
        )}

        {/* Coins & Diamonds Tab */}
        {activeTab === 'coins-diamonds' && (
          <div className="space-y-6">
            {/* Coins Section */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                Coins Economy
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="Total Coins Purchased"
                  value={data?.totalCoinsPurchased ?? 0}
                  icon={<ArrowUpRight className="w-5 h-5 text-green-400" />}
                  variant="success"
                  loading={loading}
                />
                <KpiCard
                  title="Total Coins Spent (Gifts)"
                  value={data?.totalCoinsSpent ?? 0}
                  icon={<Gift className="w-5 h-5 text-pink-400" />}
                  loading={loading}
                />
                <KpiCard
                  title="Total Coins Burned"
                  value={data?.totalCoinsBurned ?? 0}
                  icon={<ArrowDownRight className="w-5 h-5 text-orange-400" />}
                  variant="warning"
                  loading={loading}
                  subtitle="Platform fees, expired, etc."
                />
                <KpiCard
                  title="Coins in Circulation"
                  value={data?.coinsInCirculation ?? 0}
                  icon={<PiggyBank className="w-5 h-5 text-yellow-400" />}
                  loading={loading}
                  subtitle="Purchased - Spent - Burned"
                />
              </div>
            </div>
            
            {/* Diamonds Section */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Gem className="w-5 h-5 text-cyan-400" />
                Diamonds Economy
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  title="Total Diamonds Minted"
                  value={data?.totalDiamondsMinted ?? 0}
                  icon={<ArrowUpRight className="w-5 h-5 text-cyan-400" />}
                  loading={loading}
                  subtitle="From gift conversions"
                />
                <KpiCard
                  title="Total Diamonds Cashed Out"
                  value={data?.totalDiamondsCashedOut ?? 0}
                  icon={<Banknote className="w-5 h-5 text-green-400" />}
                  variant="success"
                  loading={loading}
                />
                <KpiCard
                  title="Diamonds Outstanding"
                  value={data?.diamondsOutstanding ?? 0}
                  icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
                  variant="danger"
                  loading={loading}
                  subtitle="Cashout liability"
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Coins: Purchased vs Spent (Stacked)"
                data={data?.coinPurchaseVsSpent ?? []}
                type="stacked"
                colors={{ primary: '#eab308', secondary: '#f97316' }}
                legend={{ primary: 'Purchased', secondary: 'Spent' }}
                loading={loading}
              />
              <AnalyticsChart
                title="Diamonds: Minted vs Cashed Out"
                data={data?.diamondMintedVsCashedOut ?? []}
                type="stacked"
                colors={{ primary: '#06b6d4', secondary: '#22c55e' }}
                legend={{ primary: 'Minted', secondary: 'Cashed Out' }}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Stripe & Revenue Tab */}
        {activeTab === 'stripe-revenue' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard
                title="Total Charges"
                value={data?.totalChargesCount ?? 0}
                subtitle={formatCurrency(data?.totalChargesUsd ?? 0)}
                icon={<CreditCard className="w-5 h-5 text-blue-400" />}
                loading={loading}
              />
              <KpiCard
                title="Stripe Fees"
                value={formatCurrency(data?.totalStripeFees ?? 0)}
                icon={<Percent className="w-5 h-5 text-gray-400" />}
                loading={loading}
              />
              <KpiCard
                title="Refunds"
                value={formatCurrency(data?.refundsTotal ?? 0)}
                icon={<ArrowDownRight className="w-5 h-5 text-orange-400" />}
                variant="warning"
                loading={loading}
              />
              <KpiCard
                title="Disputes"
                value={formatCurrency(data?.disputesTotal ?? 0)}
                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                variant="danger"
                loading={loading}
              />
              <KpiCard
                title="Net After Stripe"
                value={formatCurrency(data?.netAfterStripe ?? 0)}
                icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                variant="success"
                loading={loading}
              />
            </div>

            {/* Stripe Events Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Recent Stripe Events</h3>
              </div>
              
              {loading ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="flex-1" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3 text-right">Fees</th>
                        <th className="px-6 py-3 text-right">Net</th>
                        <th className="px-6 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(data?.stripeEvents ?? []).slice(0, 20).map((event) => (
                        <tr key={event.id} className="hover:bg-muted/30 transition">
                          <td className="px-6 py-3 text-sm text-foreground">
                            {formatDate(event.date)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              event.type === 'charge' ? 'bg-green-500/20 text-green-400' :
                              event.type === 'refund' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {event.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-foreground text-right font-mono">
                            {formatCurrency(event.amount)}
                          </td>
                          <td className="px-6 py-3 text-sm text-muted-foreground text-right font-mono">
                            {formatCurrency(event.fees)}
                          </td>
                          <td className={`px-6 py-3 text-sm text-right font-mono ${
                            event.net >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {event.net >= 0 ? '+' : ''}{formatCurrency(event.net)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              event.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                              event.status === 'refunded' ? 'bg-orange-500/20 text-orange-400' :
                              event.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {event.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payout Exposure Tab */}
        {activeTab === 'payout-exposure' && (
          <div className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <ShieldAlert className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-400 text-lg">Payout Liability Overview</h3>
                  <p className="text-yellow-200/80 mt-1">
                    This section shows your platform's current exposure to creator payouts. 
                    Outstanding diamonds represent a future liability that creators can cash out.
                  </p>
                </div>
              </div>
            </div>

            {/* Exposure KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard
                title="Diamonds Outstanding"
                value={data?.diamondsOutstanding ?? 0}
                icon={<Gem className="w-5 h-5 text-cyan-400" />}
                loading={loading}
                subtitle="Total uncashed diamonds"
              />
              <KpiCard
                title="Estimated USD Exposure"
                value={formatCurrency(data?.cashoutExposure ?? 0)}
                icon={<DollarSign className="w-5 h-5 text-red-400" />}
                variant="danger"
                loading={loading}
                subtitle="If all diamonds cashed at $0.01/diamond"
              />
              <KpiCard
                title="Coverage Ratio"
                value={data && data.cashoutExposure > 0 ? `${Math.round((data.netRevenue / data.cashoutExposure) * 100)}%` : '0%'}
                icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                variant={data && data.cashoutExposure > 0 && (data.netRevenue / data.cashoutExposure) >= 1 ? 'success' : 'warning'}
                loading={loading}
                subtitle="Net revenue vs exposure"
              />
            </div>

            {/* Top Diamond Holders */}
            <TopUsersTable
              title="Top Diamond Holders (Highest Payout Risk)"
              users={data?.topDiamondEarners ?? []}
              columns={{
                primary: { label: 'Diamonds Held', suffix: ' 💎' },
                secondary: { label: 'Est. Payout', prefix: '$' },
              }}
              loading={loading}
              maxRows={10}
            />

            {/* Recommendations */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Risk Management Recommendations</h3>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Maintain a reserve fund equal to at least 50% of your estimated exposure</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Set minimum cashout thresholds to reduce transaction overhead</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Monitor large diamond holders and their cashout patterns</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <span>Consider implementing cashout processing windows (e.g., weekly payouts)</span>
                </li>
              </ul>
            </div>
          </div>
        )}
    </div>
  );
}
