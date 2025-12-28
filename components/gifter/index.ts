/**
 * Gifter Tier System Components
 * 
 * Export all gifter-related components for easy importing:
 * import { GifterBadge, TierList, TierDetail } from '@/components/gifter';
 */

export { default as GifterBadge, GifterBadgeCompact } from './GifterBadge';
export type { GifterBadgeProps } from './GifterBadge';

export { default as TierList } from './TierList';
export type { TierListProps } from './TierList';

export { default as TierDetail } from './TierDetail';
export type { TierDetailProps } from './TierDetail';

// Re-export types and utilities from lib
export {
  GIFTER_TIERS,
  getTierByKey,
  getTierByOrder,
  getVisibleTiers,
  formatCoinAmount,
  getTierLevelRange,
  getTierCoinRange,
  // Mock data for testing
  MOCK_GIFTER_STATUS_STARTER,
  MOCK_GIFTER_STATUS_ELITE,
  MOCK_GIFTER_STATUS_VIP,
  MOCK_GIFTER_STATUS_DIAMOND,
  ALL_MOCK_STATUSES,
} from '@/lib/gifter-tiers';

export type { GifterTier, GifterStatus } from '@/lib/gifter-tiers';





