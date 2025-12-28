/**
 * Profile Type Configuration & Mapping (WEB)
 * 
 * Central configuration for conditional rendering based on profile_type.
 * Defines which tabs, sections, and quick actions are available per type.
 * 
 * PARITY: This config is a direct port from mobile/config/profileTypeConfig.ts
 * Mobile is the reference. Web mirrors it exactly.
 * 
 * NOTE: This currently uses mock/placeholder data. Once the Logic Manager
 * provides real data, simply replace the mock providers with real API calls.
 */

export type ProfileType = 
  | 'streamer'
  | 'musician' 
  | 'comedian'
  | 'business'
  | 'creator';

// ============================================================================
// TABS DEFINITION
// ============================================================================

export type ProfileTab = 'info' | 'feed' | 'reels' | 'photos' | 'videos' | 'music' | 'events' | 'products';

export interface TabConfig {
  id: ProfileTab;
  label: string;
  icon: string; // Lucide icon name for web
  enabled: boolean;
}

// ============================================================================
// SECTIONS DEFINITION
// ============================================================================

export type ProfileSection = 
  | 'hero'
  | 'social_counts'
  | 'top_supporters'
  | 'top_streamers'
  | 'social_media'
  | 'connections'
  | 'links'
  | 'profile_stats'
  | 'streaming_stats'
  | 'music_showcase'
  | 'upcoming_events'
  | 'merchandise'
  | 'portfolio'
  | 'business_info'
  | 'footer';

export interface SectionConfig {
  id: ProfileSection;
  enabled: boolean;
  order: number; // Display order (lower = earlier)
}

// ============================================================================
// QUICK ACTIONS DEFINITION
// ============================================================================

export type QuickAction = 
  | 'follow'
  | 'message'
  | 'share'
  | 'stats'
  | 'book_event'
  | 'view_portfolio'
  | 'contact_business'
  | 'tip'
  | 'subscribe';

export interface QuickActionConfig {
  id: QuickAction;
  label: string;
  icon: string; // Lucide icon name for web
  enabled: boolean;
  primary?: boolean; // Primary action (e.g., Follow button)
}

// ============================================================================
// PROFILE TYPE CONFIGURATION
// ============================================================================

export interface ProfileTypeConfig {
  tabs: TabConfig[];
  sections: SectionConfig[];
  quickActions: QuickActionConfig[];
}

export const PROFILE_TYPE_CONFIG: Record<ProfileType, ProfileTypeConfig> = {
  // ========================================================================
  // STREAMER
  // ========================================================================
  streamer: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'Info', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'LayoutGrid', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'Clapperboard', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'Image', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'Video', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'top_supporters', enabled: true, order: 3 },
      { id: 'top_streamers', enabled: true, order: 4 },
      { id: 'streaming_stats', enabled: true, order: 5 },
      { id: 'social_media', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'links', enabled: true, order: 8 },
      { id: 'profile_stats', enabled: true, order: 9 },
      { id: 'footer', enabled: true, order: 10 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'UserPlus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'MessageCircle', enabled: true },
      { id: 'tip', label: 'Tip', icon: 'DollarSign', enabled: true },
      { id: 'share', label: 'Share', icon: 'Share2', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'BarChart3', enabled: true },
    ],
  },

  // ========================================================================
  // MUSICIAN
  // ========================================================================
  musician: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'Info', enabled: true },
      { id: 'music', label: 'Music', icon: 'Music', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'Video', enabled: true },
      { id: 'events', label: 'Events', icon: 'Calendar', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'Image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'music_showcase', enabled: true, order: 2 },
      { id: 'upcoming_events', enabled: true, order: 3 },
      { id: 'social_counts', enabled: true, order: 4 },
      { id: 'social_media', enabled: true, order: 5 },
      { id: 'merchandise', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'links', enabled: true, order: 8 },
      { id: 'footer', enabled: true, order: 9 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'UserPlus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'MessageCircle', enabled: true },
      { id: 'book_event', label: 'Book', icon: 'Calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'Share2', enabled: true },
    ],
  },

  // ========================================================================
  // COMEDIAN
  // ========================================================================
  comedian: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'Info', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'Video', enabled: true },
      { id: 'events', label: 'Shows', icon: 'Calendar', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'Image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'upcoming_events', enabled: true, order: 2 },
      { id: 'social_counts', enabled: true, order: 3 },
      { id: 'social_media', enabled: true, order: 4 },
      { id: 'merchandise', enabled: true, order: 5 },
      { id: 'connections', enabled: true, order: 6 },
      { id: 'links', enabled: true, order: 7 },
      { id: 'footer', enabled: true, order: 8 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'UserPlus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'MessageCircle', enabled: true },
      { id: 'book_event', label: 'Book Show', icon: 'Calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'Share2', enabled: true },
    ],
  },

  // ========================================================================
  // BUSINESS
  // ========================================================================
  business: {
    tabs: [
      { id: 'info', label: 'About', icon: 'Info', enabled: true },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: true },
      { id: 'photos', label: 'Gallery', icon: 'Image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'business_info', enabled: true, order: 2 },
      { id: 'portfolio', enabled: true, order: 3 },
      { id: 'social_counts', enabled: true, order: 4 },
      { id: 'social_media', enabled: true, order: 5 },
      { id: 'links', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'footer', enabled: true, order: 8 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'UserPlus', enabled: true, primary: true },
      { id: 'contact_business', label: 'Contact', icon: 'Mail', enabled: true },
      { id: 'share', label: 'Share', icon: 'Share2', enabled: true },
    ],
  },

  // ========================================================================
  // CREATOR (Default)
  // ========================================================================
  creator: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'Info', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'LayoutGrid', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'Clapperboard', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'Image', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'Video', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'social_media', enabled: true, order: 3 },
      { id: 'portfolio', enabled: true, order: 4 },
      { id: 'connections', enabled: true, order: 5 },
      { id: 'links', enabled: true, order: 6 },
      { id: 'profile_stats', enabled: true, order: 7 },
      { id: 'footer', enabled: true, order: 8 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'UserPlus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'MessageCircle', enabled: true },
      { id: 'share', label: 'Share', icon: 'Share2', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'BarChart3', enabled: true },
    ],
  },

};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a specific profile type
 * Falls back to 'creator' if profile_type is missing/null/invalid
 */
export function getProfileTypeConfig(profileType?: ProfileType): ProfileTypeConfig {
  if (!profileType || !PROFILE_TYPE_CONFIG[profileType]) {
    return PROFILE_TYPE_CONFIG.creator;
  }
  return PROFILE_TYPE_CONFIG[profileType];
}

/**
 * Get enabled tabs for a profile type
 */
export function getEnabledTabs(profileType?: ProfileType): TabConfig[] {
  const config = getProfileTypeConfig(profileType);
  return config.tabs.filter(tab => tab.enabled);
}

/**
 * Get enabled sections for a profile type (sorted by order)
 */
export function getEnabledSections(profileType?: ProfileType): SectionConfig[] {
  const config = getProfileTypeConfig(profileType);
  return config.sections
    .filter(section => section.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get enabled quick actions for a profile type
 */
export function getEnabledQuickActions(profileType?: ProfileType): QuickActionConfig[] {
  const config = getProfileTypeConfig(profileType);
  return config.quickActions.filter(action => action.enabled);
}

/**
 * Check if a specific section is enabled for a profile type
 */
export function isSectionEnabled(section: ProfileSection, profileType?: ProfileType): boolean {
  const config = getProfileTypeConfig(profileType);
  const sectionConfig = config.sections.find(s => s.id === section);
  return sectionConfig?.enabled ?? false;
}

/**
 * Check if a specific tab is enabled for a profile type
 */
export function isTabEnabled(tab: ProfileTab, profileType?: ProfileType): boolean {
  const config = getProfileTypeConfig(profileType);
  const tabConfig = config.tabs.find(t => t.id === tab);
  return tabConfig?.enabled ?? false;
}

