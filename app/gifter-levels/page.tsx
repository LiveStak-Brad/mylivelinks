'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, Gift, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import {
  GifterBadge,
  TierDetail,
  TierList,
  GIFTER_TIERS,
  MOCK_GIFTER_STATUS_VIP,
  GifterStatus,
  GifterTier,
  formatCoinAmount,
} from '@/components/gifter';
import { createClient } from '@/lib/supabase';
import { LIVE_LAUNCH_ENABLED, isLiveOwnerUser } from '@/lib/livekit-constants';
import { PageShell, PageHeader, Grid } from '@/components/layout';
import { Card, Button } from '@/components/ui';

// Helper to compute level boundaries for a tier
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
  return boundaries;
}

// Tier growth rates matching lib/gifter-status.ts
const TIER_GROWTH: Record<string, number> = {
  starter: 1.1,
  supporter: 1.12,
  contributor: 1.15,
  elite: 1.18,
  patron: 1.22,
  power: 1.26,
  vip: 1.3,
  legend: 1.35,
  mythic: 1.4,
  diamond: 1.45,
};

type LevelInfo = {
  level: number;
  rangeStart: number;
  rangeEnd: number;
  cost: number;
};

/**
 * Gifter Levels - Public explainer page
 * 
 * Accessible at: /gifter-levels
 */
export default function GifterLevelsPage() {
  const [demoStatus] = useState<GifterStatus>(MOCK_GIFTER_STATUS_VIP);
  const [selectedTier, setSelectedTier] = useState<GifterTier | null>(null);
  const [canOpenLive, setCanOpenLive] = useState(false);
  const [breakdownTier, setBreakdownTier] = useState<string>('starter');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Compute level info for the selected breakdown tier
  const levelInfo = useMemo((): LevelInfo[] => {
    const tier = GIFTER_TIERS.find(t => t.key === breakdownTier);
    if (!tier || tier.isDiamond) {
      // Diamond tier uses different calculation
      const DIAMOND_BASE = 3_000_000;
      const DIAMOND_GROWTH = 1.45;
      const levels: LevelInfo[] = [];
      let start = 60_000_000;
      for (let i = 1; i <= 20; i++) {
        const cost = Math.floor(DIAMOND_BASE * Math.pow(DIAMOND_GROWTH, i - 1));
        levels.push({ level: i, rangeStart: start, rangeEnd: start + cost, cost });
        start += cost;
      }
      return levels;
    }

    const growth = TIER_GROWTH[tier.key] || 1.1;
    const boundaries = computeTierBoundaries(tier.minLifetimeCoins, tier.maxLifetimeCoins! + 1, growth, 50);
    
    return Array.from({ length: 50 }, (_, i) => ({
      level: i + 1,
      rangeStart: boundaries[i],
      rangeEnd: boundaries[i + 1],
      cost: boundaries[i + 1] - boundaries[i],
    }));
  }, [breakdownTier]);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCanOpenLive(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user?.id, email: user?.email }));
    })();
  }, []);

  return (
    <PageShell maxWidth="lg" padding="lg" className="bg-gradient-to-b from-background via-background to-muted/30 pb-20 md:pb-8">
      <PageHeader 
        title="" 
        backLink="/" 
        backLabel="Back to Home"
      />

      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Rewards Program
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Gifter Levels
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Support your favorite creators and unlock exclusive badges, perks, and recognition 
            as you climb through <strong>10 unique tiers</strong>.
          </p>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Send Gifts</h3>
            <p className="text-sm text-muted-foreground">
              Use coins to send gifts to creators during their live streams
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Level Up</h3>
            <p className="text-sm text-muted-foreground">
              Every coin you gift counts toward your lifetime total and level
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Get Recognized</h3>
            <p className="text-sm text-muted-foreground">
              Unlock exclusive badges that show your support level in chat
            </p>
          </div>
        </div>

        {/* Badge Preview Section */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Exclusive Badges</h2>
            <p className="text-muted-foreground">
              Each tier has a unique badge — <strong>higher tiers have larger badges!</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Click any badge to see tier details
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="flex flex-wrap justify-center items-end gap-4">
              {GIFTER_TIERS.map((tier) => (
                <button
                  key={tier.key}
                  onClick={() => setSelectedTier(tier)}
                  className="text-center space-y-2 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="transform group-hover:scale-110 transition-transform">
                    <GifterBadge
                      tier_key={tier.key}
                      level={25}
                    />
                  </div>
                  <p className="text-xs font-medium" style={{ color: tier.color }}>
                    {tier.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Badge Size Showcase */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Badges Scale With Your Tier</h2>
            <p className="text-muted-foreground">
              As you climb higher, your badge grows to match your status
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="flex justify-center items-end gap-8">
              <div className="text-center space-y-3">
                <GifterBadge tier_key="starter" level={10} size="sm" />
                <p className="text-xs text-muted-foreground">Starter</p>
                <p className="text-[10px] text-muted-foreground/70">Small</p>
              </div>
              <div className="text-center space-y-3">
                <GifterBadge tier_key="elite" level={25} size="md" />
                <p className="text-xs text-muted-foreground">Elite</p>
                <p className="text-[10px] text-muted-foreground/70">Medium</p>
              </div>
              <div className="text-center space-y-3">
                <GifterBadge tier_key="diamond" level={50} size="lg" />
                <p className="text-xs text-muted-foreground">Diamond</p>
                <p className="text-[10px] text-muted-foreground/70">Large</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Requirements */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">All Tiers</h2>
            <p className="text-muted-foreground">
              50 levels per tier • Diamond has unlimited levels • Click any tier for details
            </p>
          </div>
          
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_140px] gap-4 px-6 py-4 bg-muted/50 border-b border-border">
              <div className="text-sm font-semibold text-muted-foreground">Tier</div>
              <div className="text-sm font-semibold text-muted-foreground text-center">Levels</div>
              <div className="text-sm font-semibold text-muted-foreground text-right">Coins Required</div>
            </div>
            
            {/* Tier Rows */}
            <div className="divide-y divide-border">
              {GIFTER_TIERS.map((tier) => (
                <button 
                  key={tier.key}
                  onClick={() => setSelectedTier(tier)}
                  className={`
                    w-full grid grid-cols-[1fr_100px_140px] gap-4 px-6 py-4
                    transition-colors hover:bg-muted/30 text-left cursor-pointer
                    ${tier.isDiamond ? 'bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-xl
                        ${tier.isDiamond ? 'animate-pulse' : ''}
                      `}
                      style={{
                        backgroundColor: `${tier.color}20`,
                        border: `2px solid ${tier.color}50`,
                        boxShadow: tier.isDiamond ? `0 0 12px ${tier.color}40` : 'none',
                      }}
                    >
                      {tier.icon}
                    </span>
                    <div>
                      <span className="font-semibold text-foreground" style={{ color: tier.isDiamond ? tier.color : undefined }}>
                        {tier.name}
                      </span>
                      {tier.isDiamond && (
                        <p className="text-xs text-muted-foreground">Ultimate tier</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-muted-foreground font-mono">
                      {tier.isDiamond ? '1+' : '1–50'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono text-muted-foreground">
                      {tier.maxLifetimeCoins === null 
                        ? `${formatCoinAmount(tier.minLifetimeCoins)}+`
                        : `${formatCoinAmount(tier.minLifetimeCoins)} – ${formatCoinAmount(tier.maxLifetimeCoins + 1)}`
                      }
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Level Breakdown Section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Level Breakdown</h2>
            <p className="text-muted-foreground">
              See exactly how many coins each level costs within each tier
            </p>
          </div>

          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full p-4 rounded-2xl bg-card border border-border hover:bg-muted/30 transition-colors flex items-center justify-between"
          >
            <span className="font-semibold text-foreground">View Detailed Level Costs</span>
            {showBreakdown ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {showBreakdown && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Tier Tabs */}
              <div className="flex overflow-x-auto border-b border-border bg-muted/30 p-2 gap-1">
                {GIFTER_TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    onClick={() => setBreakdownTier(tier.key)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                      ${breakdownTier === tier.key 
                        ? 'bg-background shadow-sm' 
                        : 'hover:bg-background/50'
                      }
                    `}
                    style={{ 
                      color: breakdownTier === tier.key ? tier.color : undefined,
                      borderBottom: breakdownTier === tier.key ? `2px solid ${tier.color}` : undefined
                    }}
                  >
                    <span>{tier.icon}</span>
                    <span>{tier.name}</span>
                  </button>
                ))}
              </div>

              {/* Tier Summary */}
              {(() => {
                const tier = GIFTER_TIERS.find(t => t.key === breakdownTier);
                if (!tier) return null;
                return (
                  <div className="p-4 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${tier.color}20`, border: `2px solid ${tier.color}50` }}
                      >
                        {tier.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: tier.color }}>{tier.name} Tier</h3>
                        <p className="text-sm text-muted-foreground">
                          {tier.isDiamond 
                            ? `${formatCoinAmount(tier.minLifetimeCoins)}+ coins • Unlimited levels • Growth: ${TIER_GROWTH[tier.key]}x per level`
                            : `${formatCoinAmount(tier.minLifetimeCoins)} – ${formatCoinAmount(tier.maxLifetimeCoins! + 1)} coins • 50 levels • Growth: ${TIER_GROWTH[tier.key]}x`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Level Table */}
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Level</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Coins Needed</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Cost to Level Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {levelInfo.map((info) => (
                      <tr key={info.level} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">
                          Lv {info.level}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono">
                          {formatCoinAmount(info.rangeStart)} → {formatCoinAmount(info.rangeEnd)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                          {formatCoinAmount(info.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Diamond Note */}
              {breakdownTier === 'diamond' && (
                <div className="p-4 bg-cyan-500/10 border-t border-cyan-500/30">
                  <p className="text-sm text-cyan-400 text-center">
                    💎 Diamond tier has unlimited levels. Showing first 20 levels. Each level costs 1.45x more than the previous.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diamond Highlight */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <button 
              onClick={() => setSelectedTier(GIFTER_TIERS.find(t => t.isDiamond) || null)}
              className="flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
            >
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl animate-pulse"
                style={{
                  backgroundColor: '#22D3EE20',
                  border: '3px solid #22D3EE60',
                  boxShadow: '0 0 30px #22D3EE40, 0 0 60px #22D3EE20',
                }}
              >
                💎
              </div>
            </button>
            
            <div className="text-center md:text-left space-y-3">
              <h3 className="text-2xl font-bold text-cyan-400">
                Reach Diamond Status
              </h3>
              <p className="text-muted-foreground max-w-md">
                The ultimate recognition for our most generous supporters. 
                Diamond members have <strong>unlimited levels</strong> and exclusive perks. 
                Join the elite at <strong>60 million coins</strong> gifted.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 pb-8">
          <h2 className="text-2xl font-bold text-foreground">Ready to Start?</h2>
          <p className="text-muted-foreground">
            Get coins and start supporting your favorite creators today!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/wallet">
              <Button size="lg">Get Coins</Button>
            </Link>
            {canOpenLive ? (
              <Link href="/live">
                <Button variant="secondary" size="lg">Browse Live Streams</Button>
              </Link>
            ) : (
              <Button 
                variant="secondary" 
                size="lg" 
                disabled
                title="Live streaming coming soon"
              >
                Browse Live Streams
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* TierDetail Modal */}
      {selectedTier && (
        <TierDetail
          tier={selectedTier}
          gifterStatus={demoStatus}
          isOpen={true}
          onClose={() => setSelectedTier(null)}
        />
      )}

      {/* Dev-only debug section */}
      {process.env.NODE_ENV === 'development' && (
        <div className="space-y-6 pb-8">
          <Card className="p-6 border-2 border-dashed border-amber-500/50 bg-amber-500/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔧 Dev: Interactive TierList Component
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(DEV ONLY)</span>
            </h2>
            <TierList gifterStatus={demoStatus} />
          </Card>
        </div>
      )}
    </PageShell>
  );
}
