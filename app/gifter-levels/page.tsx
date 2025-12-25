'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, TrendingUp, Gift, Crown } from 'lucide-react';
import {
  GifterBadge,
  TierList,
  GIFTER_TIERS,
  MOCK_GIFTER_STATUS_VIP,
  GifterStatus,
  formatCoinAmount,
} from '@/components/gifter';

/**
 * Gifter Levels - Public explainer page
 * 
 * Accessible at: /gifter-levels
 */
export default function GifterLevelsPage() {
  // In production, this would come from the user's actual gifter status
  const [demoStatus] = useState<GifterStatus>(MOCK_GIFTER_STATUS_VIP);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
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
              Each tier has a unique badge that displays next to your name
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="flex flex-wrap justify-center gap-4">
              {GIFTER_TIERS.map((tier) => (
                <div key={tier.key} className="text-center space-y-2">
                  <GifterBadge
                    tier_key={tier.key}
                    level={25}
                    size="lg"
                  />
                  <p className="text-xs font-medium" style={{ color: tier.color }}>
                    {tier.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tier Requirements */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">All Tiers</h2>
            <p className="text-muted-foreground">
              50 levels per tier • Diamond has unlimited levels
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
                <div 
                  key={tier.key}
                  className={`
                    grid grid-cols-[1fr_100px_140px] gap-4 px-6 py-4
                    transition-colors hover:bg-muted/30
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
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diamond Highlight */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
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
            </div>
            
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
            <Link
              href="/wallet"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Get Coins
            </Link>
            <Link
              href="/live"
              className="px-6 py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
            >
              Browse Live Streams
            </Link>
          </div>
        </div>
      </div>

      {/* Dev-only debug section */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-4xl mx-auto px-6 pb-12 space-y-6">
          <div className="p-6 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔧 Dev: Interactive TierList Component
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(DEV ONLY)</span>
            </h2>
            <TierList gifterStatus={demoStatus} />
          </div>
        </div>
      )}
    </div>
  );
}

