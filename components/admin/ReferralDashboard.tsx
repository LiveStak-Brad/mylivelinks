'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  UserCheck, 
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Activity,
  Calendar,
  Award,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import KpiCard from '@/components/analytics/KpiCard';
import DataTable, { DataTableColumn } from '@/components/analytics/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

/* =============================================================================
   TYPES & INTERFACES
============================================================================= */

type TimeFilter = 'all-time' | '30d' | '7d';

interface ReferredUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  joined_date: string;
  is_active: boolean;
  last_active: string;
  activity_level: 'high' | 'medium' | 'low';
  total_posts: number;
  total_streams: number;
}

interface ReferrerData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_joined: number;
  total_active: number;
  growth_7d: number;
  growth_30d: number;
  joined_7d: number;
  joined_30d: number;
  active_7d: number;
  active_30d: number;
  referred_users: ReferredUser[];
  rank: number;
}

type AdminLeaderboardRow = {
  profile_id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  clicks: number;
  joined: number;
  active: number;
  joined_7d?: number;
  joined_30d?: number;
  active_7d?: number;
  active_30d?: number;
  last_click_at?: string | null;
  last_referral_at?: string | null;
  last_activity_at?: string | null;
  rank: number;
};

type AdminReferrerDetails = {
  referrer: { id: string; username: string | null; avatar_url: string | null; display_name: string | null } | null;
  referred_users: Array<{
    profile_id: string;
    username: string | null;
    avatar_url: string | null;
    display_name: string | null;
    joined_at: string | null;
    is_active: boolean;
    last_activity_at: string | null;
  }>;
};

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

export default function ReferralDashboard() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');
  const [sortColumn, setSortColumn] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerData | null>(null);

  const [loading, setLoading] = useState(true);
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/referrals/leaderboard?range=all&limit=100');
        const json = (await res.json().catch(() => [])) as AdminLeaderboardRow[];
        const rows = res.ok && Array.isArray(json) ? json : [];

        const mapped: ReferrerData[] = rows.map((r) => {
          const displayName = r.display_name || r.username || 'Unknown';
          return {
            id: String(r.profile_id),
            username: String(r.username ?? ''),
            display_name: displayName,
            avatar_url: r.avatar_url ?? null,
            total_joined: Number(r.joined ?? 0),
            total_active: Number(r.active ?? 0),
            growth_7d: 0,
            growth_30d: 0,
            joined_7d: Number((r as any).joined_7d ?? 0),
            joined_30d: Number((r as any).joined_30d ?? 0),
            active_7d: Number((r as any).active_7d ?? 0),
            active_30d: Number((r as any).active_30d ?? 0),
            referred_users: [],
            rank: Number(r.rank ?? 0),
          };
        });

        if (mounted) setReferrers(mapped);
      } catch (err) {
        console.warn('[admin] Failed to load referral leaderboard (non-blocking):', err);
        if (mounted) setReferrers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Calculate aggregate KPIs
  const kpiData = useMemo(() => {
    const totalJoined = referrers.reduce((sum, r) => sum + r.total_joined, 0);
    const totalActive = referrers.reduce((sum, r) => sum + r.total_active, 0);
    const totalJoined7d = referrers.reduce((sum, r) => sum + r.joined_7d, 0);
    const totalJoined30d = referrers.reduce((sum, r) => sum + r.joined_30d, 0);
    const totalActive7d = referrers.reduce((sum, r) => sum + r.active_7d, 0);
    const totalActive30d = referrers.reduce((sum, r) => sum + r.active_30d, 0);

    const conversionRate = totalJoined > 0 ? ((totalActive / totalJoined) * 100).toFixed(1) : '0.0';
    const activeReferrers = referrers.filter(r => r.joined_7d > 0).length;

    return {
      totalJoined,
      totalActive,
      totalJoined7d,
      totalJoined30d,
      totalActive7d,
      totalActive30d,
      conversionRate,
      activeReferrers,
    };
  }, [referrers]);

  // Sort and filter referrer data
  const sortedReferrers = useMemo(() => {
    const sorted = [...referrers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'total_joined':
          aValue = a.total_joined;
          bValue = b.total_joined;
          break;
        case 'total_active':
          aValue = a.total_active;
          bValue = b.total_active;
          break;
        case 'growth_7d':
          aValue = a.joined_7d;
          bValue = b.joined_7d;
          break;
        case 'growth_30d':
          aValue = a.joined_30d;
          bValue = b.joined_30d;
          break;
        default:
          aValue = a.rank;
          bValue = b.rank;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [referrers, sortColumn, sortDirection]);

  useEffect(() => {
    if (!selectedReferrer) return;

    let mounted = true;
    const loadDetails = async () => {
      try {
        const res = await fetch(`/api/admin/referrals/referrer/${encodeURIComponent(selectedReferrer.id)}`);
        const json = (await res.json().catch(() => null)) as AdminReferrerDetails | null;
        if (!mounted) return;
        if (!res.ok || !json) return;

        const referred_users: ReferredUser[] = (Array.isArray(json.referred_users) ? json.referred_users : []).map((u) => {
          const last = u.last_activity_at || u.joined_at || new Date(0).toISOString();
          const lastDate = new Date(last);
          const days = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          const activity_level: ReferredUser['activity_level'] = u.is_active ? (days <= 2 ? 'high' : days <= 7 ? 'medium' : 'low') : 'low';

          return {
            id: String(u.profile_id),
            username: String(u.username ?? ''),
            display_name: String(u.display_name ?? u.username ?? 'Unknown'),
            avatar_url: u.avatar_url ?? null,
            joined_date: String(u.joined_at ?? ''),
            is_active: Boolean(u.is_active),
            last_active: String(u.last_activity_at ?? u.joined_at ?? ''),
            activity_level,
            total_posts: 0,
            total_streams: 0,
          };
        });

        setSelectedReferrer((prev) => {
          if (!prev) return prev;
          if (prev.id !== selectedReferrer.id) return prev;
          return { ...prev, referred_users };
        });
      } catch (err) {
        console.warn('[admin] Failed to load referrer details (non-blocking):', err);
      }
    };

    void loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedReferrer?.id]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Define table columns
  const columns: DataTableColumn<ReferrerData>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '80px',
      align: 'center',
      sortable: true,
      render: (row) => (
        <div className="flex items-center justify-center">
          {row.rank <= 3 ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 font-bold text-white">
              {row.rank}
            </div>
          ) : (
            <span className="font-semibold text-gray-400">#{row.rank}</span>
          )}
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Referrer',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
            {row.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-white">{row.display_name}</div>
            <div className="text-xs text-gray-400">@{row.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'total_joined',
      header: 'Total Joined',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="font-semibold text-white">{row.total_joined.toLocaleString()}</div>
        </div>
      ),
    },
    {
      key: 'total_active',
      header: 'Active',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="font-semibold text-green-400">{row.total_active.toLocaleString()}</div>
          <div className="text-xs text-gray-500">
            {((row.total_active / row.total_joined) * 100).toFixed(0)}% rate
          </div>
        </div>
      ),
    },
    {
      key: 'growth_7d',
      header: '7d Growth',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            {row.joined_7d > 0 ? (
              <>
                <ChevronUp className="w-4 h-4 text-green-400" />
                <span className="font-semibold text-green-400">+{row.joined_7d}</span>
              </>
            ) : (
              <span className="font-semibold text-gray-500">0</span>
            )}
          </div>
          <div className="text-xs text-gray-500">{row.active_7d} active</div>
        </div>
      ),
    },
    {
      key: 'growth_30d',
      header: '30d Growth',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            {row.joined_30d > 0 ? (
              <>
                <ChevronUp className="w-4 h-4 text-green-400" />
                <span className="font-semibold text-green-400">+{row.joined_30d}</span>
              </>
            ) : (
              <span className="font-semibold text-gray-500">0</span>
            )}
          </div>
          <div className="text-xs text-gray-500">{row.active_30d} active</div>
        </div>
      ),
    },
  ];

  // Drilldown columns for referred users
  const referredUsersColumns: DataTableColumn<ReferredUser>[] = [
    {
      key: 'username',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-white">{user.display_name}</div>
            <div className="text-xs text-gray-400">@{user.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'joined_date',
      header: 'Join Date',
      width: '150px',
      render: (user) => {
        const date = new Date(user.joined_date);
        return (
          <div className="text-sm text-gray-300">
            {date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        );
      },
    },
    {
      key: 'activity',
      header: 'Activity',
      width: '200px',
      render: (user) => {
        const activityColors = {
          high: 'success',
          medium: 'warning',
          low: 'destructive',
        } as const;

        const activityLabels = {
          high: 'High',
          medium: 'Medium',
          low: 'Low',
        };

        return (
          <div className="flex items-center gap-2">
            <Badge variant={activityColors[user.activity_level]} size="sm">
              {activityLabels[user.activity_level]}
            </Badge>
            <span className="text-xs text-gray-500">
              {user.total_posts}p / {user.total_streams}s
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      align: 'center',
      render: (user) => (
        <div className="flex justify-center">
          {user.is_active ? (
            <Badge variant="success" size="sm" dot dotColor="success">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" size="sm">
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Seen',
      width: '150px',
      render: (user) => {
        const now = new Date();
        const lastActive = new Date(user.last_active);
        const diffMs = now.getTime() - lastActive.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        let timeAgo = '';
        if (diffDays > 0) {
          timeAgo = `${diffDays}d ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours}h ago`;
        } else {
          timeAgo = 'Just now';
        }

        return (
          <div className="text-sm text-gray-400">{timeAgo}</div>
        );
      },
    },
  ];

  // Drilldown view
  if (selectedReferrer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft />}
            onClick={() => setSelectedReferrer(null)}
          >
            Back to Overview
          </Button>

          {/* Referrer header */}
          <Card>
            <CardContent noPadding>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                    {selectedReferrer.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-white">
                        {selectedReferrer.display_name}
                      </h2>
                      <Badge variant="primary" size="md">
                        <Award className="w-3 h-3" />
                        Rank #{selectedReferrer.rank}
                      </Badge>
                    </div>
                    <p className="text-gray-400">@{selectedReferrer.username}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Referred</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedReferrer.total_joined}
                    </div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    <div className="text-sm text-gray-400 mb-1">Active Users</div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedReferrer.total_active}
                    </div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                    <div className="text-sm text-gray-400 mb-1">7d Growth</div>
                    <div className="text-2xl font-bold text-blue-400">
                      +{selectedReferrer.growth_7d}
                    </div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                    <div className="text-sm text-gray-400 mb-1">30d Growth</div>
                    <div className="text-2xl font-bold text-purple-400">
                      +{selectedReferrer.growth_30d}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referred users table */}
          <DataTable
            title="Referred Users"
            subtitle={`${selectedReferrer.referred_users.length} total users referred`}
            columns={referredUsersColumns}
            data={selectedReferrer.referred_users}
            keyExtractor={(user) => user.id}
          />
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Referral Analytics Dashboard
            </h1>
            <p className="text-gray-400">
              Track and monitor referrer performance and user growth
            </p>
          </div>
          
          {/* Time filter buttons */}
          <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
            <Button
              variant={timeFilter === 'all-time' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('all-time')}
            >
              All-time
            </Button>
            <Button
              variant={timeFilter === '30d' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeFilter === '7d' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('7d')}
            >
              7 Days
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Referred"
            value={
              timeFilter === 'all-time'
                ? kpiData.totalJoined
                : timeFilter === '30d'
                ? kpiData.totalJoined30d
                : kpiData.totalJoined7d
            }
            subtitle="Users joined via referrals"
            icon={<Users className="w-5 h-5 text-blue-400" />}
            variant="info"
          />
          <KpiCard
            title="Active Users"
            value={
              timeFilter === 'all-time'
                ? kpiData.totalActive
                : timeFilter === '30d'
                ? kpiData.totalActive30d
                : kpiData.totalActive7d
            }
            subtitle="Currently active referred users"
            icon={<UserCheck className="w-5 h-5 text-green-400" />}
            variant="success"
          />
          <KpiCard
            title="Conversion Rate"
            value={`${kpiData.conversionRate}%`}
            subtitle="Joined → Active conversion"
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            variant="default"
          />
          <KpiCard
            title="Active Referrers"
            value={kpiData.activeReferrers}
            subtitle="Referrers with 7d activity"
            icon={<Activity className="w-5 h-5 text-orange-400" />}
            variant="warning"
          />
        </div>

        {/* Info banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300">
              <strong>Time Filter Active:</strong> Currently viewing{' '}
              <span className="font-semibold">
                {timeFilter === 'all-time'
                  ? 'all-time'
                  : timeFilter === '30d'
                  ? 'last 30 days'
                  : 'last 7 days'}
              </span>{' '}
              data. The growth columns show new referrals within their respective time periods.
            </p>
          </div>
        </div>

        {/* Main referrers table */}
        <DataTable
          title="Top Referrers"
          subtitle="Ranked by total referrals and engagement"
          columns={columns}
          data={sortedReferrers}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setSelectedReferrer(row)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        {/* Footer note */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>
            Click any referrer to view detailed breakdown of their referred users
          </p>
        </div>
      </div>
    </div>
  );
}






