/**
 * Referral System Mock Data Provider
 * 
 * Mock data only - no hard reward guarantees
 * Shows user progress and leaderboard rankings
 */

export interface ReferralStats {
  invitesSent: number;
  inviteClicks: number;
  usersJoined: number;
  activeUsers: number;
  currentRank: number | null;
  totalReferrers: number;
}

export interface LeaderboardEntry {
  rank: number;
  profileId?: string;
  username: string;
  avatarUrl?: string;
  referralCount: number;
  activeCount?: number;
  isCurrentUser?: boolean;
}

/**
 * Generate mock referral stats for current user
 */
export function getMockReferralStats(): ReferralStats {
  return {
    invitesSent: 12,
    inviteClicks: 45,
    usersJoined: 8,
    activeUsers: 5,
    currentRank: 8,
    totalReferrers: 47,
  };
}

/**
 * Generate mock leaderboard data (top 5 preview)
 */
export function getMockReferralLeaderboard(includeCurrentUser = false): LeaderboardEntry[] {
  const topFive: LeaderboardEntry[] = [
    {
      rank: 1,
      username: 'StreamerPro',
      avatarUrl: '/api/placeholder/50/50',
      referralCount: 127,
    },
    {
      rank: 2,
      username: 'LiveKing',
      avatarUrl: '/api/placeholder/50/50',
      referralCount: 98,
    },
    {
      rank: 3,
      username: 'BroadcastQueen',
      avatarUrl: '/api/placeholder/50/50',
      referralCount: 76,
    },
    {
      rank: 4,
      username: 'VideoMaster',
      avatarUrl: '/api/placeholder/50/50',
      referralCount: 54,
    },
    {
      rank: 5,
      username: 'StreamStar',
      avatarUrl: '/api/placeholder/50/50',
      referralCount: 42,
    },
  ];

  // Optionally show current user in 8th place
  if (includeCurrentUser) {
    return [
      ...topFive,
      {
        rank: 8,
        username: 'You',
        referralCount: 8,
        isCurrentUser: true,
      },
    ];
  }

  return topFive;
}

/**
 * Generate encouraging message based on stats
 */
export function getReferralEncouragementMessage(stats: ReferralStats): string {
  if (stats.usersJoined === 0) {
    return "Start inviting friends to climb the leaderboard!";
  }
  if (stats.usersJoined < 5) {
    return "Great start! Keep sharing to move up the ranks.";
  }
  if (stats.usersJoined < 10) {
    return "You're doing amazing! Keep building your network.";
  }
  return "Incredible work! You're a referral superstar!";
}

/**
 * Format referral count for display
 */
export function formatReferralCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}



