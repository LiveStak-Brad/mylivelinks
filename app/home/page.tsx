'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmailSignupCard } from '@/components/EmailSignupCard';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  Sparkles,
  Link2,
  Tv,
  Rss,
  Play,
  X
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

// Explore panel feature definitions
const EXPLORE_FEATURES = [
  {
    id: 'link',
    label: 'Link',
    href: '/link',
    iconColor: 'text-blue-500',
    borderColor: 'hover:border-purple-500/50',
    description: 'Grow your follows, discover new people, and connect through dating and social discovery.',
    useGradientIcon: true,
  },
  {
    id: 'livetv',
    label: 'LiveTV',
    href: '/liveTV',
    icon: Tv,
    iconColor: 'text-rose-500',
    borderColor: 'hover:border-rose-500/50',
    description: 'Watch live streams from creators around the world. Discover new content and interact in real-time.',
  },
  {
    id: 'feed',
    label: 'Feed',
    href: '/feed',
    icon: Rss,
    iconColor: 'text-orange-500',
    borderColor: 'hover:border-orange-500/50',
    description: 'Stay updated with posts from people you follow. Like, comment, and share content.',
  },
  {
    id: 'watch',
    label: 'Watch',
    href: '/watch',
    icon: Play,
    iconColor: 'text-purple-500',
    borderColor: 'hover:border-purple-500/50',
    description: 'Discover short-form videos in a vertical feed. Swipe through endless content from creators.',
  },
  {
    id: 'teams',
    label: 'Teams',
    href: '/teams',
    icon: Users,
    iconColor: 'text-cyan-500',
    borderColor: 'hover:border-cyan-500/50',
    description: 'Join or create teams to collaborate with others. Build communities around shared interests.',
  },
];

// Link gradient icon component (matches GlobalHeader)
function LinkGradientIcon({ className = 'w-6 h-6' }: { className?: string }) {
  const gradientId = `link-gradient-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke={`url(#${gradientId})`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(37, 99, 235)" />
          <stop offset="100%" stopColor="rgb(168, 85, 247)" />
        </linearGradient>
      </defs>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

// Explore Panel Component
function ExplorePanel() {
  const router = useRouter();
  const [selectedFeature, setSelectedFeature] = useState<typeof EXPLORE_FEATURES[0] | null>(null);

  const renderIcon = (feature: typeof EXPLORE_FEATURES[0], size: string = 'w-6 h-6') => {
    if (feature.useGradientIcon) {
      return <LinkGradientIcon className={size} />;
    }
    const Icon = feature.icon;
    return Icon ? <Icon className={`${size} ${feature.iconColor}`} /> : null;
  };

  return (
    <>
      <Card className="border-border/50 shadow-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">
            Explore MyLiveLinks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {EXPLORE_FEATURES.map((feature) => {
              return (
                <button
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature)}
                  className="group text-left"
                >
                  <div className={`flex flex-col items-center p-4 rounded-xl bg-background/50 hover:bg-background/80 border border-border/50 ${feature.borderColor} transition-all`}>
                    <div className="mb-2">{renderIcon(feature)}</div>
                    <span className="text-sm font-medium text-foreground transition-colors">
                      {feature.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">Learn more...</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feature Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                {renderIcon(selectedFeature, 'w-8 h-8')}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{selectedFeature.label}</h3>
              <p className="text-muted-foreground text-sm mb-6">{selectedFeature.description}</p>
              
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedFeature(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    router.push(selectedFeature.href);
                    setSelectedFeature(null);
                  }}
                >
                  Go To {selectedFeature.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
      display_photo_preference: string | null;
      created_at: string;
    }[]
  >([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Show home page content for logged-in users (no redirect - this is /home)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      setCurrentUser({ id: user.id, username: profile?.username });
      setCanOpenLive(isLiveOwnerUser({ id: user.id, email: user.email }));
      setLoading(false);
    } else {
      // Public landing page should be accessible when logged out.
      // Redirecting to /login causes confusing loops (especially when OAuth cookies
      // are not yet established on localhost).
      setCurrentUser(null);
      setCanOpenLive(false);
      setLoading(false);
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
      {/* Wide mode: at 2xl+ expands container, below 2xl stays max-w-4xl */}
      <div className="container mx-auto px-4 2xl:px-10 pt-6">
        <div className="max-w-4xl 2xl:max-w-6xl mx-auto">
          <MllProHero />
        </div>
      </div>

      {/* Section 1: Teams Banner (Compact + Exciting) */}
      <div className="container mx-auto px-4 2xl:px-10 pt-3 pb-3">
        <div className="max-w-4xl 2xl:max-w-6xl mx-auto">
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

      <div className="container mx-auto px-4 2xl:px-10 pb-3">
        <div className="max-w-4xl 2xl:max-w-6xl mx-auto">
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
                  'from-blue-500/30 to-teal-500/30',
                  'from-teal-500/30 to-green-500/30',
                ];
                const gradient = fallbackGradients[idx % fallbackGradients.length];
                const team = card.kind === 'team' ? card.team : null;
                // Use display_photo_preference to determine which photo to show
                const preference = team?.display_photo_preference || 'banner';
                const imageUrl = team ? (preference === 'icon' ? (team.icon_url || team.banner_url) : (team.banner_url || team.icon_url)) : null;

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
                'from-blue-500/30 to-teal-500/30',
                'from-teal-500/30 to-green-500/30',
              ];
              const gradient = fallbackGradients[idx % fallbackGradients.length];
              const team = card.kind === 'team' ? card.team : null;
              // Use display_photo_preference to determine which photo to show
              const preference = team?.display_photo_preference || 'banner';
              const imageUrl = team ? (preference === 'icon' ? (team.icon_url || team.banner_url) : (team.banner_url || team.icon_url)) : null;

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
        <div className="container mx-auto px-4 2xl:px-10 py-3">
          <div className="max-w-4xl 2xl:max-w-6xl mx-auto">
            <ReferralCard />
          </div>
        </div>
      )}

      {/* Main Content Section */}
      <div className="container mx-auto px-4 2xl:px-10 py-4">
        <div className="max-w-4xl 2xl:max-w-6xl mx-auto space-y-6">

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

          {/* Explore Panel */}
          <ExplorePanel />

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
