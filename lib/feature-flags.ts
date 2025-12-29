/**
 * Feature Flags Helper
 * Provides functions to check feature flags server-side
 */

import { getSupabaseAdmin } from './supabase-admin';

type FeatureFlag = 
  | 'live_enabled'
  | 'gifting_enabled'
  | 'chat_enabled'
  | 'battles_enabled'
  | 'payouts_enabled';

// Cache feature flags for 30 seconds to reduce DB load
let flagsCache: Record<string, boolean> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get all feature flags (cached for 30 seconds)
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  
  // Return cached flags if still valid
  if (flagsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return flagsCache;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('key, enabled');

    if (error) {
      console.error('[FEATURE_FLAGS] Error fetching flags:', error);
      // Return safe defaults if DB query fails
      return {
        live_enabled: true,
        gifting_enabled: true,
        chat_enabled: true,
        battles_enabled: true,
        payouts_enabled: true,
      };
    }

    // Transform to map
    const flags = (data || []).reduce((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {} as Record<string, boolean>);

    // Update cache
    flagsCache = flags;
    cacheTimestamp = now;

    return flags;
  } catch (error) {
    console.error('[FEATURE_FLAGS] Unexpected error:', error);
    // Return safe defaults
    return {
      live_enabled: true,
      gifting_enabled: true,
      chat_enabled: true,
      battles_enabled: true,
      payouts_enabled: true,
    };
  }
}

/**
 * Check if a specific feature flag is enabled
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[flag] ?? true; // Default to enabled if flag not found
}

/**
 * Clear the feature flags cache (useful after admin updates)
 */
export function clearFeatureFlagsCache(): void {
  flagsCache = null;
  cacheTimestamp = 0;
}


