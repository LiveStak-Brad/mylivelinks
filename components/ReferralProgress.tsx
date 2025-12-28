'use client';

import { useState, useEffect } from 'react';
import {
  getMockReferralStats,
  getReferralEncouragementMessage,
  type ReferralStats,
} from '@/lib/referralMockData';

interface ReferralProgressProps {
  className?: string;
  onViewLeaderboard?: () => void;
}

export default function ReferralProgress({
  className = '',
  onViewLeaderboard,
}: ReferralProgressProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading mock data
    const timer = setTimeout(() => {
      setStats(getMockReferralStats());
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const encouragementMessage = getReferralEncouragementMessage(stats);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Referrals
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {encouragementMessage}
          </p>
        </div>
        
        {/* Current Rank Badge */}
        {stats.currentRank && (
          <div className="flex flex-col items-center bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-lg px-4 py-3 shadow-md">
            <div className="text-xs font-medium opacity-90 uppercase tracking-wide">
              Your Rank
            </div>
            <div className="text-2xl font-bold">
              #{stats.currentRank}
            </div>
            <div className="text-xs opacity-75">
              of {stats.totalReferrers}
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Invites Sent */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300 uppercase tracking-wide">
              Invites Sent
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {stats.invitesSent}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {stats.inviteClicks} clicks
          </div>
        </div>

        {/* Users Joined */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            <span className="text-xs font-medium text-green-900 dark:text-green-300 uppercase tracking-wide">
              Users Joined
            </span>
          </div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            {stats.usersJoined}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            {stats.inviteClicks > 0
              ? `${((stats.usersJoined / stats.inviteClicks) * 100).toFixed(1)}% conversion`
              : 'No clicks yet'}
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs font-medium text-purple-900 dark:text-purple-300 uppercase tracking-wide">
              Active Users
            </span>
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {stats.activeUsers}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            {stats.usersJoined > 0
              ? `${((stats.activeUsers / stats.usersJoined) * 100).toFixed(0)}% active rate`
              : 'No users yet'}
          </div>
        </div>

        {/* Progress Score */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-xs font-medium text-orange-900 dark:text-orange-300 uppercase tracking-wide">
              Total Score
            </span>
          </div>
          <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {stats.invitesSent + stats.usersJoined * 5 + stats.activeUsers * 10}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Combined metric
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md">
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Your Referral Link
          </span>
        </button>
        
        {onViewLeaderboard && (
          <button
            onClick={onViewLeaderboard}
            className="flex-1 sm:flex-initial bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-medium border-2 border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 transition-all"
          >
            View Full Leaderboard
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-xs text-yellow-800 dark:text-yellow-300">
          <strong>Note:</strong> Rankings and stats are for engagement purposes only. 
          No guaranteed rewards. Quality referrals matter more than quantity.
        </p>
      </div>
    </div>
  );
}

