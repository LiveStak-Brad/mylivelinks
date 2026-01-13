/**
 * Profile Type Definitions (MOBILE)
 * 
 * Extended type definitions for profile data matching web implementation.
 * This ensures mobile and web have identical data contracts.
 */

import { ProfileType, ProfileTab, ProfileSection } from '../config/profileTypeConfig';

export type GenderEnum = 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say';

export interface ProfileData {
  profile: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    is_live: boolean;
    live_stream_id?: number | null;
    follower_count: number;
    total_gifts_received: number;
    total_gifts_sent: number;
    created_at: string;
    profile_type?: ProfileType | null;
    gender?: GenderEnum | null;
    
    // Module & Tab Customization
    enabled_modules?: ProfileSection[] | null;
    enabled_tabs?: ProfileTab[] | null;
    
    // Visual Customization
    profile_bg_url?: string | null;
    profile_bg_overlay?: string | null;
    card_color?: string | null;
    card_opacity?: number | null;
    card_border_radius?: string | null;
    font_preset?: string | null;
    accent_color?: string | null;
    button_color?: string | null;
    content_text_color?: string | null;
    ui_text_color?: string | null;
    link_color?: string | null;
    links_section_title?: string | null;
    
    // Social Media Links
    social_instagram?: string | null;
    social_twitter?: string | null;
    social_youtube?: string | null;
    social_tiktok?: string | null;
    social_facebook?: string | null;
    social_twitch?: string | null;
    social_discord?: string | null;
    social_snapchat?: string | null;
    social_linkedin?: string | null;
    social_github?: string | null;
    social_spotify?: string | null;
    social_onlyfans?: string | null;
    
    // Display Preferences
    hide_streaming_stats?: boolean | null;
    
    // Top Friends Customization
    show_top_friends?: boolean | null;
    top_friends_title?: string | null;
    top_friends_avatar_style?: 'circle' | 'square' | null;
    top_friends_max_count?: number | null;
    
    // Location
    location_zip?: string | null;
    location_city?: string | null;
    location_region?: string | null;
    location_country?: string | null;
    location_label?: string | null;
    location_hidden?: boolean | null;
    location_show_zip?: boolean | null;
    location_updated_at?: string | null;
    
    // Private (only if owner)
    coin_balance?: number | null;
    earnings_balance?: number | null;
    
    // MLL PRO
    is_mll_pro?: boolean | null;
    
    // Gifting Stats
    lifetime_coins_gifted?: number | null;
  };
  
  // Gifter Status Mapping
  gifter_statuses?: Record<string, {
    tier: string;
    level: number;
    badge_color: string;
    badge_icon: string;
  }>;
  
  // Links
  links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string | null;
    click_count: number;
    display_order: number;
  }>;
  
  // Adult Links (18+ consent required)
  adult_links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string | null;
    click_count: number;
    display_order: number;
    adult_category?: string | null;
    requires_warning: boolean;
  }>;
  show_adult_section: boolean;
  
  // Social Counts
  follower_count: number;
  following_count: number;
  friends_count: number;
  relationship: 'none' | 'following' | 'followed_by' | 'friends';
  
  // Top Supporters (Gifters)
  top_supporters: Array<{
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    total_gifted: number;
  }>;
  
  // Top Streamers (Earners)
  top_streamers: Array<{
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    is_live: boolean;
    diamonds_earned_lifetime: number;
    peak_viewers: number;
    total_streams: number;
  }>;
  
  // Streaming Stats
  stream_stats: {
    total_streams: number;
    total_minutes_live: number;
    total_viewers: number;
    peak_viewers: number;
    diamonds_earned_lifetime: number;
    diamonds_earned_7d: number;
    followers_gained_from_streams: number;
    last_stream_at?: string | null;
  };
  
  // Gamification
  streak_days?: number | null;
  gifter_rank?: number | null;
  streamer_rank?: number | null;
}

// Top Friends
export interface TopFriend {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_live: boolean;
  display_order: number;
}

// Music Track
export interface MusicTrack {
  id: number;
  profile_id: string;
  title: string;
  artist_name?: string | null;
  audio_url: string;
  cover_art_url?: string | null;
  duration_seconds?: number | null;
  play_count: number;
  display_order: number;
  created_at: string;
}

// Music Video
export interface MusicVideo {
  id: number;
  profile_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url?: string | null;
  display_order: number;
  created_at: string;
}

// Event
export interface ProfileEvent {
  id: number;
  profile_id: string;
  title: string;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  url?: string | null;
  notes?: string | null;
  created_at: string;
}

// Comedy Special
export interface ComedySpecial {
  id: number;
  profile_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  display_order: number;
  created_at: string;
}

// Portfolio Item
export interface PortfolioItem {
  id: number;
  profile_id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  media_type: 'image' | 'video' | 'link';
  media_url: string;
  thumbnail_url?: string | null;
  display_order: number;
  created_at: string;
}

// Business Info
export interface BusinessInfo {
  profile_id: string;
  business_name?: string | null;
  business_hours?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  services?: string | null;
  updated_at: string;
}

// Schedule Item
export interface ScheduleItem {
  id: number;
  profile_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time?: string | null;
  description?: string | null;
  created_at: string;
}

// Referral Stats
export interface ReferralStats {
  total_referrals: number;
  active_conversions: number;
  pending_conversions: number;
  referral_code: string;
  referral_url: string;
}
