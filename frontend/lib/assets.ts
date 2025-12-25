/**
 * Centralized Asset Configuration
 * All branding assets referenced here - no hardcoded paths
 */

export const ASSETS = {
  logo: {
    light: '/branding/mylivelinkstransparent.png',
    dark: '/branding/mylivelinkstransparent.png',
    icon: {
      light: '/branding/mylivelinkstransparent.png',
      dark: '/branding/mylivelinkstransparent.png',
      any: '/branding/mylivelinkstransparent.png',
    },
    fallback: '/branding/mylivelinkstransparent.png',
  },
  banner: {
    live: {
      light: '/branding/mylivelinkslightbanner.png',
      dark: '/branding/mylivelinksdarkbanner.png',
      any: '/branding/mylivelinkslightbanner.png',
    },
    hero: {
      light: '/branding/mylivelinkslightbanner.png',
      dark: '/branding/mylivelinksdarkbanner.png',
      any: '/branding/mylivelinkslightbanner.png',
    },
    cta: {
      joinLive: {
        light: '/branding/mylivelinkslightbanner.png',
        dark: '/branding/mylivelinksdarkbanner.png',
        any: '/branding/mylivelinkslightbanner.png',
      },
      goLive: {
        light: '/branding/mylivelinkslightbanner.png',
        dark: '/branding/mylivelinksdarkbanner.png',
        any: '/branding/mylivelinkslightbanner.png',
      },
    },
  },
  favicon: {
    ico: '/branding/favicon/favicon.ico',
    png16: '/branding/favicon/favicon-16x16.png',
    png32: '/branding/favicon/favicon-32x32.png',
    apple: '/branding/favicon/apple-touch-icon.png',
  },
} as const;

/**
 * Get asset path based on theme
 */
export function getAsset(
  category: keyof typeof ASSETS,
  subcategory?: string,
  theme: 'light' | 'dark' | 'auto' = 'auto'
): string {
  const resolvedTheme = theme === 'auto' ? 'light' : theme;
  
  // @ts-ignore - Dynamic access
  const asset = ASSETS[category];
  if (!asset) return '';
  
  if (subcategory) {
    // @ts-ignore
    const sub = asset[subcategory];
    if (!sub) return '';
    
    if (typeof sub === 'object' && 'light' in sub) {
      return sub[resolvedTheme] || sub.any || sub.light || '';
    }
    return sub || '';
  }
  
  if (typeof asset === 'object' && 'light' in asset) {
    // @ts-ignore - Dynamic access for theme-based assets
    return asset[resolvedTheme] || (asset as any).any || asset.light || '';
  }
  
  // If it's a string, return it; otherwise return empty string
  return typeof asset === 'string' ? asset : '';
}

/**
 * Get logo path
 */
export function getLogoPath(
  theme: 'light' | 'dark' | 'auto' = 'auto',
  iconOnly: boolean = false
): string {
  const resolvedTheme = theme === 'auto' ? 'light' : theme;
  
  if (iconOnly) {
    return ASSETS.logo.icon[resolvedTheme] || ASSETS.logo.icon.any || ASSETS.logo.icon.light;
  }
  
  return ASSETS.logo[resolvedTheme] || ASSETS.logo.light;
}

/**
 * Get banner path
 */
export function getBannerPath(
  type: 'live' | 'hero' | 'joinLive' | 'goLive' = 'live',
  theme: 'light' | 'dark' | 'auto' = 'auto'
): string {
  const resolvedTheme = theme === 'auto' ? 'light' : theme;
  
  if (type === 'joinLive' || type === 'goLive') {
    return ASSETS.banner.cta[type][resolvedTheme] || ASSETS.banner.cta[type].any || ASSETS.banner.cta[type].light;
  }
  
  return ASSETS.banner[type][resolvedTheme] || ASSETS.banner[type].any || ASSETS.banner[type].light;
}


