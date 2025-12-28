'use client';

import { useMemo } from 'react';
import { GIFTER_TIERS, getTierByKey, formatCoinAmount, getTierCoinRange } from '@/lib/gifter-tiers';
import GifterBadge from '@/components/gifter/GifterBadge';
import { Trophy, TrendingUp, Target, Star, Award } from 'lucide-react';

export interface TierProgressCardProps {
  tierKey: string;
  tierName: string;
  tierColor: string;
  tierIcon: string;
  level: number;
  levelInTier: number;
  tierLevelMax: number;
  isDiamond: boolean;
  progressPct: number;
  lifetimeCoins: number;
  nextLevelCoins: number;
  loading?: boolean;
}

export default function TierProgressCard({
  tierKey,
  tierName,
  tierColor,
  tierIcon,
  level,
  levelInTier,
  tierLevelMax,
  isDiamond,
  progressPct,
  lifetimeCoins,
  nextLevelCoins,
  loading = false,
}: TierProgressCardProps) {
  const tier = useMemo(() => getTierByKey(tierKey), [tierKey]);
  const currentTierIndex = tier ? GIFTER_TIERS.findIndex(t => t.key === tierKey) : 0;
  const nextTier = GIFTER_TIERS[currentTierIndex + 1] || null;
  
  // Calculate percentile (rough estimate based on tier)
  const estimatedPercentile = useMemo(() => {
    if (!tier) return 0;
    // Higher tiers = higher percentile
    const tierProgress = tier.order / 10;
    const levelProgress = levelInTier / 50;
    return Math.round((tierProgress * 0.7 + levelProgress * 0.3) * 100);
  }, [tier, levelInTier]);
  
  // Milestones reached
  const milestones = useMemo(() => {
    const reached: Array<{ name: string; coins: number; reached: boolean }> = [
      { name: 'First Gift', coins: 1, reached: lifetimeCoins >= 1 },
      { name: 'Regular Supporter', coins: 10000, reached: lifetimeCoins >= 10000 },
      { name: 'Generous Patron', coins: 100000, reached: lifetimeCoins >= 100000 },
      { name: 'Elite Supporter', coins: 1000000, reached: lifetimeCoins >= 1000000 },
      { name: 'Legendary Backer', coins: 10000000, reached: lifetimeCoins >= 10000000 },
      { name: 'Diamond Legend', coins: 60000000, reached: lifetimeCoins >= 60000000 },
    ];
    return reached;
  }, [lifetimeCoins]);
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-700" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="h-4 w-full bg-gray-700 rounded" />
          <div className="h-20 w-full bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Tier Badge */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ 
              backgroundColor: `${tierColor}20`,
              border: `2px solid ${tierColor}50`,
            }}
          >
            {tierIcon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{tierName}</h2>
              <GifterBadge tier_key={tierKey} level={level} size="md" />
            </div>
            <p className="text-sm text-gray-400">
              Global Level {level} • {isDiamond ? 'Unlimited' : `Level ${levelInTier} of ${tierLevelMax}`}
            </p>
          </div>
        </div>
        
        {/* Progress to next level */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress to Level {level + 1}</span>
            <span className="text-white font-medium">{progressPct}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: tierColor,
                boxShadow: `0 0 10px ${tierColor}50`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCoinAmount(lifetimeCoins)} coins</span>
            <span>{formatCoinAmount(nextLevelCoins)} to next level</span>
          </div>
        </div>
        
        {/* Next tier preview */}
        {nextTier && !isDiamond && (
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: `${nextTier.color}10`,
              borderColor: `${nextTier.color}30`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{nextTier.icon}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: nextTier.color }}>
                    Next: {nextTier.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getTierCoinRange(nextTier)}
                  </p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        )}
        
        {isDiamond && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center">
            <Trophy className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-cyan-400 font-medium">Maximum Tier Achieved!</p>
            <p className="text-xs text-gray-400 mt-1">
              Continue gifting to increase your Diamond level
            </p>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{level}</p>
          <p className="text-xs text-gray-400">Global Level</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{levelInTier}</p>
          <p className="text-xs text-gray-400">Tier Level</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <Award className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">{formatCoinAmount(lifetimeCoins)}</p>
          <p className="text-xs text-gray-400">Lifetime Coins</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <Trophy className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-lg font-bold text-white">Top {100 - estimatedPercentile}%</p>
          <p className="text-xs text-gray-400">Est. Ranking</p>
        </div>
      </div>
      
      {/* Milestones */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Milestones
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {milestones.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border transition ${
                m.reached
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-gray-700/30 border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {m.reached ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-gray-500">○</span>
                )}
                <span className={`text-sm font-medium ${m.reached ? 'text-white' : 'text-gray-400'}`}>
                  {m.name}
                </span>
              </div>
              <p className={`text-xs ${m.reached ? 'text-green-400' : 'text-gray-500'}`}>
                {formatCoinAmount(m.coins)} coins
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* All Tiers List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="font-semibold text-white mb-4">All Tiers</h3>
        <div className="space-y-2">
          {GIFTER_TIERS.map((t) => {
            const isCurrentTier = t.key === tierKey;
            const isPastTier = t.order < (tier?.order || 0);
            
            return (
              <div
                key={t.key}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isCurrentTier
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : isPastTier
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-gray-700/20 border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className={`font-medium ${isCurrentTier ? 'text-white' : 'text-gray-300'}`}>
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{getTierCoinRange(t)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isPastTier && (
                    <span className="text-xs text-green-400 px-2 py-1 bg-green-500/10 rounded-full">
                      Completed
                    </span>
                  )}
                  {isCurrentTier && (
                    <span className="text-xs text-purple-400 px-2 py-1 bg-purple-500/10 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}




