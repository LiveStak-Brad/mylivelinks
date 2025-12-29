'use client';

import { useOwnerPanelData } from '@/hooks/useOwnerPanelData';
import {
  StatCard,
  EmptyState,
  SkeletonCard,
  Button,
  Card,
  CardHeader,
  CardBody,
} from '@/components/owner/ui-kit';
import { LiveNowTable } from '@/components/owner/LiveNowTable';
import { RecentReportsTable } from '@/components/owner/RecentReportsTable';
import { PlatformHealthCard } from '@/components/owner/PlatformHealthCard';
import { AnalyticsChart, type ChartDataPoint } from '@/components/analytics';
import {
  Users,
  Radio,
  Gift,
  AlertCircle,
  TrendingUp,
  UserPlus,
  DollarSign,
  Eye,
  Crown,
  Target,
} from 'lucide-react';

export default function OwnerDashboard() {
  const { data, loading, error, refetch } = useOwnerPanelData();

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load Data"
          description={error}
          variant="error"
          action={
            <Button variant="primary" onClick={refetch}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Platform Health Skeleton */}
        <SkeletonCard />

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ============================================================================
  // SUCCESS STATE (Data loaded)
  // ============================================================================

  // Calculate today's delta for users (mock for now)
  const todayDelta = 12;
  const todayDeltaPercent = 12.5;

  // Mock gifts today count - UI-only, ready for wiring
  const giftsToday = 0;
  const giftCoinsToday = 0;

  // Pending reports count
  const pendingReports = data.recentReports?.filter(r => r.status === 'pending').length || 0;

  // UI-only chart data (wire-ready placeholders)
  const giftsChartData: ChartDataPoint[] = [];
  const usersChartData: ChartDataPoint[] = [];
  const streamsChartData: ChartDataPoint[] = [];

  // UI-only top creators snapshot (wire-ready)
  const topCreatorsToday: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
    giftsReceived: number;
    revenueUsd: number;
  }> = [];

  // UI-only referrals snapshot (wire-ready)
  const referralsToday = {
    clicks: 0,
    signups: 0,
    topReferrer: null as { username: string; signups: number } | null,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Mission Control. Monitor your platform at a glance.
        </p>
      </div>

      {/* Top KPI Row - 6 StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Total Users with today delta */}
        <StatCard
          title="Total Users"
          value={(data.stats?.totalUsers || 0).toLocaleString()}
          icon={Users}
          trend={{
            value: todayDeltaPercent,
            direction: todayDelta >= 0 ? 'up' : 'down',
            label: `+${todayDelta} today`,
          }}
        />

        {/* DAU - wire-ready placeholder */}
        <StatCard
          title="DAU"
          value={0}
          icon={Eye}
          subtitle="Daily active users"
        />

        {/* Live Streams Now */}
        <StatCard
          title="Live Now"
          value={data.liveStreamInfo?.length || 0}
          icon={Radio}
          subtitle="Active streams"
        />

        {/* Gifts Today (count + coins) - wire-ready */}
        <StatCard
          title="Gifts Today"
          value={giftsToday.toLocaleString()}
          icon={Gift}
          subtitle={`${giftCoinsToday.toLocaleString()} coins`}
        />

        {/* Revenue Today - wire-ready placeholder */}
        <StatCard
          title="Revenue Today"
          value="$0"
          icon={DollarSign}
          subtitle="Gross coin sales"
        />

        {/* Pending Reports */}
        <StatCard
          title="Pending Reports"
          value={pendingReports}
          icon={AlertCircle}
          subtitle="Awaiting review"
        />
      </div>

      {/* Graphs Section - 3 Charts */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnalyticsChart
            title="Gifts Over Time (7d)"
            data={giftsChartData}
            type="area"
            colors={{ primary: '#ec4899' }}
            height={180}
            loading={false}
          />
          <AnalyticsChart
            title="New Users Over Time (7d)"
            data={usersChartData}
            type="area"
            colors={{ primary: '#8b5cf6' }}
            height={180}
            loading={false}
          />
          <AnalyticsChart
            title="Live Streams Over Time (7d)"
            data={streamsChartData}
            type="area"
            colors={{ primary: '#3b82f6' }}
            height={180}
            loading={false}
          />
        </div>
      </div>

      {/* Platform Health Strip */}
      <PlatformHealthCard health={data.platformHealth} loading={false} />

      {/* Snapshot Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Creators Today */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <span>Top Creators Today</span>
              </div>
            }
            subtitle="By gifts received"
          />
          <CardBody>
            {topCreatorsToday.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="No Data"
                description="Top creators data will appear here once wired."
                variant="default"
              />
            ) : (
              <div className="space-y-3">
                {topCreatorsToday.slice(0, 5).map((creator, idx) => (
                  <div key={creator.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                    <img
                      src={creator.avatarUrl || '/no-profile-pic.png'}
                      alt={creator.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{creator.username}</p>
                      <p className="text-xs text-muted-foreground">{creator.giftsReceived} gifts</p>
                    </div>
                    <span className="text-sm font-semibold text-success">${creator.revenueUsd}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Referrals Snapshot */}
        <Card>
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span>Referrals Today</span>
              </div>
            }
            subtitle="Growth from referrals"
          />
          <CardBody>
            {referralsToday.clicks === 0 && referralsToday.signups === 0 ? (
              <EmptyState
                icon={Target}
                title="No Data"
                description="Referral activity will appear here once wired."
                variant="default"
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Clicks</p>
                    <p className="text-2xl font-bold text-foreground">{referralsToday.clicks}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Signups</p>
                    <p className="text-2xl font-bold text-foreground">{referralsToday.signups}</p>
                  </div>
                </div>
                {referralsToday.topReferrer && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Top Referrer</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{referralsToday.topReferrer.username}</span>
                      <span className="text-sm text-primary">{referralsToday.topReferrer.signups} signups</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Live Now Table & Recent Reports Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveNowTable
          streams={data.liveStreamInfo || []}
          loading={false}
          onJoinInvisibly={(id) => console.log('Join invisibly:', id)}
          onEndStream={(id) => console.log('End stream:', id)}
          onShadowMute={(id) => console.log('Shadow mute:', id)}
        />

        <RecentReportsTable
          reports={data.recentReports || []}
          loading={false}
          onReview={(id) => console.log('Review report:', id)}
        />
      </div>
    </div>
  );
}
