'use client';

import { CSSProperties, ReactNode, useMemo, useState } from 'react';
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
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui';
import {
  Activity,
  Bolt,
  Flame,
  Gift,
  MessageCircle,
  Palette,
  PlayCircle,
  Radio,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

type MembershipState = 'not_member' | 'pending' | 'approved';
type RoleState = 'member' | 'moderator' | 'admin';
type MemberActivity = 'active' | 'lurker' | 'in_live';
type TabKey = 'home' | 'members' | 'live' | 'designer' | 'gifts';
type ThemeKey = 'neon' | 'midnight' | 'sunrise';
type GiftType = 'creator' | 'team';

interface TeamTheme {
  name: string;
  accent: string;
  accentSoft: string;
  surface: string;
  surfaceCard: string;
  textOnAccent: string;
}

interface Post {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  text: string;
  timestamp: string;
  reactions: number;
  replies: number;
}

interface Member {
  id: string;
  name: string;
  handle: string;
  role: RoleState;
  avatar: string;
  activity: MemberActivity;
}

interface LiveTile {
  id: string;
  host: string;
  title: string;
  viewers: number;
  access: 'open' | 'approved_only';
  backdrop: string;
}

const teamThemes: Record<ThemeKey, TeamTheme> = {
  neon: {
    name: 'Neon Pulse',
    accent: '#a855f7',
    accentSoft: '#6366f1',
    surface: 'radial-gradient(circle at 20% 20%, rgba(168,85,247,0.25), transparent), #05030d',
    surfaceCard: 'rgba(15,12,32,0.85)',
    textOnAccent: '#fdf4ff',
  },
  midnight: {
    name: 'Midnight Signal',
    accent: '#22d3ee',
    accentSoft: '#0ea5e9',
    surface: 'linear-gradient(135deg, #020617 0%, #111827 100%)',
    surfaceCard: 'rgba(15,23,42,0.85)',
    textOnAccent: '#f0fdfa',
  },
  sunrise: {
    name: 'Sunrise Bloom',
    accent: '#fb7185',
    accentSoft: '#f97316',
    surface: 'linear-gradient(135deg, #180202 0%, #251311 100%)',
    surfaceCard: 'rgba(39,15,13,0.85)',
    textOnAccent: '#fff7ed',
  },
};

const mockPosts: Post[] = [
  {
    id: 'p1',
    author: 'Mira Rivera',
    handle: '@mira',
    avatar: 'https://ui-avatars.com/api/?name=Mira+Rivera&background=6A5ACD&color=fff',
    text: 'Dropping today’s motion pack preview here. Need emoji votes on the glow pass before we ship the order to merch.',
    timestamp: '3m ago',
    reactions: 182,
    replies: 24,
  },
  {
    id: 'p2',
    author: 'Noor Patel',
    handle: '@noor',
    avatar: 'https://ui-avatars.com/api/?name=Noor+Patel&background=EA580C&color=fff',
    text: 'Weekend IRL roster: confirm if you need travel stipends before Friday. Ping me in-thread so we keep it organized.',
    timestamp: '28m ago',
    reactions: 97,
    replies: 12,
  },
];

const memberRoster: Member[] = [
  {
    id: 'mira',
    name: 'Mira Rivera',
    handle: '@mira',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Mira+Rivera&background=6A5ACD&color=fff',
    activity: 'active',
  },
  {
    id: 'noor',
    name: 'Noor Patel',
    handle: '@noor',
    role: 'moderator',
    avatar: 'https://ui-avatars.com/api/?name=Noor+Patel&background=EA580C&color=fff',
    activity: 'in_live',
  },
  {
    id: 'samir',
    name: 'Samir Lee',
    handle: '@samir',
    role: 'member',
    avatar: 'https://ui-avatars.com/api/?name=Samir+Lee&background=0EA5E9&color=fff',
    activity: 'lurker',
  },
  {
    id: 'avery',
    name: 'Avery Chen',
    handle: '@avery',
    role: 'member',
    avatar: 'https://ui-avatars.com/api/?name=Avery+Chen&background=16A34A&color=fff',
    activity: 'active',
  },
  {
    id: 'vic',
    name: 'Vic Torres',
    handle: '@vic',
    role: 'moderator',
    avatar: 'https://ui-avatars.com/api/?name=Vic+Torres&background=F43F5E&color=fff',
    activity: 'lurker',
  },
];

const liveTiles: LiveTile[] = [
  {
    id: 'live-clip',
    host: 'Mira Rivera',
    title: 'Clip Lab · real-time moodboard',
    viewers: 264,
    access: 'open',
    backdrop: 'linear-gradient(135deg,#a855f7,#6366f1)',
  },
  {
    id: 'live-scrim',
    host: 'Noor Patel',
    title: 'Weekend scrim · seating matrix',
    viewers: 118,
    access: 'approved_only',
    backdrop: 'linear-gradient(135deg,#f97316,#fb7185)',
  },
];

const templateOptions = [
  { id: 'pulse', name: 'Pulse Grid', accent: '#a855f7' },
  { id: 'signal', name: 'Signal Wave', accent: '#22d3ee' },
  { id: 'ember', name: 'Ember Fade', accent: '#fb7185' },
  { id: 'mono', name: 'Mono Glass', accent: '#e4e4e7' },
];

const backgroundStyles = ['Gradient mesh', 'Glass blur', 'Solid badge'] as const;
const borderStyles = ['Soft glow', 'Sharp neon', 'Minimal'] as const;
const nameColorOptions = ['Accent', 'White', 'Mint'] as const;
const messageColorOptions = ['Muted', 'Bright', 'Custom'] as const;
const badgeSlots = ['Left badge', 'Right badge', 'Hidden'] as const;

const MIN_TEAM_SPLIT = 300;

export default function PremiumTeamsSandboxPage() {
  const [membership, setMembership] = useState<MembershipState>('not_member');
  const [role, setRole] = useState<RoleState>('member');
  const [tab, setTab] = useState<TabKey>('home');
  const [themeKey, setThemeKey] = useState<ThemeKey>('neon');
  const [useTeamCard, setUseTeamCard] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0].id);
  const [backgroundStyle, setBackgroundStyle] = useState<typeof backgroundStyles[number]>('Gradient mesh');
  const [borderStyle, setBorderStyle] = useState<typeof borderStyles[number]>('Soft glow');
  const [nameColor, setNameColor] = useState<typeof nameColorOptions[number]>('Accent');
  const [messageColor, setMessageColor] = useState<typeof messageColorOptions[number]>('Muted');
  const [badgeSlot, setBadgeSlot] = useState<typeof badgeSlots[number]>('Left badge');
  const [giftType, setGiftType] = useState<GiftType>('team');
  const [giftAmount, setGiftAmount] = useState(1800);

  const theme = teamThemes[themeKey];

  const themeStyle = useMemo(() => {
    return {
      '--team-accent': theme.accent,
      '--team-accent-soft': theme.accentSoft,
      '--team-surface': theme.surface,
      '--team-surface-card': theme.surfaceCard,
      '--team-text-on-accent': theme.textOnAccent,
    } as CSSProperties;
  }, [theme]);

  const activeMembers = memberRoster.filter((member) => member.activity !== 'lurker');
  const eligibleCount = activeMembers.length;
  const perMember = eligibleCount ? Math.floor(giftAmount / eligibleCount) : 0;
  const splitBlocked =
    giftType === 'team' && (eligibleCount === 0 || perMember < MIN_TEAM_SPLIT / Math.max(eligibleCount, 1));

  const membershipBadge = {
    not_member: { label: 'Not a member', variant: 'secondary' as const },
    pending: { label: 'Pending approval', variant: 'warning' as const },
    approved: { label: 'Inside team', variant: 'success' as const },
  }[membership];

  const ctaCopy = {
    label:
      membership === 'approved'
        ? 'Switch to Link Legends'
        : membership === 'pending'
        ? 'Awaiting approval'
        : 'Request instant access',
    helper:
      membership === 'approved'
        ? role === 'admin'
          ? 'Admin rails unlocked—team pool, designer, and live rooms go live.'
          : 'Jump directly into feed, live rooms, and member chats.'
        : membership === 'pending'
        ? 'An admin will flip this shortly. You’ll get a push when it lands.'
        : 'Instant join for public teams. Private teams alert admins immediately.',
    disabled: membership === 'pending',
  };

  const composerDisabled = membership !== 'approved';
  const canJoinLive = membership === 'approved';

  const designerPreviewStyle: CSSProperties = {
    background:
      backgroundStyle === 'Gradient mesh'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))'
        : backgroundStyle === 'Glass blur'
        ? 'rgba(15,23,42,0.65)'
        : 'rgba(0,0,0,0.75)',
    border:
      borderStyle === 'Minimal'
        ? '1px solid rgba(255,255,255,0.2)'
        : '1px solid rgba(255,255,255,0.35)',
    boxShadow:
      borderStyle === 'Soft glow'
        ? '0 0 25px rgba(168,85,247,0.35)'
        : borderStyle === 'Sharp neon'
        ? '0 0 25px rgba(34,211,238,0.55)'
        : undefined,
  };

  return (
    <PageShell maxWidth="2xl" padding="sm">
      <div className="relative" style={themeStyle}>
        <div
          className="absolute inset-0 -z-10 rounded-[32px] border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
          style={{ background: 'var(--team-surface)' }}
        />
        <PageHeader
          title="Teams Premium Sandbox"
          description="UI-only harness for the new Teams member experience, chat card designer, and team pool gifting."
          icon={<Sparkles className="h-6 w-6" style={{ color: 'var(--team-accent)' }} />}
        />

        <div className="space-y-4">
          <HeroCard
            membership={membership}
            membershipBadge={membershipBadge.label}
            role={role}
            onMembershipChange={setMembership}
            onRoleChange={setRole}
            onThemeChange={setThemeKey}
            activeTheme={themeKey}
            ctaCopy={ctaCopy}
            theme={theme}
          />

          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
            <TabsList className="flex flex-wrap gap-2 bg-white/5 p-1 backdrop-blur">
              <TabButton value="home" icon={<MessageCircle className="h-4 w-4" />}>
                Home
              </TabButton>
              <TabButton value="members" icon={<Users className="h-4 w-4" />}>
                Members
              </TabButton>
              <TabButton value="live" icon={<PlayCircle className="h-4 w-4" />}>
                Live
              </TabButton>
              <TabButton value="designer" icon={<Palette className="h-4 w-4" />}>
                Designer
              </TabButton>
              <TabButton value="gifts" icon={<Gift className="h-4 w-4" />}>
                Gifts
              </TabButton>
            </TabsList>

            <TabsContent value="home" className="space-y-4">
              <HomeTab
                posts={mockPosts}
                composerDisabled={composerDisabled}
                theme={theme}
                membership={membership}
              />
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <MembersTab members={memberRoster} />
            </TabsContent>

            <TabsContent value="live" className="space-y-4">
              <LiveTab liveTiles={liveTiles} canJoin={canJoinLive} membership={membership} />
            </TabsContent>

            <TabsContent value="designer" className="space-y-4">
              <DesignerTab
                useTeamCard={useTeamCard}
                setUseTeamCard={setUseTeamCard}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                backgroundStyle={backgroundStyle}
                setBackgroundStyle={setBackgroundStyle}
                borderStyle={borderStyle}
                setBorderStyle={setBorderStyle}
                nameColor={nameColor}
                setNameColor={setNameColor}
                messageColor={messageColor}
                setMessageColor={setMessageColor}
                badgeSlot={badgeSlot}
                setBadgeSlot={setBadgeSlot}
                designerPreviewStyle={designerPreviewStyle}
                theme={theme}
              />
            </TabsContent>

            <TabsContent value="gifts" className="space-y-4">
              <GiftTab
                giftType={giftType}
                setGiftType={setGiftType}
                giftAmount={giftAmount}
                setGiftAmount={setGiftAmount}
                activeMembers={activeMembers}
                perMember={perMember}
                splitBlocked={splitBlocked}
                eligibleCount={eligibleCount}
                membership={membership}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-[88px] z-30 px-4 pb-[env(safe-area-inset-bottom)] sm:bottom-6">
          <div className="mx-auto w-full max-w-3xl pointer-events-auto rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Primary team actions</p>
                <p className="text-sm text-white">
                  {membership === 'approved'
                    ? 'Post, go live, or drop gifts without leaving this view.'
                    : 'Request access to unlock feed posts, live rooms, and team pool gifting.'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="gradient"
                  size="sm"
                  disabled={ctaCopy.disabled}
                  style={{
                    background: `linear-gradient(135deg,var(--team-accent),var(--team-accent-soft))`,
                    color: 'var(--team-text-on-accent)',
                  }}
                >
                  {ctaCopy.label}
                </Button>
                <Button variant="outline" size="sm">
                  View active live rooms
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

interface HeroCardProps {
  membership: MembershipState;
  membershipBadge: string;
  role: RoleState;
  onMembershipChange: (value: MembershipState) => void;
  onRoleChange: (value: RoleState) => void;
  onThemeChange: (value: ThemeKey) => void;
  activeTheme: ThemeKey;
  ctaCopy: { helper: string; disabled: boolean; label: string };
  theme: TeamTheme;
}

function HeroCard({
  membership,
  membershipBadge,
  role,
  onMembershipChange,
  onRoleChange,
  onThemeChange,
  activeTheme,
  ctaCopy,
  theme,
}: HeroCardProps) {
  const stateChips: { label: string; value: MembershipState }[] = [
    { label: 'Not member', value: 'not_member' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
  ];
  const roleChips: { label: string; value: RoleState }[] = [
    { label: 'Member', value: 'member' },
    { label: 'Moderator', value: 'moderator' },
    { label: 'Admin', value: 'admin' },
  ];
  const themeChips: { label: string; value: ThemeKey }[] = [
    { label: 'Neon', value: 'neon' },
    { label: 'Midnight', value: 'midnight' },
    { label: 'Sunrise', value: 'sunrise' },
  ];

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://ui-avatars.com/api/?name=Link+Legends&background=111827&color=fff"
              alt="Link Legends"
              width={72}
              height={72}
              className="rounded-2xl border border-white/20 object-cover"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-white">Link Legends</p>
                <Badge variant="primary" size="sm" className="bg-white/15 text-white">
                  #LEGENDS
                </Badge>
              </div>
              <p className="text-sm text-white/70">Neu Premium Capsule · 924 members · 61 active now</p>
            </div>
          </div>
          <Badge variant="outline" size="sm" className="border-white/30 text-white">
            {membershipBadge}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <StateCluster
            label="Membership state"
            description="Switch flows instantly"
            chips={stateChips}
            value={membership}
            onChange={onMembershipChange}
          />
          <StateCluster
            label="Role"
            description="Unlock mod/admin UI"
            chips={roleChips}
            value={role}
            onChange={onRoleChange}
          />
          <StateCluster
            label="Theme"
            description="Preview premium skins"
            chips={themeChips}
            value={activeTheme}
            onChange={onThemeChange}
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white">
            <p className="font-semibold">CTA preview</p>
            <p className="text-white/70">{ctaCopy.helper}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-4 text-sm text-white/80" style={{ background: theme.surfaceCard }}>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: theme.accent }} />
            <span>Theme accent</span>
            <span className="text-white/50">·</span>
            <span>Primary buttons + badges follow {theme.name}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StateClusterProps<T extends string> {
  label: string;
  description: string;
  chips: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

function StateCluster<T extends string>({ label, description, chips, value, onChange }: StateClusterProps<T>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-white/60">{description}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip
            key={chip.value}
            size="sm"
            variant="outline"
            selected={value === chip.value}
            onClick={() => onChange(chip.value)}
            className={value === chip.value ? 'border-white bg-white/20 text-white' : 'border-white/20 text-white/70'}
          >
            {chip.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

interface HomeTabProps {
  posts: Post[];
  composerDisabled: boolean;
  theme: TeamTheme;
  membership: MembershipState;
}

function HomeTab({ posts, composerDisabled, theme, membership }: HomeTabProps) {
  return (
    <>
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5" style={{ color: theme.accent }} />
            Feed composer
          </CardTitle>
          <p className="text-sm text-white/70">Post updates, pin strategy docs, or drop event threads.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={composerDisabled ? 'Requires membership approval' : 'Share a drop, clip, or mission update...'}
            disabled={composerDisabled}
            className="border-white/10 bg-black/30 text-white placeholder:text-white/50"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={composerDisabled}
              style={{
                background: `linear-gradient(135deg,${theme.accent},${theme.accentSoft})`,
                color: theme.textOnAccent,
              }}
            >
              Post to feed
            </Button>
            <Button variant="ghost" size="sm" className="text-white">
              Add media
            </Button>
            {membership !== 'approved' && (
              <Badge variant="warning" size="sm">
                Join to post
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className="border-white/10 bg-white/5 backdrop-blur">
            <CardContent className="flex gap-3 p-4">
              <Image src={post.avatar} alt={post.author} width={44} height={44} className="rounded-xl" />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                  <p className="font-semibold">{post.author}</p>
                  <span className="text-white/60">{post.handle}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">{post.timestamp}</span>
                </div>
                <p className="text-sm text-white/90">{post.text}</p>
                <div className="flex gap-3 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                    <Bolt className="h-3 w-3" />
                    {post.reactions} reacts
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                    <MessageCircle className="h-3 w-3" />
                    {post.replies} replies
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

interface MembersTabProps {
  members: Member[];
}

function MembersTab({ members }: MembersTabProps) {
  const statusLabels: Record<MemberActivity, string> = {
    active: 'Active now',
    lurker: 'Lurker',
    in_live: 'In live room',
  };

  const statusVariants: Record<MemberActivity, 'success' | 'secondary' | 'info'> = {
    active: 'success',
    lurker: 'secondary',
    in_live: 'info',
  };

  const activeStrip = members.filter((m) => m.activity !== 'lurker');

  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
          <Activity className="h-4 w-4" />
          Active now
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {activeStrip.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80"
            >
              <span className="relative">
                <Image src={member.avatar} alt={member.name} width={32} height={32} className="rounded-xl" />
                <span
                  className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-black"
                  style={{
                    backgroundColor: member.activity === 'in_live' ? '#22d3ee' : '#4ade80',
                  }}
                />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">{member.name}</p>
                <p className="text-[11px] text-white/60">{statusLabels[member.activity]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-white sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <Image src={member.avatar} alt={member.name} width={48} height={48} className="rounded-2xl" />
              <div>
                <p className="font-semibold">{member.name}</p>
                <p className="text-sm text-white/60">{member.handle}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" size="sm" className="border-white/20 text-white/80">
                {member.role}
              </Badge>
              <Badge variant={statusVariants[member.activity]} size="sm">
                {statusLabels[member.activity]}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

interface LiveTabProps {
  liveTiles: LiveTile[];
  canJoin: boolean;
  membership: MembershipState;
}

function LiveTab({ liveTiles, canJoin, membership }: LiveTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {liveTiles.map((tile) => (
        <div key={tile.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white">
          <div
            className="h-48 rounded-2xl border border-white/10 p-4"
            style={{
              background: tile.backdrop,
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1">
                <Radio className="h-3 w-3" />
                Live · {tile.viewers} viewers
              </span>
              {tile.access === 'approved_only' && (
                <span className="rounded-full bg-white/20 px-3 py-1">Approved only</span>
              )}
            </div>
            <div className="mt-16">
              <p className="text-lg font-semibold">{tile.title}</p>
              <p className="text-sm text-white/70">Hosted by {tile.host}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {!canJoin && (
              <p className="text-xs text-white/70">
                Join buttons unlock once your membership flips to Approved.
              </p>
            )}
            <Button
              size="sm"
              disabled={!canJoin || (tile.access === 'approved_only' && membership !== 'approved')}
            >
              Enter live room
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DesignerTabProps {
  useTeamCard: boolean;
  setUseTeamCard: (value: boolean) => void;
  selectedTemplate: string;
  setSelectedTemplate: (value: string) => void;
  backgroundStyle: typeof backgroundStyles[number];
  setBackgroundStyle: (value: typeof backgroundStyles[number]) => void;
  borderStyle: typeof borderStyles[number];
  setBorderStyle: (value: typeof borderStyles[number]) => void;
  nameColor: typeof nameColorOptions[number];
  setNameColor: (value: typeof nameColorOptions[number]) => void;
  messageColor: typeof messageColorOptions[number];
  setMessageColor: (value: typeof messageColorOptions[number]) => void;
  badgeSlot: typeof badgeSlots[number];
  setBadgeSlot: (value: typeof badgeSlots[number]) => void;
  designerPreviewStyle: CSSProperties;
  theme: TeamTheme;
}

function DesignerTab({
  useTeamCard,
  setUseTeamCard,
  selectedTemplate,
  setSelectedTemplate,
  backgroundStyle,
  setBackgroundStyle,
  borderStyle,
  setBorderStyle,
  nameColor,
  setNameColor,
  messageColor,
  setMessageColor,
  badgeSlot,
  setBadgeSlot,
  designerPreviewStyle,
  theme,
}: DesignerTabProps) {
  const controlGroups = [
    {
      label: 'Background style',
      value: backgroundStyle,
      options: backgroundStyles,
      setter: setBackgroundStyle,
    },
    {
      label: 'Border & glow',
      value: borderStyle,
      options: borderStyles,
      setter: setBorderStyle,
    },
    {
      label: 'Name color',
      value: nameColor,
      options: nameColorOptions,
      setter: setNameColor,
    },
    {
      label: 'Message color',
      value: messageColor,
      options: messageColorOptions,
      setter: setMessageColor,
    },
    {
      label: 'Badge slot',
      value: badgeSlot,
      options: badgeSlots,
      setter: setBadgeSlot,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <Palette className="h-5 w-5" style={{ color: theme.accent }} />
            Team chat card designer
          </CardTitle>
          <p className="text-sm text-white/70">Live preview mirrors the real live chat overlay.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={useTeamCard ? 'gradient' : 'outline'}
              className="transition"
              style={
                useTeamCard
                  ? {
                      background: `linear-gradient(135deg,var(--team-accent),var(--team-accent-soft))`,
                      color: 'var(--team-text-on-accent)',
                    }
                  : undefined
              }
              onClick={() => setUseTeamCard(true)}
            >
              Use Team Card
            </Button>
            <Button
              size="sm"
              variant={!useTeamCard ? 'gradient' : 'outline'}
              className="transition"
              onClick={() => setUseTeamCard(false)}
            >
              Use Creator Card
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {templateOptions.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="ghost"
                onClick={() => setSelectedTemplate(template.id)}
                className={`w-full justify-start rounded-2xl border px-4 py-3 text-left ${
                  selectedTemplate === template.id ? 'border-white/70 bg-white/10 text-white' : 'border-white/20 text-white/70'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-white/60">Accent {template.accent}</p>
                </div>
              </Button>
            ))}
          </div>

          {controlGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{group.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <Chip
                    key={option}
                    size="sm"
                    variant="outline"
                    selected={group.value === option}
                    onClick={() => group.setter(option as never)}
                    className={
                      group.value === option ? 'border-white/60 bg-white/10 text-white' : 'border-white/20 text-white/70'
                    }
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-[32px] border border-white/15 bg-black/30 p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <p className="text-sm font-semibold text-white/80">Live preview</p>
        <div className="mt-3 space-y-3">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="rounded-2xl p-3 text-sm text-white"
              style={designerPreviewStyle}
            >
              <div className="flex items-center gap-2">
                {badgeSlot !== 'Hidden' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      badgeSlot === 'Left badge' ? 'order-none' : 'order-2'
                    }`}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    TEAM
                  </span>
                )}
                <p
                  className="font-semibold"
                  style={{
                    color:
                      nameColor === 'Accent'
                        ? theme.accent
                        : nameColor === 'Mint'
                        ? '#34d399'
                        : '#ffffff',
                  }}
                >
                  {index === 0 ? 'Mira Rivera' : 'Noor Patel'}
                </p>
              </div>
              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    messageColor === 'Muted'
                      ? 'rgba(255,255,255,0.75)'
                      : messageColor === 'Bright'
                      ? '#ffffff'
                      : '#e879f9',
                }}
              >
                {index === 0
                  ? '“Running this clip loop through the new glow template. Thoughts?”'
                  : '“Signal wave template reads cleaner on stream—approve?”'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GiftTabProps {
  giftType: GiftType;
  setGiftType: (value: GiftType) => void;
  giftAmount: number;
  setGiftAmount: (value: number) => void;
  activeMembers: Member[];
  perMember: number;
  splitBlocked: boolean;
  eligibleCount: number;
  membership: MembershipState;
}

function GiftTab({
  giftType,
  setGiftType,
  giftAmount,
  setGiftAmount,
  activeMembers,
  perMember,
  splitBlocked,
  eligibleCount,
  membership,
}: GiftTabProps) {
  const amountOptions = [600, 1200, 1800, 3600];

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-white">
          <Gift className="h-5 w-5" />
          Two gift flows
        </CardTitle>
        <p className="text-sm text-white/70">Creator vs Team Pool with mock active member split.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['creator', 'team'] as GiftType[]).map((type) => (
            <Chip
              key={type}
              variant="outline"
              selected={giftType === type}
              onClick={() => setGiftType(type)}
              className={
                giftType === type ? 'border-white/70 bg-white/15 text-white' : 'border-white/20 text-white/70'
              }
            >
              {type === 'creator' ? 'Gift Creator' : 'Gift Team Pool'}
            </Chip>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
          <p className="text-sm font-semibold">Gift amount</p>
          <div className="mt-2 flex gap-2">
            {amountOptions.map((amount) => (
              <Button
                key={amount}
                size="sm"
                variant={giftAmount === amount ? 'gradient' : 'outline'}
                className="flex-1"
                onClick={() => setGiftAmount(amount)}
              >
                {amount.toLocaleString()}💎
              </Button>
            ))}
          </div>
          <div className="mt-3">
            <Input
              type="range"
              min={300}
              max={6000}
              step={300}
              value={giftAmount}
              onChange={(e) => setGiftAmount(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-white/60">Adjust amount to preview splits.</p>
          </div>
        </div>

        {giftType === 'team' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <Shield className="h-4 w-4 text-white/70" />
              <p className="text-sm font-semibold">Team pool preview</p>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p>Active members eligible: {eligibleCount}</p>
              <p>Each receives: {eligibleCount ? perMember.toLocaleString() : 0}💎</p>
              {splitBlocked && (
                <Badge variant="warning" size="sm">
                  Amount is below the minimum split ({MIN_TEAM_SPLIT}💎)
                </Badge>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeMembers.map((member) => (
                <Badge key={member.id} variant="outline" size="sm" className="border-white/20 text-white/80">
                  {member.name} · {perMember.toLocaleString()}💎
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
            <p className="text-sm font-semibold">Gifting creator directly</p>
            <p className="text-sm text-white/70">
              Entire {giftAmount.toLocaleString()}💎 routes to the host. Team pool stats stay hidden.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={membership !== 'approved' || (giftType === 'team' && splitBlocked)}
            variant="gradient"
            className="flex-1"
          >
            {giftType === 'team' ? 'Gift Team Pool' : 'Gift Creator'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Preview confirmation sheet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface TabButtonProps {
  value: TabKey;
  icon: ReactNode;
  children: ReactNode;
}

function TabButton({ value, icon, children }: TabButtonProps) {
  return (
    <TabsTrigger
      value={value}
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm text-white data-[state=active]:bg-white/15"
    >
      {icon}
      {children}
    </TabsTrigger>
  );
}
