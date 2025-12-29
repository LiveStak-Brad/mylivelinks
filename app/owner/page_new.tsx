'use client';

import { useState } from 'react';
import { useOwnerPanelData } from '@/hooks/useOwnerPanelData';
import {
  Card,
  CardHeader,
  StatCard,
  Table,
  TableToolbar,
  EmptyState,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  Badge,
  Button,
  IconButton,
  RowActions,
} from '@/components/owner/ui-kit';
import {
  Users,
  Crown,
  Radio,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  AlertCircle,
} from 'lucide-react';

export default function OwnerDashboard() {
  const { data, loading, error, refetch } = useOwnerPanelData();
  const [searchQuery, setSearchQuery] = useState('');

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
        {/* Page Header Skeleton */}
        <div>
          <Skeleton variant="text" width="200px" height="32px" className="mb-2" />
          <Skeleton variant="text" width="400px" height="20px" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader title="Loading..." />
          <SkeletonTable rows={5} columns={4} />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // EMPTY STATE (No data available)
  // ============================================================================
  const hasNoData = 
    !data.stats && 
    data.liveNow.length === 0 && 
    data.users.length === 0;

  if (hasNoData) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          title="No Data Available"
          description="There is currently no data to display. This could be because the system is initializing or no data has been generated yet."
          action={
            <Button variant="primary" onClick={refetch}>
              Refresh Data
            </Button>
          }
        />
      </div>
    );
  }

  // ============================================================================
  // SUCCESS STATE (Data loaded)
  // ============================================================================

  // Mock data for demonstration (since hook returns empty data)
  const mockStats = data.stats || {
    totalUsers: 1234,
    totalCreators: 567,
    activeStreams: 12,
    totalRevenue: 89456,
    trends: {
      users: { value: 12.5, direction: 'up' as const },
      creators: { value: 8.3, direction: 'up' as const },
      streams: { value: -5.2, direction: 'down' as const },
      revenue: { value: 23.1, direction: 'up' as const },
    },
  };

  const mockLiveStreams = data.liveNow.length > 0 ? data.liveNow : [
    {
      id: '1',
      roomName: 'Room 1',
      streamerId: 'user1',
      streamerUsername: 'streamer1',
      streamerDisplayName: 'Streamer One',
      streamerAvatarUrl: null,
      viewerCount: 145,
      startedAt: new Date().toISOString(),
      isAdultContent: false,
    },
    {
      id: '2',
      roomName: 'Room 2',
      streamerId: 'user2',
      streamerUsername: 'streamer2',
      streamerDisplayName: 'Streamer Two',
      streamerAvatarUrl: null,
      viewerCount: 89,
      startedAt: new Date().toISOString(),
      isAdultContent: true,
    },
  ];

  const filteredStreams = mockLiveStreams.filter((stream) =>
    stream.streamerUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (stream.streamerDisplayName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Mission Control. Monitor your platform at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={mockStats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{
            value: mockStats.trends.users.value,
            direction: mockStats.trends.users.direction,
            label: 'vs last month',
          }}
        />
        <StatCard
          title="Total Creators"
          value={mockStats.totalCreators.toLocaleString()}
          icon={Crown}
          trend={{
            value: mockStats.trends.creators.value,
            direction: mockStats.trends.creators.direction,
            label: 'vs last month',
          }}
        />
        <StatCard
          title="Active Streams"
          value={mockStats.activeStreams}
          icon={Radio}
          trend={{
            value: mockStats.trends.streams.value,
            direction: mockStats.trends.streams.direction,
            label: 'vs last hour',
          }}
        />
        <StatCard
          title="Total Revenue"
          value={`$${(mockStats.totalRevenue / 100).toLocaleString()}`}
          icon={DollarSign}
          subtitle="USD"
          trend={{
            value: mockStats.trends.revenue.value,
            direction: mockStats.trends.revenue.direction,
            label: 'vs last month',
          }}
        />
      </div>

      {/* Live Streams Table */}
      <Card>
        <CardHeader
          title="Live Streams"
          subtitle={`${filteredStreams.length} active stream${filteredStreams.length !== 1 ? 's' : ''}`}
          action={
            <Button
              variant="primary"
              leftIcon={Plus}
              size="sm"
            >
              New Stream
            </Button>
          }
        />

        <TableToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search streamers..."
          actions={
            <>
              <IconButton
                icon={Download}
                label="Export data"
                variant="ghost"
              />
            </>
          }
        />

        {filteredStreams.length === 0 ? (
          <EmptyState
            title="No Active Streams"
            description={
              searchQuery
                ? `No streams match "${searchQuery}"`
                : 'There are currently no active streams.'
            }
          />
        ) : (
          <Table
            columns={[
              {
                key: 'streamer',
                header: 'Streamer',
                render: (stream) => (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                      {stream.streamerUsername[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {stream.streamerDisplayName || stream.streamerUsername}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{stream.streamerUsername}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'viewers',
                header: 'Viewers',
                width: '120px',
                render: (stream) => (
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {stream.viewerCount}
                    </span>
                  </div>
                ),
              },
              {
                key: 'content',
                header: 'Content',
                width: '120px',
                render: (stream) => (
                  <Badge variant={stream.isAdultContent ? 'warning' : 'success'}>
                    {stream.isAdultContent ? 'Adult' : 'General'}
                  </Badge>
                ),
              },
              {
                key: 'duration',
                header: 'Duration',
                width: '120px',
                render: (stream) => {
                  const minutes = Math.floor(
                    (Date.now() - new Date(stream.startedAt).getTime()) / 60000
                  );
                  return (
                    <span className="text-muted-foreground">
                      {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: '',
                width: '60px',
                align: 'right',
                render: (stream) => (
                  <RowActions
                    actions={[
                      {
                        label: 'View Stream',
                        icon: Eye,
                        onClick: () => console.log('View', stream.id),
                      },
                      {
                        label: 'Edit',
                        icon: Edit,
                        onClick: () => console.log('Edit', stream.id),
                      },
                      {
                        label: 'End Stream',
                        icon: Trash2,
                        variant: 'destructive',
                        onClick: () => console.log('End', stream.id),
                      },
                    ]}
                  />
                ),
              },
            ]}
            data={filteredStreams}
            keyExtractor={(stream) => stream.id}
          />
        )}
      </Card>
    </div>
  );
}

