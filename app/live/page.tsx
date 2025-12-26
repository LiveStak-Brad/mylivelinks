'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Sparkles, Users, TrendingUp, Bell, Zap, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { canAccessLive } from '@/lib/livekit-constants';
import LiveRoom from '@/components/LiveRoom';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';
import { Button, Card, StatusBadge } from '@/components/ui';

const OWNER_UUID = '2b4a1178-3c39-4179-94ea-314dd824a818';

export default function LiveComingSoonPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    checkOwner();
  }, []);

  const checkOwner = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      console.log('[LIVE PAGE] Auth check:', {
        hasUser: !!user,
        userId: user?.id,
        ownerUuid: OWNER_UUID,
        isMatch: user?.id === OWNER_UUID,
        error: error
      });
      
      if (canAccessLive({ id: user?.id, email: user?.email })) {
        console.log('[LIVE PAGE] ✅ Live access allowed, showing LiveRoom');
        setIsOwner(true);
      } else {
        console.log('[LIVE PAGE] ❌ Live access not allowed');
        setIsOwner(false);
      }
    } catch (error) {
      console.error('[LIVE PAGE] Error checking owner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAudio = async () => {
    // Resume AudioContext on user gesture
    try {
      // @ts-ignore - AudioContext is available in browser
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        ctx.close();
        console.log('[AUDIO] AudioContext resumed after user gesture');
      }
    } catch (error) {
      console.warn('[AUDIO] Could not resume AudioContext:', error);
    }
    setAudioEnabled(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
            <Video className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // If owner but audio not enabled, show audio enable screen
  if (isOwner && !audioEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-2xl overflow-hidden">
          {/* Header gradient */}
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <div className="p-8">
            <div className="relative mx-auto mb-8">
              {/* Glow effect */}
              <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
              
              {/* Icon */}
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">Enable Audio</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Click below to enable audio for the live stream. This is required by your browser's autoplay policy.
            </p>
            
            <Button
              onClick={handleEnableAudio}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30"
            >
              <Zap className="w-5 h-5 mr-2" />
              Enable Audio & Enter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If owner and audio enabled, show the actual LiveRoom
  if (isOwner && audioEnabled) {
    return (
      <LiveRoomErrorBoundary>
        <LiveRoom />
      </LiveRoomErrorBoundary>
    );
  }

  // Everyone else sees "Coming Soon" - Premium version
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <StatusBadge variant="coming-soon" size="sm" pulse={false}>
              COMING SOON
            </StatusBadge>
          </div>
          
          {/* Main icon */}
          <div className="relative mx-auto mb-8 w-fit">
            <div className="absolute inset-0 -m-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
              <Video className="w-14 h-14 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Live Streaming
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We're building something amazing! Go live and connect with your audience in real-time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: Video,
              title: 'HD Streaming',
              description: 'Broadcast in stunning high quality with ultra-low latency',
              color: 'from-violet-500 to-purple-600',
            },
            {
              icon: Users,
              title: 'Real-Time Interaction',
              description: 'Chat, gifts, and live engagement with your fans',
              color: 'from-rose-500 to-pink-600',
            },
            {
              icon: TrendingUp,
              title: 'Monetization',
              description: 'Earn from gifts, tips, and supporter badges',
              color: 'from-amber-500 to-orange-600',
            },
          ].map((feature, i) => (
            <Card 
              key={i} 
              className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className={`
                  w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${feature.color} 
                  flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300
                `}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-8 md:p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Get Ready for Launch! 🚀
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Set up your profile now so you're ready to stream as soon as we launch.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/settings/profile">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Customize Your Profile
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" size="lg">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Notify section */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Bell className="w-4 h-4" />
            Stay tuned — live streaming launches soon!
          </p>
        </div>
      </div>
    </div>
  );
}
