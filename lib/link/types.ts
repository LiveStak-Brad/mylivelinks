/**
 * Link Module Types
 * Shared types for Regular Link, Auto-Link, and Dating
 */

export interface LinkProfile {
  profile_id: string;
  enabled: boolean;
  bio?: string;
  location_text?: string;
  photos?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Joined from profiles
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface LinkSettings {
  profile_id: string;
  auto_link_on_follow: boolean;
  auto_link_require_approval: boolean;
  auto_link_policy: 'everyone';
  updated_at: string;
}

export interface LinkMutual {
  profile_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  location_text?: string;
  photos?: string[];
  tags?: string[];
  created_at: string;
  source: 'manual' | 'auto_follow';
}

export interface LinkDecisionResult {
  success: boolean;
  mutual: boolean;
}

export type {
  DatingProfile,
  DatingMatch,
  DatingDecisionResult,
} from './dating-types';

// Interest tags for UI
export const INTEREST_TAGS = [
  'Music', 'Gaming', 'Fitness', 'Business', 'Art', 'Tech',
  'Travel', 'Food', 'Sports', 'Fashion', 'Photography', 'Reading',
  'Movies', 'Cooking', 'Dancing', 'Yoga', 'Hiking', 'Pets'
];
