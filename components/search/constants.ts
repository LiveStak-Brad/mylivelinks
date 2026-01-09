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
  Music,
  Video,
} from 'lucide-react';
import type { PersonResult, PostResult, TeamResult, LiveResult } from '@/types/search';

export type SearchTab =
  | 'top'
  | 'people'
  | 'posts'
  | 'teams'
  | 'live'
  | 'media'
  | 'music'
  | 'videos'
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
  {
    id: 'media',
    label: 'Media',
    description: 'Photos and videos',
    icon: Video,
  },
  {
    id: 'music',
    label: 'Music',
    description: 'Tracks and audio',
    icon: Music,
  },
  {
    id: 'videos',
    label: 'Music Videos',
    description: 'Music videos',
    icon: Video,
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
  media: '/search/media',
  music: '/search/music',
  videos: '/search/videos',
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

export const SEARCH_RECENTS_STORAGE_KEY = 'mylivelinks.search.recents';

export const MOCK_SUGGESTED_QUERIES = [
  'Verified creators in LA',
  'Upcoming music lives',
  'Teams for artists',
];

export const QUICK_JUMP_TARGETS: SearchTab[] = ['people', 'posts', 'teams', 'live'];

export interface SearchablePage {
  id: string;
  name: string;
  aliases: string[];
  route: string;
  description: string;
  icon: 'home' | 'tv' | 'users' | 'trophy' | 'heart' | 'settings' | 'wallet' | 'music' | 'video' | 'compass' | 'gift' | 'crown' | 'star' | 'message';
}

export const SEARCHABLE_PAGES: SearchablePage[] = [
  { id: 'home', name: 'Home', aliases: ['main', 'landing'], route: '/', description: 'Home page', icon: 'home' },
  { id: 'feed', name: 'Feed', aliases: ['timeline', 'posts', 'social'], route: '/feed', description: 'Your social feed', icon: 'compass' },
  { id: 'livetv', name: 'LiveTV', aliases: ['live tv', 'tv', 'streams', 'streaming', 'broadcast', 'watch'], route: '/liveTV', description: 'Watch live streams', icon: 'tv' },
  { id: 'teams', name: 'Teams', aliases: ['communities', 'groups', 'clubs'], route: '/teams', description: 'Browse and join teams', icon: 'users' },
  { id: 'leaderboards', name: 'Leaderboards', aliases: ['leaderboard', 'rankings', 'top creators', 'leaders', 'rank'], route: '/leaderboards', description: 'Top creators and gifters', icon: 'trophy' },
  { id: 'link', name: 'Link', aliases: ['link or nah', 'dating', 'connections', 'matches'], route: '/link', description: 'Link or Nah - Find connections', icon: 'heart' },
  { id: 'trending', name: 'Trending', aliases: ['popular', 'hot', 'viral'], route: '/trending', description: 'Trending content', icon: 'star' },
  { id: 'wallet', name: 'Wallet', aliases: ['coins', 'balance', 'money', 'earnings', 'payments', 'diamonds'], route: '/wallet', description: 'Your wallet and earnings', icon: 'wallet' },
  { id: 'gifter-levels', name: 'Gifter Levels', aliases: ['gifter', 'gifts', 'gifting', 'levels', 'tiers'], route: '/gifter-levels', description: 'Gifter level rewards', icon: 'gift' },
  { id: 'settings', name: 'Settings', aliases: ['preferences', 'account', 'options', 'config', 'profile settings'], route: '/settings', description: 'Account settings', icon: 'settings' },
  { id: 'messages', name: 'Messages', aliases: ['inbox', 'dms', 'chat', 'conversations'], route: '/messages', description: 'Your messages', icon: 'message' },
  { id: 'noties', name: 'Notifications', aliases: ['alerts', 'noties', 'notifs', 'notifications'], route: '/noties', description: 'Your notifications', icon: 'star' },
  { id: 'mll-pro', name: 'MLL Pro', aliases: ['premium', 'subscription', 'upgrade', 'mll pro', 'mylivelinks pro', 'pro'], route: '/mll-pro', description: 'Upgrade to MLL Pro', icon: 'crown' },
  { id: 'referrals', name: 'Referrals', aliases: ['refer', 'invite friends', 'share'], route: '/referrals', description: 'Refer friends and earn', icon: 'gift' },
];
