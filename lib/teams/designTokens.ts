/**
 * Teams Design System - Visual Tokens & Constants
 * 
 * LOCKED VISUAL DECISIONS for Teams section
 * Discord clarity + Facebook Groups structure + TikTok cleanliness + Twitch energy
 * 
 * DO NOT MODIFY without design review
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR SIZES - Always circular with team color border
// ═══════════════════════════════════════════════════════════════════════════════

export const AVATAR_SIZES = {
  /** Team header avatar - largest size */
  header: {
    size: 56,
    className: 'h-14 w-14',
    ringWidth: 3,
  },
  /** Feed cards, chat header - medium size */
  feed: {
    size: 44,
    className: 'h-11 w-11',
    ringWidth: 2,
  },
  /** Member list, compact views - smallest */
  compact: {
    size: 36,
    className: 'h-9 w-9',
    ringWidth: 2,
  },
  /** Chat messages - single sequence */
  chat: {
    size: 32,
    className: 'h-8 w-8',
    ringWidth: 2,
  },
  /** Live tiles, presence strip */
  live: {
    size: 48,
    className: 'h-12 w-12',
    ringWidth: 2,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BANNER SPECIFICATIONS - Short + subtle, not hero
// ═══════════════════════════════════════════════════════════════════════════════

export const BANNER_CONFIG = {
  /** Maximum height: 20-25% viewport, capped at 180px */
  maxHeight: 180,
  minHeight: 120,
  /** Mobile height */
  mobileHeight: 140,
  /** Gradient overlay for text legibility */
  overlay: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)',
  /** Blur amount for team image banners */
  imageBlur: 8,
  /** Darkening for image banners */
  imageDarken: 0.35,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CARD STYLING - Lighter than global feed
// ═══════════════════════════════════════════════════════════════════════════════

export const CARD_STYLES = {
  /** Border radius for cards */
  borderRadius: 16,
  borderRadiusClass: 'rounded-2xl',
  /** Padding scales */
  padding: {
    default: 16,
    compact: 12,
    className: 'p-4',
    compactClassName: 'p-3',
  },
  /** Border styling - subtle, not heavy */
  border: {
    color: 'border-white/8',
    hoverColor: 'border-white/15',
  },
  /** Background - lighter than dark theme */
  background: {
    default: 'bg-white/[0.03]',
    hover: 'bg-white/[0.06]',
    /** Feed cards specifically */
    feed: 'bg-white/[0.02]',
    /** Chat bubbles */
    chat: 'bg-white/[0.04]',
  },
  /** Shadow - subtle or none for mobile-first */
  shadow: 'shadow-none',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SCALE
// ═══════════════════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  /** Team name in header */
  teamName: {
    size: 'text-xl',
    weight: 'font-bold',
    tracking: 'tracking-tight',
  },
  /** Team tag */
  teamTag: {
    size: 'text-xs',
    weight: 'font-semibold',
    tracking: 'tracking-wide uppercase',
  },
  /** Section titles */
  sectionTitle: {
    size: 'text-xs',
    weight: 'font-medium',
    tracking: 'tracking-wider uppercase',
    color: 'text-white/50',
  },
  /** Card titles (thread, announcement) */
  cardTitle: {
    size: 'text-base',
    weight: 'font-semibold',
  },
  /** Author names */
  authorName: {
    size: 'text-sm',
    weight: 'font-semibold',
  },
  /** Body text */
  body: {
    size: 'text-sm',
    weight: 'font-normal',
    color: 'text-white/80',
  },
  /** Metadata, timestamps */
  meta: {
    size: 'text-[10px]',
    weight: 'font-normal',
    color: 'text-white/40',
  },
  /** Badge text */
  badge: {
    size: 'text-[9px]',
    weight: 'font-bold',
    tracking: 'uppercase tracking-wide',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING SCALE
// ═══════════════════════════════════════════════════════════════════════════════

export const SPACING = {
  /** Micro gaps (2-4px) */
  xs: 4,
  xsClass: 'gap-1',
  /** Small gaps (8px) */
  sm: 8,
  smClass: 'gap-2',
  /** Default gaps (12px) */
  md: 12,
  mdClass: 'gap-3',
  /** Large gaps (16px) */
  lg: 16,
  lgClass: 'gap-4',
  /** Section spacing (24px) */
  section: 24,
  sectionClass: 'gap-6',
  /** Page sections (32px) */
  page: 32,
  pageClass: 'gap-8',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE INDICATORS
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESENCE = {
  /** Online indicator */
  online: {
    color: 'bg-green-500',
    ringColor: 'ring-green-500/50',
    size: 'h-3 w-3',
  },
  /** Live indicator with pulse */
  live: {
    color: 'bg-red-500',
    ringColor: 'ring-red-500/50',
    size: 'h-3.5 w-3.5',
    pulse: true,
  },
  /** Offline indicator */
  offline: {
    color: 'bg-white/30',
    ringColor: 'ring-white/10',
    size: 'h-2.5 w-2.5',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE STYLING - Icon-based, not text-heavy
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_STYLES = {
  leader: {
    badgeColor: 'bg-amber-500/20 text-amber-400',
    ringColor: 'ring-amber-500/50',
    iconColor: 'text-amber-400',
  },
  core: {
    badgeColor: 'bg-purple-500/20 text-purple-400',
    ringColor: 'ring-purple-500/50',
    iconColor: 'text-purple-400',
  },
  member: {
    badgeColor: 'bg-white/10 text-white/60',
    ringColor: 'ring-white/20',
    iconColor: 'text-white/60',
  },
  guest: {
    badgeColor: 'bg-white/5 text-white/40',
    ringColor: 'ring-white/10',
    iconColor: 'text-white/40',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT STYLING - Discord-like but calmer
// ═══════════════════════════════════════════════════════════════════════════════

export const CHAT_STYLES = {
  /** Message bubbles auto-size to content */
  bubble: {
    maxWidth: 'max-w-[85%]',
    borderRadius: 'rounded-2xl',
    padding: 'px-3 py-2',
    /** Regular message */
    regular: {
      bg: 'bg-white/[0.06]',
      text: 'text-white/90',
    },
    /** Own message */
    own: {
      bg: 'bg-purple-500',
      text: 'text-white',
    },
    /** System message */
    system: {
      bg: 'bg-purple-500/10 border border-purple-500/20',
      text: 'text-purple-300 italic',
    },
  },
  /** Composer */
  composer: {
    /** Single-line by default, expand on focus */
    defaultRows: 1,
    maxRows: 6,
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  /** Team color usage */
  teamColorUsage: {
    mentions: true,
    systemEvents: true,
    teamReactions: true,
    ownBubbles: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FEED CARD STYLING
// ═══════════════════════════════════════════════════════════════════════════════

export const FEED_CARD_STYLES = {
  /** Author avatar always visible */
  authorAvatarVisible: true,
  /** Team badge placement - subtle top-left or footer */
  teamBadgePlacement: 'footer',
  /** Reactions row minimal - icons first, counts second */
  reactions: {
    iconFirst: true,
    compact: true,
    size: 'text-xs',
  },
  /** Thread styling */
  thread: {
    titleStandout: true,
    repliesPreviewMax: 2,
    enterAffordance: true,
    votingCompact: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE TILE STYLING
// ═══════════════════════════════════════════════════════════════════════════════

export const LIVE_TILE_STYLES = {
  /** Height for live preview tiles */
  height: 160,
  heightClass: 'h-40',
  /** Border radius */
  borderRadius: 'rounded-2xl',
  /** Live badge styling */
  badge: {
    bg: 'bg-red-500',
    text: 'text-white',
    size: 'text-[10px]',
    pulse: true,
  },
  /** Viewer count styling */
  viewerCount: {
    bg: 'bg-black/50',
    text: 'text-white',
    size: 'text-xs',
  },
  /** Gradient overlay */
  overlay: 'bg-gradient-to-t from-black via-black/20 to-transparent',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR PALETTE - Limited for team customization
// ═══════════════════════════════════════════════════════════════════════════════

export const TEAM_COLOR_PALETTE = [
  { name: 'Purple', primary: '#8B5CF6', accent: '#6366F1' },
  { name: 'Blue', primary: '#3B82F6', accent: '#2563EB' },
  { name: 'Cyan', primary: '#06B6D4', accent: '#0891B2' },
  { name: 'Green', primary: '#10B981', accent: '#059669' },
  { name: 'Amber', primary: '#F59E0B', accent: '#D97706' },
  { name: 'Orange', primary: '#F97316', accent: '#EA580C' },
  { name: 'Rose', primary: '#F43F5E', accent: '#E11D48' },
  { name: 'Pink', primary: '#EC4899', accent: '#DB2777' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get avatar size class based on context
 */
export function getAvatarSizeClass(context: keyof typeof AVATAR_SIZES): string {
  return AVATAR_SIZES[context].className;
}

/**
 * Get presence indicator classes
 */
export function getPresenceClasses(status: 'online' | 'live' | 'offline'): string {
  const config = PRESENCE[status];
  const pulseClass = 'pulse' in config && config.pulse ? 'animate-pulse' : '';
  return `${config.size} ${config.color} ring-2 ring-[#0a0a0f] ${pulseClass}`.trim();
}

/**
 * Get role badge classes
 */
export function getRoleBadgeClasses(role: keyof typeof ROLE_STYLES): string {
  return `${ROLE_STYLES[role].badgeColor} ${TYPOGRAPHY.badge.size} ${TYPOGRAPHY.badge.weight} ${TYPOGRAPHY.badge.tracking} rounded-full px-1.5 py-0.5`;
}

/**
 * Build team gradient from theme colors
 */
export function buildTeamGradient(primary: string, accent: string): string {
  return `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;
}

/**
 * Build banner overlay style
 */
export function buildBannerStyle(
  imageUrl?: string | null,
  primary?: string,
  accent?: string
): React.CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `${BANNER_CONFIG.overlay}, url(${imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: `brightness(${1 - BANNER_CONFIG.imageDarken})`,
    };
  }
  return {
    backgroundImage: buildTeamGradient(primary ?? '#8B5CF6', accent ?? '#6366F1'),
  };
}

export type AvatarContext = keyof typeof AVATAR_SIZES;
export type PresenceStatus = keyof typeof PRESENCE;
export type RoleType = keyof typeof ROLE_STYLES;
