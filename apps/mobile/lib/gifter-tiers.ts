/**
 * Mobile-local Gifter Tier reference data (UI only)
 *
 * Note: We keep this inside apps/mobile/** so Metro can resolve it reliably.
 * This mirrors the shared tier order/hierarchy used on web.
 */
export interface GifterTier {
  key: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  levelMax: number; // 50 for all except Diamond (Infinity)
  minLifetimeCoins: number;
  maxLifetimeCoins: number | null; // null = no cap (Diamond)
  isDiamond: boolean;
}

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
    icon: '🏆',
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
    icon: '💎',
    order: 10,
    levelMax: Infinity,
    minLifetimeCoins: 60_000_000,
    maxLifetimeCoins: null,
    isDiamond: true,
  },
];

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
  return tier.isDiamond ? '1+' : '1–50';
}

export function getTierCoinRange(tier: GifterTier): string {
  const min = formatCoinAmount(tier.minLifetimeCoins);
  if (tier.maxLifetimeCoins === null) return `${min}+`;
  const max = formatCoinAmount(tier.maxLifetimeCoins + 1);
  return `${min} – ${max}`;
}

