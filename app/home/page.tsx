'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmailSignupCard } from '@/components/EmailSignupCard';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  Sparkles
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

export default function HomePage() {
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
      // Show home page for logged-in users (no redirect - this is /home)
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

  const handleTeamClick = (slug: string) => {
    setRoutingTeams(true);
    router.push(`/teams/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <Image
                src="/branding/mylivelinksdarkbanner.png"
                alt="MyLiveLinks"
                width={280}
                height={70}
                className="h-16 w-auto"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Live Streaming
              </span>
              <br />
              <span className="text-foreground">Reimagined</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with creators, join live streams, and be part of an amazing community.
            </p>
            
            {!currentUser && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
            
            {currentUser && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="/watch">
                  <Button size="lg" className="w-full sm:w-auto">
                    Watch Now
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    View Feed
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Discover</h2>
          
          {/* Profile Carousel */}
          <div className="mb-12">
            <ProfileCarousel />
          </div>
          
          {/* Teams Section */}
          {newTeams.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {newTeams.slice(0, 6).map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team.slug)}
                    disabled={routingTeams}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                  >
                    {team.banner_url ? (
                      <Image
                        src={team.banner_url}
                        alt={team.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium truncate">{team.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Rooms Carousel */}
          <RoomsCarousel />
        </div>
      </section>

      {/* MLL Pro Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <MllProHero />
        </div>
      </section>

      {/* Referral Section */}
      {currentUser && (
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <ReferralCard />
          </div>
        </section>
      )}

      {/* Email Signup for non-logged in users */}
      {!currentUser && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <EmailSignupCard />
          </div>
        </section>
      )}

      {/* PWA Install */}
      <section className="py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <PwaInstallButton />
        </div>
      </section>

      {/* Support */}
      <div className="fixed bottom-20 right-4 z-50">
        <LinklerSupportButton />
      </div>

      {/* Footer */}
      <PolicyFooter />
    </div>
  );
}
