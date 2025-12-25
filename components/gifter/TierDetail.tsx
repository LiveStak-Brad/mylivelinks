'use client';

import { useMemo } from 'react';
import { X, Lock, ChevronRight } from 'lucide-react';
import {
  GifterStatus,
  GifterTier,
  getTierByKey,
  getTierLevelRange,
  getTierCoinRange,
  formatCoinAmount,
  GIFTER_TIERS,
} from '@/lib/gifter-tiers';
import GifterBadge from './GifterBadge';

export interface TierDetailProps {
  /** The tier to display details for */
  tier: GifterTier;
  /** Current user's gifter status */
  gifterStatus: GifterStatus;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * TierDetail - Modal showing detailed information about a specific tier
 * 
 * Features:
 * - Tier name and badge preview
 * - Current level and progress bar (if user's tier)
 * - Coins needed for next level
 * - Locked tiers show "Locked" message
 * - Shows perks/benefits for tier (placeholder for future)
 */
export default function TierDetail({
  tier,
  gifterStatus,
  isOpen,
  onClose,
}: TierDetailProps) {
  if (!isOpen) return null;
  
  const currentTier = useMemo(
    () => getTierByKey(gifterStatus.tier_key),
    [gifterStatus.tier_key]
  );
  
  const isCurrentTier = tier.key === gifterStatus.tier_key;
  const isLocked = currentTier ? tier.order > currentTier.order : true;
  const isPast = currentTier ? tier.order < currentTier.order : false;
  
  // Get next tier for progression info
  const nextTier = useMemo(
    () => GIFTER_TIERS.find((t) => t.order === tier.order + 1),
    [tier.order]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tier color accent */}
        <div
          className="relative px-6 py-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${tier.color}15 0%, ${tier.color}05 100%)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          {/* Large tier icon */}
          <div
            className={`
              inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl mb-4
              ${tier.isDiamond ? 'gifter-badge-diamond' : ''}
            `}
            style={{
              backgroundColor: `${tier.color}25`,
              border: `3px solid ${tier.color}60`,
              boxShadow: tier.isDiamond 
                ? `0 0 20px ${tier.color}50, 0 0 40px ${tier.color}20` 
                : `0 4px 12px ${tier.color}20`,
            }}
          >
            {tier.icon}
          </div>
          
          {/* Tier name */}
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: tier.color }}
          >
            {tier.name}
          </h2>
          
          {/* Tier status */}
          <div className="text-sm text-muted-foreground">
            {isCurrentTier && 'Your Current Tier'}
            {isPast && 'Completed ✓'}
            {isLocked && (
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Locked state */}
          {isLocked && !gifterStatus.show_locked_tiers && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Tier Locked</h3>
              <p className="text-sm text-muted-foreground">
                Keep gifting to unlock this tier and see its rewards!
              </p>
            </div>
          )}
          
          {/* Unlocked state (visible or current/past) */}
          {(!isLocked || gifterStatus.show_locked_tiers) && (
            <>
              {/* Badge Preview */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Badge Preview</span>
                <div className="flex gap-2">
                  <GifterBadge tier_key={tier.key} level={1} size="sm" />
                  <GifterBadge tier_key={tier.key} level={25} size="md" />
                  <GifterBadge tier_key={tier.key} level={50} size="lg" />
                </div>
              </div>
              
              {/* Tier info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Levels
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    {getTierLevelRange(tier)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Coins Required
                  </div>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {getTierCoinRange(tier)}
                  </div>
                </div>
              </div>
              
              {/* Current tier progress */}
              {isCurrentTier && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      Level {gifterStatus.level_in_tier}
                      {tier.levelMax !== Infinity && ` / ${tier.levelMax}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {gifterStatus.progress_pct}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${gifterStatus.progress_pct}%`,
                        backgroundColor: tier.color,
                        boxShadow: `0 0 8px ${tier.color}60`,
                      }}
                    />
                  </div>
                  
                  {/* Coins to next level */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Lifetime: {formatCoinAmount(gifterStatus.lifetime_coins)} coins
                    </span>
                    <span className="text-muted-foreground">
                      Next: {formatCoinAmount(gifterStatus.next_level_coins)} more
                    </span>
                  </div>
                </div>
              )}
              
              {/* Next tier preview */}
              {isCurrentTier && nextTier && (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{
                    background: `linear-gradient(90deg, ${nextTier.color}08 0%, transparent 100%)`,
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{
                      backgroundColor: `${nextTier.color}20`,
                      border: `2px solid ${nextTier.color}40`,
                    }}
                  >
                    {nextTier.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      Next: {nextTier.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCoinAmount(nextTier.minLifetimeCoins - gifterStatus.lifetime_coins)} coins to unlock
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              
              {/* Diamond special message */}
              {tier.isDiamond && (
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30">
                  <p className="text-sm text-foreground">
                    ✨ <strong>Diamond</strong> is the ultimate tier with <strong>unlimited levels</strong>!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your generosity knows no bounds.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

