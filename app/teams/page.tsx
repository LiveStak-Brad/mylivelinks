'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Radio, Search, Users } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Chip, Input } from '@/components/ui';
import DiscoverTeamsOverlay from '@/components/teams/DiscoverTeamsOverlay';
import { createClient } from '@/lib/supabase';

const TEAMS_DISCOVERY_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TEAMS_DISCOVERY === 'true';
const ONBOARDING_KEY = 'mylivelinks_teams_onboarding_completed';

export default function TeamsIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [liveTogetherCount, setLiveTogetherCount] = useState(6);
  const [hubMode, setHubMode] = useState<'feed' | 'forum'>('feed');
  const [checkingTeam, setCheckingTeam] = useState(true);

  // Check onboarding status and if user has a team, redirect to it
  useEffect(() => {
    const checkUserTeam = async () => {
      if (typeof window === 'undefined') return;
      
      const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
      if (!onboardingCompleted) {
        router.replace('/teams/setup');
        return;
      }

      // Check if user has a team and redirect to it
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Find user's active team membership
          const { data: membership } = await supabase
            .from('team_memberships')
            .select('team_id, status')
            .eq('profile_id', user.id)
            .in('status', ['approved', 'requested'])
            .limit(1)
            .maybeSingle();

          if (membership?.team_id) {
            // Get team slug
            const { data: team } = await supabase
              .from('teams')
              .select('slug')
              .eq('id', membership.team_id)
              .single();

            if (team?.slug) {
              router.replace(`/teams/${team.slug}`);
              return;
            }
          }
        }
      } catch (error) {
        console.error('[teams] Error checking user team:', error);
      }
      
      setCheckingTeam(false);
    };

    checkUserTeam();
  }, [router]);

  useEffect(() => {
    const focusSearch = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => searchRef.current?.focus(), 50);
    };

    window.addEventListener('teams:focusSearch', focusSearch as EventListener);
    if (TEAMS_DISCOVERY_ENABLED) {
      window.addEventListener('mll:teams:focus', focusSearch as EventListener);
    }
    return () => {
      window.removeEventListener('teams:focusSearch', focusSearch as EventListener);
      if (TEAMS_DISCOVERY_ENABLED) {
        window.removeEventListener('mll:teams:focus', focusSearch as EventListener);
      }
    };
  }, []);

  // Show loading while checking for user's team
  if (checkingTeam) {
    return (
      <PageShell maxWidth="lg" padding="md">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading your team...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell maxWidth="lg" padding="md">
        <PageHeader
          title="Teams"
          description="Premium communities: live together, forum threads, and high-velocity feeds (UI-only)"
          icon={<Users className="w-6 h-6 text-primary" />}
        />

        <PageSection card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Live Together</p>
              <p className="text-sm text-muted-foreground">
                Drop into a team stage that grows as people join — like Discord’s group live.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-2 text-sm">
                <Radio className="h-4 w-4 text-destructive" />
                <span className="font-semibold">{liveTogetherCount}</span>
                <span className="text-muted-foreground">in stage</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLiveTogetherCount((v) => Math.min(24, v + 1))}>
                Simulate join
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLiveTogetherCount((v) => Math.max(0, v - 1))}>
                Simulate leave
              </Button>
              <Link href="/teams/sandbox">
                <Button variant="primary">Open Premium Sandbox</Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Subreddit-style forum</p>
              <p className="text-sm text-muted-foreground">
                Pinned announcements, hot threads, and deep comment chains.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip variant="outline" size="sm" selected={hubMode === 'forum'} onClick={() => setHubMode('forum')}>
                  Forum preview
                </Chip>
                <Chip variant="outline" size="sm" selected={hubMode === 'feed'} onClick={() => setHubMode('feed')}>
                  Feed preview
                </Chip>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This hub stays UI-only until teams are fully wired.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Identity-driven</p>
              <p className="text-sm text-muted-foreground">
                Banner + circle icon, theme accents across live, badges, and chips.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Link href="/teams/sandbox#identity">
                  <Button variant="outline" size="sm">
                    Jump to identity
                  </Button>
                </Link>
                <Link href="/teams/sandbox#together">
                  <Button variant="outline" size="sm">
                    Jump to live together
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection card>
          {TEAMS_DISCOVERY_ENABLED ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search teams"
                    className="pl-10"
                  />
                </div>
                <Chip
                  variant="outline"
                  size="lg"
                  className="font-semibold"
                  icon={<Compass className="h-4 w-4" />}
                  onClick={() => setShowDiscover(true)}
                >
                  Discover Teams
                </Chip>
              </div>

              <p className="text-sm text-muted-foreground">
                Use the discovery overlay to browse public teams, send join requests, or unlock private teams with invite codes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams"
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Search for teams you've joined or been invited to.
              </p>
            </div>
          )}
        </PageSection>
      </PageShell>

      {TEAMS_DISCOVERY_ENABLED && (
        <DiscoverTeamsOverlay isOpen={showDiscover} onClose={() => setShowDiscover(false)} />
      )}
    </>
  );
}
