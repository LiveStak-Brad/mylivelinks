'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
    banner_url?: string | null;
    icon_url?: string | null;
  } | null;
};

type RecentTeam = {
  id: string;
  slug: string;
  name: string;
  banner_url: string | null;
  icon_url: string | null;
  created_at: string;
};

type NewTeamsCard =
  | { kind: 'team'; team: RecentTeam }
  | { kind: 'cta' }
  | { kind: 'placeholder' };

function teamRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'Team_Admin':
      return 'Owner';
    case 'Team_Moderator':
      return 'Moderator';
    case 'Team_Member':
    default:
      return 'Member';
  }
}

export default function TeamsIndexPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [isAllowlisted, setIsAllowlisted] = useState(false);
  const [allowlistChecked, setAllowlistChecked] = useState(false);
  const [myTeams, setMyTeams] = useState<MyTeamRow[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [newTeams, setNewTeams] = useState<RecentTeam[]>([]);
  const [primaryTeamRequestCount, setPrimaryTeamRequestCount] = useState<number | null>(null);

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
  }, [supabase]);

  useEffect(() => {
    if (checkingTeam) return;
    let cancelled = false;

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
              banner_url,
              icon_url,
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
  }, [checkingTeam, supabase]);

  useEffect(() => {
    if (checkingTeam) return;
    let cancelled = false;

    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('id, slug, name, banner_url, icon_url, created_at')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        if (!cancelled) setNewTeams(((data as any) ?? []) as any);
      } catch (error) {
        console.error('[teams] new teams fetch error:', error);
        if (!cancelled) setNewTeams([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [checkingTeam, supabase]);

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

  const approvedTeams = useMemo(() => {
    return myTeams.filter((row) => row.status === 'approved' && !!row.team) as Array<
      MyTeamRow & { team: NonNullable<MyTeamRow['team']> }
    >;
  }, [myTeams]);

  const primaryApprovedRow = useMemo(() => {
    return myTeams.find((r) => r.status === 'approved' && !!r.team) ?? null;
  }, [myTeams]);

  const primaryApprovedTeam = primaryApprovedRow?.team ?? null;

  useEffect(() => {
    if (!primaryApprovedTeam?.id) {
      setPrimaryTeamRequestCount(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const { count, error } = await supabase
          .from('team_memberships')
          .select('team_id', { count: 'exact', head: true })
          .eq('team_id', primaryApprovedTeam.id)
          .in('status', ['requested', 'pending']);

        if (error) throw error;
        if (!cancelled) setPrimaryTeamRequestCount(count ?? 0);
      } catch (error) {
        console.error('[teams] request count error:', error);
        if (!cancelled) setPrimaryTeamRequestCount(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [primaryApprovedTeam?.id, supabase]);

  const newTeamsCards = useMemo<NewTeamsCard[]>(() => {
    const real = newTeams.slice(0, 12);

    if (real.length >= 3) {
      return real.map((t) => ({ kind: 'team', team: t }));
    }

    const cards: NewTeamsCard[] = real.map((t) => ({ kind: 'team', team: t }));
    cards.push({ kind: 'cta' });
    while (cards.length < 3) cards.push({ kind: 'placeholder' });
    return cards;
  }, [newTeams]);

  const mobileTeamsScrollable = newTeamsCards.length > 3;
  const mobileTeamsFill = !mobileTeamsScrollable && newTeamsCards.length === 3;

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
          description="Your team community: feed, chat, live, members, and settings."
          icon={<Users className="w-6 h-6 text-primary" />}
        />

        <div className="max-w-4xl mx-auto mb-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-accent to-primary border border-white/10 shadow-xl">
            <div className="relative p-4">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">New Teams</p>

              <div
                className={
                  mobileTeamsScrollable
                    ? 'flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide touch-pan-x overscroll-x-contain snap-x snap-mandatory'
                    : 'flex gap-3 overflow-x-hidden overflow-y-hidden'
                }
              >
                {newTeamsCards.map((card, idx) => {
                  const fallbackGradients = [
                    'from-pink-500/30 to-purple-500/30',
                    'from-purple-500/30 to-blue-500/30',
                    'from-rose-500/30 to-orange-500/30',
                    'from-cyan-500/30 to-violet-500/30',
                    'from-emerald-500/30 to-cyan-500/30',
                  ];
                  const gradient = fallbackGradients[idx % fallbackGradients.length];
                  const team = card.kind === 'team' ? card.team : null;
                  const imageUrl = team?.banner_url || team?.icon_url || null;

                  const cardInner = (
                    <>
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br">
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={team?.name ?? 'Team'}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="absolute top-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white">
                          NEW
                        </div>
                        {card.kind === 'cta' ? (
                          <div className="absolute inset-0 flex items-center justify-center px-3">
                            <div className="w-full text-center">
                              <p className="text-sm font-extrabold text-white tracking-tight drop-shadow-sm">
                                Your Team Here
                              </p>
                              <p className="mt-0.5 text-[10px] font-medium text-white/75">
                                Start something new
                              </p>
                              <div className="mt-2 inline-flex items-center justify-center px-3 py-1 rounded-full font-semibold shadow-lg whitespace-nowrap bg-gradient-to-r from-pink-500 to-purple-500">
                                <span className="text-[11px] text-white">Create a Team</span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-white/90 truncate">
                        {card.kind === 'cta' ? 'Your Team Here' : team?.name ?? 'New Team'}
                      </p>
                    </>
                  );

                  const cardClassName = mobileTeamsFill
                    ? 'flex-1 min-w-0 transition-transform duration-200 ease-out active:scale-[0.98]'
                    : `${mobileTeamsScrollable ? 'snap-start ' : ''}flex-shrink-0 w-24 sm:w-28 md:w-32 transition-transform duration-200 ease-out active:scale-[0.98]`;

                  const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl';

                  if (card.kind === 'placeholder') {
                    return (
                      <div key={`teams-new-placeholder-${idx}`} className={cardClassName}>
                        {cardInner}
                      </div>
                    );
                  }

                  if (card.kind === 'cta') {
                    return (
                      <Link key={`teams-new-cta-${idx}`} href="/teams/setup" className={`${cardClassName} ${focusClass}`}>
                        {cardInner}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={`teams-new-${card.team.id}`}
                      href={`/teams/${card.team.slug}`}
                      className={`${cardClassName} ${focusClass}`}
                    >
                      {cardInner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <PageSection card>
          {primaryApprovedTeam ? (
            <Link href={`/teams/${primaryApprovedTeam.slug}`} className="block">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
                  {primaryApprovedTeam.banner_url || primaryApprovedTeam.icon_url ? (
                    <img
                      src={primaryApprovedTeam.banner_url || primaryApprovedTeam.icon_url || ''}
                      alt={primaryApprovedTeam.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">Your team</p>
                      <p className="mt-0.5 text-sm font-bold text-foreground truncate">{primaryApprovedTeam.name}</p>
                      <p className="text-xs text-muted-foreground truncate">/{primaryApprovedTeam.slug}</p>
                    </div>
                    <Chip variant="outline" size="sm" className="shrink-0">
                      {teamRoleLabel(primaryApprovedRow?.role)}
                    </Chip>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {primaryApprovedTeam.approved_member_count} members
                    </span>
                    {primaryTeamRequestCount !== null && (
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {primaryTeamRequestCount} requests
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
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
          )}
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
            ) : approvedTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams found.</p>
            ) : (
              <div
                className={
                  'grid gap-2 grid-cols-5 ' +
                  'sm:[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))] sm:gap-3'
                }
              >
                {approvedTeams.map((row) => {
                  const team = row.team;
                  const imageUrl = team.banner_url || team.icon_url || null;
                  return (
                    <Link
                      key={`${row.team_id}:${row.status}`}
                      href={`/teams/${team.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted transition-transform duration-200 ease-out group-hover:scale-[1.02]">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={team.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] sm:text-xs font-semibold text-foreground truncate">
                        {team.name}
                      </p>
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
