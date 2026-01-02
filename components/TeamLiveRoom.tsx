'use client';

import { useMemo } from 'react';
import LiveRoom from './LiveRoom';
import { createTeamRoomConfig, type RoomUser } from '@/lib/room-config';

interface TeamLiveRoomProps {
  teamId: string;
  teamSlug: string;
  teamName: string;
  teamIconUrl?: string;
  teamBannerUrl?: string;
  /** Current user's role in the team */
  userTeamRole?: 'owner' | 'admin' | 'moderator' | 'member';
  /** Override: minimum role required to publish (default: 'moderator') */
  publishMinRole?: 'owner' | 'admin' | 'moderator' | 'member';
}

/**
 * TeamLiveRoom - A LiveRoom configured for team use
 * 
 * Uses the same 12-box grid as LiveCentral but scoped to a team.
 * Room name: team-{teamSlug}
 * 
 * Permissions:
 * - View: Team members only (verified server-side via token API)
 * - Publish: Based on team role (default: moderator+)
 * - Moderate: Admin+ roles
 */
export default function TeamLiveRoom({
  teamId,
  teamSlug,
  teamName,
  teamIconUrl,
  teamBannerUrl,
  userTeamRole,
  publishMinRole = 'moderator',
}: TeamLiveRoomProps) {
  // Create team-specific room config
  const roomConfig = useMemo(() => {
    const baseConfig = createTeamRoomConfig(
      teamId,
      teamSlug,
      teamName,
      teamIconUrl,
      teamBannerUrl
    );

    // Role hierarchy for permission checks
    const roleRank: Record<string, number> = {
      owner: 40,
      admin: 30,
      moderator: 20,
      member: 10,
    };

    const minRoleRank = roleRank[publishMinRole] || 20;

    // Override permissions with the current user's role
    return {
      ...baseConfig,
      permissions: {
        canView: (user: RoomUser | null) => {
          // Must be logged in (team membership checked server-side)
          return !!user?.id;
        },
        canPublish: (user: RoomUser | null) => {
          // Use the passed userTeamRole since we know it
          if (!userTeamRole) return false;
          const userRank = roleRank[userTeamRole] || 0;
          return userRank >= minRoleRank;
        },
        canModerate: (user: RoomUser | null) => {
          if (!userTeamRole) return false;
          const userRank = roleRank[userTeamRole] || 0;
          return userRank >= roleRank['admin'];
        },
      },
    };
  }, [teamId, teamSlug, teamName, teamIconUrl, teamBannerUrl, userTeamRole, publishMinRole]);

  return (
    <LiveRoom 
      roomConfig={roomConfig}
      mode="solo"
      layoutStyle="twitch-viewer"
    />
  );
}
