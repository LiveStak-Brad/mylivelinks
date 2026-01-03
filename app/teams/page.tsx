'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, Compass, Loader2, Mail, Search, Users, X, Plus } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { Button, Chip, Input } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import DiscoverTeamsOverlay from '@/components/teams/DiscoverTeamsOverlay';
import { createClient } from '@/lib/supabase';
import { getMyTeamInvites, acceptTeamInvite, declineTeamInvite, TeamInvite } from '@/lib/teamInvites';
import { TeamAvatarStack } from '@/components/teams/TeamAvatar';

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
  approved_member_count: number;
};

type AvatarSample = {
  avatar_url: string | null;
  display_name: string | null;
};

type NewTeamsCard =
  | { kind: 'team'; team: RecentTeam }
  | { kind: 'placeholder' };

type TeamDiscoveryStatus = 'NEW' | 'PRIVATE' | 'INVITED' | 'REQUESTED' | 'LIVE';

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
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);
  const [isAllowlisted, setIsAllowlisted] = useState(false);
  const [allowlistChecked, setAllowlistChecked] = useState(false);
  const [myTeams, setMyTeams] = useState<MyTeamRow[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [newTeams, setNewTeams] = useState<RecentTeam[]>([]);
  const [loadingNewTeams, setLoadingNewTeams] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<number | null>(null);
  const [teamMemberPreview, setTeamMemberPreview] = useState<Record<string, AvatarSample[]>>({});
  const previewLoadedRef = useRef<Set<string>>(new Set());

  const loadTeamPreviews = useCallback(
    async (teamIds: string[]) => {
      const normalized = Array.from(
        new Set(teamIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
      );
      const missing = normalized.filter((id) => !previewLoadedRef.current.has(id));
      if (missing.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('team_memberships')
          .select(
            `
            team_id,
            approved_at,
            profiles:profiles!team_memberships_profile_id_fkey (
              id,
              avatar_url,
              display_name
            )
          `
          )
          .eq('status', 'approved')
          .in('team_id', missing)
          .order('approved_at', { ascending: false })
          .limit(missing.length * 6);
        if (error) throw error;
        const grouped: Record<string, AvatarSample[]> = {};
        for (const row of (data as any[]) ?? []) {
          if (!row.team_id || !row.profiles) continue;
          if (!grouped[row.team_id]) {
            grouped[row.team_id] = [];
          }
          if (grouped[row.team_id].length >= 6) continue;
          grouped[row.team_id].push({
            avatar_url: row.profiles.avatar_url,
            display_name: row.profiles.display_name,
          });
        }
        if (missing.length > 0) {
          previewLoadedRef.current = new Set([...previewLoadedRef.current, ...missing]);
        }
        if (Object.keys(grouped).length > 0) {
          setTeamMemberPreview((prev) => ({
            ...prev,
            ...grouped,
          }));
        }
      } catch (error) {
        console.error('[teams] member preview fetch error:', error);
      }
    },
    [supabase]
  );

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
        if (!cancelled) {
          setMyTeams(((data as any) ?? []) as MyTeamRow[]);
          const previewIds = ((data as any[]) ?? [])
            .map((row) => row.team?.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
          void loadTeamPreviews(previewIds);
        }
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
  }, [checkingTeam, supabase, loadTeamPreviews]);

  useEffect(() => {
    if (checkingTeam) return;
    let cancelled = false;

    const run = async () => {
      setLoadingNewTeams(true);
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('id, slug, name, banner_url, icon_url, created_at, approved_member_count')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        if (!cancelled) {
          setNewTeams(((data as any) ?? []) as any);
          const previewIds = ((data as any[]) ?? [])
            .map((row) => row.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
          void loadTeamPreviews(previewIds);
        }
      } catch (error) {
        console.error('[teams] new teams fetch error:', error);
        if (!cancelled) setNewTeams([]);
      } finally {
        if (!cancelled) setLoadingNewTeams(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [checkingTeam, supabase, loadTeamPreviews]);

  // Fetch pending team invites
  useEffect(() => {
    if (checkingTeam) return;
    let cancelled = false;

    const run = async () => {
      setLoadingInvites(true);
      try {
        const invites = await getMyTeamInvites();
        if (!cancelled) setPendingInvites(invites);
      } catch (error) {
        console.error('[teams] pending invites fetch error:', error);
        if (!cancelled) setPendingInvites([]);
      } finally {
        if (!cancelled) setLoadingInvites(false);
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

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  const discoveryEnabled =
    TEAMS_DISCOVERY_ENABLED &&
    process.env.NODE_ENV !== 'production' &&
    allowlistChecked &&
    isAllowlisted;

  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const approvedTeams = useMemo(() => {
    return myTeams.filter((row) => row.status === 'approved' && !!row.team) as Array<
      MyTeamRow & { team: NonNullable<MyTeamRow['team']> }
    >;
  }, [myTeams]);

  const ownedTeams = useMemo(
    () => approvedTeams.filter((row) => row.role === 'Team_Admin'),
    [approvedTeams]
  );
  const memberTeams = useMemo(
    () => approvedTeams.filter((row) => row.role !== 'Team_Admin'),
    [approvedTeams]
  );
  const unifiedTeams = useMemo(
    () => [...ownedTeams, ...memberTeams],
    [ownedTeams, memberTeams]
  );
  const showCreateTeamCta = ownedTeams.length === 0;
  const displayTeams = useMemo(() => {
    if (!normalizedQuery) return unifiedTeams;
    return unifiedTeams.filter((row) => {
      const team = row.team;
      const haystack = `${team.name} ${team.slug} ${team.team_tag}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, unifiedTeams]);

  const invitedTeamSlugs = useMemo(() => {
    return new Set(
      pendingInvites
        .map((invite) => invite.team_slug)
        .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    );
  }, [pendingInvites]);

  const requestedTeamSlugs = useMemo(() => {
    return new Set(
      myTeams
        .filter((row) => row.status === 'requested' && row.team?.slug)
        .map((row) => row.team!.slug)
    );
  }, [myTeams]);

  const ownerHeroData = useMemo(() => {
    if (ownedTeams.length === 0) {
      return null;
    }
    const primaryRow = ownedTeams[0];
    const totalMembers = ownedTeams.reduce(
      (sum, row) => sum + (row.team?.approved_member_count ?? 0),
      0
    );
    return {
      primaryRow,
      ownedCount: ownedTeams.length,
      totalMembers,
    };
  }, [ownedTeams]);

  const ownerHeroAvatars =
    ownerHeroData?.primaryRow.team?.id
      ? buildAvatarItemsFromSamples(
          teamMemberPreview[ownerHeroData.primaryRow.team.id],
          ownerHeroData.primaryRow.team.slug,
          ownerHeroData.primaryRow.team.approved_member_count ?? 0
        )
      : [];

  const heroShouldSkeleton = loadingTeams && myTeams.length === 0;

  const newTeamsCards = useMemo<NewTeamsCard[]>(() => {
    const real = newTeams.slice(0, 12);

    if (real.length >= 3) {
      return real.map((t) => ({ kind: 'team', team: t }));
    }

    const cards: NewTeamsCard[] = real.map((t) => ({ kind: 'team', team: t }));
    while (cards.length < 3) cards.push({ kind: 'placeholder' });
    return cards;
  }, [newTeams]);

  const mobileTeamsScrollable = newTeamsCards.length > 3;
  const mobileTeamsFill = !mobileTeamsScrollable && newTeamsCards.length === 3;

  const handleAcceptInvite = async (invite: TeamInvite) => {
    setProcessingInviteId(invite.invite_id);
    try {
      const result = await acceptTeamInvite(invite.invite_id);
      if (result.success) {
        setPendingInvites((prev) => prev.filter((i) => i.invite_id !== invite.invite_id));
        toast({
          title: `Welcome to ${invite.team_name}!`,
          description: "You're now a member.",
          variant: 'success',
        });
        // Navigate to the team
        router.push(`/teams/${invite.team_slug}`);
      } else {
        toast({
          title: 'Could not accept invite',
          description: result.error || 'Please try again.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Could not accept invite',
        description: err?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: TeamInvite) => {
    setProcessingInviteId(invite.invite_id);
    try {
      const result = await declineTeamInvite(invite.invite_id);
      if (result.success) {
        setPendingInvites((prev) => prev.filter((i) => i.invite_id !== invite.invite_id));
        toast({
          title: 'Invite declined',
          description: 'You can always join later if invited again.',
          variant: 'info',
        });
      } else {
        toast({
          title: 'Could not decline invite',
          description: result.error || 'Please try again.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Could not decline invite',
        description: err?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setProcessingInviteId(null);
    }
  };

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
      <PageShell
        maxWidth="lg"
        padding="lg"
        gradient
        gradientClass="bg-[radial-gradient(circle_at_top,_#1a1035_0%,_#0c0c16_40%,_#050507_100%)]"
        className="text-white"
        contentClassName="py-8 sm:py-10"
      >
        <div className="space-y-10">
        <header className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">
              <Users className="h-4 w-4 text-white/50" />
              <span>Teams</span>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Teams</h1>
            <p className="text-sm text-white/70 max-w-2xl">
              Your communities — chat, posts, live rooms, and people you care about.
            </p>
          </div>
          {showCreateTeamCta && (
            <Link href="/teams/setup" className="shrink-0">
              <Button className="h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 text-base font-semibold shadow-lg shadow-pink-500/30">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </Link>
          )}
        </header>

        {heroShouldSkeleton ? (
          <HeroSkeleton />
        ) : showCreateTeamCta ? (
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-indigo-500/20 p-5">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">Create your space</p>
              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Launch a home for your people
              </h2>
              <p className="text-sm text-white/70 max-w-2xl">
                Spin up live rooms, posts, and chats in minutes. Invite collaborators and grow your community.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/teams/setup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-semibold text-pink-600 shadow-lg shadow-pink-500/40 hover:text-pink-700 transition"
              >
                <Plus className="h-4 w-4" />
                Start a team
              </Link>
              <div className="flex flex-wrap gap-3 text-xs text-white/80">
                <span className="rounded-full border border-white/30 px-3 py-1 uppercase tracking-[0.2em]">
                  Free to launch
                </span>
                <span className="rounded-full border border-white/30 px-3 py-1 uppercase tracking-[0.2em]">
                  Invite-only
                </span>
                <span className="rounded-full border border-white/30 px-3 py-1 uppercase tracking-[0.2em]">
                  Live ready
                </span>
              </div>
            </div>
          </section>
        ) : ownerHeroData ? (
          <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1b1630] via-[#151129] to-[#0c0d1c] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">
                  Owner dashboard
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    {ownerHeroData.primaryRow.team?.icon_url ? (
                      <img
                        src={ownerHeroData.primaryRow.team.icon_url!}
                        alt={ownerHeroData.primaryRow.team.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-base font-semibold text-white/80">
                        {ownerHeroData.primaryRow.team?.name[0]?.toUpperCase() ?? 'T'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{ownerHeroData.primaryRow.team?.name}</p>
                    <p className="text-sm text-white/60">/{ownerHeroData.primaryRow.team?.slug}</p>
                  </div>
                </div>
              </div>
              <Link
                href={`/teams/${ownerHeroData.primaryRow.team?.slug ?? ''}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-base font-semibold text-white hover:bg-white/20 transition"
              >
                Jump back in
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {ownerHeroData.ownedCount} owner {ownerHeroData.ownedCount === 1 ? 'team' : 'teams'}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {ownerHeroData.totalMembers} members
                </span>
                {pendingInvites.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-100">
                    {pendingInvites.length} invites
                  </span>
                )}
              </div>
              <TeamAvatarStack avatars={ownerHeroAvatars} maxVisible={5} size="compact" className="sm:justify-end" />
            </div>
          </section>
        ) : null}

        <section className="glass-panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">Discover</p>
              <h2 className="text-lg font-semibold text-white sm:text-xl">New teams</h2>
            </div>
            {discoveryEnabled && (
              <button
                onClick={() => setShowDiscover(true)}
                className="text-sm font-semibold text-white/70 hover:text-white"
              >
                Explore all &rarr;
              </button>
            )}
          </div>
          <div
            className="flex gap-4 overflow-x-auto pb-4 touch-pan-x snap-x snap-mandatory"
            aria-label="New teams"
          >
            {showCreateTeamCta && (
              <Link
                href="/teams/setup"
                className="group relative block flex w-[34vw] max-w-[10rem] shrink-0 snap-start flex-col justify-between rounded-3xl border border-dashed border-white/20 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-indigo-500/20 p-4 text-white transition hover:-translate-y-1 hover:border-white/40 sm:w-60"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
                  <span>Create</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>
                </div>
                <div className="mt-6 space-y-2">
                  <p className="text-xl font-bold leading-tight">Start your own team</p>
                  <p className="text-sm text-white/70">Invite members, host live rooms, and share updates.</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" />
                  Create Team
                </div>
              </Link>
            )}
            {loadingNewTeams
              ? Array.from({ length: 3 }).map((_, idx) => <NewTeamSkeleton key={`skeleton-${idx}`} />)
              : newTeamsCards.map((card, idx) => (
                  <NewTeamTile
                    key={idx}
                    card={card}
                    index={idx}
                    invitedSlugs={invitedTeamSlugs}
                    requestedSlugs={requestedTeamSlugs}
                    memberPreview={card.kind === 'team' ? teamMemberPreview[card.team.id] : undefined}
                  />
                ))}
          </div>
        </section>

        <section className="glass-panel space-y-2 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams by name, tag, or slug"
              className="rounded-2xl border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-white/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-white/70 transition hover:bg-white/20"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-white/50">Find teams by name, tag, or slug across your memberships.</p>
        </section>

        {(pendingInvites.length > 0 || loadingInvites) && (
          <section className="glass-panel p-5">
            <div className="flex items-center gap-2 text-white">
              <Mail className="h-4 w-4 text-teal-300" />
              <p className="text-sm font-semibold">Teams you're invited to</p>
              {pendingInvites.length > 0 && (
                <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs font-bold text-teal-300">
                  {pendingInvites.length}
                </span>
              )}
            </div>
            <div className="mt-4">
              {loadingInvites ? (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading invites...
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {pendingInvites.map((invite) => {
                    const isProcessing = processingInviteId === invite.invite_id;
                    const imageUrl = invite.team_icon_url;
                    const inviterName = invite.inviter_display_name || invite.inviter_username;

                    return (
                      <div
                        key={invite.invite_id}
                        className="flex w-64 flex-shrink-0 snap-start flex-col rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-4"
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-emerald-500/20" />
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={invite.team_name}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/70">
                                {invite.team_name[0]?.toUpperCase() ?? 'T'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{invite.team_name}</p>
                            <p className="text-xs text-white/70 truncate">Invited by {inviterName}</p>
                          </div>
                        </div>

                        {invite.message && (
                          <p className="mb-3 text-xs italic text-white/70 line-clamp-2">"{invite.message}"</p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={isProcessing}
                            className="flex-1 bg-teal-500 text-white hover:bg-teal-600"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Join
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineInvite(invite)}
                            disabled={isProcessing}
                            className="flex-1 border-white/20 text-white/80"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <X className="mr-1 h-3 w-3" />
                                Decline
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50">Your space</p>
              <h2 className="text-lg font-semibold text-white sm:text-xl">Your teams</h2>
            </div>
            {!showCreateTeamCta && discoveryEnabled && (
              <Button variant="ghost" size="sm" onClick={() => setShowDiscover(true)} className="text-white/70">
                <Compass className="mr-2 h-4 w-4" />
                Discover
              </Button>
            )}
          </div>
          {loadingTeams ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, idx) => (
                <TeamCardSkeleton key={`team-skel-${idx}`} />
              ))}
            </div>
          ) : displayTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-white/70">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Users className="h-6 w-6 text-white/70" />
              </div>
              {showCreateTeamCta ? (
                <>
                  <p className="text-sm font-semibold text-white">No teams yet</p>
                  <p className="mt-1 text-sm text-white/60">
                    Create a team to unlock live rooms, posts, and chat for your community.
                  </p>
                  <Link
                    href="/teams/setup"
                    className="inline-flex mt-4 items-center justify-center rounded-2xl bg-white/20 px-4 py-2 text-white hover:bg-white/30 transition"
                  >
                    Create your first team
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white">No teams to display</p>
                  <p className="mt-1 text-sm text-white/60">Try discovering a new community to join.</p>
                  {discoveryEnabled && (
                    <Button
                      variant="ghost"
                      className="mt-4 text-white"
                      onClick={() => setShowDiscover(true)}
                    >
                      Browse discovery
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayTeams.map((row) => (
                <TeamCard
                  key={`${row.team_id}:${row.status}`}
                  row={row}
                  memberPreview={teamMemberPreview[row.team?.id ?? '']}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </PageShell>

      {discoveryEnabled && (
        <DiscoverTeamsOverlay isOpen={showDiscover} onClose={() => setShowDiscover(false)} />
      )}
    </>
  );
}

const CARD_GRADIENTS = [
  'from-pink-500/25 via-purple-500/20 to-indigo-500/20',
  'from-emerald-500/20 via-teal-500/10 to-cyan-500/20',
  'from-orange-500/20 via-rose-500/15 to-amber-500/20',
  'from-blue-500/20 via-sky-500/10 to-indigo-500/20',
];

const DISCOVERY_STATUS_CLASSES: Record<TeamDiscoveryStatus, string> = {
  NEW: 'bg-black/40 text-white',
  PRIVATE: 'bg-white/15 text-white',
  INVITED: 'bg-amber-500/30 text-amber-50',
  REQUESTED: 'bg-sky-500/30 text-sky-50',
  LIVE: 'bg-red-500/40 text-white',
};

function NewTeamTile({
  card,
  index,
  invitedSlugs,
  requestedSlugs,
  memberPreview,
}: {
  card: NewTeamsCard;
  index: number;
  invitedSlugs: Set<string>;
  requestedSlugs: Set<string>;
  memberPreview?: AvatarSample[];
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  if (card.kind === 'placeholder') {
    return (
      <div className="hidden w-[85vw] max-w-[18rem] shrink-0 snap-start rounded-3xl border border-white/5 bg-white/5 sm:w-60 lg:block" />
    );
  }

  const team = card.team;
  const imageUrl = team.banner_url || team.icon_url || undefined;
  const memberCount = team.approved_member_count ?? 0;
  const avatars = buildAvatarItemsFromSamples(memberPreview, team.slug, memberCount);
  let statusLabel: TeamDiscoveryStatus = 'NEW';
  if (invitedSlugs.has(team.slug)) {
    statusLabel = 'INVITED';
  } else if (requestedSlugs.has(team.slug)) {
    statusLabel = 'REQUESTED';
  }

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group block flex w-[34vw] max-w-[10rem] shrink-0 snap-start flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 transition hover:-translate-y-1 hover:border-white/30 sm:w-60"
    >
      <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-white/10">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        {imageUrl && (
          <img
            src={imageUrl}
            alt={team.name}
            className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
            loading="lazy"
          />
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${DISCOVERY_STATUS_CLASSES[statusLabel]}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-white truncate">{team.name}</p>
          <span className="text-xs text-white/60">/{team.slug}</span>
        </div>
        <TeamAvatarStack avatars={avatars} maxVisible={4} size="compact" className="mt-2" />
      </div>
    </Link>
  );
}

function NewTeamSkeleton() {
  return (
    <div className="glass-panel glass-panel--muted w-[85vw] max-w-[18rem] shrink-0 snap-start p-4 sm:w-60">
      <div className="h-32 w-full rounded-2xl bg-white/10 animate-pulse" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-2/3 rounded-full bg-white/10 animate-pulse" />
        <div className="h-3 w-1/3 rounded-full bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

function TeamCard({
  row,
  memberPreview,
}: {
  row: MyTeamRow & { team: NonNullable<MyTeamRow['team']> };
  memberPreview?: AvatarSample[];
}) {
  const { team } = row;
  const isOwner = row.role === 'Team_Admin';
  const imageUrl = team.banner_url || team.icon_url || undefined;
  const statusLabel =
    row.status === 'requested'
      ? 'REQUESTED'
      : row.status === 'pending'
      ? 'PENDING'
      : undefined;
  const memberCount = team.approved_member_count ?? 0;
  const avatars = buildAvatarItemsFromSamples(memberPreview, team.slug, memberCount);

  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group flex flex-col gap-3 glass-panel glass-panel--muted p-4 transition hover:-translate-y-1 hover:border-white/30"
    >
      <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-white/10">
        <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[hashString(team.id) % CARD_GRADIENTS.length]}`} />
        {imageUrl && (
          <img
            src={imageUrl}
            alt={team.name}
            className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
            loading="lazy"
          />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {statusLabel && (
            <TeamStatusPill label={statusLabel} variant={statusLabel === 'REQUESTED' ? 'requested' : 'default'} />
          )}
          {isOwner && <TeamStatusPill label="Owner" variant="owner" />}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold text-white truncate">{team.name}</p>
          <span className="text-xs text-white/50">/{team.slug}</span>
        </div>
        <p className="text-xs text-white/50">{memberCount} members</p>
      </div>
      <TeamAvatarStack avatars={avatars} maxVisible={4} size="compact" />
    </Link>
  );
}

function HeroSkeleton() {
  return (
    <div className="glass-panel p-5">
      <div className="h-4 w-32 rounded-full bg-white/10 animate-pulse" />
      <div className="mt-4 h-6 w-2/3 rounded-full bg-white/15 animate-pulse" />
      <div className="mt-2 h-4 w-1/2 rounded-full bg-white/10 animate-pulse" />
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-12 w-32 rounded-2xl bg-white/10 animate-pulse" />
        <div className="h-10 w-24 rounded-full bg-white/10 animate-pulse" />
        <div className="h-10 w-24 rounded-full bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}

function TeamCardSkeleton() {
  return (
    <div className="glass-panel glass-panel--muted p-4 animate-pulse space-y-3">
      <div className="h-32 w-full rounded-2xl bg-white/10" />
      <div className="h-4 w-2/3 rounded-full bg-white/10" />
      <div className="h-3 w-1/3 rounded-full bg-white/5" />
      <div className="h-8 w-28 rounded-full bg-white/10" />
    </div>
  );
}

function TeamStatusPill({ label, variant = 'default' }: { label: string; variant?: 'default' | 'owner' | 'requested' }) {
  return (
    <span className={`status-pill status-pill--${variant}`}>{label}</span>
  );
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const AVATAR_COLORS = ['F97316', 'EC4899', '38BDF8', 'A78BFA', '34D399', 'FACC15', 'FB923C', '0EA5E9'];

function buildAvatarItemsFromSamples(
  samples: AvatarSample[] | undefined,
  seed: string,
  count: number
) {
  if (samples && samples.length > 0) {
    return samples.map((sample) => ({
      src: sample.avatar_url ?? undefined,
      alt: sample.display_name || seed,
    }));
  }
  return buildPlaceholderAvatars(seed, count);
}

function buildPlaceholderAvatars(seed: string, count: number) {
  const total = Math.max(count, 0);
  const actualCount = total === 0 ? 2 : Math.min(total, 20);
  return Array.from({ length: actualCount }, (_, idx) => {
    const initial = seed[idx % seed.length]?.toUpperCase() ?? 'T';
    const color = `#${AVATAR_COLORS[(hashString(seed + idx) + idx) % AVATAR_COLORS.length]}`;
    return {
      src: undefined,
      alt: initial,
      color,
    };
  });
}
