'use client';

import { useEffect, useState } from 'react';
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
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canOpenLive, setCanOpenLive] = useState(false);

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
        setCanOpenLive(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user.id, email: user.email }));
        setCurrentUser({ id: user.id, email: user.email });
        setLoading(false);
        return;
      }
      
      setCanOpenLive(!!(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user.id, email: user.email })));
      setCurrentUser(profile || { id: user.id, email: user.email });
      setLoading(false);
    } else {
      router.push('/login');
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
      {/* Section 1: Teams Banner (Compact + Exciting) */}
      <div className="container mx-auto px-4 pt-6 pb-3">
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
                      Teams are here!
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">New</span>
                    </span>
                  </div>
                  <p className="text-sm text-white/70">Create communities around shared interests.</p>
                </div>
              </div>
              
              <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 sm:items-center">
                <Link href="/teams" className="w-full sm:w-auto">
                  <Button size="sm" className="w-full px-6 font-semibold shadow-lg whitespace-nowrap bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0">
                    Explore Teams
                  </Button>
                </Link>
                <PwaInstallButton
                  size="sm"
                  className="w-full sm:w-auto font-semibold shadow-lg"
                  variant="gradient"
                />
              </div>
            </div>
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

          {/* Coming Soon Strip (Inline, minimal) */}
          <div className="text-center py-2">
            <p className="text-xs text-white/40">
              Coming soon: Live streaming • New gifts
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PolicyFooter />
    </main>
  );
}
