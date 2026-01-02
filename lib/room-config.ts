/**
 * Room Configuration System
 * 
 * Defines the configuration for different room types (LiveCentral, Team Rooms, Official Rooms).
 * The LiveRoom component uses this config to determine permissions, room names, and behavior.
 */

export type RoomType = 'live_central' | 'team' | 'official' | 'private';

export interface RoomPermissions {
  /** Check if user can view/enter the room */
  canView: (user: RoomUser | null) => boolean | Promise<boolean>;
  /** Check if user can publish video/audio */
  canPublish: (user: RoomUser | null) => boolean | Promise<boolean>;
  /** Check if user is admin/moderator of the room */
  canModerate: (user: RoomUser | null) => boolean | Promise<boolean>;
}

export interface RoomUser {
  id: string;
  email?: string | null;
  username?: string;
  teamRole?: string; // For team rooms: 'owner' | 'admin' | 'moderator' | 'member'
  teamId?: string;
}

export interface RoomBranding {
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  backgroundUrl?: string;
  fallbackGradient?: string;
  theme?: 'default' | 'dark' | 'team';
}

export interface RoomConfig {
  /** Unique room identifier (used for LiveKit room name) */
  roomId: string;
  
  /** Identifier used for scoping chat/viewers/leaderboards (defaults to roomId) */
  contentRoomId?: string;
  
  /** Room type for conditional logic */
  type: RoomType;
  
  /** Display information */
  branding: RoomBranding;
  
  /** Permission callbacks */
  permissions: RoomPermissions;
  
  /** Optional: Team ID if this is a team room */
  teamId?: string;
  
  /** Optional: Team slug for URL routing */
  teamSlug?: string;
  
  /** Grid size (default 12) */
  gridSize?: number;
  
  /** Enable chat (default true) */
  chatEnabled?: boolean;
  
  /** Enable gifting (default true) */
  giftingEnabled?: boolean;
  
  /** Enable leaderboards (default true) */
  leaderboardsEnabled?: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * LiveCentral - The main public room
 * Anyone can view, only approved users can publish
 */
export function createLiveCentralConfig(
  canPublishCheck: (user: RoomUser | null) => boolean
): RoomConfig {
  return {
    roomId: 'live_central',
    contentRoomId: 'live-central',
    type: 'live_central',
    branding: {
      name: 'Live Central',
      description: 'The main live room',
    },
    permissions: {
      canView: () => true, // Public room
      canPublish: canPublishCheck,
      canModerate: (user) => {
        // Platform admins can moderate
        if (!user) return false;
        // Add your admin check here
        return false;
      },
    },
    gridSize: 12,
    chatEnabled: true,
    giftingEnabled: true,
    leaderboardsEnabled: true,
  };
}

/**
 * Team Room - Private room for team members
 */
export function createTeamRoomConfig(
  teamId: string,
  teamSlug: string,
  teamName: string,
  teamIconUrl?: string,
  teamBannerUrl?: string
): RoomConfig {
  return {
    roomId: `team-${teamSlug}`,
    contentRoomId: teamId,
    type: 'team',
    teamId,
    teamSlug,
    branding: {
      name: teamName,
      description: `${teamName} Team Room`,
      iconUrl: teamIconUrl,
      bannerUrl: teamBannerUrl,
      theme: 'team',
    },
    permissions: {
      canView: (user) => {
        // Must be logged in and team member (checked server-side)
        return !!user?.id;
      },
      canPublish: (user) => {
        // Team members with appropriate role can publish
        if (!user?.teamRole) return false;
        const publishRoles = ['owner', 'admin', 'moderator'];
        return publishRoles.includes(user.teamRole);
      },
      canModerate: (user) => {
        if (!user?.teamRole) return false;
        const modRoles = ['owner', 'admin', 'moderator'];
        return modRoles.includes(user.teamRole);
      },
    },
    gridSize: 12,
    chatEnabled: true,
    giftingEnabled: true,
    leaderboardsEnabled: true,
  };
}

/**
 * Official Room - Platform-managed themed rooms
 */
export function createOfficialRoomConfig(
  roomSlug: string,
  roomName: string,
  description?: string,
  canPublishCheck?: (user: RoomUser | null) => boolean
): RoomConfig {
  return {
    roomId: `official-${roomSlug}`,
    contentRoomId: roomSlug,
    type: 'official',
    branding: {
      name: roomName,
      description,
    },
    permissions: {
      canView: () => true, // Official rooms are public
      canPublish: canPublishCheck || (() => false),
      canModerate: () => false, // Platform-managed
    },
    gridSize: 12,
    chatEnabled: true,
    giftingEnabled: true,
    leaderboardsEnabled: true,
  };
}

// ============================================================================
// Room Registry (for discovering available rooms)
// ============================================================================

export interface RoomRegistryEntry {
  roomId: string;
  type: RoomType;
  name: string;
  description?: string;
  iconUrl?: string;
  isLive: boolean;
  viewerCount: number;
  streamerCount: number;
}

// This would be populated from the database
export async function getAvailableRooms(): Promise<RoomRegistryEntry[]> {
  // TODO: Fetch from database
  return [
    {
      roomId: 'live_central',
      type: 'live_central',
      name: 'Live Central',
      description: 'The main live room',
      isLive: true,
      viewerCount: 0,
      streamerCount: 0,
    },
  ];
}
