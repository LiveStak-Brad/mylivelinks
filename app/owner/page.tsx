'use client';

import { useOwnerPanelData } from '@/hooks/useOwnerPanelData';
import {
  StatCard,
  EmptyState,
  SkeletonCard,
  Button,
} from '@/components/owner/ui-kit';
import { LiveNowTable } from '@/components/owner/LiveNowTable';
import { RecentReportsTable } from '@/components/owner/RecentReportsTable';
import { PlatformHealthCard } from '@/components/owner/PlatformHealthCard';
import {
  Users,
  Radio,
  Gift,
  AlertCircle,
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
          icon={<AlertCircle className="w-12 h-12" />}
          title="Failed to Load Data"
          description={error}
          action={{
            label: 'Try Again',
            onClick: refetch,
            variant: 'primary',
          }}
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

  // Mock gifts today count
  const giftsToday = 234;

  // Pending reports count
  const pendingReports = data.recentReports?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Mission Control. Monitor your platform at a glance.
        </p>
      </div>

      {/* Top KPI Row - 4 StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Live Streams Now */}
        <StatCard
          title="Live Streams Now"
          value={data.liveStreamInfo?.length || 0}
          icon={Radio}
          subtitle="Active streams"
        />

        {/* Gifts Today */}
        <StatCard
          title="Gifts Today"
          value={giftsToday.toLocaleString()}
          icon={Gift}
          subtitle="Sent across platform"
        />

        {/* Pending Reports */}
        <StatCard
          title="Pending Reports"
          value={pendingReports}
          icon={AlertCircle}
          subtitle="Awaiting review"
        />
      </div>

      {/* Platform Health Strip */}
      <PlatformHealthCard health={data.platformHealth} loading={false} />

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
