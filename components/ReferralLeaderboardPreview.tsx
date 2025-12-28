'use client';

import { useState, useEffect } from 'react';
import {
  formatReferralCount,
  type LeaderboardEntry,
} from '@/lib/referralMockData';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { createClient } from '@/lib/supabase';

interface ReferralLeaderboardPreviewProps {
  className?: string;
  showCurrentUser?: boolean;
  onViewFull?: () => void;
}

export default function ReferralLeaderboardPreview({
  className = '',
  showCurrentUser = false,
  onViewFull,
}: ReferralLeaderboardPreviewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;

        const res = await fetch('/api/referrals/leaderboard?range=all&limit=5');
        const json = await res.json().catch(() => null);
        const rows = res.ok && Array.isArray((json as any)?.items) ? (json as any).items : [];

        const mapped: LeaderboardEntry[] = rows.slice(0, 5).map((r: any) => ({
          rank: Number(r?.rank ?? 0),
          profileId: r?.profile_id ? String(r.profile_id) : undefined,
          username: String(r?.username ?? 'Unknown'),
          avatarUrl: r?.avatar_url ? String(r.avatar_url) : undefined,
          referralCount: Number(r?.joined ?? 0),
          activeCount: Number(r?.active ?? 0),
          isCurrentUser: userId ? String(r?.profile_id ?? '') === String(userId) : false,
        }));

        let me: LeaderboardEntry | null = null;
        if (showCurrentUser && userId) {
          const inTop = mapped.some((e) => e.isCurrentUser);
          if (!inTop) {
            const [{ data: profile }, statsRes, rankRes] = await Promise.all([
              supabase.from('profiles').select('username, avatar_url').eq('id', userId).maybeSingle(),
              fetch('/api/referrals/me/stats?range=all'),
              fetch('/api/referrals/me/rank'),
            ]);

            const statsJson = await statsRes.json().catch(() => null);
            const rankJson = await rankRes.json().catch(() => null);

            const rank = rankRes.ok && typeof rankJson?.rank === 'number' ? Number(rankJson.rank) : null;
            const joined = statsRes.ok ? Number(statsJson?.joined ?? 0) : 0;
            const uname = typeof (profile as any)?.username === 'string' ? String((profile as any).username) : 'You';
            const avatarUrl = (profile as any)?.avatar_url ? String((profile as any).avatar_url) : undefined;

            if (rank && rank > 5) {
              me = {
                rank,
                profileId: String(userId),
                username: uname || 'You',
                avatarUrl,
                referralCount: joined,
                isCurrentUser: true,
              };
            }
          }
        }

        if (mounted) {
          setEntries(mapped);
          setCurrentUserEntry(me);
        }
      } catch (err) {
        console.warn('[referrals] Failed to load leaderboard (non-blocking):', err);
        if (mounted) {
          setEntries([]);
          setCurrentUserEntry(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [showCurrentUser]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-orange-400';
      default:
        return 'text-gray-400 dark:text-gray-600';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-6 h-6 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            Top Referrers
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This month's leading members
          </p>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2 mb-4">
        {entries.map((entry, index) => (
          <a
            key={`${entry.rank}-${entry.username}`}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              entry.isCurrentUser
                ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-300 dark:border-purple-700'
                : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm'
            }`}
            href={`/${encodeURIComponent(entry.username)}`}
            style={{
              animation: `slideIn 0.3s ease-out ${index * 0.08}s both`,
            }}
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-10 flex items-center justify-center">
              {getRankIcon(entry.rank) ? (
                <div className={`${getRankColor(entry.rank)}`}>
                  {getRankIcon(entry.rank)}
                </div>
              ) : (
                <span className={`text-sm font-bold ${getRankColor(entry.rank)}`}>
                  #{entry.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            {entry.avatarUrl && (
              <div className="flex-shrink-0">
                <img
                  src={getAvatarUrl(entry.avatarUrl)}
                  alt={entry.username}
                  className={`w-10 h-10 rounded-full border-2 ${
                    entry.isCurrentUser
                      ? 'border-purple-400 dark:border-purple-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            )}

            {/* Username */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {entry.username}
                {entry.isCurrentUser && (
                  <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatReferralCount(entry.referralCount)} referrals
              </div>
            </div>

            {/* Referral Count Badge */}
            <div className="flex-shrink-0">
              <div className={`text-right ${
                entry.rank === 1
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : entry.rank === 2
                  ? 'text-gray-500 dark:text-gray-400'
                  : entry.rank === 3
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                <div className="text-lg font-bold">
                  {formatReferralCount(entry.referralCount)}
                </div>
              </div>
            </div>
          </a>
        ))}

        {showCurrentUser && currentUserEntry ? (
          <>
            <div className="text-center py-2 text-gray-400 dark:text-gray-600 text-sm">...</div>
            <a
              key={`me-${currentUserEntry.rank}`}
              className="flex items-center gap-3 p-3 rounded-lg transition-all bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-300 dark:border-purple-700"
              href={`/${encodeURIComponent(currentUserEntry.username)}`}
            >
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">#{currentUserEntry.rank}</span>
              </div>

              {currentUserEntry.avatarUrl ? (
                <div className="flex-shrink-0">
                  <img
                    src={getAvatarUrl(currentUserEntry.avatarUrl)}
                    alt={currentUserEntry.username}
                    className="w-10 h-10 rounded-full border-2 border-purple-400 dark:border-purple-500"
                  />
                </div>
              ) : null}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {currentUserEntry.username}
                  <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">YOU</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatReferralCount(currentUserEntry.referralCount)} referrals
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="text-right text-gray-700 dark:text-gray-300">
                  <div className="text-lg font-bold">{formatReferralCount(currentUserEntry.referralCount)}</div>
                </div>
              </div>
            </a>
          </>
        ) : null}
      </div>

      {/* View Full CTA */}
      {onViewFull && (
        <button
          onClick={onViewFull}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <span>View Full Leaderboard</span>
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
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      )}

      {/* Encouragement Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
          💡 <strong>Pro tip:</strong> Quality referrals lead to lasting engagement!
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}



