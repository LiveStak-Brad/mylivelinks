'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmailSignupCard } from '@/components/EmailSignupCard';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  DollarSign,
  Gift, 
  MessageCircle, 
  Mail, 
  Music, 
  PenLine, 
  Sparkles,
  Trophy,
  TrendingUp,
  Gem
} from 'lucide-react';
import ProfileCarousel from '@/components/ProfileCarousel';
import { RoomsCarousel } from '@/components/rooms';
import { LIVE_LAUNCH_ENABLED, isLiveOwnerUser } from '@/lib/livekit-constants';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { ReferralCard } from '@/components/referral';
import { PolicyFooter } from '@/components/PolicyFooter';
import PwaInstallButton from '@/components/PwaInstallButton';
import LinklerSupportButton from '@/components/linkler/LinklerSupportButton';
import { MllProHero } from '@/components/mll-pro/MllProHero';

// Exact reactions available in the app (from components/feed/ReactionPicker.tsx)
const LIVE_REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🔥', label: 'Fire' },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canOpenLive, setCanOpenLive] = useState(false);
  const [routingTeams, setRoutingTeams] = useState(false);
  const [ownedTeamSlug, setOwnedTeamSlug] = useState<string | null>(null);
  const [memberTeamSlug, setMemberTeamSlug] = useState<string | null>(null);
  const [newTeams, setNewTeams] = useState<
    {
      id: string;
      slug: string;
      name: string;
      banner_url: string | null;
      icon_url: string | null;
      created_at: string;
    }[]
  >([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profile && !profileError) {
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: null,
            coin_balance: 0,
            earnings_balance: 0,
            gifter_level: 0
          });
      }

      const [{ data: ownedTeams }, { data: memberships }] = await Promise.all([
        supabase
          .from('teams')
          .select('slug')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('team_memberships')
          .select(
            `
            requested_at,
            team:teams!team_memberships_team_id_fkey (
              slug
            )
          `
          )
          .eq('profile_id', user.id)
          .in('status', ['approved'])
          .order('requested_at', { ascending: false })
          .limit(1),
      ]);

      setOwnedTeamSlug((ownedTeams ?? [])?.[0]?.slug ?? null);
      setMemberTeamSlug(((memberships as any[]) ?? [])?.[0]?.team?.slug ?? null);
      setCanOpenLive(!!(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user.id, email: user.email })));
      setCurrentUser(profile || { id: user.id, email: user.email });
      setLoading(false);
    } else {
      router.push('/login');
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    const fetchOwnedTeam = async () => {
      try {
        const { data } = await supabase
          .from('teams')
          .select('slug')
          .eq('created_by', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!cancelled) setOwnedTeamSlug((data ?? [])?.[0]?.slug ?? null);
      } catch (error) {
        console.error('[home][teams] ownership fetch error:', error);
      }
    };

    fetchOwnedTeam();

    const channel = supabase
      .channel(`home:teams_owner:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `created_by=eq.${currentUser.id}`,
        },
        () => {
          fetchOwnedTeam();
        }
      )
      .subscribe();

    const onFocus = () => fetchOwnedTeam();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, supabase]);

  const fetchNewTeams = useCallback(async () => {
    const { data, error } = await supabase
      .rpc('rpc_get_teams_discovery_ordered', {
        p_limit: 12,
        p_offset: 0
      });

    if (error) throw error;
    setNewTeams(((data as any) ?? []) as any);
  }, [supabase]);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    const fetchMembershipTeam = async () => {
      try {
        const { data } = await supabase
          .from('team_memberships')
          .select(
            `
            requested_at,
            team:teams!team_memberships_team_id_fkey (
              slug
            )
          `
          )
          .eq('profile_id', currentUser.id)
          .in('status', ['approved'])
          .order('requested_at', { ascending: false })
          .limit(1);

        if (!cancelled) setMemberTeamSlug(((data as any[]) ?? [])?.[0]?.team?.slug ?? null);
      } catch (error) {
        console.error('[home][teams] membership fetch error:', error);
      }
    };

    fetchMembershipTeam();

    const channel = supabase
      .channel(`home:team_memberships:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_memberships',
          filter: `profile_id=eq.${currentUser.id}`,
        },
        () => {
          fetchMembershipTeam();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, supabase]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await fetchNewTeams();
      } catch (error) {
        console.error('[home][teams] new teams fetch error:', error);
        if (!cancelled) setNewTeams([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchNewTeams]);

  useEffect(() => {
    const onRefresh = () => {
      void checkUser();
      void fetchNewTeams();
    };

    window.addEventListener('mll:refresh', onRefresh);
    return () => {
      window.removeEventListener('mll:refresh', onRefresh);
    };
  }, [fetchNewTeams]);

  const primaryTeamSlug = ownedTeamSlug || memberTeamSlug;

  const teamsPrimaryCtaLabel = useMemo(
    () => (primaryTeamSlug ? 'Visit My Team' : 'Create a Team'),
    [primaryTeamSlug]
  );

  const newTeamsCards = useMemo(() => {
    const real = (newTeams ?? []).slice(0, 12);

    if (real.length >= 3) {
      return real.map((t) => ({ kind: 'team' as const, team: t }));
    }

    const cards: Array<
      | { kind: 'team'; team: (typeof real)[number] }
      | { kind: 'cta' }
      | { kind: 'placeholder' }
    > = real.map((t) => ({ kind: 'team', team: t }));

    cards.push({ kind: 'cta' });
    while (cards.length < 3) cards.push({ kind: 'placeholder' });
    return cards;
  }, [newTeams]);

  const mobileTeamsScrollable = newTeamsCards.length > 3;
  const mobileTeamsFill = !mobileTeamsScrollable && newTeamsCards.length === 3;

  const handleTeamsPrimaryCtaClick = async () => {
    if (routingTeams) return;
    setRoutingTeams(true);

    try {
      if (primaryTeamSlug) {
        router.push(`/teams/${primaryTeamSlug}`);
        return;
      }

      router.push('/teams/setup');
    } catch (error) {
      console.error('[home][teams] routing error:', error);
      router.push(primaryTeamSlug ? `/teams/${primaryTeamSlug}` : '/teams/setup');
    } finally {
      setRoutingTeams(false);
    }
  };

  if (loading) {
    return (
      <main id="main" className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl bg-white/20" />
            <Skeleton className="h-16 w-full rounded-2xl bg-white/20" />
            <Skeleton className="h-32 w-full rounded-2xl bg-white/20" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary pb-20 md:pb-8">
      {/* MLL PRO Hero */}
      <div className="container mx-auto px-4 pt-6">
        <div className="max-w-4xl mx-auto">
          <MllProHero />
        </div>
      </div>

      {/* Section 1: Teams Banner (Compact + Exciting) */}
      <div className="container mx-auto px-4 pt-3 pb-3">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-xl">
            {/* Animated gradient accent */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(236,72,153,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
            </div>
            
            <div className="relative px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/30">
                  <Users className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      TEAMS
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">New</span>
                    </span>
                  </div>
                  <p className="text-sm text-white/70">My Team. My People. My Community.</p>
                  <p className="mt-1 text-xs text-white/60">
                    Create communities around shared ideas. Chat, posts, lives, group gifting.
                  </p>
                </div>
              </div>
              
              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  size="sm"
                  className="w-full sm:w-auto px-6 font-semibold shadow-lg whitespace-nowrap bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0"
                  onClick={handleTeamsPrimaryCtaClick}
                  disabled={routingTeams}
                >
                  {teamsPrimaryCtaLabel}
                </Button>
                <PwaInstallButton
                  size="sm"
                  className="w-full sm:w-auto font-semibold shadow-lg"
                  variant="gradient"
                  label="Download App"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">New Teams</p>
          </div>

          <div className="sm:hidden">
            <div
              className={
                mobileTeamsScrollable
                  ? 'flex gap-3 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain snap-x snap-mandatory'
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
                      {!imageUrl && card.kind === 'team' ? (
                        <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                          <div className="line-clamp-2 text-[13px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
                            {team?.name ?? 'Team'}
                          </div>
                        </div>
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
                    <p className="mt-1 text-[11px] font-semibold text-white/90 truncate">
                      {card.kind === 'cta' ? 'Your Team Here' : team?.name ?? 'New Team'}
                    </p>
                  </>
                );

                const cardClassName = mobileTeamsFill
                  ? 'block flex-1 min-w-0 transition-transform duration-200 ease-out active:scale-[0.98]'
                  : `${mobileTeamsScrollable ? 'snap-start ' : ''}block flex-shrink-0 w-28 transition-transform duration-200 ease-out active:scale-[0.98]`;

                if (card.kind === 'placeholder') {
                  return (
                    <div key={`new-team-carousel-placeholder-${idx}`} className={cardClassName}>
                      {cardInner}
                    </div>
                  );
                }

                if (card.kind === 'cta') {
                  return (
                    <Link
                      key={`new-team-carousel-cta-${idx}`}
                      href="/teams/setup"
                      className={`${cardClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl`}
                    >
                      {cardInner}
                    </Link>
                  );
                }

                const t = card.team;
                return (
                  <Link
                    key={`new-team-carousel-${t.id}`}
                    href={`/teams/${t.slug}`}
                    className={`${cardClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl`}
                  >
                    {cardInner}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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

              const tile = (
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
                    {!imageUrl && card.kind === 'team' ? (
                      <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                        <div className="line-clamp-2 text-sm font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
                          {team?.name ?? 'Team'}
                        </div>
                      </div>
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
                          <p className="mt-0.5 text-[10px] font-medium text-white/75">Start something new</p>
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

              const baseClass =
                'transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-xl';

              if (card.kind === 'placeholder') {
                return (
                  <div key={`new-team-grid-placeholder-${idx}`} className={baseClass}>
                    {tile}
                  </div>
                );
              }

              if (card.kind === 'cta') {
                return (
                  <Link key={`new-team-grid-cta-${idx}`} href="/teams/setup" className={baseClass}>
                    {tile}
                  </Link>
                );
              }

              const t = card.team;
              return (
                <Link key={`new-team-grid-${t.id}`} href={`/teams/${t.slug}`} className={baseClass}>
                  {tile}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Referral Network */}
      {currentUser && (
        <div className="container mx-auto px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <ReferralCard />
          </div>
        </div>
      )}

      {/* Section 2.5: Live Feature Highlight */}
      <div className="container mx-auto px-4 pb-3">
        <div className="max-w-4xl mx-auto">
          <Card className="border-white/10 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 shadow-2xl">
            <CardContent className="p-5 sm:p-6 flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex-1 text-center md:text-left space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Live feature</p>
                <h2 className="text-2xl font-extrabold text-white">Live is happening</h2>
                <p className="text-sm text-white/80">
                  Join Live Central to go live together, or start your own Solo Live stream!
                </p>
                <p className="text-xs text-white/60">
                  Discover live rooms on LiveTV. Trending and Discovery help streams get seen.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start justify-center pt-1">
                  <Link href="/liveTV" className="w-full sm:w-auto">
                    <Button size="sm" className="w-full sm:w-auto px-6 font-semibold shadow-lg">
                      Watch Live
                    </Button>
                  </Link>
                  <Link
                    href="/room/live-central"
                    className="text-sm font-semibold text-white/80 hover:text-white underline decoration-dotted decoration-white/40 underline-offset-4"
                  >
                    Go Live in Live Central
                  </Link>
                </div>
              </div>

              <div className="w-full md:max-w-[220px]">
                <div className="relative rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.65)]">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
                      Live Central
                    </span>
                    <span className="text-white/50">Group room</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 aspect-video flex items-center justify-center overflow-hidden">
                    <Image
                      src="/livecentral.png"
                      alt="Live Central group room"
                      width={180}
                      height={120}
                      className="object-contain opacity-90"
                      priority={false}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {['/livecentral.png', '/no-profile-pic.png', '/coin-icon.png'].map((src, idx) => (
                        <Image
                          key={`${src}-${idx}`}
                          src={src}
                          alt="Live participant"
                          width={32}
                          height={32}
                          className="rounded-full border border-white/20 bg-white/10 object-cover shadow"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-white/70">Rooms are filling up</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 3: What you can do right now (2 rows) */}
      <div className="container mx-auto px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <Card className="border-border/50 shadow-lg">
            <CardContent className="p-4">
              <h2 className="text-xs font-semibold text-muted-foreground mb-2 text-center uppercase tracking-wide">
                What you can do right now
              </h2>
              
              {/* Row 1: Buy coins + Gift actions + Gifter level + Rise board */}
              <div className="flex justify-center items-end gap-3 py-2">
                {/* Buy coins */}
                <Link href="/wallet" className="group flex flex-col items-center gap-0.5">
                  <Image src="/coin-icon.png" alt="Coin" width={24} height={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold">Buy coins</span>
                </Link>

                {/* Gift section */}
                <div className="flex gap-2">
                  <Link href="/feed" className="group flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Gift</span>
                    <Gift className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold">Posts</span>
                  </Link>
                  
                  <Link href="/feed" className="group flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Gift</span>
                    <MessageCircle className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold">Comments</span>
                  </Link>
                  
                  <Link href="/messages" className="group flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Gift</span>
                    <Mail className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold">Messages</span>
                  </Link>
                  
                  <Link href="/feed" className="group flex flex-col items-center gap-0.5">
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Gift</span>
                    <Music className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold">Music</span>
                  </Link>
                </div>

                {/* Gifter level */}
                <Link href="/gifter-levels" className="group flex flex-col items-center gap-0.5">
                  <TrendingUp className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold text-center">Gifter level</span>
                </Link>
                
                {/* Rise board */}
                <Link href="/leaderboards" className="group flex flex-col items-center gap-0.5">
                  <Trophy className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold text-center">Rise board</span>
                </Link>
              </div>

              {/* Row 2: Get gifted + Earn diamonds + Rise board + Cash out or Convert */}
              <div className="flex justify-center items-center gap-3 py-2">
                {/* Get gifted */}
                <div className="group flex flex-col items-center gap-0.5">
                  <Gift className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold">Get gifted</span>
                </div>
                
                {/* Earn diamonds */}
                <Link href="/wallet" className="group flex flex-col items-center gap-0.5">
                  <Gem className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" strokeWidth={2} />
                  <span className="text-[9px] font-semibold">Diamonds</span>
                </Link>
                
                {/* Rise board */}
                <Link href="/leaderboards" className="group flex flex-col items-center gap-0.5">
                  <Trophy className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold text-center">Rise board</span>
                </Link>

                {/* Cash out */}
                <Link href="/wallet" className="group flex flex-col items-center gap-0.5">
                  <div className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="w-5 h-5 text-green-500" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-semibold">Cash out</span>
                </Link>
                
                <span className="text-[8px] text-muted-foreground">or</span>
                
                {/* Convert */}
                <Link href="/wallet" className="group flex flex-col items-center gap-0.5">
                  <Image src="/coin-icon.png" alt="Coin" width={24} height={24} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold">Convert</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Recommended Profiles Carousel */}
          <Card className="border-border/50 shadow-xl">
            <CardContent className="p-5 sm:p-6">
              <ProfileCarousel 
                title={currentUser ? "Recommended for You" : "Popular Creators"} 
                currentUserId={currentUser?.id || null}
              />
            </CardContent>
          </Card>

          {/* Coming Soon Rooms Carousel */}
          <Card className="border-border/50 shadow-xl">
            <CardContent className="p-5 sm:p-6">
              <RoomsCarousel />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 shadow-xl">
            <CardContent className="p-5 sm:p-6 text-center">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {currentUser?.username ? (
                  <Link href={`/${currentUser.username}`}>
                    <Button size="md" className="w-full sm:w-auto">
                      View My Profile
                    </Button>
                  </Link>
                ) : (
                  <Link href="/settings/profile">
                    <Button size="md" className="w-full sm:w-auto">
                      Complete Your Profile
                    </Button>
                  </Link>
                )}
                {canOpenLive ? (
                  <Link href="/room/live-central">
                    <Button variant="outline" size="md" className="w-full sm:w-auto">
                      🔴 Go Live
                    </Button>
                  </Link>
                ) : (
                  <Link href="/liveTV">
                    <Button variant="outline" size="md" className="w-full sm:w-auto">
                      Browse Live Streams
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Email Signup */}
          <div className="flex justify-center py-4">
            <EmailSignupCard placement="banner" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <PolicyFooter />
      {!loading && <LinklerSupportButton />}
    </main>
  );
}
