'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Video, Users, TrendingUp, Link2 } from 'lucide-react';
import ProfileCarousel from '@/components/ProfileCarousel';
import { RoomsCarousel } from '@/components/rooms';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
        setCurrentUser({ id: user.id, email: user.email });
        setLoading(false);
        return;
      }
      
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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center">
        <div className="animate-pulse text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Welcome to MyLiveLinks
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-2">
              Your all-in-one platform for live streaming and link sharing
            </p>
            <p className="text-lg text-white/80">
              Stream live, share your links, and build your community — all in one place! 🚀
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-card rounded-2xl shadow-2xl p-8 mb-12 border border-border/50">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" />
                Find Creators
              </h2>
              <p className="text-muted-foreground">
                Search for profiles, discover new content, and connect with creators
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full px-6 py-4 text-lg border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-background text-foreground"
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              {searching ? (
                <div className="text-center py-8 text-muted-foreground">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((profile) => (
                    <Link
                      key={profile.id}
                      href={`/${profile.username}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition group"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                          {profile.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground group-hover:text-primary transition">
                            {profile.display_name || profile.username}
                          </p>
                          {profile.is_live && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                              LIVE
                            </span>
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
        </div>

        {/* Recommended Profiles Carousel - More prominent */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 mb-12 border border-border/50">
          <ProfileCarousel 
            title={currentUser ? "Recommended for You" : "Popular Creators"} 
            currentUserId={currentUser?.id || null}
          />
        </div>

        {/* Coming Soon Rooms Carousel */}
        <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 mb-12 border border-border/50">
          <RoomsCarousel />
        </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Streaming</h3>
              <p className="text-white/90">
                Go live instantly with high-quality video streaming. Connect with your audience in real-time.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Link2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Link Hub</h3>
              <p className="text-white/90">
                Share all your important links in one beautiful profile. Your personal link tree, supercharged!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community</h3>
              <p className="text-white/90">
                Follow creators, chat live, send gifts, and build your community all in one place.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Monetization</h3>
              <p className="text-white/90">
                Earn from your content through gifts, tips, and viewer support. Turn your passion into income.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl shadow-2xl p-8 text-center border border-border/50">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Ready to Get Started?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentUser?.username ? (
                <Link
                  href={`/${currentUser.username}`}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
                >
                  View My Profile
                </Link>
              ) : (
                <Link
                  href="/settings/profile"
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
                >
                  Complete Your Profile
                </Link>
              )}
              <Link
                href="/live"
                className="px-8 py-4 bg-card border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/10 transition"
              >
                Browse Live Streams
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 py-8 text-center text-white/60 text-sm">
        <p>© 2025 MyLiveLinks. All rights reserved.</p>
      </div>
    </div>
  );
}
