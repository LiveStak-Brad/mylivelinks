'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Sparkles, Users, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import LiveRoom from '@/components/LiveRoom';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';

const OWNER_UUID = '2b4a1178-3c39-4179-94ea-314dd824a818';

export default function LiveComingSoonPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

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
      
      // Allow all authenticated users for now
      if (user) {
        console.log('[LIVE PAGE] ✅ User confirmed, showing LiveRoom');
        setIsOwner(true);
      } else {
        console.log('[LIVE PAGE] ❌ No user logged in');
      }
    } catch (error) {
      console.error('[LIVE PAGE] Error checking owner:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If owner, show the actual LiveRoom
  if (isOwner) {
    return (
      <LiveRoomErrorBoundary>
        <LiveRoom />
      </LiveRoomErrorBoundary>
    );
  }

  // Everyone else sees "Coming Soon"
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 p-6 rounded-full animate-pulse">
                <Video className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Live Streaming
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-white/90">
              Coming Soon! 🚀
            </p>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <p className="text-xl text-white/90 text-center mb-12">
              We're building something amazing! Live streaming will be available very soon. Get ready to go live and connect with your audience in real-time.
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
                <div className="bg-purple-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-7 h-7 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">HD Streaming</h3>
                <p className="text-sm text-white/70">
                  Broadcast in stunning high quality with low latency
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
                <div className="bg-pink-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-pink-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Real-Time Interaction</h3>
                <p className="text-sm text-white/70">
                  Chat, gifts, and engagement with your fans
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
                <div className="bg-blue-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Monetization</h3>
                <p className="text-sm text-white/70">
                  Earn from gifts, tips, and supporter badges
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-white/10 text-center mb-8">
              <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">
                Meanwhile, set up your profile!
              </h3>
              <p className="text-white/80 mb-6">
                Get your profile ready so you can start streaming as soon as we launch.
              </p>
              <Link
                href="/settings/profile"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                Customize Your Profile
              </Link>
            </div>

            {/* Back Link */}
            <div className="text-center">
              <Link
                href="/"
                className="text-white/70 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-white/60 mt-8 text-sm">
          Stay tuned for updates! Live streaming is launching soon.
        </p>
      </div>
    </div>
  );
}
