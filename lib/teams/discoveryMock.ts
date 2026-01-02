export type DiscoverVisibilitySource =
  | 'public_listing'
  | 'share_link'
  | 'pending_request'
  | 'invite_code'
  | 'existing_membership';

export type DiscoverMembershipState = 'eligible' | 'pending' | 'approved' | 'already_member';

export interface DiscoverTeamTheme {
  accent: string;
  accentMuted: string;
  pattern: 'grid' | 'beam' | 'wave';
}

export interface DiscoverTeamTemplate {
  id: string;
  order: number;
  name: string;
  tagline: string;
  privacy: 'public' | 'private';
  memberCount: number;
  tags: string[];
  safeSummary: string;
  visibilitySource: DiscoverVisibilitySource;
  initialState: DiscoverMembershipState;
  pendingSinceMinutes?: number;
  approvedSinceMinutes?: number;
  theme: DiscoverTeamTheme;
}

const BASE_DISCOVER_TEAMS: DiscoverTeamTemplate[] = [
  {
    id: 'team_art_house_collective',
    order: 1,
    name: 'Art House Collective',
    tagline: 'Portfolio-friendly critique loops & collabs.',
    privacy: 'public',
    memberCount: 2450,
    tags: ['Creators', 'Visual', 'Critique'],
    safeSummary: 'Open feedback rounds for illustrators, motion designers, and editors.',
    visibilitySource: 'public_listing',
    initialState: 'eligible',
    theme: {
      accent: '#ec4899',
      accentMuted: '#fed7e2',
      pattern: 'beam',
    },
  },
  {
    id: 'team_creator_uplift',
    order: 2,
    name: 'Creator Uplift Club',
    tagline: 'Daily accountability standups.',
    privacy: 'public',
    memberCount: 1875,
    tags: ['Accountability', 'Short-form', 'Support'],
    safeSummary: 'Public uplift pod focused on repeatable posting habits and encouragement.',
    visibilitySource: 'public_listing',
    initialState: 'eligible',
    theme: {
      accent: '#8b5cf6',
      accentMuted: '#ddd6fe',
      pattern: 'grid',
    },
  },
  {
    id: 'team_rooms_backstage',
    order: 3,
    name: 'Rooms Backstage Crew',
    tagline: 'Live room producers swapping field notes.',
    privacy: 'public',
    memberCount: 920,
    tags: ['Live Rooms', 'Technical', 'Producers'],
    safeSummary: 'Venue-style tips, layouts, and run-of-show templates for live rooms.',
    visibilitySource: 'public_listing',
    initialState: 'eligible',
    theme: {
      accent: '#f97316',
      accentMuted: '#fed7aa',
      pattern: 'wave',
    },
  },
  {
    id: 'team_lightning_lab',
    order: 4,
    name: 'Lightning Lab',
    tagline: 'Rapid experiments on new formats.',
    privacy: 'public',
    memberCount: 1310,
    tags: ['Experiments', 'A/B Tests', 'Formats'],
    safeSummary: 'Open lab for testing hooks, countdowns, and hybrid livestream formats.',
    visibilitySource: 'public_listing',
    initialState: 'eligible',
    theme: {
      accent: '#10b981',
      accentMuted: '#a7f3d0',
      pattern: 'grid',
    },
  },
  {
    id: 'team_signal_boost_lab',
    order: 5,
    name: 'Signal Boost Lab',
    tagline: 'Campaign-only growth pod.',
    privacy: 'private',
    memberCount: 118,
    tags: ['Growth', 'Campaigns'],
    safeSummary: 'Invitation-only campaign sync. Only safe summary text is shown here.',
    visibilitySource: 'pending_request',
    initialState: 'pending',
    pendingSinceMinutes: 210,
    theme: {
      accent: '#475569',
      accentMuted: '#cbd5f5',
      pattern: 'beam',
    },
  },
  {
    id: 'team_quiet_moderators_guild',
    order: 6,
    name: 'Quiet Moderators Guild',
    tagline: 'Trust & safety best practices.',
    privacy: 'private',
    memberCount: 42,
    tags: ['Moderation', 'Trust & Safety'],
    safeSummary: 'By-invite guild sharing redacted moderation playbooks. Limited preview only.',
    visibilitySource: 'share_link',
    initialState: 'approved',
    approvedSinceMinutes: 35,
    theme: {
      accent: '#0f172a',
      accentMuted: '#64748b',
      pattern: 'grid',
    },
  },
  {
    id: 'team_live_ops_vanguard',
    order: 7,
    name: 'Live Ops Vanguard',
    tagline: 'Already joined via owner invite.',
    privacy: 'public',
    memberCount: 560,
    tags: ['Live Ops', 'Owner'],
    safeSummary: 'Owner-only pilots for future live ops workflows.',
    visibilitySource: 'existing_membership',
    initialState: 'already_member',
    theme: {
      accent: '#14b8a6',
      accentMuted: '#a5f3fc',
      pattern: 'wave',
    },
  },
];

const INVITE_CODE_DIRECTORY: Record<string, DiscoverTeamTemplate> = {
  'ATLAS-CREW': {
    id: 'team_atlas_strategy_studio',
    order: 20,
    name: 'Atlas Strategy Studio',
    tagline: 'Invite-only roadmap council.',
    privacy: 'private',
    memberCount: 64,
    tags: ['Strategy', 'Roadmap'],
    safeSummary: 'Only visible with a direct code. Summaries stay vague by design.',
    visibilitySource: 'invite_code',
    initialState: 'eligible',
    theme: {
      accent: '#6366f1',
      accentMuted: '#c7d2fe',
      pattern: 'grid',
    },
  },
  'GILDED-PASS': {
    id: 'team_gilded_support_pod',
    order: 21,
    name: 'Gilded Support Pod',
    tagline: 'Private peer escalation lane.',
    privacy: 'private',
    memberCount: 36,
    tags: ['Support', 'Escalations'],
    safeSummary: 'Minimal metadata displayed. No member previews are exposed.',
    visibilitySource: 'invite_code',
    initialState: 'eligible',
    theme: {
      accent: '#f59e0b',
      accentMuted: '#fde68a',
      pattern: 'beam',
    },
  },
  'QUIET-LAUNCH': {
    id: 'team_quiet_launch_studio',
    order: 22,
    name: 'Quiet Launch Studio',
    tagline: 'Soft-launch rehearsal partners.',
    privacy: 'private',
    memberCount: 28,
    tags: ['Launch', 'Rehearsal'],
    safeSummary: 'Only surfaced via code to avoid leaking stealth campaigns.',
    visibilitySource: 'invite_code',
    initialState: 'eligible',
    theme: {
      accent: '#be185d',
      accentMuted: '#fecdd3',
      pattern: 'wave',
    },
  },
};

function cloneTeam(template: DiscoverTeamTemplate): DiscoverTeamTemplate {
  return {
    ...template,
    tags: [...template.tags],
    theme: { ...template.theme },
  };
}

export async function loadDiscoverTeamsMock(opts?: {
  delayMs?: number;
  shouldError?: boolean;
}): Promise<DiscoverTeamTemplate[]> {
  const delay = typeof opts?.delayMs === 'number' ? opts.delayMs : 420;
  await new Promise((resolve) => setTimeout(resolve, delay));
  if (opts?.shouldError) {
    throw new Error('Failed to load discovery data (mock)');
  }
  return BASE_DISCOVER_TEAMS.map(cloneTeam);
}

export async function lookupInviteCodeMock(
  code: string,
  opts?: { delayMs?: number }
): Promise<DiscoverTeamTemplate | null> {
  const delay = typeof opts?.delayMs === 'number' ? opts.delayMs : 360;
  await new Promise((resolve) => setTimeout(resolve, delay));
  const normalized = code.trim().toUpperCase();
  const template = INVITE_CODE_DIRECTORY[normalized];
  return template ? cloneTeam(template) : null;
}
