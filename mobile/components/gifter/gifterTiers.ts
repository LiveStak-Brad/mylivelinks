/**
 * Gifter Tier System - Types and Configuration for React Native
 * 
 * This is a mobile-specific copy of the gifter-tiers configuration.
 * Keep in sync with lib/gifter-tiers.ts on the web side.
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
// TIER CONFIGURATION
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
    maxLifetimeCoins: 999,
    isDiamond: false,
  },
  {
    key: 'supporter',
    name: 'Supporter',
    color: '#CD7F32',
    icon: '🤝',
    order: 2,
    levelMax: 50,
    minLifetimeCoins: 1000,
    maxLifetimeCoins: 4999,
    isDiamond: false,
  },
  {
    key: 'contributor',
    name: 'Contributor',
    color: '#C0C0C0',
    icon: '⭐',
    order: 3,
    levelMax: 50,
    minLifetimeCoins: 5000,
    maxLifetimeCoins: 14999,
    isDiamond: false,
  },
  {
    key: 'elite',
    name: 'Elite',
    color: '#D4AF37',
    icon: '👑',
    order: 4,
    levelMax: 50,
    minLifetimeCoins: 15000,
    maxLifetimeCoins: 49999,
    isDiamond: false,
  },
  {
    key: 'patron',
    name: 'Patron',
    color: '#22C55E',
    icon: '💎',
    order: 5,
    levelMax: 50,
    minLifetimeCoins: 50000,
    maxLifetimeCoins: 149999,
    isDiamond: false,
  },
  {
    key: 'power',
    name: 'Power',
    color: '#3B82F6',
    icon: '⚡',
    order: 6,
    levelMax: 50,
    minLifetimeCoins: 150000,
    maxLifetimeCoins: 499999,
    isDiamond: false,
  },
  {
    key: 'vip',
    name: 'VIP',
    color: '#EF4444',
    icon: '🔥',
    order: 7,
    levelMax: 50,
    minLifetimeCoins: 500000,
    maxLifetimeCoins: 1499999,
    isDiamond: false,
  },
  {
    key: 'legend',
    name: 'Legend',
    color: '#A855F7',
    icon: '🌟',
    order: 8,
    levelMax: 50,
    minLifetimeCoins: 1500000,
    maxLifetimeCoins: 4999999,
    isDiamond: false,
  },
  {
    key: 'mythic',
    name: 'Mythic',
    color: '#111827',
    icon: '🔮',
    order: 9,
    levelMax: 50,
    minLifetimeCoins: 5000000,
    maxLifetimeCoins: 14999999,
    isDiamond: false,
  },
  {
    key: 'diamond',
    name: 'Diamond',
    color: '#22D3EE',
    icon: '💠',
    order: 10,
    levelMax: Infinity,
    minLifetimeCoins: 15000000,
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
  if (coins >= 1000000) {
    return `${(coins / 1000000).toFixed(1)}M`;
  }
  if (coins >= 1000) {
    return `${(coins / 1000).toFixed(0)}K`;
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
  const max = formatCoinAmount(tier.maxLifetimeCoins);
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
  lifetime_coins: 250,
  next_level_coins: 50,
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
  lifetime_coins: 25000000,
  next_level_coins: 100000,
  show_locked_tiers: true,
};

