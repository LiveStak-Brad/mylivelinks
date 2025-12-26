/**
 * Navigation Utilities
 * 
 * Helpers for consistent active-route detection and navigation state management.
 */

/**
 * Check if a route is active based on the current pathname.
 * 
 * @param pathname - Current pathname from usePathname()
 * @param href - The route href to check
 * @param options - Match options
 * @returns boolean - Whether the route is considered active
 * 
 * @example
 * // Exact match (default)
 * isRouteActive('/settings/profile', '/settings/profile') // true
 * isRouteActive('/settings/profile', '/settings') // false
 * 
 * @example
 * // Prefix match
 * isRouteActive('/settings/profile', '/settings', { matchType: 'prefix' }) // true
 * 
 * @example
 * // With exclusions
 * isRouteActive('/admin/users', '/admin', { 
 *   matchType: 'prefix',
 *   excludePaths: ['/admin/settings']
 * }) // true
 */
export function isRouteActive(
  pathname: string,
  href: string,
  options: {
    /** 'exact' (default) or 'prefix' for parent route matching */
    matchType?: 'exact' | 'prefix';
    /** Paths to exclude from prefix matching */
    excludePaths?: string[];
  } = {}
): boolean {
  const { matchType = 'exact', excludePaths = [] } = options;

  // Normalize paths (remove trailing slashes except for root)
  const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  const normalizedHref = href === '/' ? '/' : href.replace(/\/$/, '');

  if (matchType === 'exact') {
    return normalizedPathname === normalizedHref;
  }

  // Prefix matching
  if (normalizedPathname === normalizedHref) {
    return true;
  }

  // Check if pathname starts with href (as a path segment)
  const isPrefix = normalizedPathname.startsWith(normalizedHref + '/');
  
  if (!isPrefix) {
    return false;
  }

  // Check exclusions
  for (const excludePath of excludePaths) {
    const normalizedExclude = excludePath === '/' ? '/' : excludePath.replace(/\/$/, '');
    if (
      normalizedPathname === normalizedExclude ||
      normalizedPathname.startsWith(normalizedExclude + '/')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Navigation items configuration.
 * Single source of truth for main navigation items.
 */
export interface NavItem {
  /** Route href */
  href: string;
  /** Display label */
  label: string;
  /** Icon component name (optional) */
  icon?: string;
  /** Whether this route requires authentication */
  requiresAuth?: boolean;
  /** Whether this route requires live streaming to be enabled */
  requiresLive?: boolean;
  /** Whether this route requires owner privileges */
  requiresOwner?: boolean;
  /** Match type for active state detection */
  matchType?: 'exact' | 'prefix';
  /** Paths to exclude from prefix matching */
  excludePaths?: string[];
}

/**
 * Main navigation items for GlobalHeader
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { 
    href: '/', 
    label: 'Home', 
    matchType: 'exact',
  },
  { 
    href: '/feed', 
    label: 'Feed', 
    matchType: 'exact',
  },
  { 
    href: '/live', 
    label: 'Live Streams', 
    matchType: 'prefix',
    requiresLive: true,
  },
];

/**
 * User menu items configuration
 */
export interface UserMenuItem {
  href?: string;
  label: string;
  icon: string;
  iconColor?: string;
  action?: 'logout' | 'theme';
  destructive?: boolean;
  dividerAfter?: boolean;
}

export const USER_MENU_ITEMS: UserMenuItem[] = [
  { href: '/{username}', label: 'View Profile', icon: 'User', iconColor: 'text-blue-500' },
  { href: '/settings/profile', label: 'Edit Profile', icon: 'Settings', iconColor: 'text-gray-500', dividerAfter: true },
  { href: '/wallet', label: 'Wallet', icon: 'Wallet', iconColor: 'text-amber-500' },
  { href: '/me/analytics', label: 'Analytics', icon: 'BarChart3', iconColor: 'text-purple-500', dividerAfter: true },
  { action: 'theme', label: 'Theme', icon: 'Palette' },
  { action: 'logout', label: 'Logout', icon: 'LogOut', destructive: true },
];

/**
 * Get the active nav item based on current pathname
 */
export function getActiveNavItem(pathname: string, items: NavItem[]): NavItem | undefined {
  return items.find(item => 
    isRouteActive(pathname, item.href, {
      matchType: item.matchType,
      excludePaths: item.excludePaths,
    })
  );
}

/**
 * Icon size constants for standardization
 */
export const ICON_SIZES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/**
 * Get icon size class
 */
export function getIconSizeClass(size: IconSize = 'md'): string {
  return ICON_SIZES[size];
}

