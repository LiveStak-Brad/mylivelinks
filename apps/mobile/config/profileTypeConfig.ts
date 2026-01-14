/**
 * Profile Type Configuration (MOBILE)
 * 
 * Central configuration for conditional rendering based on profile_type.
 * Defines which tabs, sections, and quick actions are available per type.
 * 
 * PARITY: This is a direct port from web's lib/profileTypeConfig.ts
 * Web is the reference. Mobile mirrors it exactly.
 */

export type ProfileType = 
  | 'streamer'
  | 'musician' 
  | 'comedian'
  | 'business'
  | 'creator'
  | 'default';

// ============================================================================
// TABS DEFINITION
// ============================================================================

export type ProfileTab = 'info' | 'feed' | 'reels' | 'media' | 'music_videos' | 'music' | 'events' | 'products' | 'podcasts' | 'series' | 'education';

export interface TabConfig {
  id: ProfileTab;
  label: string;
  icon: string; // Feather/Ionicons icon name
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
  | 'referral_network'
  | 'top_friends'
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
  icon: string; // Feather/Ionicons icon name
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
      { id: 'info', label: 'Info', icon: 'info', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'grid', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'film', enabled: true },
      { id: 'media', label: 'Media', icon: 'image', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'music', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'top_supporters', enabled: true, order: 3 },
      { id: 'top_streamers', enabled: true, order: 4 },
      { id: 'streaming_stats', enabled: true, order: 5 },
      { id: 'social_media', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'referral_network', enabled: true, order: 8 },
      { id: 'top_friends', enabled: true, order: 9 },
      { id: 'links', enabled: true, order: 10 },
      { id: 'profile_stats', enabled: true, order: 11 },
      { id: 'footer', enabled: true, order: 12 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'message-circle', enabled: true },
      { id: 'tip', label: 'Tip', icon: 'dollar-sign', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'bar-chart-2', enabled: true },
    ],
  },

  // ========================================================================
  // MUSICIAN
  // ========================================================================
  musician: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'info', enabled: true },
      { id: 'music', label: 'Music', icon: 'music', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'music', enabled: true },
      { id: 'events', label: 'Events', icon: 'calendar', enabled: true },
      { id: 'media', label: 'Media', icon: 'image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'music_showcase', enabled: true, order: 2 },
      { id: 'upcoming_events', enabled: true, order: 3 },
      { id: 'social_counts', enabled: true, order: 4 },
      { id: 'social_media', enabled: true, order: 5 },
      { id: 'merchandise', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'referral_network', enabled: true, order: 8 },
      { id: 'top_friends', enabled: true, order: 9 },
      { id: 'links', enabled: true, order: 10 },
      { id: 'footer', enabled: true, order: 11 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'message-circle', enabled: true },
      { id: 'book_event', label: 'Book', icon: 'calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
    ],
  },

  // ========================================================================
  // COMEDIAN
  // ========================================================================
  comedian: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'info', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'music', enabled: true },
      { id: 'events', label: 'Shows', icon: 'calendar', enabled: true },
      { id: 'media', label: 'Media', icon: 'image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'upcoming_events', enabled: true, order: 2 },
      { id: 'social_counts', enabled: true, order: 3 },
      { id: 'social_media', enabled: true, order: 4 },
      { id: 'merchandise', enabled: true, order: 5 },
      { id: 'connections', enabled: true, order: 6 },
      { id: 'referral_network', enabled: true, order: 7 },
      { id: 'top_friends', enabled: true, order: 8 },
      { id: 'links', enabled: true, order: 9 },
      { id: 'footer', enabled: true, order: 10 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'message-circle', enabled: true },
      { id: 'book_event', label: 'Book Show', icon: 'calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
    ],
  },

  // ========================================================================
  // BUSINESS
  // ========================================================================
  business: {
    tabs: [
      { id: 'info', label: 'About', icon: 'info', enabled: true },
      { id: 'products', label: 'Products', icon: 'shopping-cart', enabled: true },
      { id: 'media', label: 'Gallery', icon: 'image', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'business_info', enabled: true, order: 2 },
      { id: 'portfolio', enabled: true, order: 3 },
      { id: 'social_counts', enabled: true, order: 4 },
      { id: 'social_media', enabled: true, order: 5 },
      { id: 'links', enabled: true, order: 6 },
      { id: 'connections', enabled: true, order: 7 },
      { id: 'referral_network', enabled: true, order: 8 },
      { id: 'top_friends', enabled: true, order: 9 },
      { id: 'footer', enabled: true, order: 10 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'contact_business', label: 'Contact', icon: 'mail', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
    ],
  },

  // ========================================================================
  // CREATOR (Default)
  // ========================================================================
  creator: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'info', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'grid', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'film', enabled: true },
      { id: 'media', label: 'Media', icon: 'image', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'music', enabled: true },
      { id: 'podcasts', label: 'Podcasts', icon: 'mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'layers', enabled: false },
      { id: 'education', label: 'Education', icon: 'book-open', enabled: false },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'social_media', enabled: true, order: 3 },
      { id: 'portfolio', enabled: true, order: 4 },
      { id: 'connections', enabled: true, order: 5 },
      { id: 'referral_network', enabled: true, order: 6 },
      { id: 'top_friends', enabled: true, order: 7 },
      { id: 'links', enabled: true, order: 8 },
      { id: 'profile_stats', enabled: true, order: 9 },
      { id: 'footer', enabled: true, order: 10 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'message-circle', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'bar-chart-2', enabled: true },
    ],
  },

  // ========================================================================
  // DEFAULT (fallback for null/undefined profile_type)
  // ========================================================================
  default: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'info', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'grid', enabled: true },
      { id: 'media', label: 'Media', icon: 'image', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'music', enabled: true },
      { id: 'podcasts', label: 'Podcasts', icon: 'mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'layers', enabled: false },
      { id: 'education', label: 'Education', icon: 'book-open', enabled: false },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'social_media', enabled: true, order: 3 },
      { id: 'connections', enabled: true, order: 4 },
      { id: 'top_friends', enabled: true, order: 5 },
      { id: 'links', enabled: true, order: 6 },
      { id: 'footer', enabled: true, order: 7 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'user-plus', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'message-circle', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-2', enabled: true },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a specific profile type
 * Falls back to 'default' if profile_type is missing/null/invalid
 */
export function getProfileTypeConfig(profileType?: ProfileType | null): ProfileTypeConfig {
  if (!profileType || !PROFILE_TYPE_CONFIG[profileType]) {
    return PROFILE_TYPE_CONFIG.default;
  }
  return PROFILE_TYPE_CONFIG[profileType];
}

/**
 * Get enabled tabs for a profile type
 * If customEnabledTabs is provided, use that instead of profile_type defaults
 */
export function getEnabledTabs(
  profileType?: ProfileType | null,
  customEnabledTabs?: ProfileTab[] | null
): TabConfig[] {
  const config = getProfileTypeConfig(profileType);
  
  // If user has custom enabled tabs, use those
  // Note: empty array means user intentionally disabled all OPTIONAL tabs.
  if (Array.isArray(customEnabledTabs)) {
    // Map legacy tab IDs to new ones for backwards compatibility
    const mappedTabs = customEnabledTabs.map(tab => {
      if (tab === 'photos' as any) return 'media';
      if (tab === 'videos' as any) return 'music_videos';
      return tab;
    });
    const allowed = new Set<ProfileTab>(['info', ...mappedTabs]);
    return config.tabs.filter(tab => allowed.has(tab.id));
  }
  
  // Otherwise use profile_type defaults
  return config.tabs.filter(tab => tab.enabled);
}

/**
 * Get enabled sections for a profile type (sorted by order)
 * If customEnabledModules is provided, use that instead of profile_type defaults
 */
export function getEnabledSections(
  profileType?: ProfileType | null, 
  customEnabledModules?: ProfileSection[] | null
): SectionConfig[] {
  const config = getProfileTypeConfig(profileType);
  
  // If custom list exists, use it (respecting order from config)
  if (Array.isArray(customEnabledModules)) {
    const customSet = new Set(customEnabledModules);
    // Always include hero and footer (core sections)
    customSet.add('hero');
    customSet.add('footer');
    
    return config.sections
      .filter(section => customSet.has(section.id))
      .sort((a, b) => a.order - b.order);
  }
  
  // Fallback to profile_type defaults
  return config.sections
    .filter(section => section.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get enabled quick actions for a profile type
 */
export function getEnabledQuickActions(profileType?: ProfileType | null): QuickActionConfig[] {
  const config = getProfileTypeConfig(profileType);
  return config.quickActions.filter(action => action.enabled);
}

/**
 * Check if a specific section is enabled for a profile type
 * Core sections (hero, footer) ALWAYS return true - these are non-removable shell elements
 * ALL other sections are FULLY CUSTOMIZABLE
 * 
 * CRITICAL: When user has customEnabledModules set (even empty array), profile_type defaults are BYPASSED
 * This allows ANY user to add/remove ANY module regardless of their profile type
 */
export function isSectionEnabled(
  section: ProfileSection, 
  profileType?: ProfileType | null,
  customEnabledModules?: ProfileSection[] | null
): boolean {
  // Core sections are ALWAYS enabled (not customizable)
  const CORE_SECTIONS: ProfileSection[] = ['hero', 'footer'];
  if (CORE_SECTIONS.includes(section)) {
    return true;
  }
  
  // For optional modules, check custom list if provided
  // When customEnabledModules is set, we BYPASS profile_type defaults
  // Note: empty array means user intentionally disabled all OPTIONAL modules.
  if (Array.isArray(customEnabledModules)) {
    return customEnabledModules.includes(section);
  }

  // Fallback to profile_type defaults ONLY if user has never customized
  const config = getProfileTypeConfig(profileType);
  const sectionConfig = config.sections.find(s => s.id === section);
  return sectionConfig?.enabled ?? false;
}

/**
 * Check if a specific tab is enabled for a profile type
 */
export function isTabEnabled(
  tab: ProfileTab, 
  profileType?: ProfileType | null,
  customEnabledTabs?: ProfileTab[] | null
): boolean {
  // Info tab is always enabled
  if (tab === 'info') {
    return true;
  }
  
  // Check custom tabs if provided
  if (Array.isArray(customEnabledTabs)) {
    return customEnabledTabs.includes(tab);
  }
  
  // Fallback to profile_type defaults
  const config = getProfileTypeConfig(profileType);
  const tabConfig = config.tabs.find(t => t.id === tab);
  return tabConfig?.enabled ?? false;
}
