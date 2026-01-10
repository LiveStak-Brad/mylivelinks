import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type {
  LiveResult,
  PersonResult,
  PostResult,
  SearchResultsBundle,
  TeamResult,
  MusicTrackResult,
  MusicVideoResult,
  CommentResult,
} from '@/types/search';

const PERSON_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-amber-500 to-orange-500',
  'from-teal-500 to-emerald-500',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-purple-500',
];

const DEFAULT_LIMITS: SearchResultsLimits = {
  people: 5,
  posts: 5,
  teams: 5,
  live: 5,
  music: 5,
  videos: 5,
};

export type SearchResultsLimits = Partial<Record<keyof SearchResultsBundle, number>>;

export interface SearchFetchOptions {
  term: string;
  client?: SupabaseClient;
  limits?: SearchResultsLimits;
}

export async function fetchSearchResults({
  term,
  client,
  limits,
}: SearchFetchOptions): Promise<SearchResultsBundle> {
  const trimmed = term.trim();
  if (!trimmed) {
    return emptyResults();
  }

  const supabase = client ?? createClient();
  const likePattern = `%${escapeLikePattern(trimmed.toLowerCase())}%`;
  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };

  // Get current user for team membership filtering
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Get teams the user is a member of
  let userTeamIds: string[] = [];
  if (currentUserId) {
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('profile_id', currentUserId)
      .eq('status', 'approved');
    userTeamIds = (memberships ?? []).map((m: any) => m.team_id);
  }

  const postsLimit = resolvedLimits.posts ?? DEFAULT_LIMITS.posts ?? 5;
  const postsFetchCap = Math.max(postsLimit * 2, postsLimit + 2);
  const peopleLimit = resolvedLimits.people ?? DEFAULT_LIMITS.people ?? 5;
  const teamsLimit = resolvedLimits.teams ?? DEFAULT_LIMITS.teams ?? 5;
  const liveLimit = resolvedLimits.live ?? DEFAULT_LIMITS.live ?? 5;
  const musicLimit = resolvedLimits.music ?? DEFAULT_LIMITS.music ?? 5;
  const videosLimit = resolvedLimits.videos ?? DEFAULT_LIMITS.videos ?? 5;
  const commentsLimit = resolvedLimits.comments ?? 10;

  // First, find matching profile IDs for author-based searches
  const matchingProfilesResponse = await supabase
    .from('profiles')
    .select('id')
    .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
    .limit(50);
  
  const matchingProfileIds = (matchingProfilesResponse.data ?? []).map((p: any) => p.id);

  const [peopleResponse, postsResponse, teamPostsResponse, teamsResponse, liveResponse, musicResponse, videosResponse, commentsResponse, postsByAuthorResponse, musicByProfileResponse, videosByProfileResponse] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_live, follower_count, adult_verified_at, bio, is_mll_pro')
      .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
      .order('follower_count', { ascending: false })
      .limit(peopleLimit),
    supabase
      .from('posts')
      .select(
        `
        id,
        text_content,
        created_at,
        media_url,
        likes_count,
        post_comments(count),
        author:profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_mll_pro
        )
      `
      )
      .ilike('text_content', likePattern)
      .order('created_at', { ascending: false })
      .limit(postsFetchCap),
    // Only fetch team posts if user is a member of at least one team
    userTeamIds.length > 0
      ? supabase
          .from('team_feed_posts')
          .select(
            `
            id,
            text_content,
            created_at,
            media_url,
            comment_count,
            reaction_count,
            team_id,
            team:teams!team_feed_posts_team_id_fkey (
              id,
              name,
              slug
            ),
            author:profiles!team_feed_posts_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              is_mll_pro
            )
          `
          )
          .in('team_id', userTeamIds)
          .ilike('text_content', likePattern)
          .order('created_at', { ascending: false })
          .limit(postsFetchCap)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('teams')
      .select('id, name, slug, description, icon_url, banner_url, approved_member_count')
      .or(`name.ilike.${likePattern},description.ilike.${likePattern}`)
      .order('approved_member_count', { ascending: false })
      .limit(teamsLimit),
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_live')
      .eq('is_live', true)
      .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
      .order('username')
      .limit(liveLimit),
    supabase
      .from('profile_music_tracks')
      .select(`
        id,
        title,
        artist_name,
        audio_url,
        created_at,
        profile:profiles!profile_music_tracks_profile_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .ilike('title', likePattern)
      .order('created_at', { ascending: false })
      .limit(musicLimit),
    supabase
      .from('profile_music_videos')
      .select(`
        id,
        title,
        video_type,
        video_url,
        youtube_id,
        created_at,
        profile:profiles!profile_music_videos_profile_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .ilike('title', likePattern)
      .order('created_at', { ascending: false })
      .limit(videosLimit),
    // Search comments by content
    supabase
      .from('post_comments')
      .select(`
        id,
        text_content,
        created_at,
        post_id,
        author_id,
        post:posts!post_comments_post_id_fkey (
          text_content
        ),
        author:profiles!post_comments_author_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .ilike('text_content', likePattern)
      .order('created_at', { ascending: false })
      .limit(commentsLimit),
    // Additional queries to find content BY matching users
    matchingProfileIds.length > 0
      ? supabase
          .from('posts')
          .select(`
            id,
            text_content,
            created_at,
            media_url,
            likes_count,
            post_comments(count),
            author:profiles!posts_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              is_mll_pro
            )
          `)
          .in('author_id', matchingProfileIds)
          .order('created_at', { ascending: false })
          .limit(postsFetchCap)
      : Promise.resolve({ data: [], error: null }),
    matchingProfileIds.length > 0
      ? supabase
          .from('profile_music_tracks')
          .select(`
            id,
            title,
            artist_name,
            audio_url,
            created_at,
            profile:profiles!profile_music_tracks_profile_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .in('profile_id', matchingProfileIds)
          .order('created_at', { ascending: false })
          .limit(musicLimit)
      : Promise.resolve({ data: [], error: null }),
    matchingProfileIds.length > 0
      ? supabase
          .from('profile_music_videos')
          .select(`
            id,
            title,
            video_type,
            video_url,
            youtube_id,
            created_at,
            profile:profiles!profile_music_videos_profile_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .in('profile_id', matchingProfileIds)
          .order('created_at', { ascending: false })
          .limit(videosLimit)
      : Promise.resolve({ data: [], error: null }),
  ]);

  validateResponse(peopleResponse.error, 'profiles');
  validateResponse(postsResponse.error, 'posts');
  validateResponse(teamPostsResponse.error, 'team_feed_posts');
  validateResponse(teamsResponse.error, 'teams');
  validateResponse(liveResponse.error, 'live');
  validateResponse(musicResponse.error, 'profile_music_tracks');
  validateResponse(videosResponse.error, 'profile_music_videos');

  // Combine posts from text search + posts by matching authors (dedupe by id)
  const allPostRows = [
    ...(postsResponse.data ?? []),
    ...(postsByAuthorResponse.data ?? []),
  ];
  const seenPostIds = new Set<string>();
  const dedupedPostRows = allPostRows.filter((row) => {
    if (seenPostIds.has(row.id)) return false;
    seenPostIds.add(row.id);
    return true;
  });

  const combinedPosts = [
    ...dedupedPostRows.map((row) => mapGlobalPostRow(row)),
    ...(teamPostsResponse.data ?? []).map((row) => mapTeamPostRow(row)),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, postsLimit);

  // Combine music from title search + music by matching profiles (dedupe)
  const allMusicRows = [
    ...(musicResponse.data ?? []),
    ...(musicByProfileResponse.data ?? []),
  ];
  const seenMusicIds = new Set<string>();
  const dedupedMusicRows = allMusicRows.filter((row) => {
    if (seenMusicIds.has(row.id)) return false;
    seenMusicIds.add(row.id);
    return true;
  });

  // Combine videos from title search + videos by matching profiles (dedupe)
  const allVideoRows = [
    ...(videosResponse.data ?? []),
    ...(videosByProfileResponse.data ?? []),
  ];
  const seenVideoIds = new Set<string>();
  const dedupedVideoRows = allVideoRows.filter((row) => {
    if (seenVideoIds.has(row.id)) return false;
    seenVideoIds.add(row.id);
    return true;
  });

  return {
    people: (peopleResponse.data ?? []).map((row, index) => mapProfileRow(row, index)),
    posts: combinedPosts,
    teams: (teamsResponse.data ?? []).map((row) => mapTeamRow(row)),
    live: (liveResponse.data ?? []).map((row) => mapLiveRow(row)),
    music: dedupedMusicRows.map((row) => mapMusicTrackRow(row)).slice(0, musicLimit),
    videos: dedupedVideoRows.map((row) => mapMusicVideoRow(row)).slice(0, videosLimit),
    comments: (commentsResponse.data ?? []).map((row) => mapCommentRow(row)),
  };
}

export function escapeLikePattern(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function mapProfileRow(row: any, index: number): PersonResult {
  return {
    id: row.id,
    name: row.display_name || row.username || 'Unknown creator',
    handle: row.username ? `@${row.username}` : '',
    avatarUrl: row.avatar_url,
    followerCount: Number(row.follower_count ?? 0),
    verified: Boolean(row.is_verified ?? row.verified ?? row.adult_verified_at),
    isMllPro: Boolean(row.is_mll_pro),
    location: null,
    status: row.bio ?? undefined,
    avatarColor: PERSON_GRADIENTS[index % PERSON_GRADIENTS.length],
    following: false,
  };
}

function mapGlobalPostRow(row: any): PostResult {
  // Extract comment count from post_comments aggregate
  const commentCount = Array.isArray(row.post_comments) && row.post_comments[0]?.count != null
    ? Number(row.post_comments[0].count)
    : Number(row.comment_count ?? 0);

  return {
    id: row.id,
    authorId: row.author?.id ?? '',
    text: row.text_content ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    mediaUrl: row.media_url,
    likeCount: Number(row.likes_count ?? 0),
    commentCount,
    author: row.author?.display_name || row.author?.username || 'Unknown',
    authorHandle: row.author?.username ? `@${row.author.username}` : '',
    authorAvatarUrl: row.author?.avatar_url,
    authorIsMllPro: Boolean(row.author?.is_mll_pro),
    source: 'global',
  };
}

function mapTeamPostRow(row: any): PostResult {
  const teamName = row.team?.name ?? 'Team post';
  const teamSlug = row.team?.slug ?? null;

  return {
    id: row.id,
    authorId: row.author?.id ?? '',
    text: row.text_content ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    mediaUrl: row.media_url,
    likeCount: Number(row.reaction_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    author: row.author?.display_name || row.author?.username || 'Unknown',
    authorHandle: row.author?.username ? `@${row.author.username}` : '',
    authorAvatarUrl: row.author?.avatar_url,
    authorIsMllPro: Boolean(row.author?.is_mll_pro),
    source: 'team',
    contextLabel: teamSlug ? `Team • ${teamName}` : 'Team post',
    contextHref: teamSlug ? `/teams/${teamSlug}?postId=${row.id}` : undefined,
    teamSlug,
    teamName,
  };
}

function mapTeamRow(row: any): TeamResult {
  return {
    id: row.id,
    name: row.name ?? 'New team',
    slug: row.slug ?? row.id,
    description: row.description,
    avatarUrl: row.icon_url || row.banner_url || null,
    memberCount: Number(row.approved_member_count ?? 0),
  };
}

function mapLiveRow(row: any): LiveResult {
  return {
    id: row.id,
    username: row.username || 'unknown',
    displayName: row.display_name || row.username || 'Live creator',
    avatarUrl: row.avatar_url,
    viewerCount: Number(row.viewer_count ?? row.current_viewer_count ?? 0),
    isLive: Boolean(row.is_live),
  };
}

function validateResponse(error: any, source: string) {
  if (error) {
    const message = error.message ?? 'Unknown Supabase error';
    throw new Error(`Search query failed for ${source}: ${message}`);
  }
}

function mapMusicTrackRow(row: any): MusicTrackResult {
  return {
    id: row.id,
    title: row.title ?? 'Untitled Track',
    artistName: row.artist_name,
    audioUrl: row.audio_url ?? '',
    profileId: row.profile?.id ?? '',
    profileUsername: row.profile?.username ?? 'unknown',
    profileDisplayName: row.profile?.display_name,
    profileAvatarUrl: row.profile?.avatar_url,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapMusicVideoRow(row: any): MusicVideoResult {
  return {
    id: row.id,
    title: row.title ?? 'Untitled Video',
    videoType: row.video_type ?? 'upload',
    videoUrl: row.video_url,
    youtubeId: row.youtube_id,
    profileId: row.profile?.id ?? '',
    profileUsername: row.profile?.username ?? 'unknown',
    profileDisplayName: row.profile?.display_name,
    profileAvatarUrl: row.profile?.avatar_url,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapCommentRow(row: any): CommentResult {
  return {
    id: String(row.id),
    content: row.text_content ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    postId: row.post_id ?? '',
    postText: row.post?.text_content?.slice(0, 100),
    authorId: row.author_id ?? '',
    authorUsername: row.author?.username ?? 'unknown',
    authorDisplayName: row.author?.display_name,
    authorAvatarUrl: row.author?.avatar_url,
  };
}

function emptyResults(): SearchResultsBundle {
  return {
    people: [],
    posts: [],
    teams: [],
    live: [],
    music: [],
    videos: [],
    comments: [],
  };
}
