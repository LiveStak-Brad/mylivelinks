'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  TrendingUp,
  RefreshCw,
  Activity,
  Clock,
  ExternalLink,
  Target,
} from 'lucide-react';
import {
  StatCard,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  Button,
} from '@/components/owner/ui-kit';

type ReferralOverviewData = {
  totals: {
    clicks: number;
    signups: number;
    activations: number;
    activation_rate: number;
  };
  leaderboard: Array<{
    rank: number;
    profile_id: string;
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    clicks: number;
    signups: number;
    activations: number;
  }>;
  recent_activity: Array<{
    id: string | number;
    type: 'click' | 'signup' | 'activation';
    referrer_username: string;
    referrer_avatar_url: string | null;
    referred_username: string | null;
    referred_avatar_url: string | null;
    created_at: string;
    event_type: string;
  }>;
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/referrals/overview');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load referrals data (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load referrals data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading referrals data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Activity}
          title="Failed to Load"
          description={error}
          variant="error"
          action={
            <Button variant="primary" onClick={() => void loadData()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const totals = data?.totals ?? { clicks: 0, signups: 0, activations: 0, activation_rate: 0 };
  const leaderboard = data?.leaderboard ?? [];
  const recentActivity = data?.recent_activity ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Global Referrals
          </h1>
          <p className="text-muted-foreground">Platform-wide referral performance and analytics</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Referral Clicks"
          value={totals.clicks.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Total Referral Signups"
          value={totals.signups.toLocaleString()}
          icon={UserPlus}
        />
        <StatCard
          title="Activated Referrals"
          value={totals.activations.toLocaleString()}
          icon={UserCheck}
        />
        <StatCard
          title="Activation Rate"
          value={`${totals.activation_rate.toFixed(1)}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader
            title="Top Referrers"
            subtitle="Ranked by active accepted members (activations)"
          />
          <CardBody>
            {leaderboard.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No Data"
                description="No referral data yet"
                variant="default"
              />
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Signups
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Active Accepted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaderboard.map((user) => (
                      <tr key={user.profile_id} className="hover:bg-muted/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-bold ${
                            user.rank === 1 ? 'text-yellow-500' :
                            user.rank === 2 ? 'text-gray-400' :
                            user.rank === 3 ? 'text-orange-400' :
                            'text-muted-foreground'
                          }`}>
                            #{user.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar_url || '/no-profile-pic.png'}
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {user.display_name || user.username}
                              </div>
                              {user.display_name && (
                                <div className="text-xs text-muted-foreground">@{user.username}</div>
                              )}
                            </div>
                            <a
                              href={`/${user.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-foreground">{user.clicks.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-foreground">{user.signups.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-success">
                            {user.activations.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest referral events"
          />
          <CardBody>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Activity"
                description="No recent activity"
                variant="default"
              />
            ) : (
              <div className="overflow-y-auto max-h-[600px] divide-y divide-border">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ReferralOverviewData['recent_activity'][0] }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'click':
        return <Users className="w-4 h-4 text-primary" />;
      case 'signup':
        return <UserPlus className="w-4 h-4 text-primary" />;
      case 'activation':
        return <UserCheck className="w-4 h-4 text-success" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'click':
        return (
          <>
            <span className="font-medium text-foreground">{activity.referrer_username}</span>
            <span className="text-muted-foreground"> received a referral click</span>
          </>
        );
      case 'signup':
        return (
          <>
            <span className="font-medium text-foreground">{activity.referred_username || 'Someone'}</span>
            <span className="text-muted-foreground"> joined via </span>
            <span className="font-medium text-foreground">{activity.referrer_username}</span>
          </>
        );
      case 'activation':
        return (
          <>
            <span className="font-medium text-foreground">{activity.referred_username || 'Someone'}</span>
            <span className="text-muted-foreground"> activated (referred by </span>
            <span className="font-medium text-foreground">{activity.referrer_username}</span>
            <span className="text-muted-foreground">)</span>
          </>
        );
      default:
        return <span className="text-muted-foreground">Unknown activity</span>;
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-4 hover:bg-muted/30 transition">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getActivityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            {getActivityText()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo(activity.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

