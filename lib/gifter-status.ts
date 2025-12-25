export type ViewerContext = {
  is_admin?: boolean;
};

export type GifterStatus = {
  tier_key: string;
  tier_name: string;
  tier_color: string | null;
  tier_icon: string | null;
  is_diamond: boolean;
  tier_level_max: number | null;
  level_in_tier: number;
  lifetime_coins: number;
  tier_start_coins: number;
  tier_end_coins: number | null;
  level_start_coins: number;
  next_level_coins: number | null;
  progress_pct: number;
  show_locked_tiers: boolean;
  locked_reason: string | null;
};

type TierDef = {
  key: string;
  name: string;
  start: number;
  end: number | null;
  growth: number;
  levelCount: number | null;
};

const DIAMOND_UNLOCK_COINS = 60_000_000;
const DIAMOND_BASE_COST = 3_000_000;
const DIAMOND_GROWTH = 1.45;

const TIERS: TierDef[] = [
  { key: 'starter', name: 'Starter', start: 0, end: 60_000, growth: 1.1, levelCount: 50 },
  { key: 'supporter', name: 'Supporter', start: 60_000, end: 300_000, growth: 1.12, levelCount: 50 },
  { key: 'contributor', name: 'Contributor', start: 300_000, end: 900_000, growth: 1.15, levelCount: 50 },
  { key: 'elite', name: 'Elite', start: 900_000, end: 2_400_000, growth: 1.18, levelCount: 50 },
  { key: 'patron', name: 'Patron', start: 2_400_000, end: 6_000_000, growth: 1.22, levelCount: 50 },
  { key: 'power', name: 'Power', start: 6_000_000, end: 15_000_000, growth: 1.26, levelCount: 50 },
  { key: 'vip', name: 'VIP', start: 15_000_000, end: 30_000_000, growth: 1.3, levelCount: 50 },
  { key: 'legend', name: 'Legend', start: 30_000_000, end: 45_000_000, growth: 1.35, levelCount: 50 },
  { key: 'mythic', name: 'Mythic', start: 45_000_000, end: 60_000_000, growth: 1.4, levelCount: 50 },
  { key: 'diamond', name: 'Diamond', start: 60_000_000, end: null, growth: DIAMOND_GROWTH, levelCount: null },
];

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeTierBoundaries(start: number, end: number, growth: number, levelCount: number): number[] {
  const totalSpan = end - start;
  if (totalSpan <= 0) return [start, end];

  const weights: number[] = [];
  let sumW = 0;
  for (let i = 0; i < levelCount; i++) {
    const w = Math.pow(growth, i);
    weights.push(w);
    sumW += w;
  }

  const increments: number[] = [];
  let used = 0;
  for (let i = 0; i < levelCount; i++) {
    if (i === levelCount - 1) {
      increments.push(totalSpan - used);
    } else {
      const inc = Math.floor((totalSpan * weights[i]) / sumW);
      increments.push(inc);
      used += inc;
    }
  }

  const boundaries: number[] = [start];
  let cur = start;
  for (let i = 0; i < levelCount; i++) {
    cur += increments[i];
    boundaries.push(cur);
  }

  boundaries[boundaries.length - 1] = end;
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] < boundaries[i - 1]) boundaries[i] = boundaries[i - 1];
  }

  return boundaries;
}

function findLevelInBoundaries(coins: number, boundaries: number[]): number {
  let lo = 0;
  let hi = boundaries.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const a = boundaries[mid];
    const b = boundaries[mid + 1];
    if (coins < a) {
      hi = mid - 1;
    } else if (coins >= b) {
      lo = mid + 1;
    } else {
      return mid + 1;
    }
  }
  return Math.max(1, Math.min(boundaries.length - 1, lo + 1));
}

function diamondCost(step: number): number {
  return Math.floor(DIAMOND_BASE_COST * Math.pow(DIAMOND_GROWTH, step - 1));
}

function computeDiamond(coins: number) {
  let level = 1;
  let levelStart = DIAMOND_UNLOCK_COINS;
  let next = DIAMOND_UNLOCK_COINS + diamondCost(1);

  while (coins >= next) {
    level += 1;
    levelStart = next;
    next = next + diamondCost(level);
  }

  return { level, levelStart, nextLevel: next };
}

export function getGifterStatus(lifetimeCoins: number, viewerContext?: ViewerContext): GifterStatus {
  const lifetime = Math.max(0, Math.floor(lifetimeCoins || 0));
  const isDiamond = lifetime >= DIAMOND_UNLOCK_COINS;

  const tier = (() => {
    for (const t of TIERS) {
      if (t.end === null) return t;
      if (lifetime >= t.start && lifetime < t.end) return t;
    }
    return TIERS[TIERS.length - 1];
  })();

  let levelInTier = 1;
  let levelStartCoins = tier.start;
  let nextLevelCoins: number | null = tier.end;

  if (tier.key === 'diamond') {
    const d = computeDiamond(lifetime);
    levelInTier = d.level;
    levelStartCoins = d.levelStart;
    nextLevelCoins = d.nextLevel;
  } else {
    const boundaries = computeTierBoundaries(tier.start, tier.end!, tier.growth, 50);
    levelInTier = findLevelInBoundaries(lifetime, boundaries);
    levelStartCoins = boundaries[levelInTier - 1];
    nextLevelCoins = boundaries[levelInTier] ?? tier.end;
  }

  const denom = nextLevelCoins === null ? null : nextLevelCoins - levelStartCoins;
  const progress = denom && denom > 0 ? (lifetime - levelStartCoins) / denom : 0;

  const mythicTier = TIERS.find((t) => t.key === 'mythic')!;
  const hasReachedMythic40 = (() => {
    if (lifetime < mythicTier.start || lifetime >= mythicTier.end!) return false;
    const boundaries = computeTierBoundaries(mythicTier.start, mythicTier.end!, mythicTier.growth, 50);
    const mythicLevel = findLevelInBoundaries(lifetime, boundaries);
    return mythicLevel >= 40;
  })();

  const viewerIsAdmin = !!viewerContext?.is_admin;
  const canRevealDiamond = viewerIsAdmin || isDiamond || hasReachedMythic40;

  return {
    tier_key: tier.key,
    tier_name: tier.name,
    tier_color: null,
    tier_icon: null,
    is_diamond: tier.key === 'diamond',
    tier_level_max: tier.levelCount,
    level_in_tier: levelInTier,
    lifetime_coins: lifetime,
    tier_start_coins: tier.start,
    tier_end_coins: tier.end,
    level_start_coins: levelStartCoins,
    next_level_coins: nextLevelCoins,
    progress_pct: clamp01(progress),
    show_locked_tiers: canRevealDiamond,
    locked_reason: canRevealDiamond ? null : 'Reach Mythic level 40 to unlock Diamond tier details',
  };
}
