export interface PersonResult {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  mutualCount: number;
  verified: boolean;
  location?: string | null;
  online: boolean;
  status?: string | null;
  avatarColor: string;
  following?: boolean;
}

export type PostSource = 'global' | 'team';

export interface PostResult {
  id: string;
  author: string;
  authorHandle: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  mediaUrl?: string | null;
  source: PostSource;
  contextLabel?: string;
  contextHref?: string;
  teamSlug?: string | null;
  teamName?: string | null;
}

export interface TeamResult {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
}

export interface LiveResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  viewerCount: number;
  isLive: boolean;
  startsAt?: string | null;
}

export interface SearchResultsBundle {
  people: PersonResult[];
  posts: PostResult[];
  teams: TeamResult[];
  live: LiveResult[];
}

export type SearchResultCategory = keyof SearchResultsBundle;
