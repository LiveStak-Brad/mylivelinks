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
  ExternalLink
} from 'lucide-react';

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
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-400">Loading referrals data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => void loadData()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totals = data?.totals ?? { clicks: 0, signups: 0, activations: 0, activation_rate: 0 };
  const leaderboard = data?.leaderboard ?? [];
  const recentActivity = data?.recent_activity ?? [];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Global Referrals</h1>
            <p className="text-gray-400">Platform-wide referral performance and analytics</p>
          </div>
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition border border-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            label="Total Referral Clicks"
            value={totals.clicks.toLocaleString()}
            icon={<Users className="w-6 h-6" />}
            iconColor="bg-blue-500/20 text-blue-400"
          />
          <KPICard
            label="Total Referral Signups"
            value={totals.signups.toLocaleString()}
            icon={<UserPlus className="w-6 h-6" />}
            iconColor="bg-purple-500/20 text-purple-400"
          />
          <KPICard
            label="Activated Referrals"
            value={totals.activations.toLocaleString()}
            icon={<UserCheck className="w-6 h-6" />}
            iconColor="bg-green-500/20 text-green-400"
          />
          <KPICard
            label="Activation Rate"
            value={`${totals.activation_rate.toFixed(1)}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            iconColor="bg-yellow-500/20 text-yellow-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Top Referrers
              </h2>
              <p className="text-sm text-gray-400 mt-1">Ranked by activations, then signups</p>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {leaderboard.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No referral data yet
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Signups
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Activated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {leaderboard.map((user) => (
                      <tr key={user.profile_id} className="hover:bg-gray-750 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-bold ${
                            user.rank === 1 ? 'text-yellow-400' :
                            user.rank === 2 ? 'text-gray-300' :
                            user.rank === 3 ? 'text-orange-400' :
                            'text-gray-400'
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
                              <div className="text-sm font-medium text-white">
                                {user.display_name || user.username}
                              </div>
                              {user.display_name && (
                                <div className="text-xs text-gray-400">@{user.username}</div>
                              )}
                            </div>
                            <a
                              href={`/${user.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-purple-400 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-300">{user.clicks.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-300">{user.signups.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-green-400">
                            {user.activations.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Activity
              </h2>
              <p className="text-sm text-gray-400 mt-1">Latest referral events</p>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ 
  label, 
  value, 
  icon, 
  iconColor 
}: { 
  label: string; 
  value: string; 
  icon: React.ReactNode; 
  iconColor: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${iconColor}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </div>
          <div className="text-2xl font-bold text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ReferralOverviewData['recent_activity'][0] }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'click':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'signup':
        return <UserPlus className="w-4 h-4 text-purple-400" />;
      case 'activation':
        return <UserCheck className="w-4 h-4 text-green-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'click':
        return (
          <>
            <span className="font-medium text-white">{activity.referrer_username}</span>
            <span className="text-gray-400"> received a referral click</span>
          </>
        );
      case 'signup':
        return (
          <>
            <span className="font-medium text-white">{activity.referred_username || 'Someone'}</span>
            <span className="text-gray-400"> joined via </span>
            <span className="font-medium text-white">{activity.referrer_username}</span>
          </>
        );
      case 'activation':
        return (
          <>
            <span className="font-medium text-white">{activity.referred_username || 'Someone'}</span>
            <span className="text-gray-400"> activated (referred by </span>
            <span className="font-medium text-white">{activity.referrer_username}</span>
            <span className="text-gray-400">)</span>
          </>
        );
      default:
        return <span className="text-gray-400">Unknown activity</span>;
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
    <div className="p-4 hover:bg-gray-750 transition">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getActivityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            {getActivityText()}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {timeAgo(activity.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

