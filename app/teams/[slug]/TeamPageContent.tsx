'use client';

import { CSSProperties, ReactNode, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
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
  Pin,
  PlusCircle,
  Radio,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Video,
  Zap,
  AlertTriangle,
  Loader2,
  X,
  Plus,
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
import { deleteTeamAsset, uploadTeamAsset } from '@/lib/teamAssets';
import type { PendingTeamInvite } from '@/lib/teamInvites';
import {
  useTeam,
  useTeamMembership,
  useTeamFeed,
  useTeamMembers,
  useTeamPresence,
  useTeamLiveRooms,
  useTeamChat,
  useCreatePost,
  useDeletePost,
  usePinPost,
  useReactToPost,
  useLeaveTeamBySlug,
  useSendChatMessage,
  useTeamNotificationPrefsBySlug,
  useJoinTeam,
  usePostComments,
  useCreateComment,
  useGiftPost,
  useGiftComment,
  useCreatePoll,
  usePollOptions,
  useVotePoll,
  FeedSort,
  TeamMember,
  FeedItem,
  PostComment,
  ChatMessage,
  LiveRoom,
  NotificationPrefs,
  PollOption,
} from '@/hooks/useTeam';
import GiftPickerMini from '@/components/messages/GiftPickerMini';

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
type LiveMemberEntry = {
  profileId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  streamingMode: 'solo' | 'group' | string;
  streamId: number;
  destination: string;
  teamSlug?: string | null;
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
    pendingInvite,
    pendingInviteLoading,
    acceptPendingInvite,
    declinePendingInvite,
    dismissPendingInvite,
  } = useTeamContext();
  const router = useRouter();
  const supabaseClient = useMemo(() => createClient(), []);
  const [liveMemberEntries, setLiveMemberEntries] = useState<LiveMemberEntry[]>([]);
  const [liveMembersLoading, setLiveMembersLoading] = useState(false);
  
  const [feedSort, setFeedSort] = useState<FeedSort>('hot');
  const [topRange, setTopRange] = useState<TopRange>('24h');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Fetch data using shared hooks (cached, no duplicate requests)
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed, loadMore, hasMore, isLoadingMore } = useTeamFeed(teamId, feedSort);
  const { data: membersRaw, isLoading: membersLoading } = useTeamMembers(teamId, 'all');
  const { data: presenceData } = useTeamPresence(teamId);
  const { data: liveRoomsRaw, isLoading: liveLoading } = useTeamLiveRooms(teamId);
  
  // Ensure arrays are never null/undefined and always iterable
  // useTeamFeed returns { pinnedItems, feedItems } - extract properly
  const feedItems = feedData?.feedItems ?? [];
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const liveRooms = Array.isArray(liveRoomsRaw) ? liveRoomsRaw : [];
  const memberProfileIds = useMemo(
    () => members.map((member) => member.id).filter(Boolean),
    [members]
  );
  
  useEffect(() => {
    let cancelled = false;
    if (!teamId || memberProfileIds.length === 0) {
      setLiveMemberEntries([]);
      setLiveMembersLoading(false);
      return;
    }
    
    const loadLiveMembers = async () => {
      setLiveMembersLoading(true);
      try {
        const { data: streamRows, error: streamError } = await supabaseClient
          .from('live_streams')
          .select(`
            id,
            profile_id,
            streaming_mode,
            live_available,
            profiles:profiles!live_streams_profile_id_fkey(username, display_name, avatar_url)
          `)
          .eq('live_available', true)
          .in('profile_id', memberProfileIds)
          .order('started_at', { ascending: false })
          .limit(60);
        
        if (streamError) throw streamError;
        
        const normalizedStreams = (streamRows ?? [])
          .map((row: any) => {
            const streamId =
              typeof row?.id === 'number' ? row.id : Number.parseInt(String(row?.id ?? '0'), 10);
            if (!Number.isFinite(streamId)) return null;
            const streamingMode = (row?.streaming_mode as string | null) ?? 'solo';
            const profileId = String(row?.profile_id ?? '');
            if (!profileId) return null;
            const username =
              (row?.profiles?.username as string | undefined) ||
              (row?.profiles?.display_name as string | undefined) ||
              profileId.slice(0, 8);
            const displayName = (row?.profiles?.display_name as string | undefined) ?? null;
            const avatarUrl = (row?.profiles?.avatar_url as string | undefined) ?? null;
            return { streamId, streamingMode, profileId, username, displayName, avatarUrl };
          })
          .filter((row): row is {
            streamId: number;
            streamingMode: string;
            profileId: string;
            username: string;
            displayName: string | null;
            avatarUrl: string | null;
          } => !!row);
        
        const groupStreamIds = normalizedStreams
          .filter((row) => row.streamingMode === 'group')
          .map((row) => row.streamId);
        
        const teamSlugByStreamId = new Map<number, string | null>();
        if (groupStreamIds.length > 0) {
          const { data: roomRows, error: roomError } = await supabaseClient
            .from('team_live_rooms')
            .select('live_stream_id, team_id')
            .in('live_stream_id', groupStreamIds);
          
          if (!roomError && Array.isArray(roomRows) && roomRows.length > 0) {
            const teamIds = Array.from(
              new Set(
                roomRows
                  .map((row: any) => row?.team_id)
                  .filter((id: any): id is string => typeof id === 'string')
              )
            );
            
            const teamSlugMap = new Map<string, string>();
            if (teamIds.length > 0) {
              const { data: teamRows, error: teamError } = await supabaseClient
                .from('teams')
                .select('id, slug')
                .in('id', teamIds);
              
              if (!teamError && Array.isArray(teamRows)) {
                teamRows.forEach((teamRow: any) => {
                  if (teamRow?.id && teamRow?.slug) {
                    teamSlugMap.set(String(teamRow.id), String(teamRow.slug));
                  }
                });
              }
            }
            
            roomRows.forEach((room: any) => {
              const streamId =
                typeof room?.live_stream_id === 'number'
                  ? room.live_stream_id
                  : Number.parseInt(String(room?.live_stream_id ?? '0'), 10);
              if (!Number.isFinite(streamId)) return;
              const slug =
                room?.team_id && teamSlugMap.has(String(room.team_id))
                  ? teamSlugMap.get(String(room.team_id))!
                  : null;
              teamSlugByStreamId.set(streamId, slug);
            });
          }
        }
        
        const deduped = new Map<string, LiveMemberEntry>();
        normalizedStreams.forEach((row) => {
          if (deduped.has(row.profileId)) return;
          const streamId = row.streamId;
          const teamSlug = teamSlugByStreamId.get(streamId) ?? null;
          const destination =
            row.streamingMode === 'group'
              ? teamSlug
                ? `/teams/room/${teamSlug}`
                : '/room/live-central'
              : `/live/${encodeURIComponent(row.username)}`;
          
          deduped.set(row.profileId, {
            profileId: row.profileId,
            username: row.username,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
            streamingMode: row.streamingMode,
            streamId,
            destination,
            teamSlug: teamSlug ?? undefined,
          });
        });
        
        if (!cancelled) {
          setLiveMemberEntries(Array.from(deduped.values()).slice(0, 15));
        }
      } catch (err) {
        console.error('[TeamHome] Failed to load live members', err);
        if (!cancelled) {
          setLiveMemberEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLiveMembersLoading(false);
        }
      }
    };
    
    void loadLiveMembers();
    
    return () => {
      cancelled = true;
    };
  }, [memberProfileIds, supabaseClient, teamId, presenceData?.liveCount]);
  
  // Derive counts
  const onlineMembers = members.filter((m) => m.activity === 'online');
  const onlineCount = presenceData?.onlineCount ?? onlineMembers.length;
  const liveCount = presenceData?.liveCount ?? liveRooms.length;
  const canViewLiveMemberPresence =
    (membership?.status === 'approved') ||
    ((teamLiveRoomConfig?.visibility ?? 'private') === 'public');
  
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
  const handleLiveMemberNavigate = useCallback(
    (destination: string) => {
      if (!destination) return;
      router.push(destination);
    },
    [router]
  );
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

  // ─────────────────────────────────────────────────────────────────────────
  // Non-member state (guest without pending invite) - Show "Request to Join"
  // ─────────────────────────────────────────────────────────────────────────
  const isGuest = uiRole === 'guest';
  const hasPendingRequest = membership?.status === 'requested' || membership?.status === 'pending';
  const showRequestToJoin = isGuest && !pendingInvite && !pendingInviteLoading && !hasPendingRequest;
  const showPendingRequestState = isGuest && hasPendingRequest && !pendingInvite;

  if (showRequestToJoin) {
    return (
      <RequestToJoinState
        team={team}
        teamSlug={teamSlug ?? ''}
      />
    );
  }

  if (showPendingRequestState) {
    return (
      <PendingRequestState
        team={team}
      />
    );
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

      {/* pb-40 accounts for: 68px bottom nav + ~56px DockedChatBar + safe area */}
      <div className="mx-auto max-w-5xl px-4 pb-40 md:pb-6">
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
            liveMemberEntries={liveMemberEntries}
            liveMembersLoading={liveMembersLoading}
            canViewLiveMembers={canViewLiveMemberPresence}
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
            onLiveMemberNavigate={handleLiveMemberNavigate}
            viewerProfileId={membership?.profileId ?? null}
            canModerate={permissions.canModerate}
            onPostCreated={refetchFeed}
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
              viewerProfileId={membership?.profileId ?? null}
              canModerate={permissions.canModerate}
              onPostCreated={refetchFeed}
              loadMore={loadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
          )}
          {currentSurface === 'chat' && (
            <ChatScreen teamId={teamId} members={members} canChat={permissions.canPost && !permissions.isMuted} />
          )}
          {currentSurface === 'live' && (
            <LiveScreen
              liveRooms={liveRooms}
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

      {/* ══════════════════════════════════════════════════════════════════════
          PENDING INVITE ACCEPTANCE MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {pendingInvite && (
        <PendingInviteModal
          invite={pendingInvite}
          onAccept={acceptPendingInvite}
          onDecline={declinePendingInvite}
          onDismiss={dismissPendingInvite}
        />
      )}
    </div>
  );
}

function DockedChatBar({ onOpenChat, priority = 'default' }: { onOpenChat: () => void; priority?: 'default' | 'subtle' }) {
  const isSubtle = priority === 'subtle';

  return (
    <div
      className={`fixed inset-x-0 z-40 border-t ${
        isSubtle ? 'border-white/5 bg-black/70 backdrop-blur' : 'border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl'
      }`}
      style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
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

function RequestToJoinState({ 
  team, 
  teamSlug 
}: { 
  team: { name: string; teamTag: string; iconUrl?: string; bannerUrl?: string; description?: string; approvedMemberCount: number };
  teamSlug: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { mutate: requestJoin, isLoading: isRequesting } = useJoinTeam();

  const handleRequestJoin = async () => {
    try {
      await requestJoin({ teamSlug });
      toast({
        title: 'Request sent!',
        description: 'The team admins will review your request.',
        variant: 'success',
      });
      // Refresh the page to show the pending state
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Could not send request',
        description: err?.message || 'Please try again.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        {team.bannerUrl ? (
          <>
            <Image
              src={team.bannerUrl}
              alt={`${team.name} banner`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-purple-600/40 via-pink-600/30 to-blue-600/40" />
        )}
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-16 relative">
        {/* Team Icon */}
        <div className="flex justify-center mb-4">
          {team.iconUrl ? (
            <Image
              src={team.iconUrl}
              alt={team.name}
              width={96}
              height={96}
              className="rounded-2xl ring-4 ring-[#0a0a0f] shadow-xl"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-purple-500 ring-4 ring-[#0a0a0f] shadow-xl">
              <span className="text-3xl font-bold text-white">{team.teamTag.slice(0, 2)}</span>
            </div>
          )}
        </div>

        {/* Team Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{team.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge className="bg-purple-500/20 text-purple-300 text-xs">{team.teamTag}</Badge>
            <span className="text-sm text-white/50">{team.approvedMemberCount} members</span>
          </div>
          {team.description && (
            <p className="text-sm text-white/60 max-w-md mx-auto">{team.description}</p>
          )}
        </div>

        {/* Request to Join Card */}
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-[#1a1a24] to-[#0f0f18] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Join this team</h2>
              <p className="text-sm text-white/60">Send a request to become a member</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-6">
            Once approved, you'll have access to the team's feed, chat, live sessions, and more.
          </p>

          <Button
            onClick={handleRequestJoin}
            disabled={isRequesting}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:from-purple-400 hover:to-pink-400"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending request...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Request to Join
              </>
            )}
          </Button>

          <p className="text-center text-xs text-white/40 mt-4">
            Team admins will review your request and you'll be notified when approved.
          </p>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/teams')}
            className="border-white/20 text-white/70 hover:bg-white/10"
          >
            Back to Teams
          </Button>
        </div>
      </div>
    </div>
  );
}

function PendingRequestState({ 
  team 
}: { 
  team: { name: string; teamTag: string; iconUrl?: string; bannerUrl?: string; description?: string; approvedMemberCount: number };
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        {team.bannerUrl ? (
          <>
            <Image
              src={team.bannerUrl}
              alt={`${team.name} banner`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-purple-600/40 via-pink-600/30 to-blue-600/40" />
        )}
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-16 relative">
        {/* Team Icon */}
        <div className="flex justify-center mb-4">
          {team.iconUrl ? (
            <Image
              src={team.iconUrl}
              alt={team.name}
              width={96}
              height={96}
              className="rounded-2xl ring-4 ring-[#0a0a0f] shadow-xl"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-purple-500 ring-4 ring-[#0a0a0f] shadow-xl">
              <span className="text-3xl font-bold text-white">{team.teamTag.slice(0, 2)}</span>
            </div>
          )}
        </div>

        {/* Team Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{team.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge className="bg-purple-500/20 text-purple-300 text-xs">{team.teamTag}</Badge>
            <span className="text-sm text-white/50">{team.approvedMemberCount} members</span>
          </div>
          {team.description && (
            <p className="text-sm text-white/60 max-w-md mx-auto">{team.description}</p>
          )}
        </div>

        {/* Pending Request Card */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#1a1a24] to-[#0f0f18] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Request pending</h2>
              <p className="text-sm text-white/60">Waiting for admin approval</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-4">
            Your request to join <span className="text-white font-medium">{team.name}</span> is being reviewed. 
            You'll be notified when an admin approves your request.
          </p>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
            </div>
            <span className="text-sm text-white/70">Awaiting approval...</span>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/teams')}
            className="border-white/20 text-white/70 hover:bg-white/10"
          >
            Back to Teams
          </Button>
        </div>
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
  liveMemberEntries,
  liveMembersLoading,
  canViewLiveMembers,
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
  onLiveMemberNavigate,
  viewerProfileId,
  canModerate,
  onPostCreated,
}: {
  liveMemberEntries: LiveMemberEntry[];
  liveMembersLoading: boolean;
  canViewLiveMembers: boolean;
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
  onLiveMemberNavigate: (destination: string) => void;
  viewerProfileId: string | null;
  canModerate: boolean;
  onPostCreated: () => void;
}) {
  const { deletePost } = useDeletePost();
  const { pinPost } = usePinPost();
  const { reactToPost } = useReactToPost();
  const { toast } = useToast();

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await deletePost(postId);
      toast({ title: 'Post deleted' });
      onPostCreated();
    } catch (err) {
      console.error('[HomeScreen] delete failed', err);
      toast({ title: 'Failed to delete post', variant: 'error' });
    }
  }, [deletePost, toast, onPostCreated]);

  const handlePinPost = useCallback(async (postId: string, pin: boolean) => {
    try {
      await pinPost(postId, pin);
      toast({ title: pin ? 'Post pinned' : 'Post unpinned' });
      onPostCreated();
    } catch (err) {
      console.error('[HomeScreen] pin failed', err);
      toast({ title: 'Failed to update pin', variant: 'error' });
    }
  }, [pinPost, toast, onPostCreated]);
  
  const handleReactToPost = useCallback(async (postId: string) => {
    return await reactToPost(postId);
  }, [reactToPost]);

  const liveMemberCount = liveMemberEntries.length;
  const hasLive = liveMemberCount > 0 || liveCount > 0;
  const liveChipValue = liveMemberCount > 0 ? liveMemberCount : liveCount;
  const liveChipText = hasLive ? `${liveChipValue} live now` : 'Stage is open';
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
                {liveChipText}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                {onlineCount} online
              </span>
            </div>
            {canViewLiveMembers && (
              <LiveMembersRail
                entries={liveMemberEntries}
                loading={liveMembersLoading}
                onNavigate={onLiveMemberNavigate}
              />
            )}
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
            <FeedCard 
              key={item.id} 
              item={item} 
              compact
              viewerProfileId={viewerProfileId}
              canModerate={canModerate}
              onDelete={handleDeletePost}
              onPin={handlePinPost}
              onReact={handleReactToPost}
              onRefresh={onPostCreated}
            />
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
  viewerProfileId,
  canModerate,
  onPostCreated,
  loadMore,
  hasMore,
  isLoadingMore,
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
  viewerProfileId: string | null;
  canModerate: boolean;
  onPostCreated?: () => void;
  loadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  const { toast } = useToast();
  const { reactToPost } = useReactToPost();
  const handleReactToPost = useCallback(async (postId: string) => {
    return await reactToPost(postId);
  }, [reactToPost]);
  const [postText, setPostText] = useState('');
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const createPost = useCreatePost(teamSlug);
  const { createPoll, isLoading: isCreatingPoll } = useCreatePoll(teamSlug);
  const deletePost = useDeletePost();
  const pinPost = usePinPost();
  const isFeedEmpty = feedItems.length === 0;
  
  const handleAddPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };
  
  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };
  
  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  
  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) {
      toast({ title: 'Poll needs a question and at least 2 options', variant: 'error' });
      return;
    }
    try {
      await createPoll(pollQuestion.trim(), validOptions);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreator(false);
      onPostCreated?.();
      toast({ title: 'Poll created!' });
    } catch (err: any) {
      toast({ title: 'Failed to create poll', description: err?.message, variant: 'error' });
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deletePost.mutate({ postId });
      onPostCreated?.(); // Refetch
      toast({ title: 'Post deleted', variant: 'success' });
    } catch (err: any) {
      console.error('[FeedScreen] Failed to delete post:', err);
      toast({ title: 'Failed to delete', description: err?.message, variant: 'error' });
    }
  };
  
  const handlePinPost = async (postId: string, pin: boolean) => {
    try {
      await pinPost.mutate({ postId, pin });
      onPostCreated?.(); // Refetch
      toast({ title: pin ? 'Post pinned' : 'Post unpinned', variant: 'success' });
    } catch (err: any) {
      console.error('[FeedScreen] Failed to pin/unpin post:', err);
      toast({ title: 'Failed to update', description: err?.message, variant: 'error' });
    }
  };
  
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
                    <button 
                      onClick={() => setShowPollCreator(true)}
                      className={`rounded-xl border px-3 py-2 text-xs transition hover:border-white/30 hover:text-white ${showPollCreator ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 text-white/60'}`}
                    >
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
      
      {/* Poll Creator Modal */}
      {showPollCreator && (
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1c1533] via-[#141228] to-[#090912] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Create Poll</h3>
            <button onClick={() => setShowPollCreator(false)} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Question</label>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask the team something..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-500/50 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Options</label>
              <div className="space-y-2">
                {pollOptions.map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-purple-500/50 focus:outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => handleRemovePollOption(idx)}
                        className="rounded-lg p-2 text-white/40 hover:text-red-400 hover:bg-white/5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 10 && (
                <button
                  onClick={handleAddPollOption}
                  className="mt-2 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300"
                >
                  <Plus className="h-3 w-3" /> Add option
                </button>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPollCreator(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                }}
                className="border-white/20 text-white/60"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePoll}
                disabled={isCreatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                {isCreatingPoll ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Poll'}
              </Button>
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
            <FeedCard 
              key={item.id} 
              item={item}
              viewerProfileId={viewerProfileId}
              canModerate={canModerate}
              onDelete={handleDeletePost}
              onPin={handlePinPost}
              onReact={handleReactToPost}
              onRefresh={onPostCreated}
            />
          ))}
          
          {/* Load More / End of Posts */}
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading…' : 'Load more posts'}
            </button>
          ) : feedItems.length > 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/5 py-4 text-sm text-white/50">
              <span>🎉</span>
              <span>You've reached the end — no more posts</span>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function FeedCard({ 
  item, 
  compact = false,
  viewerProfileId,
  canModerate,
  onDelete,
  onPin,
  onReact,
  onGift,
  onRefresh,
}: { 
  item: FeedItem; 
  compact?: boolean;
  viewerProfileId?: string | null;
  canModerate?: boolean;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string, pin: boolean) => void;
  onReact?: (postId: string) => Promise<{ reaction_count: number; is_reacted: boolean } | null>;
  onGift?: (postId: string, authorId: string) => void;
  onRefresh?: () => void;
}) {
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [commentText, setCommentText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const giftPickerRef = useRef<HTMLDivElement>(null);
  
  // Local optimistic state for reactions
  const [localIsReacted, setLocalIsReacted] = useState(item.isReacted ?? false);
  const [localReactionCount, setLocalReactionCount] = useState(item.upvotes);
  
  // Comments
  const { comments, isLoading: commentsLoading, refetch: refetchComments } = usePostComments(showComments ? item.id : null);
  const { createComment, isLoading: isCreatingComment } = useCreateComment();
  const { giftPost, isLoading: isGiftingPost } = useGiftPost();
  
  // Poll voting
  const isPoll = item.type === 'poll' || !!item.isPoll;
  const { options: pollOptions, refetch: refetchPoll } = usePollOptions(isPoll ? item.id : null);
  const { vote: votePoll, isLoading: isVoting } = useVotePoll();
  const [localPollOptions, setLocalPollOptions] = useState<PollOption[]>([]);
  
  // Sync poll options when loaded
  useEffect(() => {
    if (pollOptions.length > 0) {
      setLocalPollOptions(pollOptions);
    }
  }, [pollOptions]);
  
  const handleVote = async (optionId: string) => {
    if (isVoting) return;
    try {
      const updated = await votePoll(item.id, optionId);
      setLocalPollOptions(updated);
    } catch (err: any) {
      toast({ title: 'Failed to vote', description: err?.message, variant: 'error' });
    }
  };
  
  const isThread = item.type === 'thread';
  const isClip = item.type === 'clip';
  
  // User can delete if they are the author OR a moderator
  const isOwner = !!(viewerProfileId && item.authorId === viewerProfileId);
  const canDelete = isOwner || !!canModerate;
  const canPin = !!canModerate;
  const hasActions = canDelete || canPin;
  const canGift = !isOwner && !!viewerProfileId; // Can't gift yourself
  
  // Sync local state when item changes
  useEffect(() => {
    setLocalIsReacted(item.isReacted ?? false);
    setLocalReactionCount(item.upvotes);
  }, [item.isReacted, item.upvotes]);
  
  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  
  const handleReact = async () => {
    if (!onReact) return;
    
    // Optimistic update
    const wasReacted = localIsReacted;
    setLocalIsReacted(!wasReacted);
    setLocalReactionCount((c) => wasReacted ? c - 1 : c + 1);
    
    try {
      const result = await onReact(item.id);
      if (result) {
        setLocalIsReacted(result.is_reacted);
        setLocalReactionCount(result.reaction_count);
      }
    } catch {
      // Revert on error
      setLocalIsReacted(wasReacted);
      setLocalReactionCount((c) => wasReacted ? c + 1 : c - 1);
    }
  };
  
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await createComment(item.id, commentText.trim());
      setCommentText('');
      refetchComments();
      onRefresh?.(); // Refresh to update comment count
      toast({ title: 'Comment added' });
    } catch (err: any) {
      toast({ title: 'Failed to add comment', description: err?.message, variant: 'error' });
    }
  };
  
  const handleGiftSelect = async (gift: { id: number; coin_cost: number; name: string }) => {
    setShowGiftPicker(false);
    try {
      await giftPost(item.id, gift.id, gift.coin_cost);
      toast({ title: `Sent ${gift.name} to ${item.author.name}!` });
      onRefresh?.();
    } catch (err: any) {
      toast({ title: 'Failed to send gift', description: err?.message, variant: 'error' });
    }
  };

  return (
    <div className={`relative rounded-2xl border border-white/10 bg-white/5 transition hover:border-white/20 ${compact ? 'p-3' : 'p-4'}`}>
      {/* Pinned badge */}
      {item.isPinned && (
        <div className="mb-2 flex items-center gap-1 text-xs text-amber-400">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
      )}
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
            {item.type !== 'post' && item.type !== 'announcement' && (
              <Badge className="bg-white/10 text-white/70 text-[10px]">{item.type}</Badge>
            )}
          </div>

          {item.title && (
            <h4 className="mt-1 font-semibold text-white">{item.title}</h4>
          )}
          <p className={`mt-1 text-white/80 ${compact ? 'text-sm line-clamp-2' : 'text-sm'}`}>{item.body}</p>

          {/* Poll Options */}
          {isPoll && localPollOptions.length > 0 && (
            <div className="mt-3 space-y-2">
              {localPollOptions.map((opt) => {
                const total = localPollOptions.reduce((acc, o) => acc + o.voteCount, 0);
                const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
                const hasVoted = localPollOptions.some(o => o.isSelected);
                return (
                  <button 
                    key={opt.id} 
                    onClick={() => handleVote(opt.id)}
                    disabled={isVoting}
                    className={`relative w-full rounded-xl p-3 text-left overflow-hidden transition ${
                      opt.isSelected 
                        ? 'bg-purple-500/20 border border-purple-500/50' 
                        : 'bg-white/10 hover:bg-white/15 border border-transparent'
                    } ${isVoting ? 'opacity-50' : ''}`}
                  >
                    <div 
                      className={`absolute inset-0 ${opt.isSelected ? 'bg-purple-500/30' : 'bg-white/10'}`} 
                      style={{ width: hasVoted ? `${pct}%` : '0%', transition: 'width 0.3s ease' }} 
                    />
                    <div className="relative flex items-center justify-between">
                      <span className={`text-sm ${opt.isSelected ? 'text-white font-medium' : 'text-white'}`}>
                        {opt.text}
                        {opt.isSelected && <span className="ml-2 text-purple-400">✓</span>}
                      </span>
                      {hasVoted && (
                        <span className="text-xs font-bold text-white/70">{pct}% ({opt.voteCount})</span>
                      )}
                    </div>
                  </button>
                );
              })}
              <p className="text-[10px] text-white/40 text-center mt-2">
                {localPollOptions.reduce((acc, o) => acc + o.voteCount, 0)} votes
              </p>
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
            {/* Heart/Like button */}
            <button 
              onClick={handleReact}
              className={`flex items-center gap-1 text-xs transition ${localIsReacted ? 'text-pink-500' : 'text-white/50 hover:text-pink-400'}`}
            >
              <Heart className={`h-4 w-4 ${localIsReacted ? 'fill-current' : ''}`} /> {localReactionCount}
            </button>
            
            {/* Comments button */}
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1 text-xs transition ${showComments ? 'text-purple-400' : 'text-white/50 hover:text-white'}`}
            >
              <MessageCircle className="h-4 w-4" /> {item.comments}
            </button>
            
            {/* Gift button */}
            {canGift && (
              <div className="relative" ref={giftPickerRef}>
                <button
                  onClick={() => setShowGiftPicker(!showGiftPicker)}
                  disabled={isGiftingPost}
                  className={`flex items-center gap-1 text-xs transition ${(item.giftCount ?? 0) > 0 ? 'text-yellow-400' : 'text-white/50 hover:text-yellow-400'}`}
                >
                  <Gift className="h-4 w-4" /> {(item.giftCount ?? 0) > 0 ? item.giftCount : ''}
                </button>
                {showGiftPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <GiftPickerMini
                      isOpen={showGiftPicker}
                      onClose={() => setShowGiftPicker(false)}
                      onSelectGift={handleGiftSelect}
                      recipientUsername={item.author.name}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* More menu */}
            {hasActions && (
              <div className="relative ml-auto" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-white/30 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-white/10 bg-gray-900 py-1 shadow-xl">
                    {canPin && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPin?.(item.id, !item.isPinned);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                      >
                        <Pin className="h-4 w-4" />
                        {item.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDelete?.(item.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {!hasActions && (
              <button className="ml-auto text-white/30 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Comments Section */}
          {showComments && !compact && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {/* Comment Composer */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-purple-500/50 focus:outline-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isCreatingComment}
                  className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                >
                  {isCreatingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Comments List */}
              {commentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-white/40 py-2">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentRow 
                      key={comment.id} 
                      comment={comment} 
                      viewerProfileId={viewerProfileId}
                      onRefresh={() => { refetchComments(); onRefresh?.(); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentRow({ 
  comment, 
  viewerProfileId,
  onRefresh,
}: { 
  comment: PostComment; 
  viewerProfileId?: string | null;
  onRefresh?: () => void;
}) {
  const { toast } = useToast();
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const { giftComment, isLoading: isGifting } = useGiftComment();
  
  const isOwner = viewerProfileId === comment.authorId;
  const canGift = !isOwner && !!viewerProfileId;
  
  const handleGiftSelect = async (gift: { id: number; coin_cost: number; name: string }) => {
    setShowGiftPicker(false);
    try {
      await giftComment(comment.id, gift.id, gift.coin_cost);
      toast({ title: `Sent ${gift.name}!` });
      onRefresh?.();
    } catch (err: any) {
      toast({ title: 'Failed to send gift', description: err?.message, variant: 'error' });
    }
  };
  
  return (
    <div className="flex gap-2">
      <Image
        src={comment.authorAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorUsername)}&background=8B5CF6&color=fff`}
        alt={comment.authorUsername}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-white">{comment.authorDisplayName || comment.authorUsername}</span>
          <span className="text-[10px] text-white/40">{formatTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/80 mt-0.5">{comment.textContent}</p>
        <div className="mt-1 flex items-center gap-3">
          <button className="text-[10px] text-white/40 hover:text-white">Like</button>
          <button className="text-[10px] text-white/40 hover:text-white">Reply</button>
          {canGift && (
            <div className="relative">
              <button
                onClick={() => setShowGiftPicker(!showGiftPicker)}
                disabled={isGifting}
                className={`text-[10px] transition ${comment.giftCount > 0 ? 'text-yellow-400' : 'text-white/40 hover:text-yellow-400'}`}
              >
                🎁 {comment.giftCount > 0 ? comment.giftCount : 'Gift'}
              </button>
              {showGiftPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <GiftPickerMini
                    isOpen={showGiftPicker}
                    onClose={() => setShowGiftPicker(false)}
                    onSelectGift={handleGiftSelect}
                    recipientUsername={comment.authorDisplayName || comment.authorUsername}
                  />
                </div>
              )}
            </div>
          )}
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3509c317-d888-4424-833f-1b9a779736e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeamPageContent.tsx:1546',message:'ChatScreen MOUNT',data:{teamId,hasMembership:!!membership},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  const { messages, isLoading, refetch } = useTeamChat(teamId);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3509c317-d888-4424-833f-1b9a779736e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeamPageContent.tsx:1546',message:'useTeamChat RESULT',data:{messagesLength:messages.length,isLoading,teamId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H4'})}).catch(()=>{});
  // #endregion
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

    const result = [...baseMessages, ...optimistic].sort((a, b) => a.timestamp - b.timestamp);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3509c317-d888-4424-833f-1b9a779736e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeamPageContent.tsx:1591',message:'orderedMessages COMPUTED',data:{baseMessagesLength:baseMessages.length,optimisticLength:optimistic.length,resultLength:result.length,firstMessage:result[0]?.text?.substring(0,30)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.log('[ChatScreen] 📨 Displaying', result.length, 'messages (', baseMessages.length, 'from DB +', optimistic.length, 'pending)');
    return result;
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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px - env(safe-area-inset-bottom, 0px))' }}>
      {/* Messages - scrollable area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-white/0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto pr-2"
        >
          <div className="flex min-h-full flex-col justify-end gap-2 px-4 pb-4 pt-4">
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

      {/* Jump to Live - fixed height, doesn't scroll */}
      {streamingMembers.length > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <Radio className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-sm text-white">
            <span className="font-semibold text-red-400">{streamingMembers[0]?.name}</span> is live
          </span>
          <Button size="sm" className="ml-auto bg-red-500 text-xs text-white hover:bg-red-600">
            Join
          </Button>
        </div>
      )}

      {/* Composer - fixed at bottom, doesn't scroll */}
      <div className="mt-2 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur chat-bottom-safe">
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
  const { refreshTeam, teamId } = useTeamContext();
  const isLeader = role === 'leader';
  const shareLink = `https://www.mylivelinks.com/teams/${team.slug}`;
  const [copied, setCopied] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingIcon, setIsDeletingIcon] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);

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

  const handleUpload = async (file: File, type: 'icon' | 'banner') => {
    if (!teamId) {
      toast({ title: 'Unable to update', description: 'Team not loaded yet.', variant: 'error' });
      return;
    }
    if (!isLeader) {
      toast({ title: 'Forbidden', description: 'Only Team Admins can edit team assets.', variant: 'error' });
      return;
    }

    const setUploading = type === 'icon' ? setIsUploadingIcon : setIsUploadingBanner;
    setUploading(true);
    try {
      const res = await uploadTeamAsset(teamId, file, type);
      if (!res.success) {
        throw new Error(res.error || 'Upload failed');
      }
      await refreshTeam();
      toast({
        title: 'Updated',
        description: type === 'icon' ? 'Team photo updated.' : 'Team banner updated.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Unknown error', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (type: 'icon' | 'banner') => {
    if (!teamId) {
      toast({ title: 'Unable to update', description: 'Team not loaded yet.', variant: 'error' });
      return;
    }
    if (!isLeader) {
      toast({ title: 'Forbidden', description: 'Only Team Admins can edit team assets.', variant: 'error' });
      return;
    }

    const setDeleting = type === 'icon' ? setIsDeletingIcon : setIsDeletingBanner;
    setDeleting(true);
    try {
      const res = await deleteTeamAsset(teamId, type);
      if (!res.success) {
        throw new Error(res.error || 'Delete failed');
      }
      await refreshTeam();
      toast({
        title: 'Removed',
        description: type === 'icon' ? 'Team photo removed.' : 'Team banner removed.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Remove failed', description: err?.message || 'Unknown error', variant: 'error' });
    } finally {
      setDeleting(false);
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
        {isLeader && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Team Photo</p>
                <p className="text-xs text-white/50">Square icon used in tiles and headers.</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {team.iconUrl ? (
                      <Image src={team.iconUrl} alt="Team icon" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex">
                      <span className="sr-only">Upload team photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingIcon || isDeletingIcon}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(file, 'icon');
                          e.currentTarget.value = '';
                        }}
                        className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-purple-200 hover:file:bg-purple-500/30"
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete('icon')}
                      disabled={!team.iconUrl || isUploadingIcon || isDeletingIcon}
                      className="border-white/20 text-white/80 hover:bg-white/10"
                    >
                      {isDeletingIcon ? 'Removing...' : 'Remove photo'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Team Banner</p>
                <p className="text-xs text-white/50">Wide header image shown on your team page.</p>
                <div className="mt-3 space-y-2">
                  <div className="relative h-20 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {team.bannerUrl ? (
                      <Image src={team.bannerUrl} alt="Team banner" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/20">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingBanner || isDeletingBanner}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file, 'banner');
                      e.currentTarget.value = '';
                    }}
                    className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-purple-200 hover:file:bg-purple-500/30"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete('banner')}
                      disabled={!team.bannerUrl || isUploadingBanner || isDeletingBanner}
                      className="border-white/20 text-white/80 hover:bg-white/10"
                    >
                      {isDeletingBanner ? 'Removing...' : 'Remove banner'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
            {teamLiveConfig?.approvedMemberCount ?? 0}.
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

/* ════════════════════════════════════════════════════════════════════════════
   PENDING INVITE ACCEPTANCE MODAL
   ════════════════════════════════════════════════════════════════════════════ */

function PendingInviteModal({
  invite,
  onAccept,
  onDecline,
  onDismiss,
}: {
  invite: PendingTeamInvite;
  onAccept: () => Promise<boolean>;
  onDecline: () => Promise<boolean>;
  onDismiss: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const success = await onAccept();
      if (success) {
        toast({
          title: `Welcome to ${invite.team_name}!`,
          description: "You're now a member of this team.",
          variant: 'success',
        });
        // Reload to refresh membership state
        router.refresh();
      } else {
        toast({
          title: 'Could not accept invite',
          description: 'Please try again in a moment.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Could not accept invite',
        description: err?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const success = await onDecline();
      if (success) {
        toast({
          title: 'Invite declined',
          description: 'You can always join later if invited again.',
          variant: 'info',
        });
      } else {
        toast({
          title: 'Could not decline invite',
          description: 'Please try again in a moment.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Could not decline invite',
        description: err?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const inviterName = invite.inviter_display_name || invite.inviter_username;
  const inviterAvatar = invite.inviter_avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=8B5CF6&color=fff`;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" 
        onClick={onDismiss} 
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md animate-scale-in">
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#1a1a24] via-[#141220] to-[#0f0f18] p-6 shadow-2xl shadow-purple-900/30">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Team Invite</h2>
            </div>
            <button
              onClick={onDismiss}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>

          {/* Invite Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
            <div className="flex items-center gap-4 mb-3">
              {/* Team Icon */}
              <div className="relative h-14 w-14 rounded-2xl bg-purple-500/20 flex items-center justify-center overflow-hidden ring-2 ring-purple-500/30">
                {invite.team_icon_url ? (
                  <Image
                    src={invite.team_icon_url}
                    alt={invite.team_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-purple-300">
                    {invite.team_name[0]?.toUpperCase() ?? 'T'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-white/60">You've been invited to join</p>
                <h3 className="text-xl font-bold text-white">{invite.team_name}</h3>
              </div>
            </div>

            {/* Inviter */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
              <Image
                src={inviterAvatar}
                alt={inviterName}
                width={36}
                height={36}
                className="rounded-full"
              />
              <div>
                <p className="text-sm text-white/60">Invited by</p>
                <p className="text-sm font-medium text-white">{inviterName}</p>
              </div>
            </div>

            {/* Personal message */}
            {invite.message && (
              <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="text-sm text-white/80 italic">"{invite.message}"</p>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 mb-4">
            <p className="text-sm font-medium text-teal-100">Join unlimited teams</p>
            <p className="text-xs text-white/60 mt-0.5">
              Accepting this invite won't remove you from any other teams.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-emerald-400"
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Accept & Join
            </Button>
            <Button
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-white/20 text-white/80 hover:bg-white/10"
            >
              {isDeclining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Decline'
              )}
            </Button>
          </div>

          {/* Dismiss hint */}
          <p className="text-center text-xs text-white/40 mt-4">
            You can dismiss this and decide later. The invite will stay pending.
          </p>
        </div>
      </div>
    </>
  );
}

function LiveMembersRail({
  entries,
  loading,
  onNavigate,
}: {
  entries: LiveMemberEntry[];
  loading: boolean;
  onNavigate: (destination: string) => void;
}) {
  if (loading && entries.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
          <span>Live members</span>
          <span className="text-white/30">Loading…</span>
        </div>
        <div className="mt-3 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={`live-skeleton-${idx}`}
              className="flex flex-col items-center gap-2 animate-pulse"
            >
              <div className="h-12 w-12 rounded-full bg-white/10" />
              <div className="h-2 w-10 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/30 p-3 text-white/60">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
          <span>Live members</span>
          <span>No one live right now</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`placeholder-${idx}`}
              className="h-10 w-10 rounded-full border border-dashed border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  const fallbackAvatar = (username: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'Live')}&background=111827&color=fff`;

  const truncatedEntries = entries.slice(0, 15);

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
        <span>Live members</span>
        <span className="text-white/60 tracking-[0.2em]">
          {loading ? 'Updating…' : `${entries.length} on air`}
        </span>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {truncatedEntries.map((entry) => (
          <button
            key={`${entry.profileId}:${entry.streamId}`}
            type="button"
            onClick={() => onNavigate(entry.destination)}
            className="group flex min-w-[72px] flex-col items-center gap-1 text-white/80 transition hover:text-white"
          >
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-red-500/60 to-pink-500/50 p-[2px]">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-black/40">
                  <Image
                    src={entry.avatarUrl || fallbackAvatar(entry.username)}
                    alt={entry.username}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-lg">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
            </div>
            <span className="text-[11px] font-semibold leading-tight text-white/80 group-hover:text-white">
              {entry.displayName || entry.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
