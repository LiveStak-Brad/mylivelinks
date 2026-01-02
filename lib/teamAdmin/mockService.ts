import type {
  LivePermissionPolicy,
  ModerationQueueItem,
  TeamAdminSnapshot,
  TeamAuditEvent,
  TeamEmote,
  TeamIdentity,
  TeamMember,
  TeamMemberProfile,
  TeamMemberRequest,
  TeamModerationAction,
  TeamRole,
} from './types';

export interface TeamAdminApi {
  getSnapshot: (teamId: string) => Promise<TeamAdminSnapshot>;
}

function nowIso() {
  return new Date().toISOString();
}

function minutesAgoIso(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

const MOCK_TEAM: TeamIdentity = {
  id: 'team_demo_001',
  name: 'MyLiveLinks Creators',
  iconUrl: null,
  bannerUrl: null,
};

const P = (id: string, username: string, displayName?: string | null): TeamMemberProfile => ({
  id,
  username,
  displayName: displayName ?? null,
  avatarUrl: null,
});

const MOCK_MEMBERS: TeamMember[] = [
  {
    profile: P('u_admin_1', 'adminbrad', 'Brad'),
    role: 'Team_Admin',
    status: { mutedUntil: null, bannedUntil: null },
    lastActiveAt: minutesAgoIso(12),
    joinedAt: daysAgoIso(90),
  },
  {
    profile: P('u_mod_1', 'modjules', 'Jules'),
    role: 'Team_Moderator',
    status: { mutedUntil: null, bannedUntil: null },
    lastActiveAt: minutesAgoIso(55),
    joinedAt: daysAgoIso(48),
  },
  {
    profile: P('u_member_1', 'creator_kay', 'Kay'),
    role: 'Team_Member',
    status: { mutedUntil: minutesAgoIso(-30), bannedUntil: null },
    lastActiveAt: daysAgoIso(2),
    joinedAt: daysAgoIso(16),
  },
  {
    profile: P('u_member_2', 'silent_sam', 'Sam'),
    role: 'Team_Member',
    status: { mutedUntil: null, bannedUntil: daysAgoIso(-7) },
    lastActiveAt: null,
    joinedAt: daysAgoIso(7),
  },
  {
    profile: P('u_member_3', 'bignate', 'Nate'),
    role: 'Team_Member',
    status: { mutedUntil: null, bannedUntil: null },
    lastActiveAt: minutesAgoIso(8),
    joinedAt: daysAgoIso(3),
  },
];

const MOCK_REQUESTS: TeamMemberRequest[] = [
  {
    id: 'req_1',
    profile: P('u_req_1', 'newcreator', 'New Creator'),
    requestedAt: minutesAgoIso(150),
    note: 'I want to collaborate with creators in this team.',
  },
  {
    id: 'req_2',
    profile: P('u_req_2', 'anotheruser', null),
    requestedAt: daysAgoIso(1),
    note: null,
  },
];

const MOCK_EMOTES: TeamEmote[] = [
  {
    id: 'emote_1',
    name: 'hype',
    imageUrl: '/images/README.md',
    enabled: true,
    createdAt: daysAgoIso(12),
    createdBy: P('u_admin_1', 'adminbrad', 'Brad'),
  },
  {
    id: 'emote_2',
    name: 'lol',
    imageUrl: '/images/README.md',
    enabled: false,
    createdAt: daysAgoIso(8),
    createdBy: P('u_mod_1', 'modjules', 'Jules'),
  },
];

const MOCK_MOD_QUEUE: ModerationQueueItem[] = [
  {
    id: 'mq_1',
    type: 'post',
    author: P('u_member_3', 'bignate', 'Nate'),
    createdAt: minutesAgoIso(230),
    summary: 'Post flagged for spam keywords (placeholder).',
    reportCount: 2,
    status: 'pending',
  },
  {
    id: 'mq_2',
    type: 'comment',
    author: P('u_member_1', 'creator_kay', 'Kay'),
    createdAt: minutesAgoIso(540),
    summary: 'Comment reported for harassment (placeholder).',
    reportCount: 1,
    status: 'pending',
  },
];

const MOCK_AUDIT: TeamAuditEvent[] = [
  {
    id: 'audit_1',
    createdAt: minutesAgoIso(42),
    actor: P('u_mod_1', 'modjules', 'Jules'),
    actorRole: 'Team_Moderator',
    action: 'Muted member',
    targetLabel: '@creator_kay',
    detail: '60 minutes · Reason: spam in chat (placeholder)',
    severity: 'warning',
  },
  {
    id: 'audit_2',
    createdAt: daysAgoIso(3),
    actor: P('u_admin_1', 'adminbrad', 'Brad'),
    actorRole: 'Team_Admin',
    action: 'Changed live permissions',
    targetLabel: null,
    detail: 'Policy: admins_and_mods',
    severity: 'info',
  },
];

const MOCK_MOD_ACTIONS: TeamModerationAction[] = [
  {
    id: 'modact_1',
    type: 'mute',
    target: P('u_member_1', 'creator_kay', 'Kay'),
    durationSeconds: 3600,
    reason: 'Spam in chat',
    createdAt: minutesAgoIso(42),
    actor: P('u_mod_1', 'modjules', 'Jules'),
  },
];

function buildSnapshot(teamId: string): TeamAdminSnapshot {
  const whoCanGoLive: LivePermissionPolicy = 'admins_and_mods';

  return {
    team: { ...MOCK_TEAM, id: teamId },
    customization: {
      theme: { primary: '#8b5cf6', accent: '#ec4899', background: '#0b0b10' },
      rules: 'Be respectful. No spam. No harassment.\n\nThis is a UI-only placeholder rules editor.',
      pinnedAnnouncement: 'Welcome to the team! Read the rules before posting. (UI-only placeholder)',
    },
    livePermissions: { whoCanGoLive },
    requests: [...MOCK_REQUESTS],
    members: [...MOCK_MEMBERS],
    emotes: [...MOCK_EMOTES],
    moderationQueue: [...MOCK_MOD_QUEUE],
    audit: [...MOCK_AUDIT],
  };
}

export function createMockTeamAdminApi(opts?: { delayMs?: number; shouldError?: boolean }):
  TeamAdminApi {
  const delayMs = typeof opts?.delayMs === 'number'
    ? opts.delayMs
    : 600 + Math.floor(Math.random() * 301);
  const shouldError = opts?.shouldError === true;

  return {
    async getSnapshot(teamId: string) {
      await new Promise((r) => setTimeout(r, delayMs));
      if (shouldError) {
        throw new Error('Failed to load team admin data (mock error)');
      }
      return buildSnapshot(teamId);
    },
  };
}

export function getMockRoleFromQuery(queryRole: string | null | undefined): TeamRole | null {
  if (queryRole === 'Team_Admin' || queryRole === 'Team_Moderator' || queryRole === 'Team_Member') {
    return queryRole;
  }
  return null;
}

export function createAuditEvent(params: {
  actor: TeamMemberProfile;
  actorRole: TeamRole;
  action: string;
  targetLabel?: string | null;
  detail?: string | null;
  severity?: TeamAuditEvent['severity'];
}): TeamAuditEvent {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: nowIso(),
    actor: params.actor,
    actorRole: params.actorRole,
    action: params.action,
    targetLabel: params.targetLabel ?? null,
    detail: params.detail ?? null,
    severity: params.severity ?? 'info',
  };
}

export function getMockModerationActions(): TeamModerationAction[] {
  return [...MOCK_MOD_ACTIONS];
}
