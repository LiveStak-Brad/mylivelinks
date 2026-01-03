'use client';

import {
  LucideIcon,
  Users,
  Hash,
  Newspaper,
  Radio,
  Sparkles,
  Link2,
  HeartHandshake,
  MessagesSquare,
} from 'lucide-react';

export type SearchTab =
  | 'top'
  | 'people'
  | 'posts'
  | 'teams'
  | 'live'
  | 'link'
  | 'dating'
  | 'messages';

export interface SearchTabDefinition {
  id: SearchTab;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PRIMARY_TABS: SearchTabDefinition[] = [
  {
    id: 'top',
    label: 'Top',
    description: 'Best blended matches',
    icon: Sparkles,
  },
  {
    id: 'people',
    label: 'People',
    description: 'Creators, friends, connections',
    icon: Users,
  },
  {
    id: 'posts',
    label: 'Posts',
    description: 'Social + community posts',
    icon: Newspaper,
  },
  {
    id: 'teams',
    label: 'Teams',
    description: 'Communities and clubs',
    icon: Hash,
  },
  {
    id: 'live',
    label: 'Live',
    description: 'Streams + live rooms',
    icon: Radio,
  },
];

export const MORE_TABS: SearchTabDefinition[] = [
  {
    id: 'link',
    label: 'Link',
    description: 'Link or Nah profiles + mutuals',
    icon: Link2,
  },
  {
    id: 'dating',
    label: 'Dating',
    description: 'Opt-in dating lane',
    icon: HeartHandshake,
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Private message history',
    icon: MessagesSquare,
  },
];

export const TAB_TO_ROUTE: Record<SearchTab, string> = {
  top: '/search',
  people: '/search/people',
  posts: '/search/posts',
  teams: '/search/teams',
  live: '/search/live',
  link: '/search',
  dating: '/search',
  messages: '/search',
};

export type SearchFilterKey = 'verified' | 'online' | 'live' | 'following';

export interface SearchFilterToggle {
  id: SearchFilterKey;
  label: string;
  appliesTo: SearchTab[] | 'all';
}

export const FILTER_TOGGLES: SearchFilterToggle[] = [
  { id: 'verified', label: 'Verified', appliesTo: ['people'] },
  { id: 'online', label: 'Online Now', appliesTo: ['people'] },
  { id: 'live', label: 'Live Now', appliesTo: ['live'] },
  { id: 'following', label: 'Following Only', appliesTo: 'all' },
];

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

export const SEARCH_RECENTS_STORAGE_KEY = 'mylivelinks.search.recents';

export const MOCK_SUGGESTED_QUERIES = [
  'Verified creators in LA',
  'Upcoming music lives',
  'Teams for artists',
];

export const QUICK_JUMP_TARGETS: SearchTab[] = ['people', 'posts', 'teams', 'live'];
