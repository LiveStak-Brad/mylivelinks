/**
 * Gifter Tier System - Types and Configuration for React Native
 * 
 * This is a mobile-specific copy of the gifter-tiers configuration.
 * Keep in sync with lib/gifter-tiers.ts on the web side.
 * 
 * FINAL TIER THRESHOLDS (cumulative lifetime coins gifted):
 * Starter:      0          → 60,000
 * Supporter:    60,000     → 300,000
 * Contributor:  300,000    → 900,000
 * Elite:        900,000    → 2,400,000
 * Patron:       2,400,000  → 6,000,000
 * Power:        6,000,000  → 15,000,000
 * VIP:          15,000,000 → 30,000,000
 * Legend:       30,000,000 → 45,000,000
 * Mythic:       45,000,000 → 60,000,000
 * Diamond:      60,000,000 → ∞
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GifterTier {
  key: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  levelMax: number;
  minLifetimeCoins: number;
  maxLifetimeCoins: number | null;
  isDiamond: boolean;
}

export interface GifterStatus {
  tier_key: string;
  tier_name: string;
  tier_color: string;
  tier_icon: string;
  level: number;
  level_in_tier: number;
  tier_level_max: number;
  is_diamond: boolean;
  progress_pct: number;
  lifetime_coins: number;
  next_level_coins: number;
  show_locked_tiers: boolean;
}

// ============================================================================
// TIER CONFIGURATION - FINAL SPEC
// Diamond unlock MUST be 60,000,000 lifetime coins gifted
// ============================================================================

export const GIFTER_TIERS: GifterTier[] = [
  {
    key: 'starter',
    name: 'Starter',
    color: '#9CA3AF',
    icon: '🌱',
    order: 1,
    levelMax: 50,
    minLifetimeCoins: 0,
    maxLifetimeCoins: 59_999,
    isDiamond: false,
  },
  {
    key: 'supporter',
    name: 'Supporter',
    color: '#CD7F32',
    icon: '🤝',
    order: 2,
    levelMax: 50,
    minLifetimeCoins: 60_000,
    maxLifetimeCoins: 299_999,
    isDiamond: false,
  },
  {
    key: 'contributor',
    name: 'Contributor',
    color: '#C0C0C0',
    icon: '⭐',
    order: 3,
    levelMax: 50,
    minLifetimeCoins: 300_000,
    maxLifetimeCoins: 899_999,
    isDiamond: false,
  },
  {
    key: 'elite',
    name: 'Elite',
    color: '#D4AF37',
    icon: '👑',
    order: 4,
    levelMax: 50,
    minLifetimeCoins: 900_000,
    maxLifetimeCoins: 2_399_999,
    isDiamond: false,
  },
  {
    key: 'patron',
    name: 'Patron',
    color: '#22C55E',
    icon: '💎',
    order: 5,
    levelMax: 50,
    minLifetimeCoins: 2_400_000,
    maxLifetimeCoins: 5_999_999,
    isDiamond: false,
  },
  {
    key: 'power',
    name: 'Power',
    color: '#3B82F6',
    icon: '⚡',
    order: 6,
    levelMax: 50,
    minLifetimeCoins: 6_000_000,
    maxLifetimeCoins: 14_999_999,
    isDiamond: false,
  },
  {
    key: 'vip',
    name: 'VIP',
    color: '#EF4444',
    icon: '🔥',
    order: 7,
    levelMax: 50,
    minLifetimeCoins: 15_000_000,
    maxLifetimeCoins: 29_999_999,
    isDiamond: false,
  },
  {
    key: 'legend',
    name: 'Legend',
    color: '#A855F7',
    icon: '🌟',
    order: 8,
    levelMax: 50,
    minLifetimeCoins: 30_000_000,
    maxLifetimeCoins: 44_999_999,
    isDiamond: false,
  },
  {
    key: 'mythic',
    name: 'Mythic',
    color: '#111827',
    icon: '🔮',
    order: 9,
    levelMax: 50,
    minLifetimeCoins: 45_000_000,
    maxLifetimeCoins: 59_999_999,
    isDiamond: false,
  },
  {
    key: 'diamond',
    name: 'Diamond',
    color: '#22D3EE',
    icon: '💠',
    order: 10,
    levelMax: Infinity,
    minLifetimeCoins: 60_000_000, // Diamond Level 1 begins at exactly 60,000,000 coins
    maxLifetimeCoins: null,
    isDiamond: true,
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getTierByKey(key: string): GifterTier | undefined {
  return GIFTER_TIERS.find((t) => t.key === key);
}

export function getTierByOrder(order: number): GifterTier | undefined {
  return GIFTER_TIERS.find((t) => t.order === order);
}

export function getVisibleTiers(
  currentTierKey: string,
  showLockedTiers: boolean
): GifterTier[] {
  if (showLockedTiers) {
    return GIFTER_TIERS;
  }

  const currentTier = getTierByKey(currentTierKey);
  if (!currentTier) return GIFTER_TIERS.slice(0, 1);

  return GIFTER_TIERS.filter((t) => t.order <= currentTier.order + 1);
}

export function formatCoinAmount(coins: number): string {
  if (coins >= 1_000_000) {
    const m = coins / 1_000_000;
    return `${m.toFixed(1)}M`;
  }
  if (coins >= 1_000) {
    const k = coins / 1_000;
    return `${k.toFixed(0)}K`;
  }
  return coins.toLocaleString();
}

export function getTierLevelRange(tier: GifterTier): string {
  if (tier.isDiamond) {
    return '1+';
  }
  return '1–50';
}

export function getTierCoinRange(tier: GifterTier): string {
  const min = formatCoinAmount(tier.minLifetimeCoins);
  if (tier.maxLifetimeCoins === null) {
    return `${min}+`;
  }
  // Add 1 to maxLifetimeCoins for display since we store as max-1
  const max = formatCoinAmount(tier.maxLifetimeCoins + 1);
  return `${min} – ${max}`;
}

// ============================================================================
// MOCK DATA FOR UI TESTING
// ============================================================================

export const MOCK_GIFTER_STATUS_STARTER: GifterStatus = {
  tier_key: 'starter',
  tier_name: 'Starter',
  tier_color: '#9CA3AF',
  tier_icon: '🌱',
  level: 5,
  level_in_tier: 5,
  tier_level_max: 50,
  is_diamond: false,
  progress_pct: 65,
  lifetime_coins: 15_000,
  next_level_coins: 3_000,
  show_locked_tiers: false,
};

export const MOCK_GIFTER_STATUS_DIAMOND: GifterStatus = {
  tier_key: 'diamond',
  tier_name: 'Diamond',
  tier_color: '#22D3EE',
  tier_icon: '💠',
  level: 523,
  level_in_tier: 73,
  tier_level_max: Infinity,
  is_diamond: true,
  progress_pct: 35,
  lifetime_coins: 85_000_000,
  next_level_coins: 3_000_000,
  show_locked_tiers: true,
};
