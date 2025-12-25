'use client';

import { useMemo, useState } from 'react';
import {
  GIFTER_TIERS,
  GifterStatus,
  GifterTier,
  getVisibleTiers,
  getTierLevelRange,
  getTierCoinRange,
  getTierByKey,
} from '@/lib/gifter-tiers';
import GifterBadge from './GifterBadge';
import TierDetail from './TierDetail';

export interface TierListProps {
  /** Current user's gifter status */
  gifterStatus: GifterStatus;
  /** Optional className override */
  className?: string;
}

/**
 * TierList - Vertical list showing all gifter tiers
 * 
 * Features:
 * - Shows tiers with level ranges and coin requirements
 * - Highlights current tier
 * - Locked tiers show as "???" if show_locked_tiers is false
 * - Diamond tier shows "1+" instead of "1-50"
 * - Click tier to open TierDetail modal
 */
export default function TierList({
  gifterStatus,
  className = '',
}: TierListProps) {
  const [selectedTier, setSelectedTier] = useState<GifterTier | null>(null);
  
  const visibleTiers = useMemo(
    () => getVisibleTiers(gifterStatus.tier_key, gifterStatus.show_locked_tiers),
    [gifterStatus.tier_key, gifterStatus.show_locked_tiers]
  );
  
  const currentTier = useMemo(
    () => getTierByKey(gifterStatus.tier_key),
    [gifterStatus.tier_key]
  );
  
  // Determine which tiers should be shown as locked (???)
  const isLocked = (tier: GifterTier): boolean => {
    if (gifterStatus.show_locked_tiers) return false;
    if (!currentTier) return true;
    return tier.order > currentTier.order + 1;
  };

  const handleTierClick = (tier: GifterTier) => {
    setSelectedTier(tier);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-foreground">Gifter Tiers</h2>
        {currentTier && (
          <GifterBadge
            tier_key={gifterStatus.tier_key}
            level={gifterStatus.level_in_tier}
            size="md"
          />
        )}
      </div>
      
      {/* Tier Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_120px] gap-2 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div>Tier</div>
          <div className="text-center">Levels</div>
          <div className="text-right">Coins</div>
        </div>
        
        {/* Tier Rows */}
        <div className="divide-y divide-border">
          {GIFTER_TIERS.map((tier) => {
            const locked = isLocked(tier);
            const isCurrent = tier.key === gifterStatus.tier_key;
            const isVisible = visibleTiers.some((t) => t.key === tier.key);
            
            // Completely hidden tiers (not in visible list and locked)
            if (!isVisible && locked) {
              return (
                <div
                  key={tier.key}
                  className="grid grid-cols-[1fr_80px_120px] gap-2 px-4 py-3 bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      ?
                    </span>
                    <span className="font-medium text-muted-foreground">???</span>
                  </div>
                  <div className="text-center text-muted-foreground">—</div>
                  <div className="text-right text-muted-foreground">—</div>
                </div>
              );
            }
            
            return (
              <button
                key={tier.key}
                onClick={() => handleTierClick(tier)}
                className={`
                  w-full grid grid-cols-[1fr_80px_120px] gap-2 px-4 py-3
                  transition-colors text-left
                  hover:bg-muted/50
                  ${isCurrent ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                `}
              >
                {/* Tier Name & Badge Preview */}
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-base
                      ${tier.isDiamond ? 'gifter-badge-diamond' : ''}
                    `}
                    style={{
                      backgroundColor: `${tier.color}20`,
                      border: `2px solid ${tier.color}50`,
                      boxShadow: tier.isDiamond ? `0 0 8px ${tier.color}40` : 'none',
                    }}
                  >
                    {tier.icon}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className="font-semibold"
                      style={{ color: isCurrent ? tier.color : 'inherit' }}
                    >
                      {tier.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Level Range */}
                <div className="text-center text-sm text-muted-foreground self-center">
                  {getTierLevelRange(tier)}
                </div>
                
                {/* Coin Range */}
                <div className="text-right text-sm text-muted-foreground self-center font-mono">
                  {getTierCoinRange(tier)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>💡 Spend coins to level up and unlock higher tiers!</p>
        {!gifterStatus.show_locked_tiers && (
          <p className="mt-1 text-muted-foreground/70">
            Some tiers are hidden. Keep gifting to reveal more!
          </p>
        )}
      </div>
      
      {/* Tier Detail Modal */}
      {selectedTier && (
        <TierDetail
          tier={selectedTier}
          gifterStatus={gifterStatus}
          isOpen={true}
          onClose={() => setSelectedTier(null)}
        />
      )}
    </div>
  );
}

