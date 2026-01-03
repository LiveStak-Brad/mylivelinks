'use client';

import { CSSProperties, ReactNode, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  Gift,
  Hash,
  Heart,
  HelpCircle,
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
  Share2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
  AlertTriangle,
  Loader2,
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
import { useToast } from '@/components/ui/Toast';
import { useTeamContext, Surface, TeamLiveVisibility, TeamLiveRoomState } from '@/contexts/TeamContext';
import {
  useTeam,
  useTeamMembership,
  useTeamFeed,
  useTeamMembers,
  useTeamPresence,
  useTeamLiveRooms,
  useTeamChat,
  useCreatePost,
  useReactToPost,
  useLeaveTeamBySlug,
  useSendChatMessage,
  useTeamNotificationPrefsBySlug,
  FeedSort,
  TeamMember,
  FeedItem,
  ChatMessage,
  LiveRoom,
  NotificationPrefs,
} from '@/hooks/useTeam';

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

type RoleState = 'leader' | 'core' | 'member' | 'guest';
type TopRange = '24h' | '7d';
type GoLiveCtaState = {
  label: string;
  helper: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};
type TeamLiveViewState = {
  isUnlocked: boolean;
  unlockThreshold: number;
  approvedMemberCount: number;
  visibility: TeamLiveVisibility;
  isLoading: boolean;
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export default function TeamPageContent() {
  const {
    team,
    teamId,
    teamSlug,
    membership,
    permissions,
    presence,
    currentSurface,
    setSurface,
    uiRole,
    isLoading,
    isError,
    errorMessage,
    teamLiveRoomConfig,
    teamLiveRoomLoading,
    isTeamLiveUnlocked,
    canToggleTeamLiveVisibility,
    isUpdatingTeamLiveVisibility,
    updateTeamLiveVisibility,
  } = useTeamContext();
  const router = useRouter();
  
  const [feedSort, setFeedSort] = useState<FeedSort>('hot');
  const [topRange, setTopRange] = useState<TopRange>('24h');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Fetch data using shared hooks (cached, no duplicate requests)
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useTeamFeed(teamId, feedSort);
  const { data: membersRaw, isLoading: membersLoading } = useTeamMembers(teamId, 'all');
  const { data: presenceData } = useTeamPresence(teamId);
  const { data: liveRoomsRaw, isLoading: liveLoading } = useTeamLiveRooms(teamId);
  
  // Ensure arrays are never null/undefined and always iterable
  // useTeamFeed returns { pinnedItems, feedItems } - extract properly
  const feedItems = feedData?.feedItems ?? [];
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const liveRooms = Array.isArray(liveRoomsRaw) ? liveRoomsRaw : [];
  
  // Derive counts
  const liveMembers = members.filter((m) => m.activity === 'live' || m.isStreaming);
  const onlineMembers = members.filter((m) => m.activity === 'online');
  const onlineCount = presenceData?.onlineCount ?? onlineMembers.length;
  const liveCount = presenceData?.liveCount ?? liveRooms.length;
  
  // Sort feed
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
  }, [feedItems, feedSort]);
  
  // useTeamFeed already separates pinned from unpinned
  const pinnedItems = feedData?.pinnedItems ?? [];
  const teamLiveThreshold = teamLiveRoomConfig?.unlockThreshold ?? 100;
  const teamLiveMemberCount = teamLiveRoomConfig?.approvedMemberCount ?? team?.approvedMemberCount ?? 0;
  const handleGoLiveClick = useCallback(() => {
    if (!team?.slug || !isTeamLiveUnlocked) return;
    router.push(`/teams/room/${team.slug}`);
  }, [router, team?.slug, isTeamLiveUnlocked]);
  const goLiveCta = useMemo<GoLiveCtaState>(() => {
    const label = isTeamLiveUnlocked ? 'Go Live' : 'Unlock at 100 members';
    const helper = isTeamLiveUnlocked
      ? 'Sends an alert to everyone here.'
      : `Team Live unlocks at ${teamLiveThreshold} members (${Math.min(teamLiveMemberCount, teamLiveThreshold)}/${teamLiveThreshold}).`;
    return {
      label,
      helper,
      loading: teamLiveRoomLoading,
      disabled: !isTeamLiveUnlocked || !team?.slug || teamLiveRoomLoading,
      onClick: handleGoLiveClick,
    };
  }, [isTeamLiveUnlocked, teamLiveThreshold, teamLiveMemberCount, teamLiveRoomLoading, team?.slug, handleGoLiveClick]);
  const teamLiveState = useMemo<TeamLiveViewState>(() => ({
    isUnlocked: isTeamLiveUnlocked,
    unlockThreshold: teamLiveThreshold,
    approvedMemberCount: teamLiveMemberCount,
    visibility: teamLiveRoomConfig?.visibility ?? 'private',
    isLoading: teamLiveRoomLoading,
  }), [isTeamLiveUnlocked, teamLiveThreshold, teamLiveMemberCount, teamLiveRoomConfig?.visibility, teamLiveRoomLoading]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <TeamSkeleton />;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Error state
  // ─────────────────────────────────────────────────────────────────────────
  if (isError || !team) {
    return <TeamErrorState message={errorMessage ?? 'Failed to load team'} />;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Banned user state
  // ─────────────────────────────────────────────────────────────────────────
  if (permissions.isBanned) {
    return <BannedState teamName={team.name} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ══════════════════════════════════════════════════════════════════════
          STICKY TEAM HEADER WITH BANNER
          ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]">
        {/* Banner Area */}
        <div className="relative h-20 w-full overflow-hidden">
          {team.bannerUrl ? (
            <>
              <Image
                src={team.bannerUrl}
                alt={`${team.name} banner`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-purple-600/40 via-pink-600/30 to-blue-600/40" />
          )}
        </div>
        
        {/* Team Info Row */}
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 -mt-7 relative">
          <div className="flex items-center gap-3">
            {/* Team Icon */}
            <div className="relative">
              {team.iconUrl ? (
                <Image
                  src={team.iconUrl}
                  alt={team.name}
                  width={52}
                  height={52}
                  className="rounded-full ring-4 ring-[#0a0a0f]"
                />
              ) : (
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-purple-500 ring-4 ring-[#0a0a0f]" style={{ width: 52, height: 52 }}>
                  <span className="text-lg font-bold text-white">{team.teamTag.slice(0, 2)}</span>
                </div>
              )}
            </div>
            <div className="pt-3">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white">{team.name}</h1>
                <Badge className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5">{team.teamTag}</Badge>
              </div>
              <p className="text-xs text-white/50">{team.approvedMemberCount} members</p>
            </div>
          </div>
          
          {/* 3-dot Menu */}
          <div className="relative pt-3">
            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {showHeaderMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-white/10 bg-[#1a1a24] p-1 shadow-xl">
                  {permissions.canModerate && (
                    <button
                      onClick={() => { setShowInviteModal(true); setShowHeaderMenu(false); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <PlusCircle className="h-4 w-4" /> Invite Members
                    </button>
                  )}
                  {permissions.canAccessSettings && (
                    <button
                      onClick={() => { setSurface('settings'); setShowHeaderMenu(false); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <Settings className="h-4 w-4" /> Team Settings
                    </button>
                  )}
                  {permissions.canModerate && (
                    <a
                      href={`/teams/${team.slug}/admin`}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <Shield className="h-4 w-4" /> Admin Panel
                    </a>
                  )}
                  <button
                    onClick={() => setShowHeaderMenu(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Share2 className="h-4 w-4" /> Share Team
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <a
                    href="/policies"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <FileText className="h-4 w-4" /> Safety Policies
                  </a>
                  <a
                    href="/help"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <HelpCircle className="h-4 w-4" /> Help & FAQ
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-40">
        {/* ══════════════════════════════════════════════════════════════════════
            NAVIGATION TABS
            ══════════════════════════════════════════════════════════════════════ */}
        <nav className="sticky top-[108px] z-40 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl justify-around py-2">
            <NavTab icon={<Home className="h-4 w-4" />} label="Home" active={currentSurface === 'home'} onClick={() => setSurface('home')} />
            <NavTab icon={<Hash className="h-4 w-4" />} label="Feed" active={currentSurface === 'feed'} onClick={() => setSurface('feed')} />
            <NavTab icon={<MessageCircle className="h-4 w-4" />} label="Chat" active={currentSurface === 'chat'} onClick={() => setSurface('chat')} />
            <NavTab icon={<Video className="h-4 w-4" />} label="Live" active={currentSurface === 'live'} onClick={() => setSurface('live')} badge={liveCount} variant="live" />
            <NavTab icon={<Users className="h-4 w-4" />} label="Members" active={currentSurface === 'members'} onClick={() => setSurface('members')} />
            {permissions.canAccessSettings && (
              <NavTab icon={<Settings className="h-4 w-4" />} label="Settings" active={currentSurface === 'settings'} onClick={() => setSurface('settings')} />
            )}
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════════════════
            SURFACE CONTENT
            ══════════════════════════════════════════════════════════════════════ */}
        <main className="mt-4 space-y-3 md:space-y-4">
          {currentSurface === 'home' && (
            <HomeScreen
              liveMembers={liveMembers}
              onlineCount={onlineCount}
              liveCount={liveCount}
              pinnedItems={pinnedItems}
              feedItems={sortedFeed.slice(0, 5)}
              liveRooms={liveRooms}
              team={team}
            goLiveCta={goLiveCta}
              onGoToFeed={() => setSurface('feed')}
              onGoToLive={() => setSurface('live')}
              onGoToChat={() => setSurface('chat')}
            />
          )}
          {currentSurface === 'feed' && (
            <FeedScreen
              pinnedItems={pinnedItems}
              feedItems={sortedFeed}
              feedSort={feedSort}
              onSortChange={setFeedSort}
              topRange={topRange}
              onTopRangeChange={setTopRange}
              teamSlug={teamSlug ?? ''}
              canPost={permissions.canPost}
              isMuted={permissions.isMuted}
              onPostCreated={refetchFeed}
            />
          )}
          {currentSurface === 'chat' && (
            <ChatScreen teamId={teamId} members={members} canChat={permissions.canPost && !permissions.isMuted} />
          )}
          {currentSurface === 'live' && (
          <LiveScreen
            liveRooms={liveRooms}
            members={members}
            role={uiRole}
            isLoading={liveLoading}
            teamLiveState={teamLiveState}
            onLaunchTeamRoom={handleGoLiveClick}
          />
          )}
          {currentSurface === 'members' && (
            <MembersScreen members={members} isLoading={membersLoading} />
          )}
          {currentSurface === 'settings' && permissions.canAccessSettings && (
          <SettingsScreen
            role={uiRole}
            team={team}
            teamLiveConfig={teamLiveRoomConfig}
            canToggleLiveVisibility={canToggleTeamLiveVisibility}
            onLiveVisibilityChange={updateTeamLiveVisibility}
            isLiveVisibilityUpdating={isUpdatingTeamLiveVisibility}
          />
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DOCKED CHAT BAR (visible on all surfaces except Chat)
          ══════════════════════════════════════════════════════════════════════ */}
      {currentSurface !== 'chat' && (
        <DockedChatBar
          onOpenChat={() => setSurface('chat')}
          priority={currentSurface === 'feed' && sortedFeed.length === 0 ? 'subtle' : 'default'}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INVITE MEMBERS MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {showInviteModal && team?.slug && (
        <InviteMembersModal
          teamName={team.name}
          teamSlug={team.slug}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

function DockedChatBar({ onOpenChat, priority = 'default' }: { onOpenChat: () => void; priority?: 'default' | 'subtle' }) {
  const isSubtle = priority === 'subtle';

  return (
    <div
      className={`fixed bottom-[68px] inset-x-0 z-40 border-t ${
        isSubtle ? 'border-white/5 bg-black/70 backdrop-blur' : 'border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 py-2">
        <button
          onClick={onOpenChat}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
            isSubtle ? 'bg-white/5 text-white/80 hover:bg-white/10' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <MessageCircle className={`h-5 w-5 ${isSubtle ? 'text-white/50' : 'text-purple-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isSubtle ? 'text-white/80' : 'text-white'}`}>Team Chat</p>
            <p className={`truncate text-xs ${isSubtle ? 'text-white/40' : 'text-white/50'}`}>Tap to open chat</p>
          </div>
        </button>
      </div>
    </div>
  );
}

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

/* ════════════════════════════════════════════════════════════════════════════
   LOADING / ERROR / EMPTY STATES
   ════════════════════════════════════════════════════════════════════════════ */

function TeamSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-white/60">Loading team...</p>
      </div>
    </div>
  );
}

function TeamErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-white/60 mb-4">{message}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    </div>
  );
}

function BannedState({ teamName }: { teamName: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-white/60 mb-4">
          You have been banned from <span className="text-white font-semibold">{teamName}</span>.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { 
  icon: ReactNode; 
  title: string; 
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/50 mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

function MutedBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
      <p className="text-sm text-amber-200">
        You are muted in this team and cannot post or chat.
      </p>
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
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center rounded-xl p-3 transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            variant === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500 text-white'
          }`}
        >
          {badge}
        </span>
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
  team,
  goLiveCta,
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
  team: { name: string; approvedMemberCount: number };
  goLiveCta: GoLiveCtaState;
  onGoToFeed: () => void;
  onGoToLive: () => void;
  onGoToChat: () => void;
}) {
  const hasLive = liveCount > 0;
  const featuredLiveMembers = liveMembers.slice(0, 6);
  const momentumStatus = hasLive ? 'Live energy is up' : onlineCount > 0 ? 'People are around' : 'Quiet moment';

  return (
    <>
      {/* ══════════ PRIMARY CTA / PRESENCE ══════════ */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-purple-600/20 via-pink-500/10 to-transparent p-4 sm:p-5 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Team Home</p>
            <h2 className="text-xl font-semibold text-white">Fire up the team room</h2>
            <p className="text-sm text-white/70">
              {hasLive
                ? 'People are live right now—jump in or start your own.'
                : 'Kick things off and everyone online gets pinged instantly.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-white/80">
                <span className={`h-1.5 w-1.5 rounded-full ${hasLive ? 'bg-red-400 animate-pulse' : 'bg-white/40'}`} />
                {hasLive ? `${liveCount} live now` : 'Stage is open'}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                {onlineCount} online
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 md:w-auto">
            <Button
              onClick={goLiveCta.disabled ? undefined : goLiveCta.onClick}
              disabled={goLiveCta.disabled}
              className="h-12 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-base font-semibold text-white shadow-[0_18px_35px_rgba(255,0,128,0.35)] hover:from-red-400 hover:to-pink-400"
            >
              <Zap className="mr-2 h-4 w-4" /> {goLiveCta.loading ? 'Checking...' : goLiveCta.label}
            </Button>
            <p className="text-center text-[11px] text-white/60 md:text-left">
              {goLiveCta.loading ? 'Checking team status...' : goLiveCta.helper}
            </p>
          </div>
        </div>

        {hasLive ? (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {featuredLiveMembers.map((m) => (
              <button
                key={m.id}
                onClick={onGoToLive}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-white/30 hover:bg-white/10"
              >
                <div className="relative">
                  <Image
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=8B5CF6&color=fff`}
                    alt={m.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-[#0a0a0f] object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <span className="text-[9px] font-bold text-white uppercase">Live</span>
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white leading-tight">{m.name.split(' ')[0]}</p>
                  <p className="text-[11px] text-white/50">tap to jump in</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
            <span className="flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1">
              <MessageCircle className="h-3.5 w-3.5 text-purple-300" />
              Start the room, set the vibe.
            </span>
          </div>
        )}
      </div>

      {/* ══════════ ACTION ROW ══════════ */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction
          icon={<Video className="h-4 w-4" />}
          label={goLiveCta.loading ? 'Checking...' : goLiveCta.label}
          onClick={goLiveCta.onClick}
          variant="live"
          description={goLiveCta.loading ? 'Checking team status...' : goLiveCta.helper}
          disabled={goLiveCta.disabled}
          className="col-span-2 sm:col-span-2"
        />
        <QuickAction
          icon={<Hash className="h-4 w-4" />}
          label="Post"
          onClick={onGoToFeed}
          description="Share an update"
        />
        <QuickAction
          icon={<MessageCircle className="h-4 w-4" />}
          label="Chat"
          onClick={onGoToChat}
          description="Drop a quick note"
        />
        <QuickAction
          icon={<TrendingUp className="h-4 w-4" />}
          label="Poll"
          onClick={onGoToFeed}
          description="Take the pulse"
        />
      </div>

      {/* ══════════ PINNED ANNOUNCEMENT ══════════ */}
      {pinnedItems[0] && (
        <AnnouncementCard item={pinnedItems[0]} />
      )}

      {/* ══════════ MOMENTUM + PROGRESS ══════════ */}
      <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/70">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Team Momentum</span>
          </div>
          <span className="text-[11px] text-white/40">{momentumStatus}</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MomentumStat icon={<Hash className="h-4 w-4" />} value={String(feedItems.length)} label="posts" />
          <MomentumStat icon={<Video className="h-4 w-4" />} value={String(liveCount)} label="live now" />
          <MomentumStat icon={<Users className="h-4 w-4" />} value={String(team.approvedMemberCount)} label="members" />
        </div>
      </div>

      {/* ══════════ PRIMARY CONTENT STACK ══════════ */}
      {feedItems.length > 0 ? (
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
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Start the conversation</p>
            <p className="text-xs text-white/60">Drop a post or go live to set the tone for everyone.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onGoToFeed}
                className="border-white/30 text-white/80 hover:bg-white/10"
              >
                Create post
              </Button>
              <Button
                size="sm"
                onClick={goLiveCta.disabled ? undefined : goLiveCta.onClick}
                disabled={goLiveCta.disabled}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-400 hover:to-pink-400"
              >
                {goLiveCta.loading ? 'Checking...' : goLiveCta.label}
              </Button>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-center text-white/40">
            <ChevronRight className="-rotate-90 h-6 w-6" />
            <span className="text-[10px] uppercase tracking-[0.3em]">Action row</span>
          </div>
        </div>
      )}
    </>
  );
}

function MomentumStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-white leading-tight">{value}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  variant,
  description,
  className,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'live';
  description?: string;
  className?: string;
  disabled?: boolean;
}) {
  const isLive = variant === 'live';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
        isLive
          ? 'border-transparent bg-gradient-to-br from-red-500/25 to-pink-500/25 text-white shadow-[0_12px_30px_rgba(255,0,153,0.25)] hover:from-red-500/35 hover:to-pink-500/35'
          : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className || ''}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isLive ? 'bg-white/15 text-white' : 'bg-white/10 text-white/70'}`}>
        {icon}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{label}</span>
        {description && <span className="text-[11px] text-white/50">{description}</span>}
      </div>
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
  teamSlug,
  canPost,
  isMuted,
  onPostCreated,
}: {
  pinnedItems: FeedItem[];
  feedItems: FeedItem[];
  feedSort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
  topRange: TopRange;
  onTopRangeChange: (range: TopRange) => void;
  teamSlug: string;
  canPost: boolean;
  isMuted: boolean;
  onPostCreated?: () => void;
}) {
  const { toast } = useToast();
  const [postText, setPostText] = useState('');
  const createPost = useCreatePost(teamSlug);
  const isFeedEmpty = feedItems.length === 0;
  
  const handleSubmitPost = async () => {
    if (!postText.trim() || !canPost) return;
    try {
      const result = await createPost.mutate({ text: postText });
      setPostText('');
      // Refetch feed to show new post immediately
      onPostCreated?.();
      toast({
        title: 'Posted!',
        description: 'Your update is now live.',
        variant: 'success',
      });
      console.log('[FeedScreen] Post created successfully:', result);
    } catch (err: any) {
      console.error('[FeedScreen] Failed to create post:', err);
      toast({
        title: 'Failed to post',
        description: err?.message || 'Something went wrong. Please try again.',
        variant: 'error',
      });
    }
  };
  
  return (
    <>
      {/* Muted banner */}
      {isMuted && <MutedBanner />}
      
      {/* Composer */}
      {canPost && !isMuted && (
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#1c1533] via-[#141228] to-[#090912] p-5 shadow-[0_20px_55px_rgba(60,27,119,0.45)] ring-1 ring-white/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: 'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.45), transparent 55%)' }}
          />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/50">
              <span>Start the conversation</span>
              <span className="text-white/40">Your update notifies the team</span>
            </div>
            <div className="flex gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/30 text-purple-200 ring-1 ring-purple-400/40 shadow-[0_0_35px_rgba(139,92,246,0.35)]">
                <Hash className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Share something with the team..."
                  className="min-h-[88px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-purple-400/60 focus:ring-0"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Media
                      </span>
                    </button>
                    <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Poll
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-white/45">Share a win, idea, or request.</p>
                    <Button 
                      size="sm" 
                      className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(167,139,250,0.35)] hover:from-purple-400 hover:to-pink-400"
                      onClick={handleSubmitPost}
                      disabled={!postText.trim() || createPost.isLoading}
                    >
                      {createPost.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className={`mt-4 flex flex-wrap items-center gap-2 ${isFeedEmpty ? 'text-white/40' : ''}`}>
        {(['hot', 'new', 'top'] as FeedSort[]).map((sort) => (
          <Chip
            key={sort}
            size="sm"
            variant="outline"
            selected={feedSort === sort}
            onClick={() => onSortChange(sort)}
            className={
              feedSort === sort
                ? 'border-purple-400 bg-purple-500/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.45)]'
                : isFeedEmpty
                ? 'border-white/10 text-white/35'
                : 'border-white/20 text-white/60'
            }
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
      {isFeedEmpty ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6 text-center shadow-inner shadow-purple-900/30">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-purple-500/15 text-purple-200">
            <ArrowUp className="h-5 w-5" />
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">Start the conversation</p>
          <p className="mt-2 text-base font-semibold text-white">Nothing has been posted yet</p>
          <p className="mt-1 text-sm text-white/60">
            Drop the first update using the composer above—everyone will feel the spark.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/45">
            <ArrowUp className="h-4 w-4" />
            <span>Tap the glowing box above to share something</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {feedItems.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function FeedCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const isThread = item.type === 'thread';
  const isPoll = item.type === 'poll';
  const isClip = item.type === 'clip';

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition hover:border-white/20 ${compact ? 'p-3' : 'p-4'}`}>
      {/* Author Row */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <Image
            src={item.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author.name)}&background=8B5CF6&color=fff`}
            alt={item.author.name}
            width={compact ? 36 : 44}
            height={compact ? 36 : 44}
            className="rounded-full"
          />
          {isThread && (
            <div className="flex flex-col items-center gap-0.5 text-white/30">
              <button className="hover:text-green-400"><ArrowUp className="h-4 w-4" /></button>
              <span className="text-[10px] font-bold text-white/60">{item.upvotes - item.downvotes}</span>
              <button className="hover:text-red-400 rotate-180"><ArrowUp className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{item.author.name}</span>
            <RoleBadge role={item.author.role} />
            <span className="text-xs text-white/40">{formatTime(item.createdAt)}</span>
            {item.type !== 'post' && (
              <Badge className="bg-white/10 text-white/70 text-[10px]">{item.type}</Badge>
            )}
          </div>

          {item.title && (
            <h4 className="mt-1 font-semibold text-white">{item.title}</h4>
          )}
          <p className={`mt-1 text-white/80 ${compact ? 'text-sm line-clamp-2' : 'text-sm'}`}>{item.body}</p>

          {/* Poll Options */}
          {isPoll && item.pollOptions && (
            <div className="mt-3 space-y-2">
              {item.pollOptions.map((opt, i) => {
                const total = item.pollOptions!.reduce((acc, o) => acc + o.votes, 0);
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                return (
                  <button key={i} className="relative w-full rounded-xl bg-white/10 p-3 text-left overflow-hidden hover:bg-white/15">
                    <div className="absolute inset-0 bg-purple-500/20" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center justify-between">
                      <span className="text-sm text-white">{opt.label}</span>
                      <span className="text-xs font-bold text-white/70">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Media */}
          {item.media && (isClip || item.type === 'post') && (
            <div className="mt-3 relative rounded-xl overflow-hidden">
              <Image src={item.media} alt="" width={600} height={300} className="w-full object-cover" />
              {isClip && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-4">
            <button className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <Heart className="h-4 w-4" /> {item.upvotes}
            </button>
            <button className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <MessageCircle className="h-4 w-4" /> {item.comments}
            </button>
            <button className="ml-auto text-white/30 hover:text-white">
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

type PendingMessage = {
  id: string;
  text: string;
  createdAt: number;
  serverId?: string | null;
};

function ChatScreen({ teamId, members, canChat }: { teamId: string | null; members: TeamMember[]; canChat: boolean }) {
  const { membership } = useTeamContext();
  const { messages, isLoading, refetch } = useTeamChat(teamId);
  const { mutate: sendMessage, isLoading: isSending } = useSendChatMessage(teamId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);

  const viewerProfileId = membership?.profileId ?? null;

  const viewerMember = useMemo(() => {
    if (viewerProfileId) {
      const match = members.find((m) => m.id === viewerProfileId);
      if (match) return match;
    }
    return null;
  }, [members, viewerProfileId]);

  const fallbackMember: TeamMember = useMemo(
    () =>
      viewerMember ?? {
        id: viewerProfileId ?? 'current-user',
        name: 'You',
        handle: '@you',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('You')}&background=8B5CF6&color=fff`,
        role: 'member',
        activity: 'online',
      },
    [viewerMember, viewerProfileId]
  );

  type DisplayChatMessage = ChatMessage & { _isPending?: boolean };

  const orderedMessages = useMemo<DisplayChatMessage[]>(() => {
    const baseMessages: DisplayChatMessage[] = messages.map((msg) => ({ ...msg, _isPending: undefined }));
    const optimistic: DisplayChatMessage[] = pendingMessages.map((pending) => ({
      id: pending.id,
      author: fallbackMember,
      text: pending.text,
      timestamp: pending.createdAt,
      reactions: [],
      isSystem: false,
      _isPending: true,
    }));

    return [...baseMessages, ...optimistic].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, pendingMessages, fallbackMember]);

  useEffect(() => {
    setPendingMessages([]);
  }, [teamId]);

  useEffect(() => {
    setPendingMessages((prev) =>
      prev.filter((pending) => {
        if (!pending.serverId) return true;
        return !messages.some((msg) => msg.id === pending.serverId);
      })
    );
  }, [messages]);

  const streamingMembers = members.filter((m) => m.isStreaming);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    setIsPinnedToBottom(distanceFromBottom < 120);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (isPinnedToBottom) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [orderedMessages, isPinnedToBottom]);

  const handleSend = async () => {
    if (!inputText.trim() || !canChat || isSending) return;

    const text = inputText.trim();
    const optimisticId = `pending-${Date.now()}`;
    setInputText('');
    setIsPinnedToBottom(true);
    setPendingMessages((prev) => [...prev, { id: optimisticId, text, createdAt: Date.now() }]);

    try {
      const result = await sendMessage({ content: text });
      const serverId = result?.message_id ? String(result.message_id) : null;
      if (serverId) {
        setPendingMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticId ? { ...msg, serverId } : msg))
        );
      } else {
        setPendingMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      }
      refetch();
    } catch (err) {
      setPendingMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setInputText(text);
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 bg-white/0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-full flex-col overflow-y-auto pr-2"
        >
          <div className="flex min-h-full flex-col justify-end gap-2 pb-4 pt-4">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : orderedMessages.length > 0 ? (
              orderedMessages.map((msg) => <ChatMessageRow key={msg.id} message={msg} />)
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-white/70">
                <MessageCircle className="h-6 w-6 text-white/60" />
                <div>
                  <p className="text-base font-semibold text-white">Say hi 👋</p>
                  <p className="text-sm text-white/60">Start the team chat and keep it rolling.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jump to Live */}
      {streamingMembers.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <Radio className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-sm text-white">
            <span className="font-semibold text-red-400">{streamingMembers[0]?.name}</span> is live
          </span>
          <Button size="sm" className="ml-auto bg-red-500 text-xs text-white hover:bg-red-600">
            Join
          </Button>
        </div>
      )}

      {/* Composer */}
      <div className="sticky bottom-0 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canChat ? 'Say hi 👋' : 'You cannot chat in this team'}
            disabled={!canChat || isSending}
            className="flex-1 border-0 bg-transparent text-white placeholder:text-white/40 focus:ring-0"
          />
          <Button
            size="sm"
            className="bg-purple-500 hover:bg-purple-600"
            disabled={!canChat || !inputText.trim() || isSending}
            onClick={handleSend}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatMessageRow({ message }: { message: ChatMessage & { _isPending?: boolean } }) {
  if (message.isSystem) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 py-2 px-3">
        <Radio className="h-4 w-4 text-purple-400" />
        <span className="text-sm text-purple-300">{message.text}</span>
      </div>
    );
  }

  const isPending = Boolean(message._isPending);

  return (
    <div className={`group flex items-start gap-3 rounded-xl p-2 ${isPending ? 'opacity-70' : 'hover:bg-white/5'}`}>
      <Image
        src={message.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.author.name)}&background=8B5CF6&color=fff`}
        alt={message.author.name}
        width={36}
        height={36}
        className="rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{message.author.name}</span>
          <RoleBadge role={message.author.role} />
          <span className="text-[10px] text-white/40">{formatTime(message.timestamp)}</span>
        </div>
        <p className="text-sm text-white/80 mt-0.5">{message.text}</p>
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex gap-1">
            {message.reactions.map((r, i) => (
              <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
        {isPending && <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">Sending…</p>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIVE SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function LiveScreen({
  liveRooms,
  isLoading,
  teamLiveState,
  onLaunchTeamRoom,
}: {
  liveRooms: LiveRoom[];
  isLoading: boolean;
  teamLiveState: TeamLiveViewState;
  onLaunchTeamRoom: () => void;
}) {
  const buttonLabel = teamLiveState.isUnlocked ? 'Go Live' : 'Unlock at 100 members';
  const buttonDisabled = !teamLiveState.isUnlocked || teamLiveState.isLoading;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((teamLiveState.approvedMemberCount / teamLiveState.unlockThreshold) * 100))
  );

  const lockedCopy = `Team Live unlocks at ${teamLiveState.unlockThreshold} members (${Math.min(
    teamLiveState.approvedMemberCount,
    teamLiveState.unlockThreshold
  )}/${teamLiveState.unlockThreshold}).`;

  return (
    <>
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500">
          <Video className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-white mb-1">Start a Live Room</h3>
        <p className="text-sm text-white/50 mb-4">
          {teamLiveState.isUnlocked
            ? 'Launch the dedicated Team Live room with chat, viewers, and leaderboards.'
            : 'Grow your team to unlock the Team Live room.'}
        </p>
        <Button
          onClick={() => {
            if (!buttonDisabled) onLaunchTeamRoom();
          }}
          disabled={buttonDisabled}
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {teamLiveState.isLoading ? 'Checking...' : buttonLabel}
        </Button>
        <p className="mt-2 text-xs text-white/60">
          {teamLiveState.isUnlocked ? 'Sends an alert to everyone here.' : lockedCopy}
        </p>
      </div>

      {!teamLiveState.isUnlocked ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Team Live Locked</p>
              <p className="text-xs text-white/60">Invite more members to unlock the Team Live experience.</p>
            </div>
            <Badge className="bg-white/10 text-white/70 text-[10px] uppercase">Locked</Badge>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-white/60">
            {teamLiveState.approvedMemberCount}/{teamLiveState.unlockThreshold} members
          </div>
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : liveRooms.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">Live Now</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {liveRooms.map((room) => (
                  <LiveTile key={room.id} room={room} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Video className="h-6 w-6 text-white/50" />}
              title="No one is live"
              description="Be the first to start a stream!"
            />
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">Upcoming</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white">No upcoming events</p>
                  <p className="text-xs text-white/50">Schedule an event for the team</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function LiveTile({ room }: { room: LiveRoom }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10">
      <div className="h-40" style={{ background: room.thumbnail }} />
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
              src={room.host.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.host.name)}&background=8B5CF6&color=fff`}
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

function MembersScreen({ members, isLoading }: { members: TeamMember[]; isLoading: boolean }) {
  const [filter, setFilter] = useState<'all' | 'live' | 'online'>('all');
  const [search, setSearch] = useState('');

  const filtered = members.filter((m) => {
    if (filter === 'live' && m.activity !== 'live' && !m.isStreaming) return false;
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
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : members.length > 0 ? (
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
      ) : (
        <EmptyState
          icon={<Users className="h-6 w-6 text-white/50" />}
          title="No members found"
          description="Try adjusting your search or filters."
        />
      )}
    </>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20">
      <div className="relative">
        <Image
          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=8B5CF6&color=fff`}
          alt={member.name}
          width={44}
          height={44}
          className="rounded-full"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0a0a0f] ${
            member.activity === 'live' || member.isStreaming ? 'bg-red-500' : member.activity === 'online' ? 'bg-green-500' : 'bg-white/30'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{member.name}</span>
          <RoleBadge role={member.role} />
        </div>
        <p className="text-xs text-white/50">{member.handle}</p>
      </div>
      <div className="flex items-center gap-2">
        {member.isStreaming && (
          <Badge className="bg-red-500/20 text-red-400 text-[10px]">LIVE</Badge>
        )}
        <button className="rounded-lg p-2 text-white/30 hover:bg-white/10 hover:text-white">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
 
 /* ════════════════════════════════════════════════════════════════════════════
   SETTINGS SCREEN
   ════════════════════════════════════════════════════════════════════════════ */

function SettingsScreen({
  role,
  team,
  teamLiveConfig,
  canToggleLiveVisibility,
  onLiveVisibilityChange,
  isLiveVisibilityUpdating,
}: {
  role: RoleState;
  team: { name: string; slug: string; description?: string; themeColor?: string; iconUrl?: string; bannerUrl?: string };
  teamLiveConfig: TeamLiveRoomState | null;
  canToggleLiveVisibility: boolean;
  onLiveVisibilityChange: (visibility: TeamLiveVisibility) => Promise<void>;
  isLiveVisibilityUpdating: boolean;
}) {
  const { toast } = useToast();
  const isLeader = role === 'leader';
  const shareLink = `https://www.mylivelinks.com/teams/${team.slug}`;
  const [copied, setCopied] = useState(false);

  const { mutate: leaveTeam, isLoading: isLeaving } = useLeaveTeamBySlug(team.slug);
  const { prefs, updatePref, isSaving: isSavingPrefs } = useTeamNotificationPrefsBySlug(team.slug);
  const safePrefs =
    prefs ?? ({ all_activity: true, live_alerts: true, mentions_only: false, feed_posts: true, chat_messages: true } as const);
  const liveVisibilityOptions: Array<{ value: TeamLiveVisibility; title: string; description: string }> = [
    {
      value: 'private',
      title: 'Private',
      description: 'Only team members can access Team Live.',
    },
    {
      value: 'public',
      title: 'Public',
      description: 'Anyone can watch, but the stream still runs inside your team.',
    },
  ];

  const handleVisibilityToggle = async (nextVisibility: TeamLiveVisibility) => {
    if (!teamLiveConfig || teamLiveConfig.visibility === nextVisibility) return;
    try {
      await onLiveVisibilityChange(nextVisibility);
      toast({
        title: 'Visibility updated',
        description: nextVisibility === 'public' ? 'Team Live is now public.' : 'Team Live is now private.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to update visibility',
        description: err?.message || 'Unknown error',
        variant: 'error',
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied', description: 'Team link copied to clipboard.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Copy failed', description: err?.message || 'Unable to copy link.', variant: 'error' });
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await leaveTeam();
      window.location.href = '/teams';
    } catch (err: any) {
      toast({ title: 'Failed to leave team', description: err?.message || 'Unknown error', variant: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Team Profile</p>
            <p className="text-xs text-white/50">Update your team details (some settings may still be rolling out).</p>
          </div>
          {isLeader && (
            <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">Leader</Badge>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Team Name</span>
            <span className="text-sm text-white">{team.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Team URL</span>
            <span className="text-xs text-white/60 font-mono truncate max-w-[60%]">{shareLink}</span>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCopyLink} className="bg-purple-500 hover:bg-purple-600 text-white">
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Team Live Visibility</p>
            <p className="text-xs text-white/50">Control who can view your Team Live room.</p>
          </div>
          <Badge className={teamLiveConfig?.isUnlocked ? 'bg-emerald-500/20 text-emerald-300 text-[10px]' : 'bg-white/10 text-white/60 text-[10px]'}>
            {teamLiveConfig?.isUnlocked ? 'Unlocked' : 'Locked'}
          </Badge>
        </div>
        {!teamLiveConfig?.isUnlocked ? (
          <p className="mt-3 text-xs text-white/50">
            Team Live unlocks at {teamLiveConfig?.unlockThreshold ?? 100} members. You're at{' '}
            {teamLiveConfig?.approvedMemberCount ?? team.approvedMemberCount}.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {liveVisibilityOptions.map((option) => {
              const selected = teamLiveConfig.visibility === option.value;
              const disabled = (!canToggleLiveVisibility || isLiveVisibilityUpdating) && !selected;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleVisibilityToggle(option.value)}
                  disabled={selected || disabled}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-purple-400 bg-purple-500/20 text-white shadow-[0_10px_25px_rgba(99,102,241,0.25)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <p className="text-sm font-semibold text-white">{option.title}</p>
                  <p className="text-xs text-white/60">{option.description}</p>
                </button>
              );
            })}
          </div>
        )}
        {!canToggleLiveVisibility && teamLiveConfig?.isUnlocked && (
          <p className="mt-3 text-xs text-white/40">Only Team Admins can change visibility.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white">Notifications</p>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">All Activity</span>
            <button
              type="button"
              onClick={() => updatePref('all_activity', !safePrefs.all_activity)}
              disabled={isSavingPrefs || !prefs}
              className={`h-6 w-11 rounded-full border transition ${
                safePrefs.all_activity ? 'bg-purple-500/60 border-purple-400/50' : 'bg-white/10 border-white/20'
              }`}
              aria-label="Toggle all activity"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Live Alerts</span>
            <button
              type="button"
              onClick={() => updatePref('live_alerts', !safePrefs.live_alerts)}
              disabled={isSavingPrefs || !prefs}
              className={`h-6 w-11 rounded-full border transition ${
                safePrefs.live_alerts ? 'bg-purple-500/60 border-purple-400/50' : 'bg-white/10 border-white/20'
              }`}
              aria-label="Toggle live alerts"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Mentions Only</span>
            <button
              type="button"
              onClick={() => updatePref('mentions_only', !safePrefs.mentions_only)}
              disabled={isSavingPrefs || !prefs}
              className={`h-6 w-11 rounded-full border transition ${
                safePrefs.mentions_only ? 'bg-purple-500/60 border-purple-400/50' : 'bg-white/10 border-white/20'
              }`}
              aria-label="Toggle mentions only"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white">Leave Team</p>
        <p className="mt-1 text-xs text-white/50">You can re-join later if invited again.</p>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLeaveTeam}
            disabled={isLeaving}
            className="border-white/20 text-white/80 hover:bg-white/10"
          >
            {isLeaving ? 'Leaving...' : 'Leave'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   INVITE MEMBERS MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function InviteMembersModal({
  teamName,
  teamSlug,
  onClose,
}: {
  teamName: string;
  teamSlug: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const shareLink = `https://www.mylivelinks.com/teams/${teamSlug}`;

  // Load users on mount and search change
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const { searchUsersToInviteBySlug } = await import('@/lib/teamInvites');
        const results = await searchUsersToInviteBySlug(teamSlug, searchQuery);
        setUsers(results);
      } catch (err: any) {
        console.error('[teams] Failed to load invite candidates:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(loadUsers, 300);
    return () => clearTimeout(debounce);
  }, [teamSlug, searchQuery]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      const { sendTeamInviteBySlug } = await import('@/lib/teamInvites');
      const result = await sendTeamInviteBySlug(teamSlug, userId);
      const alreadySent = typeof result.error === 'string' && result.error.toLowerCase().includes('invite already sent');
      if (result.success || alreadySent) {
        setInvitedIds((prev) => new Set([...prev, userId]));
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast({
          title: 'Invite sent',
          description: 'They’ll see it in Noties.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Invite failed',
          description: result.error || 'Unknown error',
          variant: 'error',
        });
      }
    } catch (err: any) {
      console.error('[teams] Invite error:', err);
      toast({
        title: 'Invite failed',
        description: err?.message || 'Unknown error',
        variant: 'error',
      });
    } finally {
      setInviting(null);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${teamName}`,
          text: `You're invited to join ${teamName} on MyLiveLinks!`,
          url: shareLink,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#1a1a24] shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-bold text-white">Invite to {teamName}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        {/* Share Link Section */}
        <div className="border-b border-white/10 p-4">
          <p className="text-sm text-white/60 mb-2">Share team link</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 truncate">
              {shareLink}
            </div>
            <Button
              size="sm"
              onClick={handleCopyLink}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search followers to invite..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-white/50">
                {searchQuery ? 'No matching users found' : 'No followers to invite yet'}
              </p>
              <p className="text-xs text-white/30 mt-1">
                Share the team link to invite others
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((user) => {
                const isInvited = invitedIds.has(user.id);
                const isInviting = inviting === user.id;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5"
                  >
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-purple-500/30 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-purple-300">
                          {(user.display_name || user.username)[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-xs text-white/50">@{user.username}</p>
                    </div>

                    {/* Invite Button */}
                    {isInvited ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <PlusCircle className="h-3 w-3" /> Invited
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                        disabled={isInviting}
                        className="bg-teal-500 hover:bg-teal-600 text-white text-xs"
                      >
                        {isInviting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
