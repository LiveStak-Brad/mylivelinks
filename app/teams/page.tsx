'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Search, Users } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Chip, Input } from '@/components/ui';
import DiscoverTeamsOverlay from '@/components/teams/DiscoverTeamsOverlay';
import { createClient } from '@/lib/supabase';

const TEAMS_DISCOVERY_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TEAMS_DISCOVERY === 'true';
const ONBOARDING_KEY = 'mylivelinks_teams_onboarding_completed';

type MyTeamRow = {
  team_id: string;
  status: string;
  role: string;
  team: {
    id: string;
    slug: string;
    name: string;
    team_tag: string;
    approved_member_count: number;
  } | null;
};

export default function TeamsIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [isAllowlisted, setIsAllowlisted] = useState(false);
  const [allowlistChecked, setAllowlistChecked] = useState(false);
  const [myTeams, setMyTeams] = useState<MyTeamRow[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Check onboarding status and if user has a team, redirect to it
  useEffect(() => {
    const checkUserTeam = async () => {
      if (typeof window === 'undefined') return;
      
      const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
      if (!onboardingCompleted) {
        router.replace('/teams/setup');
        return;
      }

      setCheckingTeam(false);
    };

    checkUserTeam();
  }, [router]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const isAllowed = (userId?: string | null, email?: string | null) => {
      const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
      const hardcodedEmails = ['wcba.mo@gmail.com'];

      const idMatch = !!(userId && (envIds.includes(userId) || hardcodedIds.includes(userId)));
      const emailMatch = !!(
        email && (envEmails.includes(email.toLowerCase()) || hardcodedEmails.includes(email.toLowerCase()))
      );
      return idMatch || emailMatch;
    };

    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        setIsAllowlisted(isAllowed(user?.id, user?.email));
        setAllowlistChecked(true);
      } catch {
        if (!mounted) return;
        setIsAllowlisted(false);
        setAllowlistChecked(true);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (checkingTeam) return;
    let cancelled = false;
    const supabase = createClient();

    const run = async () => {
      setLoadingTeams(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setMyTeams([]);
          return;
        }

        const { data, error } = await supabase
          .from('team_memberships')
          .select(
            `
            team_id,
            status,
            role,
            team:teams!team_memberships_team_id_fkey (
              id,
              slug,
              name,
              team_tag,
              approved_member_count
            )
          `
          )
          .eq('profile_id', user.id)
          .in('status', ['approved', 'requested'])
          .order('requested_at', { ascending: false });

        if (error) throw error;
        if (!cancelled) setMyTeams(((data as any) ?? []) as MyTeamRow[]);
      } catch (error) {
        console.error('[teams] Error loading teams:', error);
        if (!cancelled) setMyTeams([]);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [checkingTeam]);

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

  const discoveryEnabled =
    TEAMS_DISCOVERY_ENABLED &&
    process.env.NODE_ENV !== 'production' &&
    allowlistChecked &&
    isAllowlisted;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTeams = myTeams.filter((row) => {
    if (!normalizedQuery) return true;
    const t = row.team;
    if (!t) return false;
    const haystack = `${t.name} ${t.slug} ${t.team_tag}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <>
      <PageShell maxWidth="lg" padding="md">
        <PageHeader
          title="Teams"
          description="Your team community: feed, chat, live, members, and settings."
          icon={<Users className="w-6 h-6 text-primary" />}
        />

        <PageSection card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Get started</p>
              <p className="text-sm text-muted-foreground">
                Create your team, invite members, and start posting.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href="/teams/setup">
                <Button variant="primary">Create a Team</Button>
              </Link>
              {discoveryEnabled && (
                <Button variant="outline" onClick={() => setShowDiscover(true)}>
                  <Compass className="h-4 w-4 mr-2" />
                  Discover Teams
                </Button>
              )}
            </div>
          </div>
        </PageSection>

        <PageSection card>
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
              Search teams by name, tag, or slug.
            </p>
          </div>
        </PageSection>

        <PageSection card>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Your teams</p>

            {loadingTeams ? (
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            ) : filteredTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams found.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredTeams.map((row) => {
                  const team = row.team;
                  if (!team) return null;
                  const href = `/teams/${team.slug}`;
                  return (
                    <Link key={`${row.team_id}:${row.status}`} href={href} className="rounded-2xl border border-border bg-card p-4 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{team.name}</p>
                          <p className="text-xs text-muted-foreground truncate">/{team.slug}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{team.approved_member_count} members</p>
                        </div>
                        <Chip variant="outline" size="sm" className="shrink-0">
                          {row.status === 'approved' ? 'Member' : row.status}
                        </Chip>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </PageSection>
      </PageShell>

      {discoveryEnabled && (
        <DiscoverTeamsOverlay isOpen={showDiscover} onClose={() => setShowDiscover(false)} />
      )}
    </>
  );
}
