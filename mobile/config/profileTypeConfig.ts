/**
 * Profile Type Configuration & Mapping
 * 
 * Central configuration for conditional rendering based on profile_type.
 * Defines which tabs, sections, and quick actions are available per type.
 * 
 * NOTE: This currently uses mock/placeholder data. Once the Logic Manager
 * provides real data, simply replace the mock providers with real API calls.
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

export type ProfileTab = 'info' | 'feed' | 'reels' | 'photos' | 'videos' | 'music' | 'events' | 'products';

export interface TabConfig {
  id: ProfileTab;
  label: string;
  icon: string; // Ionicons name
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
  icon: string; // Ionicons name
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
      { id: 'info', label: 'Info', icon: 'information-circle', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'albums', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'film', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'images', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'videocam', enabled: true },
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
      { id: 'links', enabled: true, order: 9 },
      { id: 'profile_stats', enabled: true, order: 10 },
      { id: 'footer', enabled: true, order: 11 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'chatbubble', enabled: true },
      { id: 'tip', label: 'Tip', icon: 'cash', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'bar-chart', enabled: true },
    ],
  },

  // ========================================================================
  // MUSICIAN
  // ========================================================================
  musician: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'information-circle', enabled: true },
      { id: 'music', label: 'Music', icon: 'musical-notes', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'videocam', enabled: true },
      { id: 'events', label: 'Events', icon: 'calendar', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'images', enabled: true },
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
      { id: 'links', enabled: true, order: 9 },
      { id: 'footer', enabled: true, order: 10 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'chatbubble', enabled: true },
      { id: 'book_event', label: 'Book', icon: 'calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
    ],
  },

  // ========================================================================
  // COMEDIAN
  // ========================================================================
  comedian: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'information-circle', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'videocam', enabled: true },
      { id: 'events', label: 'Shows', icon: 'calendar', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'images', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'upcoming_events', enabled: true, order: 2 },
      { id: 'social_counts', enabled: true, order: 3 },
      { id: 'social_media', enabled: true, order: 4 },
      { id: 'merchandise', enabled: true, order: 5 },
      { id: 'connections', enabled: true, order: 6 },
      { id: 'referral_network', enabled: true, order: 7 },
      { id: 'links', enabled: true, order: 8 },
      { id: 'footer', enabled: true, order: 9 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'chatbubble', enabled: true },
      { id: 'book_event', label: 'Book Show', icon: 'calendar', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
    ],
  },

  // ========================================================================
  // BUSINESS
  // ========================================================================
  business: {
    tabs: [
      { id: 'info', label: 'About', icon: 'information-circle', enabled: true },
      { id: 'products', label: 'Products', icon: 'cart', enabled: true },
      { id: 'photos', label: 'Gallery', icon: 'images', enabled: true },
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
      { id: 'footer', enabled: true, order: 9 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'contact_business', label: 'Contact', icon: 'mail', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
    ],
  },

  // ========================================================================
  // CREATOR (Default)
  // ========================================================================
  creator: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'information-circle', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'albums', enabled: true },
      { id: 'reels', label: 'Vlog', icon: 'film', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'images', enabled: true },
      { id: 'videos', label: 'Videos', icon: 'videocam', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'social_media', enabled: true, order: 3 },
      // Creator: allow editable portfolio/products (real blocks-backed section)
      { id: 'portfolio', enabled: true, order: 4 },
      { id: 'connections', enabled: true, order: 5 },
      { id: 'referral_network', enabled: true, order: 6 },
      { id: 'links', enabled: true, order: 7 },
      { id: 'profile_stats', enabled: true, order: 8 },
      { id: 'footer', enabled: true, order: 9 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'chatbubble', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
      { id: 'stats', label: 'Stats', icon: 'bar-chart', enabled: true },
    ],
  },

  // ========================================================================
  // DEFAULT (Fallback)
  // ========================================================================
  default: {
    tabs: [
      { id: 'info', label: 'Info', icon: 'information-circle', enabled: true },
      { id: 'feed', label: 'Feed', icon: 'albums', enabled: true },
      { id: 'photos', label: 'Photos', icon: 'images', enabled: true },
    ],
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_counts', enabled: true, order: 2 },
      { id: 'social_media', enabled: true, order: 3 },
      { id: 'connections', enabled: true, order: 4 },
      { id: 'links', enabled: true, order: 5 },
      { id: 'footer', enabled: true, order: 6 },
    ],
    quickActions: [
      { id: 'follow', label: 'Follow', icon: 'person-add', enabled: true, primary: true },
      { id: 'message', label: 'Message', icon: 'chatbubble', enabled: true },
      { id: 'share', label: 'Share', icon: 'share-outline', enabled: true },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a specific profile type
 */
export function getProfileTypeConfig(profileType?: ProfileType): ProfileTypeConfig {
  if (!profileType || !PROFILE_TYPE_CONFIG[profileType]) {
    return PROFILE_TYPE_CONFIG.default;
  }
  return PROFILE_TYPE_CONFIG[profileType];
}

/**
 * Get enabled tabs for a profile type
 */
/**
 * Get enabled tabs for a profile type
 * If customEnabledTabs is provided, use that instead of profile_type defaults
 */
export function getEnabledTabs(
  profileType?: ProfileType,
  customEnabledTabs?: ProfileTab[] | null
): TabConfig[] {
  const config = getProfileTypeConfig(profileType);
  
  // If user has custom enabled tabs, use those
  if (customEnabledTabs && customEnabledTabs.length > 0) {
    return config.tabs.filter(tab => customEnabledTabs.includes(tab.id));
  }
  
  // Otherwise use profile_type defaults
  return config.tabs.filter(tab => tab.enabled);
}

/**
 * Get enabled sections for a profile type (sorted by order)
 * If customEnabledSections is provided, use that instead of profile_type defaults
 */
export function getEnabledSections(
  profileType?: ProfileType, 
  customEnabledSections?: ProfileSection[] | null
): SectionConfig[] {
  // If custom list exists, use it (respecting order from config)
  if (customEnabledSections && customEnabledSections.length > 0) {
    const config = getProfileTypeConfig(profileType);
    const customSet = new Set(customEnabledSections);
    return config.sections
      .filter(section => customSet.has(section.id))
      .sort((a, b) => a.order - b.order);
  }
  
  // Fallback to profile_type defaults
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
 * Core sections (hero, footer) ALWAYS return true - these are non-removable shell elements
 * ALL other sections (including social_media, links, social_counts) are FULLY CUSTOMIZABLE
 * 
 * CRITICAL: When user has customEnabledModules set (even empty array), profile_type defaults are BYPASSED
 * This allows ANY user to add/remove ANY module regardless of their profile type
 */
export function isSectionEnabled(
  section: ProfileSection, 
  profileType?: ProfileType,
  customEnabledModules?: ProfileSection[] | null
): boolean {
  // Core sections are ALWAYS enabled (not customizable)
  // ONLY hero and footer are truly locked - everything else is optional
  const CORE_SECTIONS: ProfileSection[] = ['hero', 'footer'];
  if (CORE_SECTIONS.includes(section)) {
    return true;
  }
  
  // For optional modules, check custom list if provided
  // Important: Check for null/undefined explicitly - empty array [] means "disable all optional"
  // When customEnabledModules is set, we COMPLETELY BYPASS profile_type defaults
  if (customEnabledModules !== null && customEnabledModules !== undefined) {
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
export function isTabEnabled(tab: ProfileTab, profileType?: ProfileType): boolean {
  const config = getProfileTypeConfig(profileType);
  const tabConfig = config.tabs.find(t => t.id === tab);
  return tabConfig?.enabled ?? false;
}



