'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Video, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';

interface Room {
  id: string;
  slug: string;
  display_name: string;
}

type LeaderboardType = 'gifts' | 'referrals';

/**
 * LEADERBOARDS PAGE
 * 
 * Dedicated page for leaderboards (moved from modal).
 * Better for mobile navigation and discoverability.
 * 
 * Route: /leaderboards?type=gifts (default) or /leaderboards?type=referrals
 */
export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LeaderboardsContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </main>
  );
}

function LeaderboardsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = (searchParams?.get('type') as LeaderboardType | null) ?? null;
  const [activeTab, setActiveTab] = useState<LeaderboardType>(typeParam || 'gifts');

  useEffect(() => {
    if (typeParam === 'referrals' || typeParam === 'gifts') {
      setActiveTab(typeParam);
    }
  }, [typeParam]);
  
  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        
        {/* Page Header */}
        <header className="mb-6 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 mb-4 shadow-lg">
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">
            Leaderboards
          </h1>
          <p className="text-base text-muted-foreground">
            {activeTab === 'gifts' 
              ? 'Top gifters and earners across MyLiveLinks'
              : 'Top referrers and influencers'}
          </p>
        </header>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          <Link href="/leaderboards?type=gifts" className="flex-1 max-w-xs">
            <button
              onClick={() => setActiveTab('gifts')}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'gifts'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <Video className="w-4 h-4" />
              Gifts & Earnings
            </button>
          </Link>
          <Link href="/leaderboards?type=referrals" className="flex-1 max-w-xs">
            <button
              onClick={() => setActiveTab('referrals')}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'referrals'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users className="w-4 h-4" />
              Referrals
            </button>
          </Link>
        </div>

        {/* Leaderboard content */}
        <div className="animate-slide-up">
          {activeTab === 'gifts' && <GiftsLeaderboardContent />}
          {activeTab === 'referrals' && <ReferralsLeaderboardContent />}
        </div>
      </div>
    </main>
  );
}

// Gifts & Earnings Leaderboard
function GiftsLeaderboardContent() {
  const [LeaderboardComponent, setLeaderboardComponent] = useState<any>(null);

  useEffect(() => {
    import('@/components/Leaderboard').then((mod) => {
      setLeaderboardComponent(() => mod.default);
    });
  }, []);

  if (!LeaderboardComponent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <LeaderboardComponent />;
}

// Referrals Leaderboard
function ReferralsLeaderboardContent() {
  const [ReferralLeaderboardComponent, setReferralLeaderboardComponent] = useState<any>(null);

  useEffect(() => {
    import('@/components/ReferralLeaderboardPreview').then((mod) => {
      setReferralLeaderboardComponent(() => mod.default);
    });
  }, []);

  if (!ReferralLeaderboardComponent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <ReferralLeaderboardComponent showCurrentUser={false} limit={50} />;
}
