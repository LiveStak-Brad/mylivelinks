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

export type ProfileTab = 'info' | 'feed' | 'photos' | 'reels' | 'username_tv' | 'music_videos' | 'podcasts' | 'series' | 'movies' | 'education' | 'comedy' | 'music' | 'events' | 'products' | 'reposts' | 'highlights' | 'playlists';

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
  | 'music_videos'
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
      { id: 'photos', label: 'Media', icon: 'Image', enabled: true },
      { id: 'reels', label: 'Vlogs', icon: 'Clapperboard', enabled: true },
      { id: 'username_tv', label: 'TV', icon: 'Tv', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'Video', enabled: true },
      { id: 'podcasts', label: 'Podcasts', icon: 'Mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'Layers', enabled: false },
      { id: 'movies', label: 'Movies', icon: 'Clapperboard', enabled: false },
      { id: 'education', label: 'Education', icon: 'BookOpen', enabled: false },
      { id: 'comedy', label: 'Comedy', icon: 'Laugh', enabled: false },
      { id: 'music', label: 'Music', icon: 'Music', enabled: false },
      { id: 'events', label: 'Events', icon: 'Calendar', enabled: true },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: false },
      { id: 'playlists', label: 'Playlists', icon: 'ListVideo', enabled: false },
      { id: 'reposts', label: 'Reposts', icon: 'Repeat2', enabled: true },
      { id: 'highlights', label: 'Highlights', icon: 'Bookmark', enabled: true },
    ],
    // AUTHORITATIVE ORDER from Brad's notepad:
    // 1. Social Links, 2. Custom Links, 3. Top Friends, 4. Tab Bar (UI element),
    // 5. Info/About (always on, profile_stats inside), 6. Top Supporters, 7. Top Streamers,
    // 8. Merchandise, 9. Business Info, 10. Products, 11. Events, 12. Music Tracks,
    // 13. Streaming Stats, 14. Connections, 15. Referral Network
    // NOTE: social_counts belongs in TOP BANNER, profile_stats inside Info/About
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_media', enabled: true, order: 2 },      // 1. Social Links
      { id: 'links', enabled: true, order: 3 },             // 2. Custom Links
      { id: 'top_friends', enabled: true, order: 4 },       // 3. Top Friends
      { id: 'top_supporters', enabled: true, order: 5 },    // 6. Top Supporters
      { id: 'top_streamers', enabled: true, order: 6 },     // 7. Top Streamers
      { id: 'merchandise', enabled: true, order: 7 },       // 8. Merchandise
      { id: 'business_info', enabled: true, order: 8 },     // 9. Business Info
      { id: 'portfolio', enabled: true, order: 9 },         // 10. Products
      { id: 'upcoming_events', enabled: true, order: 10 },  // 11. Events
      { id: 'music_showcase', enabled: true, order: 11 },   // 12. Music Tracks
      { id: 'streaming_stats', enabled: true, order: 12 },  // 13. Streaming Stats
      { id: 'profile_stats', enabled: true, order: 12 },    // Legacy alias for streaming_stats
      { id: 'connections', enabled: true, order: 13 },      // 14. Connections
      { id: 'referral_network', enabled: true, order: 14 }, // 15. Referral Network
      { id: 'footer', enabled: true, order: 15 },
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
      { id: 'feed', label: 'Feed', icon: 'LayoutGrid', enabled: false },
      { id: 'photos', label: 'Media', icon: 'Image', enabled: true },
      { id: 'reels', label: 'Vlogs', icon: 'Clapperboard', enabled: false },
      { id: 'username_tv', label: 'TV', icon: 'Tv', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'Video', enabled: true },
      { id: 'podcasts', label: 'Podcasts', icon: 'Mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'Layers', enabled: false },
      { id: 'movies', label: 'Movies', icon: 'Clapperboard', enabled: false },
      { id: 'education', label: 'Education', icon: 'BookOpen', enabled: false },
      { id: 'comedy', label: 'Comedy', icon: 'Laugh', enabled: false },
      { id: 'music', label: 'Music', icon: 'Music', enabled: true },
      { id: 'events', label: 'Events', icon: 'Calendar', enabled: true },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: false },
      { id: 'playlists', label: 'Playlists', icon: 'ListVideo', enabled: false },
    ],
    // AUTHORITATIVE ORDER from Brad's notepad
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_media', enabled: true, order: 2 },
      { id: 'links', enabled: true, order: 3 },
      { id: 'top_friends', enabled: true, order: 4 },
      { id: 'top_supporters', enabled: true, order: 5 },
      { id: 'top_streamers', enabled: true, order: 6 },
      { id: 'merchandise', enabled: true, order: 7 },
      { id: 'business_info', enabled: true, order: 8 },
      { id: 'portfolio', enabled: true, order: 9 },
      { id: 'upcoming_events', enabled: true, order: 10 },
      { id: 'music_showcase', enabled: true, order: 11 },
      { id: 'streaming_stats', enabled: true, order: 12 },
      { id: 'profile_stats', enabled: true, order: 12 },    // Legacy alias for streaming_stats
      { id: 'connections', enabled: true, order: 13 },
      { id: 'referral_network', enabled: true, order: 14 },
      { id: 'footer', enabled: true, order: 15 },
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
      { id: 'feed', label: 'Feed', icon: 'LayoutGrid', enabled: false },
      { id: 'photos', label: 'Media', icon: 'Image', enabled: true },
      { id: 'reels', label: 'Vlogs', icon: 'Clapperboard', enabled: false },
      { id: 'username_tv', label: 'TV', icon: 'Tv', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'Video', enabled: false },
      { id: 'podcasts', label: 'Podcasts', icon: 'Mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'Layers', enabled: false },
      { id: 'movies', label: 'Movies', icon: 'Clapperboard', enabled: false },
      { id: 'education', label: 'Education', icon: 'BookOpen', enabled: false },
      { id: 'comedy', label: 'Comedy', icon: 'Laugh', enabled: true },
      { id: 'music', label: 'Music', icon: 'Music', enabled: false },
      { id: 'events', label: 'Shows', icon: 'Calendar', enabled: true },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: false },
      { id: 'playlists', label: 'Playlists', icon: 'ListVideo', enabled: false },
    ],
    // AUTHORITATIVE ORDER from Brad's notepad
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_media', enabled: true, order: 2 },
      { id: 'links', enabled: true, order: 3 },
      { id: 'top_friends', enabled: true, order: 4 },
      { id: 'top_supporters', enabled: true, order: 5 },
      { id: 'top_streamers', enabled: true, order: 6 },
      { id: 'merchandise', enabled: true, order: 7 },
      { id: 'business_info', enabled: true, order: 8 },
      { id: 'portfolio', enabled: true, order: 9 },
      { id: 'upcoming_events', enabled: true, order: 10 },
      { id: 'music_showcase', enabled: true, order: 11 },
      { id: 'streaming_stats', enabled: true, order: 12 },
      { id: 'profile_stats', enabled: true, order: 12 },    // Legacy alias for streaming_stats
      { id: 'connections', enabled: true, order: 13 },
      { id: 'referral_network', enabled: true, order: 14 },
      { id: 'footer', enabled: true, order: 15 },
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
      { id: 'feed', label: 'Feed', icon: 'LayoutGrid', enabled: false },
      { id: 'photos', label: 'Gallery', icon: 'Image', enabled: true },
      { id: 'reels', label: 'Vlogs', icon: 'Clapperboard', enabled: false },
      { id: 'username_tv', label: 'TV', icon: 'Tv', enabled: false },
      { id: 'music_videos', label: 'Music Videos', icon: 'Video', enabled: false },
      { id: 'podcasts', label: 'Podcasts', icon: 'Mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'Layers', enabled: false },
      { id: 'movies', label: 'Movies', icon: 'Clapperboard', enabled: false },
      { id: 'education', label: 'Education', icon: 'BookOpen', enabled: false },
      { id: 'comedy', label: 'Comedy', icon: 'Laugh', enabled: false },
      { id: 'music', label: 'Music', icon: 'Music', enabled: false },
      { id: 'events', label: 'Events', icon: 'Calendar', enabled: false },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: true },
      { id: 'playlists', label: 'Playlists', icon: 'ListVideo', enabled: false },
    ],
    // AUTHORITATIVE ORDER from Brad's notepad
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_media', enabled: true, order: 2 },
      { id: 'links', enabled: true, order: 3 },
      { id: 'top_friends', enabled: true, order: 4 },
      { id: 'top_supporters', enabled: true, order: 5 },
      { id: 'top_streamers', enabled: true, order: 6 },
      { id: 'merchandise', enabled: true, order: 7 },
      { id: 'business_info', enabled: true, order: 8 },
      { id: 'portfolio', enabled: true, order: 9 },
      { id: 'upcoming_events', enabled: true, order: 10 },
      { id: 'music_showcase', enabled: true, order: 11 },
      { id: 'streaming_stats', enabled: true, order: 12 },
      { id: 'profile_stats', enabled: true, order: 12 },    // Legacy alias for streaming_stats
      { id: 'connections', enabled: true, order: 13 },
      { id: 'referral_network', enabled: true, order: 14 },
      { id: 'footer', enabled: true, order: 15 },
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
      { id: 'photos', label: 'Media', icon: 'Image', enabled: true },
      { id: 'reels', label: 'Vlogs', icon: 'Clapperboard', enabled: true },
      { id: 'username_tv', label: 'TV', icon: 'Tv', enabled: true },
      { id: 'music_videos', label: 'Music Videos', icon: 'Video', enabled: true },
      { id: 'podcasts', label: 'Podcasts', icon: 'Mic', enabled: false },
      { id: 'series', label: 'Series', icon: 'Layers', enabled: false },
      { id: 'movies', label: 'Movies', icon: 'Clapperboard', enabled: false },
      { id: 'education', label: 'Education', icon: 'BookOpen', enabled: false },
      { id: 'comedy', label: 'Comedy', icon: 'Laugh', enabled: false },
      { id: 'music', label: 'Music', icon: 'Music', enabled: false },
      { id: 'events', label: 'Events', icon: 'Calendar', enabled: false },
      { id: 'products', label: 'Products', icon: 'ShoppingCart', enabled: false },
      { id: 'playlists', label: 'Playlists', icon: 'ListVideo', enabled: false },
      { id: 'reposts', label: 'Reposts', icon: 'Repeat2', enabled: true },
      { id: 'highlights', label: 'Highlights', icon: 'Bookmark', enabled: true },
    ],
    // AUTHORITATIVE ORDER from Brad's notepad
    sections: [
      { id: 'hero', enabled: true, order: 1 },
      { id: 'social_media', enabled: true, order: 2 },
      { id: 'links', enabled: true, order: 3 },
      { id: 'top_friends', enabled: true, order: 4 },
      { id: 'top_supporters', enabled: true, order: 5 },
      { id: 'top_streamers', enabled: true, order: 6 },
      { id: 'merchandise', enabled: true, order: 7 },
      { id: 'business_info', enabled: true, order: 8 },
      { id: 'portfolio', enabled: true, order: 9 },
      { id: 'upcoming_events', enabled: true, order: 10 },
      { id: 'music_showcase', enabled: true, order: 11 },
      { id: 'streaming_stats', enabled: true, order: 12 },
      { id: 'profile_stats', enabled: true, order: 12 },    // Legacy alias for streaming_stats
      { id: 'connections', enabled: true, order: 13 },
      { id: 'referral_network', enabled: true, order: 14 },
      { id: 'footer', enabled: true, order: 15 },
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
/**
 * Get enabled tabs for a profile type
 * If customEnabledTabs is provided, use that instead of profile_type defaults
 */
// Canonical tab order - used to maintain consistent ordering
const TAB_ORDER: ProfileTab[] = [
  'info', 'feed', 'photos', 'reels', 'username_tv', 'music_videos',
  'podcasts', 'series', 'movies', 'education', 'comedy', 'music',
  'events', 'products', 'playlists', 'reposts', 'highlights'
];

export function getEnabledTabs(
  profileType?: ProfileType,
  customEnabledTabs?: ProfileTab[] | null
): TabConfig[] {
  const config = getProfileTypeConfig(profileType);
  
  // If user has custom enabled tabs, use those
  // Note: empty array means user intentionally disabled all OPTIONAL tabs.
  if (Array.isArray(customEnabledTabs)) {
    // Map mobile tab IDs to web IDs for compatibility
    const mappedTabs = customEnabledTabs.map(tab => {
      if (tab === 'media' as any) return 'photos';
      if (tab === 'videos' as any) return 'music_videos';
      return tab;
    });
    const allowed = new Set<ProfileTab>(['info', ...mappedTabs]);
    
    console.log('[getEnabledTabs] customEnabledTabs:', customEnabledTabs);
    console.log('[getEnabledTabs] mappedTabs:', mappedTabs);
    console.log('[getEnabledTabs] allowed set:', Array.from(allowed));
    
    // Build master tab list from ALL profile types to support cross-type tab selection
    const allTabs = new Map<ProfileTab, TabConfig>();
    Object.values(PROFILE_TYPE_CONFIG).forEach(ptConfig => {
      ptConfig.tabs.forEach(tab => {
        if (!allTabs.has(tab.id)) {
          allTabs.set(tab.id, tab);
        }
      });
    });
    
    console.log('[getEnabledTabs] allTabs keys:', Array.from(allTabs.keys()));
    
    // Return tabs in canonical order, filtered to only those user has enabled
    const result = TAB_ORDER
      .filter(tabId => allowed.has(tabId) && allTabs.has(tabId))
      .map(tabId => allTabs.get(tabId)!);
    
    console.log('[getEnabledTabs] result tabs:', result.map(t => t.id));
    return result;
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
export function isTabEnabled(tab: ProfileTab, profileType?: ProfileType): boolean {
  const config = getProfileTypeConfig(profileType);
  const tabConfig = config.tabs.find(t => t.id === tab);
  return tabConfig?.enabled ?? false;
}

