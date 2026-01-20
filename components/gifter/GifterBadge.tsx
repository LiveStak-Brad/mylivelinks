'use client';

import { useMemo } from 'react';
import { GIFTER_TIERS, getTierByKey } from '@/lib/gifter-tiers';

const MAX_TIER_ORDER = GIFTER_TIERS.reduce((max, t) => Math.max(max, t.order), 1);

export interface GifterBadgeProps {
  /** Tier key (e.g., 'starter', 'elite', 'diamond') */
  tier_key: string;
  /** Level within the tier (1-50, or 1+ for Diamond) */
  level: number;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the level number */
  showLevel?: boolean;
  /** Optional className override */
  className?: string;
}

/**
 * GifterBadge - Pill-shaped badge showing gifter tier and level
 * 
 * Features:
 * - Tier-colored background with icon
 * - Level display (number only)
 * - Diamond tier has animated shimmer effect
 * - Scales slightly with tier importance
 * - Respects reduced motion preferences
 */
export default function GifterBadge({
  tier_key,
  level,
  size = 'md',
  showLevel = true,
  className = '',
}: GifterBadgeProps) {
  const tier = useMemo(() => getTierByKey(tier_key), [tier_key]);
  
  if (!tier) {
    // Fallback for unknown tier
    return (
      <span className={`gifter-badge gifter-badge-${size} ${className}`}>
        <span className="gifter-badge-icon">?</span>
        {showLevel && <span className="gifter-badge-level">{level}</span>}
      </span>
    );
  }

  const isDiamond = tier.isDiamond;
  
  const t = (tier.order - 1) / Math.max(1, MAX_TIER_ORDER - 1);
  const tierScale = Math.min(1.4, 1 + 0.12 * t + 0.23 * t * t);
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  };
  
  const iconSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-semibold whitespace-nowrap
        ${sizeClasses[size]}
        ${isDiamond ? 'gifter-badge-diamond' : ''}
        ${className}
      `}
      style={{
        backgroundColor: `${tier.color}20`,
        color: tier.color,
        border: `1.5px solid ${tier.color}50`,
        boxShadow: isDiamond 
          ? `0 0 8px ${tier.color}40, inset 0 1px 0 rgba(255,255,255,0.2)` 
          : `inset 0 1px 0 rgba(255,255,255,0.1)`,
        transform: `scale(${tierScale})`,
        transformOrigin: 'center',
      }}
      title={`${tier.name} - Level ${level}`}
    >
      <span className={`${iconSizes[size]} leading-none`} role="img" aria-label={tier.name}>
        {tier.icon}
      </span>
      {showLevel && (
        <span className="font-bold tracking-tight text-base">
          {level}
        </span>
      )}
    </span>
  );
}

/**
 * Compact GifterBadge for tight spaces (icon only)
 */
export function GifterBadgeCompact({
  tier_key,
  className = '',
}: {
  tier_key: string;
  className?: string;
}) {
  const tier = useMemo(() => getTierByKey(tier_key), [tier_key]);
  
  if (!tier) return null;

  const t = (tier.order - 1) / Math.max(1, MAX_TIER_ORDER - 1);
  const tierScale = Math.min(1.4, 1 + 0.12 * t + 0.23 * t * t);

  return (
    <span
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]
        ${tier.isDiamond ? 'gifter-badge-diamond' : ''}
        ${className}
      `}
      style={{
        backgroundColor: `${tier.color}25`,
        border: `1.5px solid ${tier.color}60`,
        boxShadow: tier.isDiamond 
          ? `0 0 6px ${tier.color}50` 
          : 'none',
        transform: `scale(${tierScale})`,
        transformOrigin: 'center',
      }}
      title={tier.name}
    >
      <span role="img" aria-label={tier.name}>{tier.icon}</span>
    </span>
  );
}

