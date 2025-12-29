/**
 * Owner Panel Dashboard (P0)
 * High-signal overview page with KPIs, platform health, live streams, and reports
 */

'use client';

import { Users, Radio, Gift, AlertTriangle } from 'lucide-react';
import { useOwnerPanelData } from '@/hooks';
import {
  OwnerPanelShell,
  StatCard,
  PlatformHealthCard,
  LiveNowTable,
  RecentReportsTable,
} from '@/components/owner';
import { ErrorState } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function OwnerDashboard() {
  const { stats, platformHealth, liveStreams, recentReports, loading, error } =
    useOwnerPanelData();
  const router = useRouter();

  // Handle report review - placeholder for now
  const handleReviewReport = (reportId: string) => {
    console.log('Review report:', reportId);
    // TODO: Open report detail drawer or navigate to reports page
    // For now, we'll just navigate to the reports page when it exists
    // router.push(`/owner/reports?id=${reportId}`);
  };

  // Handle live stream actions - placeholder for now
  const handleJoinInvisibly = (streamId: number) => {
    console.log('Join invisibly:', streamId);
    // TODO: Implement invisible viewer mode
  };

  const handleEndStream = (streamId: number) => {
    console.log('End stream:', streamId);
    // TODO: Implement stream termination
  };

  const handleShadowMute = (streamId: number) => {
    console.log('Shadow mute:', streamId);
    // TODO: Implement shadow mute for chat
  };

  if (error) {
    return (
      <OwnerPanelShell>
        <div className="flex items-center justify-center min-h-screen p-6">
          <ErrorState
            title="Failed to load dashboard"
            message={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </OwnerPanelShell>
    );
  }

  return (
    <OwnerPanelShell>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the owner panel. Here's your platform overview.
          </p>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers.toLocaleString() || '0'}
            icon={Users}
            delta={stats?.newUsersToday}
            deltaLabel="today"
            variant="default"
            loading={loading}
          />
          <StatCard
            label="Live Streams Now"
            value={stats?.activeStreams || 0}
            icon={Radio}
            variant="success"
            loading={loading}
          />
          <StatCard
            label="Gifts Today"
            value={stats?.giftsToday.toLocaleString() || '0'}
            icon={Gift}
            variant="default"
            loading={loading}
          />
          <StatCard
            label="Pending Reports"
            value={stats?.pendingReports || 0}
            icon={AlertTriangle}
            variant={stats && stats.pendingReports > 0 ? 'warning' : 'default'}
            loading={loading}
          />
        </div>

        {/* Platform Health Strip */}
        <PlatformHealthCard health={platformHealth} loading={loading} />

        {/* Live Now Table */}
        <LiveNowTable
          streams={liveStreams}
          loading={loading}
          onJoinInvisibly={handleJoinInvisibly}
          onEndStream={handleEndStream}
          onShadowMute={handleShadowMute}
        />

        {/* Recent Reports Table */}
        <RecentReportsTable
          reports={recentReports}
          loading={loading}
          onReview={handleReviewReport}
        />
      </div>
    </OwnerPanelShell>
  );
}
