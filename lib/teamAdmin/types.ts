export type TeamRole = 'Team_Admin' | 'Team_Moderator' | 'Team_Member';

export type LivePermissionPolicy = 'admins_only' | 'admins_and_mods' | 'all_members';

export interface TeamIdentity {
  id: string;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
}

export interface TeamCustomization {
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  rules: string;
  pinnedAnnouncement: string;
}

export interface TeamLivePermissions {
  whoCanGoLive: LivePermissionPolicy;
}

export interface TeamEmote {
  id: string;
  name: string;
  imageUrl: string;
  enabled: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface TeamMemberProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface TeamMember {
  profile: TeamMemberProfile;
  role: TeamRole;
  status: {
    mutedUntil: string | null;
    bannedUntil: string | null;
  };
  lastActiveAt: string | null;
  joinedAt: string;
}

export interface TeamMemberRequest {
  id: string;
  profile: TeamMemberProfile;
  requestedAt: string;
  note: string | null;
}

export type ModerationActionType = 'mute' | 'ban';

export interface TeamModerationAction {
  id: string;
  type: ModerationActionType;
  target: TeamMemberProfile;
  durationSeconds: number | null;
  reason: string | null;
  createdAt: string;
  actor: TeamMemberProfile;
}

export type ModerationQueueItemType = 'post' | 'comment';

export interface ModerationQueueItem {
  id: string;
  type: ModerationQueueItemType;
  author: TeamMemberProfile;
  createdAt: string;
  summary: string;
  reportCount: number;
  status: 'pending' | 'actioned' | 'dismissed';
}

export interface TeamAuditEvent {
  id: string;
  createdAt: string;
  actor: TeamMemberProfile;
  actorRole: TeamRole;
  action: string;
  targetLabel: string | null;
  detail: string | null;
  severity: 'info' | 'warning' | 'destructive';
}

export interface TeamAdminSnapshot {
  team: TeamIdentity;
  customization: TeamCustomization;
  livePermissions: TeamLivePermissions;
  requests: TeamMemberRequest[];
  members: TeamMember[];
  emotes: TeamEmote[];
  moderationQueue: ModerationQueueItem[];
  audit: TeamAuditEvent[];
}
