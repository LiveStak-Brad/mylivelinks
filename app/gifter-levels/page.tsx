'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingUp, Gift, Crown } from 'lucide-react';
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

/**
 * Gifter Levels - Public explainer page
 * 
 * Accessible at: /gifter-levels
 */
export default function GifterLevelsPage() {
  const [demoStatus] = useState<GifterStatus>(MOCK_GIFTER_STATUS_VIP);
  const [selectedTier, setSelectedTier] = useState<GifterTier | null>(null);
  const [canOpenLive, setCanOpenLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCanOpenLive(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user?.id, email: user?.email }));
    })();
  }, []);

  return (
    <PageShell maxWidth="lg" padding="lg" className="bg-gradient-to-b from-background via-background to-muted/30">
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
