'use client';

import { CSSProperties, ReactNode, useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  ArrowUp,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Gift,
  Hash,
  Heart,
  Home,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  MoreHorizontal,
  PlusCircle,
  Radio,
  Search,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Chip,
  Input,
} from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import {
  AVATAR_SIZES,
  CARD_STYLES,
  TYPOGRAPHY,
  SPACING,
  PRESENCE,
  ROLE_STYLES,
  CHAT_STYLES,
  TEAM_COLOR_PALETTE,
  buildTeamGradient,
} from '@/lib/teams/designTokens';

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

type Surface = 'home' | 'feed' | 'chat' | 'live' | 'members' | 'settings';
type RoleState = 'leader' | 'core' | 'member' | 'guest';
type MemberActivity = 'online' | 'live' | 'offline';
type FeedSort = 'hot' | 'new' | 'top';
type TopRange = '24h' | '7d';
type ContentType = 'post' | 'thread' | 'poll' | 'clip' | 'announcement' | 'event';

interface TeamMember {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: RoleState;
  activity: MemberActivity;
  isStreaming?: boolean;
}

interface FeedItem {
  id: string;
  type: ContentType;
  author: TeamMember;
  title?: string;
  body: string;
  media?: string;
  createdAt: number;
  hotScore: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  pollOptions?: { label: string; votes: number }[];
  topReplies?: { author: TeamMember; text: string }[];
}

interface ChatMessage {
  id: string;
  author: TeamMember;
  text: string;
  timestamp: number;
  reactions?: { emoji: string; count: number }[];
  isSystem?: boolean;
  replyTo?: string;
}

interface LiveRoom {
  id: string;
  host: TeamMember;
  title: string;
  viewers: number;
  thumbnail: string;
  isTeamRoom?: boolean;
}

/* ════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ════════════════════════════════════════════════════════════════════════════ */

const teamMembers: TeamMember[] = [
  { id: '1', name: 'Mira Rivera', handle: '@mira', avatar: 'https://ui-avatars.com/api/?name=MR&background=8B5CF6&color=fff', role: 'leader', activity: 'live', isStreaming: true },
  { id: '2', name: 'Noor Patel', handle: '@noor', avatar: 'https://ui-avatars.com/api/?name=NP&background=F97316&color=fff', role: 'core', activity: 'online' },
  { id: '3', name: 'Avery Chen', handle: '@avery', avatar: 'https://ui-avatars.com/api/?name=AC&background=10B981&color=fff', role: 'core', activity: 'live', isStreaming: true },
  { id: '4', name: 'Samir Lee', handle: '@samir', avatar: 'https://ui-avatars.com/api/?name=SL&background=3B82F6&color=fff', role: 'member', activity: 'online' },
  { id: '5', name: 'Vic Torres', handle: '@vic', avatar: 'https://ui-avatars.com/api/?name=VT&background=EC4899&color=fff', role: 'member', activity: 'online' },
  { id: '6', name: 'Jordan Kim', handle: '@jordan', avatar: 'https://ui-avatars.com/api/?name=JK&background=6366F1&color=fff', role: 'member', activity: 'offline' },
  { id: '7', name: 'Riley Quinn', handle: '@riley', avatar: 'https://ui-avatars.com/api/?name=RQ&background=14B8A6&color=fff', role: 'guest', activity: 'offline' },
];

const feedItems: FeedItem[] = [
  {
    id: 'a1',
    type: 'announcement',
    author: teamMembers[0],
    title: '🎯 Weekend Tournament Registration Open',
    body: 'Sign up by Friday 6PM. Prize pool: 50,000💎 split across top 5. Check #events for bracket details.',
    createdAt: Date.now() - 1000 * 60 * 15,
    hotScore: 999,
    upvotes: 234,
    downvotes: 2,
    comments: 47,
    isPinned: true,
    isAnnouncement: true,
  },
  {
    id: 't1',
    type: 'thread',
    author: teamMembers[1],
    title: 'Best loadout for ranked this season?',
    body: 'Been experimenting with the new meta. What are you all running?',
    createdAt: Date.now() - 1000 * 60 * 45,
    hotScore: 847,
    upvotes: 156,
    downvotes: 8,
    comments: 89,
    topReplies: [
      { author: teamMembers[2], text: 'SMG + shotgun combo is insane rn' },
      { author: teamMembers[4], text: 'Sniper meta is back, trust' },
    ],
  },
  {
    id: 'p1',
    type: 'post',
    author: teamMembers[2],
    body: 'Just hit Diamond! Thanks for the carry last night @noor 🙏',
    media: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop',
    createdAt: Date.now() - 1000 * 60 * 120,
    hotScore: 623,
    upvotes: 98,
    downvotes: 3,
    comments: 24,
  },
  {
    id: 'poll1',
    type: 'poll',
    author: teamMembers[3],
    title: 'Next team event?',
    body: 'Vote for what we should do this weekend',
    createdAt: Date.now() - 1000 * 60 * 180,
    hotScore: 445,
    upvotes: 67,
    downvotes: 1,
    comments: 12,
    pollOptions: [
      { label: 'Custom lobbies', votes: 45 },
      { label: 'Ranked grind', votes: 32 },
      { label: 'Chill & chat', votes: 28 },
    ],
  },
  {
    id: 'c1',
    type: 'clip',
    author: teamMembers[4],
    body: 'That 1v4 clutch from yesterday 🔥',
    media: 'https://images.unsplash.com/photo-1493711662062-fa541f7f46f9?w=600&h=400&fit=crop',
    createdAt: Date.now() - 1000 * 60 * 300,
    hotScore: 512,
    upvotes: 203,
    downvotes: 5,
    comments: 56,
  },
];

const chatMessages: ChatMessage[] = [
  { id: 'sys1', author: teamMembers[2], text: 'Avery Chen went live: "Diamond grind continues"', timestamp: Date.now() - 1000 * 60 * 5, isSystem: true },
  { id: 'm1', author: teamMembers[1], text: 'anyone down for ranked in 10?', timestamp: Date.now() - 1000 * 60 * 4, reactions: [{ emoji: '👍', count: 3 }] },
  { id: 'm2', author: teamMembers[3], text: 'im in, just finishing this match', timestamp: Date.now() - 1000 * 60 * 3 },
  { id: 'm3', author: teamMembers[4], text: 'count me in too, warming up rn', timestamp: Date.now() - 1000 * 60 * 2 },
  { id: 'm4', author: teamMembers[0], text: 'squad up in main voice when ready 🎮', timestamp: Date.now() - 1000 * 60 * 1, reactions: [{ emoji: '🔥', count: 4 }, { emoji: '💪', count: 2 }] },
];

const liveRooms: LiveRoom[] = [
  { id: 'l1', host: teamMembers[0], title: 'Tournament practice + coaching', viewers: 127, thumbnail: 'linear-gradient(135deg, #8B5CF6, #6366F1)', isTeamRoom: true },
  { id: 'l2', host: teamMembers[2], title: 'Diamond grind continues', viewers: 89, thumbnail: 'linear-gradient(135deg, #10B981, #14B8A6)' },
];

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export default function TeamsSandboxPage() {
  const [surface, setSurface] = useState<Surface>('home');
  const [role, setRole] = useState<RoleState>('leader');
  const [feedSort, setFeedSort] = useState<FeedSort>('hot');
  const [topRange, setTopRange] = useState<TopRange>('24h');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  const liveMembers = teamMembers.filter((m) => m.activity === 'live');
  const onlineMembers = teamMembers.filter((m) => m.activity === 'online');
  const onlineCount = onlineMembers.length;
  const liveCount = liveMembers.length;

  const sortedFeed = useMemo(() => {
    const items = [...feedItems].filter((i) => !i.isPinned);
    switch (feedSort) {
      case 'hot':
        return items.sort((a, b) => b.hotScore - a.hotScore);
      case 'new':
        return items.sort((a, b) => b.createdAt - a.createdAt);
      case 'top':
        return items.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      default:
        return items;
    }
  }, [feedSort]);

  const pinnedItems = feedItems.filter((i) => i.isPinned);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ══════════════════════════════════════════════════════════════════════
          STICKY TEAM HEADER
          ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="group relative">
              <Image
                src="https://ui-avatars.com/api/?name=LL&background=8B5CF6&color=fff"
                alt="Link Legends"
                width={44}
                height={44}
                className="rounded-full ring-2 ring-purple-500/50 transition group-hover:ring-purple-400"
              />
            </button>
            <div>
              <h1 className="font-bold text-white">Link Legends</h1>
              <p className="text-xs text-white/50">{teamMembers.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
              <PlusCircle className="h-4 w-4 mr-1" /> Invite
            </Button>
            <button
              onClick={() => setShowDevPanel((v) => !v)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Dev Controls */}
      {showDevPanel && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <span className="text-xs text-white/50 uppercase tracking-wider">Role:</span>
            {(['leader', 'core', 'member', 'guest'] as RoleState[]).map((r) => (
              <Chip
                key={r}
                size="sm"
                variant="outline"
                selected={role === r}
                onClick={() => setRole(r)}
                className={role === r ? 'border-purple-400 bg-purple-500/20 text-white' : 'border-white/20 text-white/60'}
              >
                {r}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-32">
        {/* ══════════════════════════════════════════════════════════════════════
            NAVIGATION TABS
            ══════════════════════════════════════════════════════════════════════ */}
        <nav className="sticky top-[61px] z-40 -mx-4 border-b border-white/10 bg-[#0a0a0f]/95 px-4 backdrop-blur-xl">
          <div className="flex items-center justify-between py-2">
            <NavTab icon={<Home className="h-4 w-4" />} label="Home" active={surface === 'home'} onClick={() => setSurface('home')} />
            <NavTab icon={<Hash className="h-4 w-4" />} label="Feed" active={surface === 'feed'} onClick={() => setSurface('feed')} />
            <NavTab icon={<MessageCircle className="h-4 w-4" />} label="Chat" active={surface === 'chat'} onClick={() => setSurface('chat')} badge={3} />
            <NavTab icon={<Video className="h-4 w-4" />} label="Live" active={surface === 'live'} onClick={() => setSurface('live')} badge={liveCount} variant="live" />
            <NavTab icon={<Users className="h-4 w-4" />} label="Members" active={surface === 'members'} onClick={() => setSurface('members')} />
            {(role === 'leader' || role === 'core') && (
              <NavTab icon={<Settings className="h-4 w-4" />} label="Settings" active={surface === 'settings'} onClick={() => setSurface('settings')} />
            )}
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════════
            SURFACE CONTENT
            ══════════════════════════════════════════════════════════════════════ */}
        <main className="mt-4 space-y-4">
          {surface === 'home' && (
            <HomeScreen
              liveMembers={liveMembers}
              onlineCount={onlineCount}
              liveCount={liveCount}
              pinnedItems={pinnedItems}
              feedItems={sortedFeed.slice(0, 5)}
              liveRooms={liveRooms}
              onGoToFeed={() => setSurface('feed')}
              onGoToLive={() => setSurface('live')}
              onGoToChat={() => setSurface('chat')}
            />
          )}
          {surface === 'feed' && (
            <FeedScreen
              pinnedItems={pinnedItems}
              feedItems={sortedFeed}
              feedSort={feedSort}
              onSortChange={setFeedSort}
              topRange={topRange}
              onTopRangeChange={setTopRange}
            />
          )}
          {surface === 'chat' && (
            <ChatScreen messages={chatMessages} members={teamMembers} />
          )}
          {surface === 'live' && (
            <LiveScreen liveRooms={liveRooms} members={teamMembers} role={role} />
          )}
          {surface === 'members' && (
            <MembersScreen members={teamMembers} />
          )}
          {surface === 'settings' && role !== 'member' && role !== 'guest' && (
            <SettingsScreen role={role} />
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DOCKED CHAT BAR (visible on all surfaces except Chat)
          ══════════════════════════════════════════════════════════════════════ */}
      {surface !== 'chat' && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-pb">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <button
              onClick={() => setSurface('chat')}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5 text-purple-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Team Chat</p>
                <p className="truncate text-xs text-white/50">{chatMessages[chatMessages.length - 1]?.text}</p>
              </div>
              <Badge className="bg-purple-500 text-white text-xs">3</Badge>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NAV TAB COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

function NavTab({
  icon,
  label,
  active,
  onClick,
  badge,
  variant,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  variant?: 'live';
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 transition ${
        active ? 'text-white' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold ${
              variant === 'live' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="text-[9px] font-medium">{label}</span>
      {active && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-white" />
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HOME SCREEN (Dashboard)
   ════════════════════════════════════════════════════════════════════════════ */

function HomeScreen({
  liveMembers,
  onlineCount,
  liveCount,
  pinnedItems,
  feedItems,
  liveRooms,
  onGoToFeed,
  onGoToLive,
  onGoToChat,
}: {
  liveMembers: TeamMember[];
  onlineCount: number;
  liveCount: number;
  pinnedItems: FeedItem[];
  feedItems: FeedItem[];
  liveRooms: LiveRoom[];
  onGoToFeed: () => void;
  onGoToLive: () => void;
  onGoToChat: () => void;
}) {
  return (
    <>
      {/* ══════════ LIVE / PRESENCE STRIP ══════════ */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
        {liveCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">
              <span className="text-red-400">{liveCount} live</span> · {onlineCount} online
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {liveMembers.slice(0, 5).map((m) => (
                <button
                  key={m.id}
                  onClick={onGoToLive}
                  className="group flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
                >
                  <div className="relative">
                    <div className="rounded-full p-0.5 bg-gradient-to-br from-red-500 to-pink-500">
                      <Image
                        src={m.avatar}
                        alt={m.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full border-2 border-[#0a0a0f] object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      <span className="text-[9px] font-bold text-white uppercase">Live</span>
                    </span>
                  </div>
                  <span className="text-xs font-medium text-white/80 group-hover:text-white whitespace-nowrap">
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{onlineCount} online</p>
              <p className="text-xs text-white/50">No one live right now</p>
            </div>
            <Button
              size="sm"
              onClick={onGoToLive}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
            >
              Go Live
            </Button>
          </div>
        )}
      </div>

      {/* ══════════ PINNED ANNOUNCEMENT ══════════ */}
      {pinnedItems[0] && (
        <AnnouncementCard item={pinnedItems[0]} />
      )}

      {/* ══════════ QUICK ACTIONS (if nothing live) ══════════ */}
      {liveCount === 0 && (
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={<Hash className="h-5 w-5" />} label="Post" onClick={onGoToFeed} />
          <QuickAction icon={<Video className="h-5 w-5" />} label="Go Live" onClick={onGoToLive} variant="live" />
          <QuickAction icon={<MessageCircle className="h-5 w-5" />} label="Thread" onClick={onGoToFeed} />
          <QuickAction icon={<TrendingUp className="h-5 w-5" />} label="Poll" onClick={onGoToFeed} />
        </div>
      )}

      {/* ══════════ PRIMARY CONTENT STACK ══════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">What's happening</span>
          <button onClick={onGoToFeed} className="text-xs text-purple-400 hover:text-purple-300">
            View all <ChevronRight className="inline h-3 w-3" />
          </button>
        </div>
        {feedItems.slice(0, 4).map((item) => (
          <FeedCard key={item.id} item={item} compact />
        ))}
      </div>
    </>
  );
}

function QuickAction({ icon, label, onClick, variant }: { icon: ReactNode; label: string; onClick: () => void; variant?: 'live' }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl p-3 transition ${
        variant === 'live'
          ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-400 hover:from-red-500/30 hover:to-pink-500/30'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function AnnouncementCard({ item }: { item: FeedItem }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
          <Bell className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Pinned</span>
            <span className="text-xs text-white/40">· {formatTime(item.createdAt)}</span>
          </div>
          <h3 className="font-semibold text-white mb-1">{item.title}</h3>
          <p className="text-sm text-white/70">{item.body}</p>
          <div className="mt-3 flex items-center gap-3">
            <button className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <Heart className="h-3.5 w-3.5" /> {item.upvotes}
            </button>
            <button className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <MessageCircle className="h-3.5 w-3.5" /> {item.comments}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FEED SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function FeedScreen({
  pinnedItems,
  feedItems,
  feedSort,
  onSortChange,
  topRange,
  onTopRangeChange,
}: {
  pinnedItems: FeedItem[];
  feedItems: FeedItem[];
  feedSort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
  topRange: TopRange;
  onTopRangeChange: (range: TopRange) => void;
}) {
  return (
    <>
      {/* Composer */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-3">
          <Image
            src="https://ui-avatars.com/api/?name=You&background=8B5CF6&color=fff"
            alt="You"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div className="flex-1">
            <Textarea
              placeholder="Share something with the team..."
              className="min-h-[80px] resize-none border-0 bg-transparent text-white placeholder:text-white/40 focus:ring-0"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                  <TrendingUp className="h-5 w-5" />
                </button>
                <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                  <Calendar className="h-5 w-5" />
                </button>
              </div>
              <Button size="sm" className="bg-purple-500 hover:bg-purple-600">Post</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        {(['hot', 'new', 'top'] as FeedSort[]).map((sort) => (
          <Chip
            key={sort}
            size="sm"
            variant="outline"
            selected={feedSort === sort}
            onClick={() => onSortChange(sort)}
            className={feedSort === sort ? 'border-purple-400 bg-purple-500/20 text-white' : 'border-white/20 text-white/60'}
            icon={sort === 'hot' ? <Flame className="h-3 w-3" /> : sort === 'new' ? <Clock className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          >
            {sort.charAt(0).toUpperCase() + sort.slice(1)}
          </Chip>
        ))}
        {feedSort === 'top' && (
          <div className="ml-2 flex gap-1">
            {(['24h', '7d'] as TopRange[]).map((range) => (
              <button
                key={range}
                onClick={() => onTopRangeChange(range)}
                className={`rounded-lg px-2 py-1 text-xs ${
                  topRange === range ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pinned */}
      {pinnedItems.map((item) => (
        <AnnouncementCard key={item.id} item={item} />
      ))}

      {/* Feed Items */}
      <div className="space-y-3">
        {feedItems.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

/**
 * FeedCard - Team feed post with visual design lock
 * 
 * VISUAL DESIGN LOCKED:
 * - Cards lighter than global feed (bg-white/[0.02])
 * - No heavy borders, subtle shadows
 * - Author avatar + name always visible
 * - Team badge subtly present
 * - Reactions row minimal (icons first, counts second)
 */
function FeedCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const isThread = item.type === 'thread';
  const isPoll = item.type === 'poll';
  const isClip = item.type === 'clip';

  return (
    <div
      className={`
        ${CARD_STYLES.borderRadiusClass}
        border ${CARD_STYLES.border.color}
        ${CARD_STYLES.background.feed}
        overflow-hidden
        transition-all duration-200
        hover:${CARD_STYLES.border.hoverColor}
        hover:bg-white/[0.04]
        ${compact ? CARD_STYLES.padding.compactClassName : CARD_STYLES.padding.className}
      `}
    >
      {/* Author Row */}
      <div className="flex items-start gap-3">
        {/* CIRCULAR avatar - always visible */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <Image
              src={item.author.avatar}
              alt={item.author.name}
              width={compact ? AVATAR_SIZES.compact.size : AVATAR_SIZES.feed.size}
              height={compact ? AVATAR_SIZES.compact.size : AVATAR_SIZES.feed.size}
              className={`rounded-full ring-1 ring-white/20 ${compact ? AVATAR_SIZES.compact.className : AVATAR_SIZES.feed.className}`}
            />
            {/* Role indicator */}
            {item.author.role !== 'member' && item.author.role !== 'guest' && (
              <span
                className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${ROLE_STYLES[item.author.role].badgeColor} ring-1 ring-[#0a0a0f]`}
              >
                {item.author.role === 'leader' ? '★' : '◆'}
              </span>
            )}
          </div>
          {/* Thread voting - compact */}
          {isThread && (
            <div className="flex flex-col items-center gap-0.5 text-white/30">
              <button className="p-0.5 rounded hover:bg-white/10 hover:text-green-400 transition">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-bold text-white/60">{item.upvotes - item.downvotes}</span>
              <button className="p-0.5 rounded hover:bg-white/10 hover:text-red-400 rotate-180 transition">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author info row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${TYPOGRAPHY.authorName.weight} text-white ${TYPOGRAPHY.authorName.size}`}>
              {item.author.name}
            </span>
            <RoleBadge role={item.author.role} />
            <span className={`${TYPOGRAPHY.meta.size} ${TYPOGRAPHY.meta.color}`}>
              {formatTime(item.createdAt)}
            </span>
            {/* Content type badge - subtle */}
            {item.type !== 'post' && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium text-white/50 uppercase tracking-wide">
                {item.type}
              </span>
            )}
          </div>

          {/* Thread title - must stand out */}
          {item.title && (
            <h4 className={`mt-1.5 ${TYPOGRAPHY.cardTitle.weight} ${TYPOGRAPHY.cardTitle.size} text-white leading-snug`}>
              {item.title}
            </h4>
          )}
          <p className={`mt-1 ${TYPOGRAPHY.body.color} ${compact ? 'text-sm line-clamp-2' : TYPOGRAPHY.body.size} leading-relaxed`}>
            {item.body}
          </p>

          {/* Poll Options - compact styling */}
          {isPoll && item.pollOptions && (
            <div className="mt-3 space-y-1.5">
              {item.pollOptions.map((opt, i) => {
                const total = item.pollOptions!.reduce((acc, o) => acc + o.votes, 0);
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                return (
                  <button
                    key={i}
                    className="relative w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-left overflow-hidden hover:bg-white/[0.1] transition"
                  >
                    <div
                      className="absolute inset-0 bg-purple-500/15 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm text-white/90">{opt.label}</span>
                      <span className="text-xs font-bold text-white/60">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Thread Top Replies - preview max 2 */}
          {isThread && item.topReplies && !compact && (
            <div className="mt-3 space-y-2 border-l-2 border-white/[0.08] pl-3">
              {item.topReplies.slice(0, 2).map((reply, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Image
                    src={reply.author.avatar}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full ring-1 ring-white/10"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-white/60">{reply.author.name}</span>
                    <p className="text-xs text-white/50 line-clamp-1">{reply.text}</p>
                  </div>
                </div>
              ))}
              {/* Clear "enter thread" affordance */}
              <button className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition group">
                View all {item.comments} replies
                <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </button>
            </div>
          )}

          {/* Media */}
          {item.media && (isClip || item.type === 'post') && (
            <div className="mt-3 relative rounded-xl overflow-hidden">
              <Image
                src={item.media}
                alt=""
                width={600}
                height={300}
                className="w-full object-cover"
              />
              {isClip && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition cursor-pointer">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reactions row - minimal, icons first */}
          <div className="mt-3 flex items-center gap-1">
            <button className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition">
              <Heart className="h-3.5 w-3.5" />
              <span className="text-xs">{item.upvotes}</span>
            </button>
            <button className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs">{item.comments}</span>
            </button>
            <button className="ml-auto rounded-full p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CHAT SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function ChatScreen({ messages, members }: { messages: ChatMessage[]; members: TeamMember[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <ChatMessageRow key={msg.id} message={msg} />
        ))}
      </div>

      {/* Jump to Live */}
      {members.filter((m) => m.isStreaming).length > 0 && (
        <div className="my-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3">
          <Radio className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-sm text-white">
            <span className="font-semibold text-red-400">{members.find((m) => m.isStreaming)?.name}</span> is live
          </span>
          <Button size="sm" className="ml-auto bg-red-500 hover:bg-red-600 text-white text-xs">
            Join
          </Button>
        </div>
      )}

      {/* Composer */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Message the team..."
            className="flex-1 border-0 bg-transparent text-white placeholder:text-white/40 focus:ring-0"
          />
          <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <ImageIcon className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <TrendingUp className="h-5 w-5" />
          </button>
          <Button size="sm" className="bg-purple-500 hover:bg-purple-600">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * ChatMessageRow - Discord-like chat message
 * 
 * VISUAL DESIGN LOCKED:
 * - Bubbles auto-size to content (not full-width)
 * - Avatar on first message in sequence only (simulated here)
 * - System messages visually distinct (lighter, italic or pill)
 * - Team color for mentions, system events, reactions
 */
function ChatMessageRow({ message, isFirstInSequence = true }: { message: ChatMessage; isFirstInSequence?: boolean }) {
  // System messages - distinct styling
  if (message.isSystem) {
    return (
      <div className={`
        flex items-center gap-2.5 py-2 px-3.5
        ${CARD_STYLES.borderRadiusClass}
        ${CHAT_STYLES.bubble.system.bg}
        my-1
      `}>
        <Radio className="h-4 w-4 text-purple-400 flex-shrink-0" />
        <span className={`text-sm ${CHAT_STYLES.bubble.system.text}`}>{message.text}</span>
        <span className={`ml-auto ${TYPOGRAPHY.meta.size} text-purple-400/50`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03] transition">
      {/* Avatar - CIRCULAR, shown on first in sequence */}
      {isFirstInSequence ? (
        <div className="relative flex-shrink-0">
          <Image
            src={message.author.avatar}
            alt={message.author.name}
            width={AVATAR_SIZES.chat.size}
            height={AVATAR_SIZES.chat.size}
            className={`${AVATAR_SIZES.chat.className} rounded-full ring-1 ring-white/15`}
          />
          {/* Role indicator */}
          {message.author.role !== 'member' && message.author.role !== 'guest' && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] ${ROLE_STYLES[message.author.role].badgeColor} ring-1 ring-[#0a0a0f]`}
            >
              {message.author.role === 'leader' ? '★' : '◆'}
            </span>
          )}
        </div>
      ) : (
        <div className={AVATAR_SIZES.chat.className} />
      )}

      <div className="flex-1 min-w-0">
        {/* Author info - only on first message */}
        {isFirstInSequence && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`${TYPOGRAPHY.authorName.weight} text-white ${TYPOGRAPHY.authorName.size}`}>
              {message.author.name}
            </span>
            <RoleBadge role={message.author.role} />
            <span className={`${TYPOGRAPHY.meta.size} ${TYPOGRAPHY.meta.color}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message bubble - auto-sizes to content */}
        <div className={`
          inline-block
          ${CHAT_STYLES.bubble.maxWidth}
          ${CHAT_STYLES.bubble.borderRadius}
          ${CHAT_STYLES.bubble.padding}
          ${CHAT_STYLES.bubble.regular.bg}
        `}>
          <p className={`text-sm ${CHAT_STYLES.bubble.regular.text} leading-relaxed`}>
            {message.text}
          </p>
        </div>

        {/* Reactions - team color accents */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                className="flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs hover:bg-purple-500/20 transition"
              >
                <span>{r.emoji}</span>
                <span className="text-purple-300 font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message actions */}
      <button className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white transition">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIVE SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function LiveScreen({ liveRooms, members, role }: { liveRooms: LiveRoom[]; members: TeamMember[]; role: RoleState }) {
  const liveMembers = members.filter((m) => m.isStreaming);

  return (
    <>
      {/* Go Live CTA */}
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500">
          <Video className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-white mb-1">Start a Live Room</h3>
        <p className="text-sm text-white/50 mb-4">Stream, hang out, or host a team event</p>
        <Button className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600">
          Go Live
        </Button>
      </div>

      {/* Live Grid */}
      {liveRooms.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">Live Now</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveRooms.map((room) => (
              <LiveTile key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}

      {/* Scheduled */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">Upcoming</h3>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">Weekend Tournament</p>
              <p className="text-xs text-white/50">Saturday 8PM · Hosted by Mira</p>
            </div>
            <Button size="sm" variant="outline" className="ml-auto border-white/20 text-white hover:bg-white/10">
              Remind me
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function LiveTile({ room }: { room: LiveRoom }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10">
      <div
        className="h-40"
        style={{ background: room.thumbnail }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            {room.viewers} watching
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Image
              src={room.host.avatar}
              alt={room.host.name}
              width={32}
              height={32}
              className="rounded-full ring-2 ring-red-500"
            />
            <div>
              <p className="text-sm font-semibold text-white">{room.host.name}</p>
              {room.isTeamRoom && (
                <Badge className="bg-purple-500/50 text-white text-[9px]">Team Room</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-white/90 line-clamp-1">{room.title}</p>
          <Button size="sm" className="mt-2 w-full bg-white/20 backdrop-blur hover:bg-white/30 text-white">
            Join Room
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MEMBERS SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function MembersScreen({ members }: { members: TeamMember[] }) {
  const [filter, setFilter] = useState<'all' | 'live' | 'online'>('all');
  const [search, setSearch] = useState('');

  const filtered = members.filter((m) => {
    if (filter === 'live' && m.activity !== 'live') return false;
    if (filter === 'online' && m.activity === 'offline') return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = {
    leader: filtered.filter((m) => m.role === 'leader'),
    core: filtered.filter((m) => m.role === 'core'),
    member: filtered.filter((m) => m.role === 'member'),
    guest: filtered.filter((m) => m.role === 'guest'),
  };

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-white/40"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'live', 'online'] as const).map((f) => (
            <Chip
              key={f}
              size="sm"
              variant="outline"
              selected={filter === f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'border-purple-400 bg-purple-500/20 text-white' : 'border-white/20 text-white/60'}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-4">
        {(['leader', 'core', 'member', 'guest'] as RoleState[]).map((role) => {
          const group = grouped[role];
          if (group.length === 0) return null;
          return (
            <div key={role}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
                {role === 'leader' ? 'Leaders' : role === 'core' ? 'Core' : role === 'member' ? 'Members' : 'Guests'} — {group.length}
              </h3>
              <div className="space-y-2">
                {group.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * MemberRow - Team member list row
 * 
 * VISUAL DESIGN LOCKED:
 * - Avatar (CIRCLE)
 * - Display name
 * - Role icon (not text-heavy)
 * - Presence indicator
 * - Actions visible (role-gated): Approve/Reject, Change role, Mute/Ban
 */
function MemberRow({ member, showActions = true }: { member: TeamMember; showActions?: boolean }) {
  const presenceConfig = PRESENCE[member.activity];

  return (
    <div className={`
      flex items-center gap-3
      ${CARD_STYLES.borderRadiusClass}
      border ${CARD_STYLES.border.color}
      ${CARD_STYLES.background.default}
      p-3
      hover:${CARD_STYLES.border.hoverColor}
      hover:bg-white/[0.05]
      transition
    `}>
      {/* Avatar - CIRCULAR with presence ring */}
      <div className="relative flex-shrink-0">
        <Image
          src={member.avatar}
          alt={member.name}
          width={AVATAR_SIZES.feed.size}
          height={AVATAR_SIZES.feed.size}
          className={`${AVATAR_SIZES.feed.className} rounded-full ring-1 ring-white/15`}
        />
        {/* Presence indicator */}
        <span
          className={`
            absolute -bottom-0.5 -right-0.5
            ${presenceConfig.size}
            ${presenceConfig.color}
            rounded-full
            ring-2 ring-[#0a0a0f]
            ${member.activity === 'live' ? 'animate-pulse' : ''}
          `}
        />
        {/* Role icon - icon-based, not text-heavy */}
        {member.role !== 'member' && member.role !== 'guest' && (
          <span
            className={`absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${ROLE_STYLES[member.role].badgeColor} ring-1 ring-[#0a0a0f]`}
          >
            {member.role === 'leader' ? '★' : '◆'}
          </span>
        )}
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${TYPOGRAPHY.authorName.weight} text-white truncate`}>{member.name}</span>
          <RoleBadge role={member.role} />
        </div>
        <p className={`${TYPOGRAPHY.meta.size} text-white/50 truncate`}>{member.handle}</p>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* LIVE badge */}
        {member.isStreaming && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[9px] font-bold text-red-400 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        )}

        {/* Member actions - no hidden actions, no overflow confusion */}
        {showActions && (
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/70 transition"
              title="View profile"
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/70 transition"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SETTINGS SCREEN - AUDITED FOR REAL NEEDS
   
   KEPT (matches real needs):
   - Team name
   - Team description  
   - Team avatar
   - Team banner
   - Team color theme (limited palette)
   - Invite controls
   - Moderation tools (ban/mute list)
   - Notification preferences (team-only)
   
   REMOVED:
   - Any unused placeholders
   - Any global-app settings
   - Any future features not wired
   ════════════════════════════════════════════════════════════════════════════ */

function SettingsScreen({ role }: { role: RoleState }) {
  const isLeader = role === 'leader';
  const isCore = role === 'core';
  const canEditBranding = isLeader;
  const canManageMembers = isLeader || isCore;

  return (
    <div className="space-y-4">
      {/* ═══ TEAM IDENTITY ═══ */}
      <SettingsGroup
        title="Team Identity"
        description={canEditBranding ? 'Customize your team branding' : 'Only leaders can edit branding'}
      >
        <SettingsRow
          label="Team Name"
          value="Link Legends"
          action={canEditBranding ? 'Edit' : undefined}
          icon={<Hash className="h-4 w-4" />}
        />
        <SettingsRow
          label="Description"
          value="Neu Premium Capsule community"
          action={canEditBranding ? 'Edit' : undefined}
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <SettingsRow
          label="Team Avatar"
          value="Circular icon"
          action={canEditBranding ? 'Change' : undefined}
          icon={<Users className="h-4 w-4" />}
        />
        <SettingsRow
          label="Team Banner"
          value="Gradient background"
          action={canEditBranding ? 'Change' : undefined}
          icon={<ImageIcon className="h-4 w-4" />}
        />
      </SettingsGroup>

      {/* ═══ THEME COLOR ═══ */}
      <SettingsGroup
        title="Theme Color"
        description="Limited palette for consistency"
      >
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {TEAM_COLOR_PALETTE.map((color) => (
              <button
                key={color.name}
                className={`
                  flex flex-col items-center gap-1.5 rounded-xl p-2 transition
                  ${color.name === 'Purple' ? 'bg-white/10 ring-1 ring-purple-400' : 'hover:bg-white/5'}
                  ${!canEditBranding ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={!canEditBranding}
                title={color.name}
              >
                <div
                  className="h-8 w-8 rounded-full ring-2 ring-white/10"
                  style={{ background: buildTeamGradient(color.primary, color.accent) }}
                />
                <span className="text-[10px] text-white/60">{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      {/* ═══ INVITE CONTROLS ═══ */}
      <SettingsGroup title="Invite Controls">
        <SettingsRow
          label="Invite Link"
          value="mylivelinks.com/t/legends"
          action="Copy"
          icon={<PlusCircle className="h-4 w-4" />}
        />
        <SettingsRow
          label="Invite Code"
          value="LEGENDS2025"
          action={isLeader ? 'Regenerate' : undefined}
          icon={<Zap className="h-4 w-4" />}
        />
      </SettingsGroup>

      {/* ═══ MODERATION TOOLS ═══ */}
      {canManageMembers && (
        <SettingsGroup
          title="Moderation"
          description="Manage member access and behavior"
        >
          <SettingsRow
            label="Pending Requests"
            value="3 awaiting"
            action="Review"
            icon={<Clock className="h-4 w-4" />}
          />
          <SettingsRow
            label="Muted Members"
            value="0"
            action="View List"
            icon={<Radio className="h-4 w-4" />}
          />
          <SettingsRow
            label="Banned Members"
            value="0"
            action="View List"
            icon={<Users className="h-4 w-4" />}
          />
        </SettingsGroup>
      )}

      {/* ═══ NOTIFICATIONS (Team-only) ═══ */}
      <SettingsGroup
        title="Notifications"
        description="Team-specific notification preferences"
      >
        <SettingsRow
          label="Team Activity"
          description="Posts, threads, and announcements"
          toggle
          defaultChecked
        />
        <SettingsRow
          label="Live Alerts"
          description="When team members go live"
          toggle
          defaultChecked
        />
        <SettingsRow
          label="Mentions Only"
          description="Only notify when @mentioned"
          toggle
        />
        <SettingsRow
          label="Chat Messages"
          description="Team chat notifications"
          toggle
          defaultChecked
        />
      </SettingsGroup>

      {/* Role-based access note */}
      {!isLeader && (
        <div className={`
          ${CARD_STYLES.borderRadiusClass}
          border ${CARD_STYLES.border.color}
          ${CARD_STYLES.background.default}
          p-4
        `}>
          <p className="text-sm text-white/50">
            Some settings are restricted to team leaders. Contact a leader to request changes.
          </p>
        </div>
      )}
    </div>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${CARD_STYLES.borderRadiusClass} border ${CARD_STYLES.border.color} ${CARD_STYLES.background.default} overflow-hidden`}>
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <h3 className={`${TYPOGRAPHY.cardTitle.weight} text-white text-sm`}>{title}</h3>
        {description && (
          <p className={`${TYPOGRAPHY.meta.size} ${TYPOGRAPHY.meta.color} mt-0.5`}>{description}</p>
        )}
      </div>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  value,
  action,
  toggle,
  defaultChecked,
  icon,
}: {
  label: string;
  description?: string;
  value?: string;
  action?: string;
  toggle?: boolean;
  defaultChecked?: boolean;
  icon?: ReactNode;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div className="flex-shrink-0 mt-0.5 text-white/40">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className={`${TYPOGRAPHY.body.size} text-white`}>{label}</p>
          {description && (
            <p className={`${TYPOGRAPHY.meta.size} ${TYPOGRAPHY.meta.color} mt-0.5`}>{description}</p>
          )}
          {value && !description && (
            <p className={`${TYPOGRAPHY.meta.size} text-white/50 mt-0.5 truncate`}>{value}</p>
          )}
        </div>
      </div>
      {toggle ? (
        <button
          onClick={() => setChecked(!checked)}
          className={`relative h-6 w-11 rounded-full transition flex-shrink-0 ${checked ? 'bg-purple-500' : 'bg-white/20'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-5' : ''}`}
          />
        </button>
      ) : action ? (
        <Button size="sm" variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex-shrink-0">
          {action}
        </Button>
      ) : (
        <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ════════════════════════════════════════════════════════════════════════════ */

function RoleBadge({ role }: { role: RoleState }) {
  const styles: Record<RoleState, string> = {
    leader: 'bg-amber-500/20 text-amber-400',
    core: 'bg-purple-500/20 text-purple-400',
    member: 'bg-white/10 text-white/60',
    guest: 'bg-white/5 text-white/40',
  };

  if (role === 'member' || role === 'guest') return null;

  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${styles[role]}`}>
      {role}
    </span>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
