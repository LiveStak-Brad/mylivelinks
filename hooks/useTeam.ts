'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

export type FeedSort = 'hot' | 'new' | 'top';
export type MemberFilter = 'all' | 'live' | 'online';
export type MemberActivity = 'online' | 'live' | 'offline';

export type TeamMembershipStatus = 'requested' | 'pending' | 'approved' | 'rejected' | 'banned' | 'left' | 'none';

export interface TeamMember {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: 'leader' | 'core' | 'member' | 'guest';
  activity: MemberActivity;
  isStreaming?: boolean;
}

export interface FeedItem {
  id: string;
  authorId: string;
  type: 'post' | 'thread' | 'poll' | 'clip' | 'announcement' | 'event';
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
  isReacted?: boolean;
  giftCount?: number;
  isPoll?: boolean;
  pollOptions?: { id: string; label: string; votes: number; isSelected?: boolean }[];
  topReplies?: { author: TeamMember; text: string }[];
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  textContent: string;
  mediaUrl?: string | null;
  parentCommentId: string | null;
  createdAt: number;
  giftCount: number;
  isReacted?: boolean;
  reactionCount?: number;
}

export interface ChatMessage {
  id: string;
  author: TeamMember;
  text: string;
  mediaUrl?: string | null;
  timestamp: number;
  reactions?: { emoji: string; count: number }[];
  isSystem?: boolean;
  replyTo?: string;
}

export interface LiveRoom {
  id: string;
  host: TeamMember;
  title: string;
  viewers: number;
  thumbnail: string;
  isTeamRoom?: boolean;
  liveStreamId?: number;
}

export interface TeamHomeData {
  team: {
    id: string;
    name: string;
    slug: string;
    team_tag: string;
    description: string | null;
    rules: string | null;
    icon_url: string | null;
    banner_url: string | null;
    theme_color: string | null;
    approved_member_count: number;
    pending_request_count: number | null;
  };
  viewer_state: {
    is_authenticated: boolean;
    membership_status: TeamMembershipStatus;
    role: string | null;
    can_moderate: boolean;
  };
  stats: {
    posts_last_7d: number;
    live_now: number;
  };
}

export type TeamHookResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  notAuthorized: boolean;
  refetch: () => void;
};

function isAuthzError(err: unknown): boolean {
  const message = (err as any)?.message as string | undefined;
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('forbidden') || m.includes('unauthorized') || m.includes('permission');
}

function dbRoleToRoleState(dbRole: string | null | undefined): TeamMember['role'] {
  switch (dbRole) {
    case 'Team_Admin':
      return 'leader';
    case 'Team_Moderator':
      return 'core';
    case 'Team_Member':
    default:
      return 'member';
  }
}

function roleStateToDbRole(role: TeamMember['role']): 'Team_Admin' | 'Team_Moderator' | 'Team_Member' {
  switch (role) {
    case 'leader':
      return 'Team_Admin';
    case 'core':
      return 'Team_Moderator';
    case 'member':
    case 'guest':
    default:
      return 'Team_Member';
  }
}

function stableGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = 210 + (h % 90);
  const b = 120 + ((h >>> 8) % 90);
  return `linear-gradient(135deg, hsl(${a} 70% 55%), hsl(${b} 70% 55%))`;
}

const teamSlugCache = new Map<string, string>();

const teamIdCache = new Map<string, string>();

async function getTeamIdBySlug(teamSlug: string): Promise<string> {
  const slug = teamSlug?.trim();
  if (!slug) throw new Error('team_slug_required');
  const cached = teamIdCache.get(slug);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.from('teams').select('id').eq('slug', slug).single();
  if (error) throw error;
  if (!data?.id) throw new Error('team_not_found');
  teamIdCache.set(slug, data.id);
  return data.id;
}

async function getTeamSlugById(teamId: string): Promise<string> {
  const cached = teamSlugCache.get(teamId);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.from('teams').select('slug').eq('id', teamId).single();
  if (error) throw error;
  if (!data?.slug) throw new Error('team_slug_missing');
  teamSlugCache.set(teamId, data.slug);
  return data.slug;
}

/* ════════════════════════════════════════════════════════════════════════════
   QUERY KEYS
   ════════════════════════════════════════════════════════════════════════════ */

export const teamKeys = {
  all: ['team'] as const,
  team: (slug: string) => [...teamKeys.all, 'detail', slug] as const,
  membership: (teamId: string, userId: string) => [...teamKeys.all, 'membership', teamId, userId] as const,
  feed: (teamId: string, sort: FeedSort) => [...teamKeys.all, 'feed', teamId, sort] as const,
  members: (teamId: string, filter: MemberFilter) => [...teamKeys.all, 'members', teamId, filter] as const,
  presence: (teamId: string) => [...teamKeys.all, 'presence', teamId] as const,
  liveRooms: (teamId: string) => [...teamKeys.all, 'liveRooms', teamId] as const,
  chat: (teamId: string) => [...teamKeys.all, 'chat', teamId] as const,
};

/* ════════════════════════════════════════════════════════════════════════════
   useTeam — Fetch team home data
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeam(slug: string) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<TeamHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const refreshKeyRef = useRef(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setIsLoading((v) => v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!slug) {
        setData(null);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const { data: res, error: rpcError } = await supabase.rpc('rpc_get_team_home', {
          p_team_slug: slug,
        });
        if (rpcError) throw rpcError;
        if (!cancelled) setData(res as TeamHomeData);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase, refreshKeyRef.current]);

  return { data, isLoading, error, notAuthorized, refetch } satisfies TeamHookResult<TeamHomeData>;
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamMembership — Current user's membership (loaded once, reused)
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamMembership(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<
    | {
        status: TeamMembershipStatus;
        role: TeamMember['role'];
        canModerate: boolean;
        isBanned: boolean;
        isMuted: boolean;
      }
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const refreshKeyRef = useRef(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setIsLoading((v) => v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!teamId) {
        setData(null);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id ?? null;
        if (!userId) {
          if (!cancelled) {
            setData({ status: 'none', role: 'guest', canModerate: false, isBanned: false, isMuted: false });
          }
          return;
        }

        const { data: m, error: selErr } = await supabase
          .from('team_memberships')
          .select('status, role')
          .eq('team_id', teamId)
          .eq('profile_id', userId)
          .maybeSingle();

        if (selErr) throw selErr;

        const status = ((m?.status as TeamMembershipStatus | undefined) ?? 'none') satisfies TeamMembershipStatus;
        const role = status === 'approved' ? dbRoleToRoleState((m?.role as string | undefined) ?? null) : 'guest';

        const canModerate = role === 'leader' || role === 'core';

        const [{ data: bannedRes }, { data: mutedRes }] = await Promise.all([
          supabase.rpc('is_team_banned', { p_team_id: teamId, p_profile_id: userId }),
          supabase.rpc('is_team_muted', { p_team_id: teamId, p_profile_id: userId, p_stream_id: 0 }),
        ]);

        if (!cancelled) {
          setData({
            status,
            role,
            canModerate,
            isBanned: !!bannedRes,
            isMuted: !!mutedRes,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [teamId, supabase, refreshKeyRef.current]);

  return { data, isLoading, error, notAuthorized, refetch };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamFeed — Paginated feed with sorting (no duplicate fetches)
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamFeed(teamId: string | null, sort: FeedSort = 'hot') {
  const supabase = useMemo(() => createClient(), []);
  const [rawItems, setRawItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const cursorRef = useRef<{ beforeCreatedAt: string | null; beforeId: string | null } | null>(null);

  const refetch = useCallback(() => {
    cursorRef.current = null;
    setHasMore(true);
    setRawItems([]);
    setRefreshKey((k) => k + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    let cancelled = false;

    const run = async (mode: 'initial' | 'more') => {
      if (!teamId) {
        setRawItems([]);
        setHasMore(true);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      if (mode === 'initial') setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const teamSlug = await getTeamSlugById(teamId);
        const cursor = cursorRef.current;

        const { data: rows, error: rpcError } = await supabase.rpc('rpc_get_team_feed', {
          p_team_slug: teamSlug,
          p_limit: 20,
          p_before_created_at: cursor?.beforeCreatedAt ?? null,
          p_before_id: cursor?.beforeId ?? null,
        });

        if (rpcError) throw rpcError;

        const mapped = (rows as any[]).map((r) => {
          const createdAtMs = new Date(r.created_at).getTime();
          const upvotes = Number(r.reaction_count ?? 0);
          const comments = Number(r.comment_count ?? 0);

          const author: TeamMember = {
            id: String(r.author_id),
            name: String(r.author_username ?? 'Unknown'),
            handle: `@${String(r.author_username ?? 'unknown')}`,
            avatar: String(r.author_avatar_url ?? 'https://ui-avatars.com/api/?name=U&background=111827&color=fff'),
            role: 'member',
            activity: 'offline',
          };

          const isPinned = !!r.is_pinned;
          const rawText = String(r.text_content ?? '');
          const announcementParts = isPinned ? rawText.split(/\n\n+/) : null;
          const announcementTitle = isPinned ? String(announcementParts?.[0] ?? '').trim() : undefined;
          const announcementBody = isPinned
            ? String((announcementParts ?? []).slice(1).join('\n\n')).trim()
            : rawText;
          const hotScore = Math.round((upvotes * 2 + comments * 3) / Math.max(1, (Date.now() - createdAtMs) / 36e5));

          return {
            id: String(r.post_id ?? r.id),
            authorId: String(r.author_id),
            type: r.is_poll ? 'poll' : (isPinned ? 'announcement' : 'post'),
            author,
            title: isPinned && announcementTitle ? announcementTitle : undefined,
            body: announcementBody,
            media: r.media_url ? String(r.media_url) : undefined,
            createdAt: createdAtMs,
            hotScore,
            upvotes,
            downvotes: 0,
            comments,
            isPinned,
            isAnnouncement: isPinned,
            isReacted: !!r.is_reacted,
            giftCount: Number(r.gift_count ?? 0),
            isPoll: !!r.is_poll,
          } satisfies FeedItem;
        });

        if ((rows as any[])?.length === 0) setHasMore(false);

        const last = (rows as any[])?.[(rows as any[])?.length - 1];
        if (last?.created_at && (last?.post_id || last?.id)) {
          cursorRef.current = { beforeCreatedAt: last.created_at, beforeId: last.post_id ?? last.id };
        }

        if (!cancelled) {
          setRawItems((prev) => (mode === 'initial' ? mapped : [...prev, ...mapped]));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    };

    run(cursorRef.current === null ? 'initial' : 'more');
    return () => {
      cancelled = true;
    };
  }, [teamId, supabase, refreshKey]);

  useEffect(() => {
    if (!isLoadingMore) return;
    if (!teamId) return;
    let cancelled = false;

    const runMore = async () => {
      try {
        const teamSlug = await getTeamSlugById(teamId);
        const cursor = cursorRef.current;
        const { data: rows, error: rpcError } = await supabase.rpc('rpc_get_team_feed', {
          p_team_slug: teamSlug,
          p_limit: 20,
          p_before_created_at: cursor?.beforeCreatedAt ?? null,
          p_before_id: cursor?.beforeId ?? null,
        });
        if (rpcError) throw rpcError;

        const mapped = (rows as any[]).map((r) => {
          const createdAtMs = new Date(r.created_at).getTime();
          const upvotes = Number(r.reaction_count ?? 0);
          const comments = Number(r.comment_count ?? 0);
          const isPinned = !!r.is_pinned;
          const rawText = String(r.text_content ?? '');
          const announcementParts = isPinned ? rawText.split(/\n\n+/) : null;
          const announcementTitle = isPinned ? String(announcementParts?.[0] ?? '').trim() : undefined;
          const announcementBody = isPinned
            ? String((announcementParts ?? []).slice(1).join('\n\n')).trim()
            : rawText;
          const hotScore = Math.round((upvotes * 2 + comments * 3) / Math.max(1, (Date.now() - createdAtMs) / 36e5));
          const author: TeamMember = {
            id: String(r.author_id),
            name: String(r.author_username ?? 'Unknown'),
            handle: `@${String(r.author_username ?? 'unknown')}`,
            avatar: String(r.author_avatar_url ?? 'https://ui-avatars.com/api/?name=U&background=111827&color=fff'),
            role: 'member',
            activity: 'offline',
          };
          return {
            id: String(r.post_id ?? r.id),
            authorId: String(r.author_id),
            type: r.is_poll ? 'poll' : (isPinned ? 'announcement' : 'post'),
            author,
            title: isPinned && announcementTitle ? announcementTitle : undefined,
            body: announcementBody,
            media: r.media_url ? String(r.media_url) : undefined,
            createdAt: createdAtMs,
            hotScore,
            upvotes,
            downvotes: 0,
            comments,
            isPinned,
            isAnnouncement: isPinned,
            isReacted: !!r.is_reacted,
            giftCount: Number(r.gift_count ?? 0),
            isPoll: !!r.is_poll,
          } satisfies FeedItem;
        });

        if ((rows as any[])?.length === 0) setHasMore(false);
        const last = (rows as any[])?.[(rows as any[])?.length - 1];
        if (last?.created_at && (last?.post_id || last?.id)) {
          cursorRef.current = { beforeCreatedAt: last.created_at, beforeId: last.post_id ?? last.id };
        }

        if (!cancelled) setRawItems((prev) => [...prev, ...mapped]);
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoadingMore(false);
      }
    };

    runMore();
    return () => {
      cancelled = true;
    };
  }, [isLoadingMore, teamId, supabase]);

  const pinnedItems = useMemo(() => rawItems.filter((i) => i.isPinned), [rawItems]);
  const unpinned = useMemo(() => rawItems.filter((i) => !i.isPinned), [rawItems]);

  const sortedFeedItems = useMemo(() => {
    if (sort === 'new') return [...unpinned].sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'top') return [...unpinned].sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
    return [...unpinned].sort((a, b) => b.hotScore - a.hotScore);
  }, [sort, unpinned]);

  return {
    data: { pinnedItems, feedItems: sortedFeedItems },
    isLoading,
    error,
    notAuthorized,
    loadMore,
    hasMore,
    isLoadingMore,
    refetch,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamMembers — Roster with filters (no duplicate queries per panel)
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamMembers(teamId: string | null, filter: MemberFilter = 'all') {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<TeamMember[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const refreshKeyRef = useRef(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setIsLoading((v) => v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!teamId) {
        setData(null);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const teamSlug = await getTeamSlugById(teamId);
        const { data: members, error: rpcError } = await supabase.rpc('rpc_get_team_members', {
          p_team_slug: teamSlug,
          p_status: 'approved',
          p_role: null,
          p_search: null,
          p_limit: 200,
        });

        if (rpcError) throw rpcError;

        const mapped: TeamMember[] = (members as any[]).map((m) => {
          const username = String(m.username ?? 'unknown');
          return {
            id: String(m.profile_id),
            name: username,
            handle: `@${username}`,
            avatar: String(m.avatar_url ?? 'https://ui-avatars.com/api/?name=U&background=111827&color=fff'),
            role: dbRoleToRoleState(String(m.role ?? 'Team_Member')),
            activity: 'offline',
          };
        });

        if (!cancelled) {
          if (filter === 'all') {
            setData(mapped);
          } else {
            setData(mapped.filter((mm) => mm.activity === filter));
          }
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [teamId, filter, supabase, refreshKeyRef.current]);

  return { data, isLoading, error, notAuthorized, refetch };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamPresence — Online/live counts with realtime updates
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamPresence(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<{ onlineCount: number; liveCount: number; activeAvatars: TeamMember[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const refreshKeyRef = useRef(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setIsLoading((v) => v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!teamId) {
        setData(null);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const { data: summary, error: summaryErr } = await supabase.rpc('rpc_get_presence_summary', {
          p_team_id: teamId,
        });

        if (summaryErr) throw summaryErr;

        const onlineCount = Number((summary as any)?.present_total ?? 0);
        const liveCount = Number((summary as any)?.sources?.live_session ?? 0);

        if (!cancelled) {
          setData({ onlineCount, liveCount, activeAvatars: [] });
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    const interval = setInterval(() => run(), 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [teamId, supabase, refreshKeyRef.current]);

  return { data, isLoading, error, notAuthorized, refetch };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamLiveRooms — Active streams with realtime updates
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamLiveRooms(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<LiveRoom[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const refreshKeyRef = useRef(0);

  const refetch = useCallback(() => {
    refreshKeyRef.current += 1;
    setIsLoading((v) => v);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!teamId) {
        setData(null);
        setError(null);
        setNotAuthorized(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setNotAuthorized(false);

      try {
        const teamSlug = await getTeamSlugById(teamId);
        const { data: rooms, error: rpcError } = await supabase.rpc('rpc_get_team_live_rooms', {
          p_team_slug: teamSlug,
        });

        if (rpcError) throw rpcError;

        const mapped: LiveRoom[] = (rooms as any[]).map((r) => {
          const username = String(r.host_username ?? 'unknown');
          const host: TeamMember = {
            id: String(r.host_profile_id),
            name: username,
            handle: `@${username}`,
            avatar: String(r.host_avatar_url ?? 'https://ui-avatars.com/api/?name=U&background=111827&color=fff'),
            role: 'member',
            activity: 'live',
            isStreaming: true,
          };

          return {
            id: String(r.live_stream_id),
            liveStreamId: Number(r.live_stream_id),
            host,
            title: `${username} live`,
            viewers: 0,
            thumbnail: stableGradient(String(r.live_stream_id)),
            isTeamRoom: true,
          };
        });

        if (!cancelled) setData(mapped);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e as Error);
          setNotAuthorized(isAuthzError(e));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [teamId, supabase, refreshKeyRef.current]);

  return { data, isLoading, error, notAuthorized, refetch };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamChat — Messages with realtime subscription
   ════════════════════════════════════════════════════════════════════════════ */

export function useTeamChat(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, bumpRefreshToken] = useReducer((x: number) => x + 1, 0);

  const refetch = useCallback(() => {
    bumpRefreshToken();
  }, []);

  const upsertMessage = useCallback((next: ChatMessage) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.id === next.id);
      if (existingIndex === -1) {
        const inserted = [...prev, next].sort((a, b) => a.timestamp - b.timestamp);
        return inserted;
      }
      const cloned = [...prev];
      cloned[existingIndex] = next;
      return cloned.sort((a, b) => a.timestamp - b.timestamp);
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!teamId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔍 [useTeamChat] BYPASSING RPC - Using direct table query');
        
        // Query the table directly instead of using the broken RPC
        const { data: messages, error: queryError } = await supabase
          .from('team_chat_messages')
          .select(`
            id,
            team_id,
            author_id,
            content,
            media_url,
            is_system,
            is_deleted,
            created_at,
            reply_to_id,
            profiles:author_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('team_id', teamId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (queryError) throw queryError;

        const mapped: ChatMessage[] = (messages || []).map((m: any) => ({
          id: String(m.id),
          author: {
            id: String(m.author_id),
            name: m.profiles?.display_name || m.profiles?.username || 'Unknown',
            handle: `@${m.profiles?.username || 'unknown'}`,
            avatar: m.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=U&background=111827&color=fff',
            role: 'member',  // Default role since we're bypassing the RPC
            activity: 'offline' as MemberActivity,
          },
          text: m.is_deleted ? '[Message deleted]' : m.content,
          mediaUrl: m.media_url ? String(m.media_url) : null,
          timestamp: new Date(m.created_at).getTime(),
          reactions: [],  // Can add later if needed
          isSystem: m.is_system,
          replyTo: m.reply_to_id ? String(m.reply_to_id) : undefined,
        }));

        console.log('[useTeamChat] ✅ Fetched', mapped.length, 'messages for team:', teamId);
        if (!cancelled) setMessages(mapped);
      } catch (e) {
        if (!cancelled) {
          console.error('[useTeamChat] ❌ Error fetching messages:', e);
          setError(e as Error);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [teamId, supabase, refreshToken]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`team_chat:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_chat_messages',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          // Fetch the full message with author info
          const newMsg = payload.new as any;
          const { data: profiles } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', newMsg.author_id)
            .single();

          const mapped: ChatMessage = {
            id: String(newMsg.id),
            author: {
              id: String(newMsg.author_id),
              name: profiles?.display_name || profiles?.username || 'Unknown',
              handle: `@${profiles?.username || 'unknown'}`,
              avatar: profiles?.avatar_url || 'https://ui-avatars.com/api/?name=U&background=111827&color=fff',
              role: 'member',
              activity: 'offline',
            },
            text: newMsg.content,
            mediaUrl: newMsg.media_url ? String(newMsg.media_url) : null,
            timestamp: new Date(newMsg.created_at).getTime(),
            reactions: [],
            isSystem: newMsg.is_system,
            replyTo: newMsg.reply_to_id ? String(newMsg.reply_to_id) : undefined,
          };

          upsertMessage(mapped);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, teamId, upsertMessage]);

  return { messages, isLoading, error, refetch };
}

/* ════════════════════════════════════════════════════════════════════════════
   useSendChatMessage — Send a chat message
   ════════════════════════════════════════════════════════════════════════════ */

export function useSendChatMessage(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ content, replyToId, mediaUrl }: { content: string; replyToId?: string; mediaUrl?: string | null }) => {
      if (!teamId) throw new Error('No team ID');

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_send_team_chat_message', {
          p_team_id: teamId,
          p_content: content,
          p_reply_to_id: replyToId || null,
          p_media_url: mediaUrl ?? null,
        });

        if (rpcError) throw rpcError;

        const result = data as { success: boolean; error?: string; message_id?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }

        return result;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, teamId]
  );

  return { mutate, isLoading, error };
}

export function useLeaveTeamBySlug(teamSlug: string) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTeamId(null);
    setResolveError(null);
    void (async () => {
      try {
        const id = await getTeamIdBySlug(teamSlug);
        if (!cancelled) setTeamId(id);
      } catch (e) {
        if (!cancelled) setResolveError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamSlug]);

  const base = useLeaveTeam(teamId ?? '');
  const mutate = useCallback(async () => {
    if (!teamId) throw resolveError ?? new Error('team_not_found');
    return base.mutate();
  }, [base, resolveError, teamId]);

  return {
    mutate,
    isLoading: base.isLoading,
    error: base.error ?? resolveError,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   MUTATIONS
   ════════════════════════════════════════════════════════════════════════════ */

export function useCreatePost(teamSlug: string) {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ text, mediaUrl }: { text: string; mediaUrl?: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_create_team_post', {
          p_team_slug: teamSlug,
          p_text_content: text,
          p_media_url: mediaUrl ?? null,
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, teamSlug]
  );

  return { mutate, isLoading, error };
}

export function useDeletePost() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ postId }: { postId: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { error: rpcError } = await supabase.rpc('rpc_delete_team_post', {
          p_post_id: postId,
        });

        if (rpcError) throw rpcError;
        return true;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const deletePost = useCallback(
    (postId: string) => mutate({ postId }),
    [mutate]
  );

  return { mutate, deletePost, isLoading, error };
}

export function usePinPost() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ postId, pin }: { postId: string; pin: boolean }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { error: rpcError } = await supabase.rpc('rpc_pin_team_post', {
          p_post_id: postId,
          p_pin: pin,
        });

        if (rpcError) throw rpcError;
        return true;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  const pinPost = useCallback(
    (postId: string, pin: boolean) => mutate({ postId, pin }),
    [mutate]
  );

  return { mutate, pinPost, isLoading, error };
}

export function useReactToPost() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reactToPost = useCallback(
    async (postId: string): Promise<{ reaction_count: number; is_reacted: boolean } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_react_team_post', {
          p_post_id: postId,
          p_reaction_type: 'like',
        });
        if (rpcError) throw rpcError;
        // RPC returns array with single row
        const result = Array.isArray(data) ? data[0] : data;
        return result as { reaction_count: number; is_reacted: boolean } | null;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { reactToPost, isLoading, error };
}

export function useJoinTeam() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ teamSlug }: { teamSlug: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_request_join_team', {
          p_team_slug: teamSlug,
        });
        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { mutate, isLoading, error };
}

export function useLeaveTeam(teamId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('unauthorized');

      const { error: updErr } = await supabase
        .from('team_memberships')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('profile_id', userId);

      if (updErr) throw updErr;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, teamId]);

  return { mutate, isLoading, error };
}

/* ════════════════════════════════════════════════════════════════════════════
   useTeamNotificationPrefs — Get/set notification preferences
   ════════════════════════════════════════════════════════════════════════════ */

export interface NotificationPrefs {
  all_activity: boolean;
  live_alerts: boolean;
  mentions_only: boolean;
  feed_posts: boolean;
  chat_messages: boolean;
}

export function useTeamNotificationPrefs(teamId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch preferences
  useEffect(() => {
    if (!teamId) {
      setPrefs(null);
      return;
    }

    let cancelled = false;

    const fetchPrefs = async () => {
      setIsLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_get_team_notification_prefs', {
          p_team_id: teamId,
        });

        if (rpcError) throw rpcError;

        const result = data as { success: boolean; prefs?: NotificationPrefs; error?: string };
        if (result.success && result.prefs && !cancelled) {
          setPrefs(result.prefs);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPrefs();
    return () => {
      cancelled = true;
    };
  }, [teamId, supabase]);

  // Update a single preference
  const updatePref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      if (!teamId || !prefs) return;

      const newPrefs = { ...prefs, [key]: value };
      setPrefs(newPrefs); // Optimistic update
      setIsSaving(true);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_update_team_notification_prefs', {
          p_team_id: teamId,
          p_prefs: newPrefs,
        });

        if (rpcError) throw rpcError;

        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to update preferences');
        }
      } catch (e) {
        // Revert on error
        setPrefs(prefs);
        setError(e as Error);
      } finally {
        setIsSaving(false);
      }
    },
    [supabase, teamId, prefs]
  );

  return { prefs, isLoading, isSaving, error, updatePref };
}

export function useTeamNotificationPrefsBySlug(teamSlug: string | null) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTeamId(null);
    setResolveError(null);
    if (!teamSlug) return;
    void (async () => {
      try {
        const id = await getTeamIdBySlug(teamSlug);
        if (!cancelled) setTeamId(id);
      } catch (e) {
        if (!cancelled) setResolveError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamSlug]);

  const base = useTeamNotificationPrefs(teamId);

  return {
    ...base,
    error: base.error ?? resolveError,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   POST COMMENTS HOOKS
   ════════════════════════════════════════════════════════════════════════════ */

export function usePostComments(postId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!postId) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_get_post_comments', {
        p_post_id: postId,
        p_limit: 100,
        p_offset: 0,
      });

      if (rpcError) throw rpcError;

      const mapped: PostComment[] = ((data as any[]) || []).map((c) => ({
        id: String(c.comment_id),
        postId: String(c.post_id),
        authorId: String(c.author_id),
        authorUsername: String(c.author_username ?? 'Unknown'),
        authorDisplayName: c.author_display_name ? String(c.author_display_name) : null,
        authorAvatarUrl: c.author_avatar_url ? String(c.author_avatar_url) : null,
        textContent: String(c.text_content ?? ''),
        mediaUrl: c.media_url ? String(c.media_url) : null,
        parentCommentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
        createdAt: new Date(c.created_at).getTime(),
        giftCount: Number(c.gift_count ?? 0),
      }));

      setComments(mapped);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { comments, isLoading, error, refetch };
}

export function useCreateComment() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createComment = useCallback(
    async (postId: string, textContent: string, parentCommentId?: string, mediaUrl?: string | null) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_create_team_comment', {
          p_post_id: postId,
          p_text_content: textContent,
          p_parent_comment_id: parentCommentId ?? null,
          p_media_url: mediaUrl ?? null,
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { createComment, isLoading, error };
}

/* ════════════════════════════════════════════════════════════════════════════
   GIFTING HOOKS
   ════════════════════════════════════════════════════════════════════════════ */

export function useGiftPost() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const giftPost = useCallback(
    async (postId: string, giftTypeId: number, coinsAmount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_gift_team_post', {
          p_post_id: postId,
          p_gift_type_id: giftTypeId,
          p_coins_amount: coinsAmount,
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { giftPost, isLoading, error };
}

export function useGiftComment() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const giftComment = useCallback(
    async (commentId: string, giftTypeId: number, coinsAmount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_gift_team_comment', {
          p_comment_id: commentId,
          p_gift_type_id: giftTypeId,
          p_coins_amount: coinsAmount,
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { giftComment, isLoading, error };
}

export function useReactToComment() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reactToComment = useCallback(
    async (commentId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_react_team_comment', {
          p_comment_id: commentId,
          p_reaction_type: 'like',
        });

        if (rpcError) throw rpcError;
        return data;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { reactToComment, isLoading, error };
}

/* ════════════════════════════════════════════════════════════════════════════
   POLL HOOKS
   ════════════════════════════════════════════════════════════════════════════ */

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  isSelected: boolean;
}

export function useCreatePoll(teamSlug: string) {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPoll = useCallback(
    async (question: string, options: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_create_team_poll', {
          p_team_slug: teamSlug,
          p_question: question,
          p_options: options,
        });

        if (rpcError) throw rpcError;
        return data as string; // Returns post ID
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, teamSlug]
  );

  return { createPoll, isLoading, error };
}

export function usePollOptions(postId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!postId) {
      setOptions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_get_poll_options', {
        p_post_id: postId,
      });

      if (rpcError) throw rpcError;

      const mapped: PollOption[] = ((data as any[]) || []).map((o) => ({
        id: String(o.option_id),
        text: String(o.option_text),
        voteCount: Number(o.vote_count ?? 0),
        isSelected: !!o.is_selected,
      }));

      setOptions(mapped);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { options, isLoading, error, refetch };
}

export function useVotePoll() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const vote = useCallback(
    async (postId: string, optionId: string): Promise<PollOption[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('rpc_vote_team_poll', {
          p_post_id: postId,
          p_option_id: optionId,
        });

        if (rpcError) throw rpcError;

        const mapped: PollOption[] = ((data as any[]) || []).map((o) => ({
          id: String(o.option_id),
          text: String(o.option_text),
          voteCount: Number(o.vote_count ?? 0),
          isSelected: !!o.is_selected,
        }));

        return mapped;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return { vote, isLoading, error };
}

/* ════════════════════════════════════════════════════════════════════════════
   EXPORTS
   ════════════════════════════════════════════════════════════════════════════ */

