/**
 * Live Mode Router
 * 
 * Routes live session viewing based on:
 * - Session mode (solo vs battle)
 * - Platform (mobile vs web)
 * 
 * Rules:
 * - mode === "solo":
 *   - Mobile: TikTok/Favorited style (portrait, swipeable)
 *   - Web: Twitch/Kik style (landscape, chat sidebar)
 * 
 * - mode === "battle":
 *   - ALL platforms: TikTok battle layout (cameras-only, portrait)
 * 
 * - Same session can be joined from both mobile and web
 */

export type LiveSessionMode = 'solo' | 'battle';
export type LivePlatform = 'mobile' | 'web';
export type LiveLayoutStyle = 
  | 'tiktok-viewer'      // Mobile solo: portrait, fullscreen video, swipe controls
  | 'twitch-viewer'      // Web solo: landscape, video + chat sidebar
  | 'battle-cameras';    // Battle: cameras-only, portrait, minimal UI

export interface LiveModeConfig {
  mode: LiveSessionMode;
  platform: LivePlatform;
}

export interface LiveLayoutConfig extends LiveModeConfig {
  layoutStyle: LiveLayoutStyle;
  isMobile: boolean;
  isWeb: boolean;
  isSolo: boolean;
  isBattle: boolean;
}

/**
 * Determine layout style based on mode and platform
 */
export function getLayoutStyle(mode: LiveSessionMode, platform: LivePlatform): LiveLayoutStyle {
  if (mode === 'battle') {
    // Battle mode ALWAYS uses cameras-only layout on all platforms
    return 'battle-cameras';
  }
  
  // Solo mode uses platform-specific layouts
  if (platform === 'mobile') {
    return 'tiktok-viewer'; // Portrait, fullscreen, swipeable
  } else {
    return 'twitch-viewer'; // Landscape, sidebar chat
  }
}

/**
 * Get complete layout configuration
 */
export function getLayoutConfig(mode: LiveSessionMode, platform: LivePlatform): LiveLayoutConfig {
  const layoutStyle = getLayoutStyle(mode, platform);
  
  return {
    mode,
    platform,
    layoutStyle,
    isMobile: platform === 'mobile',
    isWeb: platform === 'web',
    isSolo: mode === 'solo',
    isBattle: mode === 'battle',
  };
}

/**
 * Detect platform from environment
 * 
 * This is a simple detection - can be enhanced with user agent parsing
 * or using the existing useIsMobileWeb hook
 */
export function detectPlatform(): LivePlatform {
  if (typeof window === 'undefined') {
    return 'web'; // SSR default
  }
  
  // Simple width-based detection
  // In production, you'd use the useIsMobileWeb hook or more sophisticated detection
  const width = window.innerWidth;
  const isMobile = width <= 900;
  
  return isMobile ? 'mobile' : 'web';
}

/**
 * Parse session mode from URL params or session data
 * 
 * Examples:
 * - /live?mode=solo
 * - /live?mode=battle
 * - /rooms/battle-arena?mode=battle
 */
export function parseSessionMode(
  urlParams?: URLSearchParams,
  sessionData?: { mode?: string }
): LiveSessionMode {
  // Check URL params first
  const urlMode = urlParams?.get('mode');
  if (urlMode === 'battle') return 'battle';
  if (urlMode === 'solo') return 'solo';
  
  // Check session data
  const sessionMode = sessionData?.mode;
  if (sessionMode === 'battle') return 'battle';
  if (sessionMode === 'solo') return 'solo';
  
  // Default to solo
  return 'solo';
}

/**
 * Get layout configuration from current context
 */
export function getCurrentLayoutConfig(
  urlParams?: URLSearchParams,
  sessionData?: { mode?: string },
  platformOverride?: LivePlatform
): LiveLayoutConfig {
  const mode = parseSessionMode(urlParams, sessionData);
  const platform = platformOverride ?? detectPlatform();
  
  return getLayoutConfig(mode, platform);
}

