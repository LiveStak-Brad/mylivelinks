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
        light: '/branding/newbanner.png',
        dark: '/branding/newbanner.png',
        any: '/branding/newbanner.png',
      },
      goLive: {
        light: '/branding/newbanner.png',
        dark: '/branding/newbanner.png',
        any: '/branding/newbanner.png',
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
  
  const asset: unknown = ASSETS[category];
  if (!asset) return '';
  
  if (subcategory) {
    if (typeof asset !== 'object' || asset === null) return '';
    const sub = (asset as Record<string, unknown>)[subcategory];
    if (!sub) return '';
    
    if (typeof sub === 'object' && 'light' in sub) {
      const themed = sub as Record<string, unknown>;
      return String(themed[resolvedTheme] ?? themed.any ?? themed.light ?? '');
    }
    return typeof sub === 'string' ? sub : '';
  }
  
  if (typeof asset === 'object' && 'light' in asset) {
    const themed = asset as Record<string, unknown>;
    return String(themed[resolvedTheme] ?? themed.any ?? themed.light ?? '');
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


