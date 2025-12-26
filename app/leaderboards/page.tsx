'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';

interface Room {
  id: string;
  slug: string;
  display_name: string;
}

/**
 * LEADERBOARDS PAGE
 * 
 * Dedicated page for leaderboards (moved from modal).
 * Better for mobile navigation and discoverability.
 * 
 * Route: /leaderboards
 */
export default function LeaderboardsPage() {
  const pathname = usePathname();
  
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
            Top gifters and earners across MyLiveLinks
          </p>
        </header>

        {/* Leaderboard content will go here */}
        {/* For now, we'll import the Leaderboard component */}
        <div className="animate-slide-up">
          <LeaderboardContent />
        </div>
      </div>
    </main>
  );
}

// Temporary wrapper for the existing Leaderboard component
function LeaderboardContent() {
  // We'll dynamically import the Leaderboard component to avoid circular dependencies
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

