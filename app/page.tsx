'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Video, Users, TrendingUp, Link2, Sparkles } from 'lucide-react';
import ProfileCarousel from '@/components/ProfileCarousel';
import { RoomsCarousel } from '@/components/rooms';
import { LIVE_LAUNCH_ENABLED, isLiveOwnerUser } from '@/lib/livekit-constants';
import { Input, Button, Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { ReferralCard } from '@/components/referral';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canOpenLive, setCanOpenLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if profile is complete - use maybeSingle() to avoid error if no row
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      // If profile doesn't exist, create minimal one
      if (!profile && !profileError) {
        console.log('[LANDING] No profile found, creating minimal profile...');
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: null,
            coin_balance: 0,
            earnings_balance: 0,
            gifter_level: 0
          });
        // Show homepage anyway - user can complete onboarding later
        setCanOpenLive(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user.id, email: user.email }));
        setCurrentUser({ id: user.id, email: user.email });
        setLoading(false);
        return;
      }
      
      setCanOpenLive(!!(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user.id, email: user.email })));

      // Always show homepage for logged-in users
      // (Even if profile is incomplete - they can access onboarding from menu)
      setCurrentUser(profile || { id: user.id, email: user.email });
      setLoading(false);
    } else {
      // Not logged in, redirect to login
      router.push('/login');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_live')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <main id="main" className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-3/4 mx-auto bg-white/20" />
              <Skeleton className="h-8 w-1/2 mx-auto bg-white/20" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl bg-white/20" />
            <Skeleton className="h-48 w-full rounded-2xl bg-white/20" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Banner */}
          <div className="mb-12 -mx-4 sm:mx-0">
            <Image
              src="/mylivelinksmeta.png"
              alt="MyLiveLinks - Share your links, Make Posts, Go Live, Get Paid!"
              width={1200}
              height={630}
              priority
              className="w-full h-auto sm:rounded-3xl shadow-2xl"
            />
          </div>

          {/* Referral Card - Logged-in users only */}
          {currentUser && (
            <ReferralCard className="mb-12" />
          )}

          {/* Search Bar */}
          <Card className="mb-12 border-border/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Search className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
                  Find Creators
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Search for profiles, discover new content, and connect with creators
                </p>
              </div>

              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by username or name..."
                inputSize="lg"
                rightIcon={<Search className="w-5 h-5" />}
              />

              {/* Search Results */}
              {searchQuery && (
                <div className="mt-4 max-h-96 overflow-y-auto">
                  {searching ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((profile) => (
                        <Link
                          key={profile.id}
                          href={`/${profile.username}`}
                          className="flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors group"
                        >
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                              {profile.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {profile.display_name || profile.username}
                              </p>
                              {profile.is_live && (
                                <Badge variant="destructive" className="animate-pulse">
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            {profile.bio && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {profile.bio}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No profiles found. Try a different search term.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Profiles Carousel */}
          <Card className="mb-12 border-border/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <ProfileCarousel 
                title={currentUser ? "Recommended for You" : "Popular Creators"} 
                currentUserId={currentUser?.id || null}
              />
            </CardContent>
          </Card>

          {/* Coming Soon Rooms Carousel */}
          <Card className="mb-12 border-border/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <RoomsCarousel />
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center mb-4">
                <Video className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Live Streaming</h3>
              <p className="text-white/90 text-sm sm:text-base">
                Go live instantly with high-quality video streaming. Connect with your audience in real-time.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center mb-4">
                <Link2 className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Link Hub</h3>
              <p className="text-white/90 text-sm sm:text-base">
                Share all your important links in one beautiful profile. Your personal link tree, supercharged!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Community</h3>
              <p className="text-white/90 text-sm sm:text-base">
                Follow creators, chat live, send gifts, and build your community all in one place.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-12 sm:w-14 h-12 sm:h-14 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-6 sm:w-7 h-6 sm:h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Monetization</h3>
              <p className="text-white/90 text-sm sm:text-base">
                Earn from your content through gifts, tips, and viewer support. Turn your passion into income.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <Card className="border-border/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
                Ready to Get Started?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {currentUser?.username ? (
                  <Link href={`/${currentUser.username}`}>
                    <Button size="lg" className="w-full sm:w-auto">
                      View My Profile
                    </Button>
                  </Link>
                ) : (
                  <Link href="/settings/profile">
                    <Button size="lg" className="w-full sm:w-auto">
                      Complete Your Profile
                    </Button>
                  </Link>
                )}
                {canOpenLive ? (
                  <Link href="/live">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Browse Live Streams
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    disabled
                    className="w-full sm:w-auto"
                    title="Live streaming coming soon"
                  >
                    Browse Live Streams
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-white/60 text-sm">
        <p>© 2025 MyLiveLinks. All rights reserved.</p>
      </footer>
    </main>
  );
}
