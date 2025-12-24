'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if profile is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, date_of_birth')
        .eq('id', user.id)
        .single();
      
      if (profile?.username && profile?.date_of_birth) {
        // Profile complete, redirect to live room
        router.push('/live');
      } else {
        // Profile incomplete, redirect to onboarding
        router.push('/onboarding');
      }
    } else {
      setLoading(false);
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
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold mb-4 drop-shadow-lg">
              MyLiveLinks
            </h1>
            <p className="text-2xl md:text-3xl font-light opacity-90">
              Stream Live. Share Links. Build Community.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 my-16">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition">
              <div className="text-5xl mb-4">🎥</div>
              <h3 className="text-2xl font-bold mb-2">Live Streaming</h3>
              <p className="opacity-80">
                Go live instantly with high-quality video streaming powered by LiveKit
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition">
              <div className="text-5xl mb-4">🔗</div>
              <h3 className="text-2xl font-bold mb-2">Custom Links</h3>
              <p className="opacity-80">
                Share your social media, stores, and content in one beautiful profile
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition">
              <div className="text-5xl mb-4">💎</div>
              <h3 className="text-2xl font-bold mb-2">Earn & Gift</h3>
              <p className="opacity-80">
                Monetize your content with gifts, tips, and viewer support
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Link
              href="/signup"
              className="bg-white text-purple-600 px-10 py-4 rounded-full text-xl font-bold hover:bg-gray-100 transition shadow-2xl hover:scale-105 transform"
            >
              Create Account
            </Link>
            
            <Link
              href="/login"
              className="bg-white/20 backdrop-blur-md text-white px-10 py-4 rounded-full text-xl font-bold hover:bg-white/30 transition border-2 border-white/50"
            >
              Sign In
            </Link>
          </div>

          {/* Quick Browse */}
          <div className="mt-12">
            <Link
              href="/live"
              className="text-white/80 hover:text-white underline text-lg"
            >
              Browse Live Streams →
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/10 backdrop-blur-md py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Why MyLiveLinks?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 text-white">
              <div className="flex gap-4">
                <div className="text-3xl">✨</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Beautiful Profiles</h3>
                  <p className="opacity-80">Customize your profile with backgrounds, colors, and themes</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">🎁</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Virtual Gifts</h3>
                  <p className="opacity-80">Send and receive gifts during live streams</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">👥</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Social Features</h3>
                  <p className="opacity-80">Follow, message, and connect with creators</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">📱</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Mobile & Web</h3>
                  <p className="opacity-80">Stream and browse on any device</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">💰</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Monetization</h3>
                  <p className="opacity-80">Turn your passion into income with our creator economy</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Safe & Secure</h3>
                  <p className="opacity-80">Age-verified platform with strong moderation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-white/80 mb-8">
          Join thousands of creators and viewers today
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-purple-600 px-12 py-5 rounded-full text-2xl font-bold hover:bg-gray-100 transition shadow-2xl hover:scale-105 transform"
        >
          Sign Up Free
        </Link>
      </div>
    </div>
  );
}
