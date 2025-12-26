/**
 * Image Utility Functions
 * Auto-detects image purpose based on filename and size
 * Supports both branding/ and photos/ folders
 */

export interface ImageInfo {
  path: string;
  name: string;
  type: 'logo' | 'banner' | 'hero' | 'favicon' | 'icon' | 'profile-banner' | 'unknown';
  theme: 'light' | 'dark' | 'any';
  size?: { width: number; height: number };
}

/**
 * Parse image filename to determine type and theme
 */
export function parseImageFilename(filename: string): {
  type: 'logo' | 'banner' | 'hero' | 'favicon' | 'icon' | 'profile-banner' | 'unknown';
  theme: 'light' | 'dark' | 'any';
  isIcon: boolean;
} {
  const lower = filename.toLowerCase();
  
  // Determine type
  let type: 'logo' | 'banner' | 'hero' | 'favicon' | 'icon' | 'profile-banner' | 'unknown' = 'unknown';
  
  if (lower.includes('logo')) {
    type = lower.includes('icon') ? 'icon' : 'logo';
  } else if (lower.includes('banner')) {
    type = 'banner';
  } else if (lower.includes('hero')) {
    type = 'hero';
  } else if (lower.includes('favicon')) {
    type = 'favicon';
  } else if (lower.includes('icon')) {
    type = 'icon';
  } else if (lower.includes('profile') && lower.includes('banner')) {
    type = 'profile-banner';
  }
  
  // Determine theme
  let theme: 'light' | 'dark' | 'any' = 'any';
  if (lower.includes('-light') || lower.includes('_light')) {
    theme = 'light';
  } else if (lower.includes('-dark') || lower.includes('_dark')) {
    theme = 'dark';
  }
  
  const isIcon = lower.includes('icon') || type === 'icon' || type === 'favicon';
  
  return { type, theme, isIcon };
}

/**
 * Get image dimensions (async)
 */
export async function getImageDimensions(
  src: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Determine image purpose based on dimensions
 */
export function determineImagePurpose(
  width: number,
  height: number
): 'logo' | 'banner' | 'hero' | 'favicon' | 'icon' | 'profile-banner' | 'unknown' {
  const aspectRatio = width / height;
  
  // Favicon/Icon: Square, small
  if (width <= 512 && height <= 512 && aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    if (width <= 180) return 'favicon';
    return 'icon';
  }
  
  // Banner: Wide, short (typically 1920x200 or similar)
  if (width > height * 3 && height < 500) {
    return 'banner';
  }
  
  // Hero: Wide, tall (typically 1920x1080 or similar)
  if (width > 1000 && height > 500 && aspectRatio > 1.2 && aspectRatio < 2.5) {
    return 'hero';
  }
  
  // Profile Banner: Medium-wide, medium-tall (typically 1200x300 or similar)
  if (width > 800 && height > 200 && height < 600 && aspectRatio > 2 && aspectRatio < 6) {
    return 'profile-banner';
  }
  
  // Logo: Medium size, reasonable aspect ratio
  if (width >= 100 && width <= 2000 && aspectRatio >= 0.5 && aspectRatio <= 3) {
    return 'logo';
  }
  
  return 'unknown';
}

/**
 * Find best matching image from a list
 */
export function findBestImage(
  images: ImageInfo[],
  options: {
    type?: 'logo' | 'banner' | 'hero' | 'favicon' | 'icon' | 'profile-banner';
    theme?: 'light' | 'dark';
    preferSvg?: boolean;
  }
): ImageInfo | null {
  const { type, theme, preferSvg = true } = options;
  
  // Filter by type if specified
  let filtered = type
    ? images.filter((img) => img.type === type)
    : images;
  
  // Filter by theme if specified
  if (theme) {
    filtered = filtered.filter(
      (img) => img.theme === theme || img.theme === 'any'
    );
  }
  
  // Prefer SVG if requested
  if (preferSvg) {
    const svg = filtered.find((img) => img.path.endsWith('.svg'));
    if (svg) return svg;
  }
  
  // Return first match
  return filtered[0] || null;
}

/**
 * Get profile banner path (checks photos/ and branding/ folders)
 */
export function getProfileBannerPath(
  username: string,
  theme: 'light' | 'dark' | 'auto'
): string[] {
  const resolvedTheme = theme === 'auto' ? 'light' : theme;
  
  // Priority order: user-specific → theme-specific → generic
  return [
    // User-specific from photos/
    `/photos/banners/${username}-banner-${resolvedTheme}.jpg`,
    `/photos/banners/${username}-banner-${resolvedTheme}.png`,
    `/photos/banners/${username}-banner.jpg`,
    `/photos/banners/${username}-banner.png`,
    
    // Theme-specific from branding/
    `/branding/banner/banner-${resolvedTheme}.jpg`,
    `/branding/banner/banner-${resolvedTheme}.png`,
    
    // Generic fallback
    `/branding/banner/banner.jpg`,
    `/photos/banners/default-banner.jpg`,
  ];
}

/**
 * Get logo path based on theme
 * Falls back to PNG if SVG doesn't exist
 */
export function getLogoPath(
  theme: 'light' | 'dark' | 'auto',
  _iconOnly: boolean = false
): string {
  // Always use transparent logo
  return '/branding/mylivelinkstransparent.png';
}

/**
 * Get banner path based on theme and type
 */
export function getBannerPath(
  theme: 'light' | 'dark' | 'auto',
  type: 'banner' | 'hero' = 'banner'
): string {
  const resolvedTheme = theme === 'auto' ? 'light' : theme;
  
  // Try branding/ first, then photos/
  return `/branding/banner/${type}-${resolvedTheme}.jpg`;
}
