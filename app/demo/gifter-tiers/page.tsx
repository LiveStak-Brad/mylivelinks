'use client';

import { useState } from 'react';
import {
  GifterBadge,
  GifterBadgeCompact,
  TierList,
  GIFTER_TIERS,
  MOCK_GIFTER_STATUS_STARTER,
  MOCK_GIFTER_STATUS_ELITE,
  MOCK_GIFTER_STATUS_VIP,
  MOCK_GIFTER_STATUS_DIAMOND,
  ALL_MOCK_STATUSES,
  GifterStatus,
} from '@/components/gifter';

/**
 * Demo page for testing the Gifter Tier UI System
 * 
 * Accessible at: /demo/gifter-tiers
 */
export default function GifterTiersDemoPage() {
  const [selectedMock, setSelectedMock] = useState<GifterStatus>(MOCK_GIFTER_STATUS_VIP);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold gradient-text">
            Gifter Tier System Demo
          </h1>
          <p className="text-muted-foreground">
            UI components for the MyLiveLinks gifter tier and level system
          </p>
        </div>

        {/* Mock Status Selector */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Test Different User States</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Starter (Lv 5)', status: MOCK_GIFTER_STATUS_STARTER },
              { label: 'Elite (Lv 25)', status: MOCK_GIFTER_STATUS_ELITE },
              { label: 'VIP (Lv 25)', status: MOCK_GIFTER_STATUS_VIP },
              { label: 'Diamond (Lv 73)', status: MOCK_GIFTER_STATUS_DIAMOND },
            ].map(({ label, status }) => (
              <button
                key={status.tier_key}
                onClick={() => setSelectedMock(status)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${selectedMock.tier_key === status.tier_key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Showcase */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">GifterBadge Component</h2>
          
          {/* All Tiers */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                All Tiers (Size: md)
              </h3>
              <div className="flex flex-wrap gap-3 items-center">
                {GIFTER_TIERS.map((tier) => (
                  <GifterBadge
                    key={tier.key}
                    tier_key={tier.key}
                    level={25}
                    size="md"
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Size Variants (Diamond Tier)
              </h3>
              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <GifterBadge tier_key="diamond" level={1} size="sm" />
                  <p className="text-xs text-muted-foreground mt-2">sm</p>
                </div>
                <div className="text-center">
                  <GifterBadge tier_key="diamond" level={25} size="md" />
                  <p className="text-xs text-muted-foreground mt-2">md</p>
                </div>
                <div className="text-center">
                  <GifterBadge tier_key="diamond" level={73} size="lg" />
                  <p className="text-xs text-muted-foreground mt-2">lg</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Compact Badges (Icon Only)
              </h3>
              <div className="flex gap-2">
                {GIFTER_TIERS.map((tier) => (
                  <GifterBadgeCompact key={tier.key} tier_key={tier.key} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                In Context: Chat Message
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    J
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">JohnDoe</span>
                      <GifterBadge
                        tier_key={selectedMock.tier_key}
                        level={selectedMock.level_in_tier}
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">2:34 PM</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is how the badge looks in a chat message!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier List */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <TierList gifterStatus={selectedMock} />
        </div>

        {/* Current Status Debug */}
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Current GifterStatus Object</h2>
          <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono">
            {JSON.stringify(selectedMock, null, 2)}
          </pre>
        </div>

        {/* Implementation Notes */}
        <div className="p-6 rounded-xl border border-border bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">📋 Implementation Notes</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>10 Tiers:</strong> Starter → Diamond, each with 50 levels (Diamond is unlimited)</li>
            <li>• <strong>Badge scales</strong> slightly larger for higher tiers</li>
            <li>• <strong>Diamond tier</strong> has animated shimmer + glow (respects reduced motion)</li>
            <li>• <strong>Locked tiers</strong> show as &quot;???&quot; when show_locked_tiers = false</li>
            <li>• <strong>Click any tier</strong> in the list to see TierDetail modal</li>
            <li>• <strong>Mobile:</strong> React Native versions in mobile/components/gifter/</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

