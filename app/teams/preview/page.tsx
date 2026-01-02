'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  PageHeader,
  PageShell,
} from '@/components/layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
  Modal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  Clock,
  Eye,
  EyeOff,
  Globe,
  Lock,
  MessageCircle,
  PlayCircle,
  Settings,
  Shield,
  Sparkles,
  ThumbsUp,
  Users,
} from 'lucide-react';
import type { TeamIdentityContext } from '@/types/teams';

type MembershipState = 'not_member' | 'pending' | 'approved';
type RoleState = 'member' | 'moderator' | 'admin';
type PrivacyState = 'public' | 'private';
type MemberFilter = 'all' | 'admins' | 'mods' | 'members';
type FeedRole = 'admin' | 'moderator' | 'member' | 'ally';

interface TeamPost {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    role: FeedRole;
  };
  timestamp: string;
  text: string;
  likes: number;
  commentsCount: number;
  comments: Array<{ id: string; author: string; text: string; timestamp: string }>;
}

interface TeamMember {
  id: string;
  name: string;
  handle: string;
  role: RoleState;
  avatar: string;
  status: 'online' | 'offline';
}

interface LiveSession {
  id: string;
  host: string;
  title: string;
  viewers: number;
  background: string;
  requiresApproval: boolean;
}

const mockTeam: TeamIdentityContext = {
  id: 'team_preview',
  name: 'Link Legends',
  tag: '#LEGENDS',
  iconUrl: '/no-profile-pic.png',
};

const membershipOptions: StateToggleOption<MembershipState>[] = [
  { value: 'not_member', label: 'Not a member' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];

const roleOptions: StateToggleOption<RoleState>[] = [
  { value: 'member', label: 'Member' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
];

const privacyOptions: StateToggleOption<PrivacyState>[] = [
  { value: 'public', label: 'Public team' },
  { value: 'private', label: 'Private team' },
];

const discoveryOptions: StateToggleOption<'true' | 'false'>[] = [
  { value: 'true', label: 'Discovery on' },
  { value: 'false', label: 'Discovery off' },
];

const mockPosts: TeamPost[] = [
  {
    id: 'post-1',
    author: {
      name: 'Mira Rivera',
      handle: '@mira',
      avatar: 'https://ui-avatars.com/api/?name=Mira+Rivera&background=6A5ACD&color=fff',
      role: 'admin',
    },
    timestamp: '3m ago',
    text: "Clipping tonight's live strat review into a quick-hit highlight set. Flag anything you want me to pin before we lock the next queue.",
    likes: 42,
    commentsCount: 9,
    comments: [
      { id: 'c1', author: 'Avery', text: 'Need this for the weekend push 🙌', timestamp: '2m ago' },
      { id: 'c2', author: 'Jules', text: 'Pinned! Added timing marks.', timestamp: '1m ago' },
    ],
  },
  {
    id: 'post-2',
    author: {
      name: 'Noor Patel',
      handle: '@noor',
      avatar: 'https://ui-avatars.com/api/?name=Noor+Patel&background=EA580C&color=fff',
      role: 'moderator',
    },
    timestamp: '22m ago',
    text: 'Reminder: weekend scrim is invite-only. Drop your availability in this thread so we can seat teams evenly.',
    likes: 67,
    commentsCount: 14,
    comments: [
      { id: 'c3', author: 'Eli', text: 'I can anchor lane 2 both nights.', timestamp: '10m ago' },
      { id: 'c4', author: 'Vic', text: 'Out Saturday but free Sunday.', timestamp: '8m ago' },
    ],
  },
  {
    id: 'post-3',
    author: {
      name: 'Samir Lee',
      handle: '@samir',
      avatar: 'https://ui-avatars.com/api/?name=Samir+Lee&background=0EA5E9&color=fff',
      role: 'member',
    },
    timestamp: '1h ago',
    text: 'Shared a mock poster for our next IRL meetup. Looking for feedback on the color treatment before I export variations.',
    likes: 23,
    commentsCount: 5,
    comments: [
      { id: 'c5', author: 'Noor', text: "Let's swap the gradient to match the badge set.", timestamp: '48m ago' },
    ],
  },
];

const mockMembers: TeamMember[] = [
  {
    id: 'mira',
    name: 'Mira Rivera',
    handle: '@mira',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Mira+Rivera&background=6A5ACD&color=fff',
    status: 'online',
  },
  {
    id: 'noor',
    name: 'Noor Patel',
    handle: '@noor',
    role: 'moderator',
    avatar: 'https://ui-avatars.com/api/?name=Noor+Patel&background=EA580C&color=fff',
    status: 'online',
  },
  {
    id: 'samir',
    name: 'Samir Lee',
    handle: '@samir',
    role: 'member',
    avatar: 'https://ui-avatars.com/api/?name=Samir+Lee&background=0EA5E9&color=fff',
    status: 'offline',
  },
  {
    id: 'avery',
    name: 'Avery Chen',
    handle: '@avery',
    role: 'member',
    avatar: 'https://ui-avatars.com/api/?name=Avery+Chen&background=16A34A&color=fff',
    status: 'online',
  },
  {
    id: 'vic',
    name: 'Vic Torres',
    handle: '@vic',
    role: 'moderator',
    avatar: 'https://ui-avatars.com/api/?name=Vic+Torres&background=F43F5E&color=fff',
    status: 'offline',
  },
];

const mockLiveSessions: LiveSession[] = [
  {
    id: 'live-1',
    host: 'Mira Rivera',
    title: 'Clip lab · real-time edits',
    viewers: 238,
    background: 'linear-gradient(135deg,#6366f1,#a855f7)',
    requiresApproval: false,
  },
  {
    id: 'live-2',
    host: 'Noor Patel',
    title: 'Weekend scrim staging',
    viewers: 124,
    background: 'linear-gradient(135deg,#f59e0b,#ec4899)',
    requiresApproval: true,
  },
];

const teamRules = [
  'Celebrate plays, critique ideas. Keep feedback in-channel and actionable.',
  'No live drops outside approved partners until admins flip the monetization flag.',
  'Keep IRL plans inside the verified thread—never share location details publicly.',
];

const teamSettingConfig = {
  autoApproveHighlights: {
    label: 'Auto-approve highlight posts',
    description: 'Trusted curators can push highlight reels without waiting for admin review.',
  },
  allowMemberStreams: {
    label: 'Allow member live rooms',
    description: 'Members can spin up private live rooms under this team identity.',
  },
  enableMomentAlerts: {
    label: 'Send milestone alerts',
    description: 'Notifies everyone when a new goal, badge, or IRL meetup unlocks.',
  },
} as const;

type TeamSettingKey = keyof typeof teamSettingConfig;

const initialTeamSettings: Record<TeamSettingKey, boolean> = {
  autoApproveHighlights: false,
  allowMemberStreams: true,
  enableMomentAlerts: true,
};

export default function TeamsPreviewSandboxPage() {
  const [membershipState, setMembershipState] = useState<MembershipState>('not_member');
  const [role, setRole] = useState<RoleState>('member');
  const [privacy, setPrivacy] = useState<PrivacyState>('public');
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [teamSettings, setTeamSettings] = useState<Record<TeamSettingKey, boolean>>(initialTeamSettings);

  const baseMembers = 682;
  const approvedMembers = membershipState === 'approved' ? baseMembers + 1 : baseMembers;
  const onlineMembers = 86;
  const isPrivate = privacy === 'private';
  const isApproved = membershipState === 'approved';
  const isPending = membershipState === 'pending';
  const canEditSettings = isApproved && role === 'admin';
  const canJoinLive = isApproved;

  const membershipBadge = {
    not_member: { label: 'Not a member', variant: 'outline' as const },
    pending: { label: 'Pending approval', variant: 'warning' as const },
    approved: { label: 'Approved member', variant: 'success' as const },
  }[membershipState];

  const privacyBadge = isPrivate
    ? { label: 'Private team', icon: <Lock className="h-3 w-3" />, variant: 'warning' as const }
    : { label: 'Public team', icon: <Globe className="h-3 w-3" />, variant: 'primary' as const };

  const discoveryBadge = discoveryEnabled
    ? { label: 'Discovery enabled', icon: <Eye className="h-3 w-3" />, variant: 'info' as const }
    : { label: 'Hidden from discovery', icon: <EyeOff className="h-3 w-3" />, variant: 'secondary' as const };

  const membershipCta = useMemo(() => {
    if (membershipState === 'approved') {
      return {
        label: 'Switch to Link Legends',
        helper: role === 'admin' ? 'Open the admin panel or drop into live rooms instantly.' : 'Jump straight into the feed, live rooms, and member tools.',
        variant: 'primary' as const,
        disabled: false,
      };
    }
    if (membershipState === 'pending') {
      return {
        label: 'Pending approval',
        helper: 'An admin has your request—expect a push notification once it flips.',
        variant: 'secondary' as const,
        disabled: true,
      };
    }
    return {
      label: isPrivate ? 'Request access' : 'Join instantly',
      helper: isPrivate
        ? 'Private team: requests notify admins immediately.'
        : 'Open membership: join and start posting right away.',
      variant: 'primary' as const,
      disabled: false,
    };
  }, [isPrivate, membershipState, role]);

  const filteredMembers = useMemo(() => {
    if (memberFilter === 'all') return mockMembers;
    if (memberFilter === 'admins') {
      return mockMembers.filter((member) => member.role === 'admin');
    }
    if (memberFilter === 'mods') {
      return mockMembers.filter((member) => member.role === 'moderator');
    }
    return mockMembers.filter((member) => member.role === 'member');
  }, [memberFilter]);

  const activePost = useMemo(() => mockPosts.find((post) => post.id === selectedPostId), [selectedPostId]);

  const toggleSetting = (key: TeamSettingKey) => {
    if (!canEditSettings) return;
    setTeamSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageShell maxWidth="xl" padding="md">
      <PageHeader
        title="Teams Preview Sandbox"
        description="UI-only harness so you can tour the end-to-end team experience before data and creation go live."
        icon={<Sparkles className="h-6 w-6 text-primary" />}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Dev-only controls
            </div>
            <CardTitle>State controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              Flip membership, role, privacy, and discovery booleans. Everything on this page updates immediately with zero backend calls.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <StateToggleGroup
                label="Membership state"
                description="Drive CTA states and gated experiences."
                value={membershipState}
                onChange={setMembershipState}
                options={membershipOptions}
              />
              <StateToggleGroup
                label="Role"
                description="Unlock moderator/admin-only surfaces."
                value={role}
                onChange={setRole}
                options={roleOptions}
              />
              <StateToggleGroup
                label="Privacy"
                description="Switch between public enrolment and invite-only."
                value={privacy}
                onChange={setPrivacy}
                options={privacyOptions}
              />
              <StateToggleGroup
                label="Team discovery"
                description="Simulates NEXT_PUBLIC_ENABLE_TEAMS_DISCOVERY."
                value={discoveryEnabled ? 'true' : 'false'}
                onChange={(value) => setDiscoveryEnabled(value === 'true')}
                options={discoveryOptions}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src={mockTeam.iconUrl ?? '/no-profile-pic.png'}
                    alt={mockTeam.name}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-2xl border border-border bg-muted object-cover"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-foreground">{mockTeam.name}</h2>
                      <Badge variant={privacyBadge.variant} size="sm" icon={privacyBadge.icon}>
                        {privacyBadge.label}
                      </Badge>
                      <Badge variant={discoveryBadge.variant} size="sm" icon={discoveryBadge.icon}>
                        {discoveryBadge.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@link-legends · {mockTeam.tag}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {approvedMembers.toLocaleString()} members · {onlineMembers} online
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Your role: {role.charAt(0).toUpperCase() + role.slice(1)}{' '}
                    {!isApproved && <span className="text-xs">(limited until approval)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Updated a few seconds ago (mock)
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm rounded-2xl border border-dashed border-border/70 bg-muted/40 p-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Badge variant={membershipBadge.variant} size="sm">
                    {membershipBadge.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Button
                    variant={membershipCta.variant}
                    size="lg"
                    fullWidth
                    disabled={membershipCta.disabled}
                    leftIcon={<Sparkles className="h-4 w-4" />}
                  >
                    {membershipCta.label}
                  </Button>
                  {!isApproved && (
                    <Button variant="ghost" size="sm" fullWidth>
                      Preview feed (mock)
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{membershipCta.helper}</p>
                {isApproved && (
                  <p className="mt-1 text-xs text-success">
                    Switch-state active — CTAs now show the in-team experience.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
              {isPrivate && !isApproved ? (
                <>
                  This team is private. You can read the feed but actions stay disabled until an admin approves your request.
                </>
              ) : (
                <>Everything below is interactive and wired to the state panel. Flip the toggles to preview different entry states.</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex w-full flex-wrap gap-2 bg-muted/50 p-1">
                <TabsTrigger value="feed" className="flex-1 min-w-[140px]">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="members" className="flex-1 min-w-[140px]">
                  <Users className="mr-2 h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="live" className="flex-1 min-w-[140px]">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Live
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1 min-w-[140px]">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="mt-6 space-y-4">
                {isPrivate && membershipState === 'not_member' && (
                  <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                    Private teams keep read-only until you are approved. The mock feed still loads so you can see layout coverage.
                  </div>
                )}
                {mockPosts.map((post) => (
                  <Card key={post.id} className="border border-border/70">
                    <CardHeader className="flex flex-row items-start gap-4">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{post.author.name}</p>
                          <span className="text-xs text-muted-foreground">{post.author.handle}</span>
                          <Badge variant="outline" size="sm">
                            {post.author.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {post.timestamp}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-foreground">{post.text}</p>
                      <div className="flex flex-wrap gap-6 text-xs font-medium text-muted-foreground">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1 transition hover:text-foreground"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {post.likes} likes
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPostId(post.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1 transition hover:text-foreground"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.commentsCount} comments
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="members" className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Admins', value: 'admins' },
                    { label: 'Mods', value: 'mods' },
                    { label: 'Members', value: 'members' },
                  ].map((filter) => (
                    <Chip
                      key={filter.value}
                      variant="outline"
                      size="sm"
                      selected={memberFilter === filter.value}
                      onClick={() => setMemberFilter(filter.value as MemberFilter)}
                    >
                      {filter.label}
                    </Chip>
                  ))}
                </div>
                <div className="space-y-3">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={member.avatar}
                          alt={member.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.handle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" size="sm">
                          {member.role}
                        </Badge>
                        <Badge
                          variant={member.status === 'online' ? 'success' : 'secondary'}
                          size="sm"
                          dot
                          dotColor={member.status === 'online' ? 'success' : 'default'}
                        >
                          {member.status === 'online' ? 'Online' : 'Offline'}
                        </Badge>
                        {isApproved && role === member.role && (
                          <Badge variant="primary" size="sm">
                            Matches your role
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {!filteredMembers.length && (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                      No members match this filter yet.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="live" className="mt-6 space-y-4">
                {!canJoinLive && (
                  <div className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
                    Join buttons stay disabled until your membership is approved. Use the state panel to flip into the approved experience.
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {mockLiveSessions.map((session) => (
                    <div key={session.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/90 p-4">
                      <div
                        className="h-40 rounded-xl border border-border/50"
                        style={{ background: session.background }}
                      >
                        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white/90 m-3 shadow">
                          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
                          Live · {session.viewers} viewer{session.viewers === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="text-xs text-muted-foreground">Hosted by {session.host}</p>
                      </div>
                      <Button
                        variant="primary"
                        disabled={!canJoinLive || (session.requiresApproval && !isApproved)}
                        leftIcon={<PlayCircle className="h-4 w-4" />}
                      >
                        Join live
                      </Button>
                      {session.requiresApproval && (
                        <p className="text-xs text-muted-foreground">
                          Only approved members can enter this room.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6 space-y-4">
                <Card className="border border-border/70">
                  <CardHeader>
                    <CardTitle>About & rules</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      This content stays visible to everyone to preview how story + rules will lay out.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-foreground">
                      Link Legends is our in-progress Team sandbox. Use this page to stub out moderation flows, live entry states, and member education before we wire real data.
                    </p>
                    <ul className="space-y-3 text-sm text-foreground">
                      {teamRules.map((rule) => (
                        <li key={rule} className="flex items-start gap-3">
                          <Shield className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-border/70">
                  <CardHeader>
                    <CardTitle>Team toggles</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Switch role to Admin + Approved to enable these controls.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(Object.keys(teamSettingConfig) as TeamSettingKey[]).map((key) => (
                      <SettingToggle
                        key={key}
                        label={teamSettingConfig[key].label}
                        description={teamSettingConfig[key].description}
                        value={teamSettings[key]}
                        disabled={!canEditSettings}
                        onChange={() => toggleSetting(key)}
                      />
                    ))}
                    {!canEditSettings && (
                      <p className="text-xs text-muted-foreground">
                        These switches stay read-only until your membership is approved and your role is Admin.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={Boolean(activePost)}
        onClose={() => setSelectedPostId(null)}
        title={activePost ? `Comments · ${activePost.author.name}` : undefined}
        description={activePost?.text}
        size="lg"
      >
        <div className="space-y-4">
          {activePost?.comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{comment.author}</span>
                <span>{comment.timestamp}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{comment.text}</p>
            </div>
          ))}
          {!activePost && <p className="text-sm text-muted-foreground">Select a post to preview comments.</p>}
        </div>
      </Modal>
    </PageShell>
  );
}

interface StateToggleOption<T extends string> {
  value: T;
  label: string;
}

interface StateToggleGroupProps<T extends string> {
  label: string;
  description?: string;
  value: T;
  onChange: (value: T) => void;
  options: StateToggleOption<T>[];
}

function StateToggleGroup<T extends string>({ label, description, value, onChange, options }: StateToggleGroupProps<T>) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            variant="outline"
            size="sm"
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: () => void;
}

function SettingToggle({ label, description, value, disabled, onChange }: SettingToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-full rounded-2xl border border-border/60 bg-background p-4 text-left transition ${
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/60 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          {value ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </button>
  );
}
