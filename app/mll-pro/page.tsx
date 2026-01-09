'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Shield, Users, Star, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';

export default function MllProExplainerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">MLL PRO</h1>
          <p className="text-xl text-gray-300">
            Recognition for creators who help build a positive, active community on MyLiveLinks
          </p>
        </div>

        {/* What is MLL PRO? */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-400" />
            What is MLL PRO?
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            MLL PRO is a recognition badge for streamers who help grow a positive, active community on MyLiveLinks. 
            It highlights creators who show up with intent—building culture, bringing supporters, and making MyLiveLinks 
            a place people want to return to.
          </p>
        </section>

        {/* How do you qualify? */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            How do you qualify?
          </h2>
          <p className="text-gray-200 text-lg mb-4">We look for creators who:</p>
          <ul className="space-y-3 text-gray-200 text-lg">
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Stream consistently with purpose</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Actively invite their community to watch/support on MyLiveLinks</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Create a welcoming vibe (community-first, respectful, warm)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Show effort in growth (promotion, engagement, collaboration)</span>
            </li>
          </ul>
          
          <div className="mt-6 p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
            <p className="text-white font-semibold mb-2">Followers are not required</p>
            <p className="text-gray-200">
              Follower counts are not a requirement. They can help us understand your reach, but we care most about 
              consistency, quality, and your willingness to help grow the platform.
            </p>
          </div>
        </section>

        {/* What do you get? */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            What do you get?
          </h2>
          <p className="text-gray-200 text-lg mb-4">MLL PRO includes:</p>
          <ul className="space-y-3 text-gray-200 text-lg">
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>PRO badge next to your name across the app (profile, chat, posts, live, teams, etc.)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Priority placement on the MLL PRO listing</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400 mt-1">•</span>
              <span>Higher placement in LiveTV Featured when live (above other featured streamers)</span>
            </li>
          </ul>
        </section>

        {/* How do you keep it? */}
        <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-pink-400" />
            How do you keep it?
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            MLL PRO is maintained by continued participation. We may cross-reference referral activity and overall 
            contribution to platform growth, but we're reasonable during growth phases.
          </p>
        </section>

        {/* No contracts / no quotas */}
        <section className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-purple-400/30">
          <h2 className="text-3xl font-bold text-white mb-4">No contracts / no quotas / no minimum earnings</h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            This is not a contract. No minimum streaming hours, no earnings requirements, and no forced commitments. 
            We reserve the right to grant or remove MLL PRO based on overall fit and community standards.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => router.push('/mll-pro/apply')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xl px-12 py-6 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Apply Now
            <ArrowRight className="w-6 h-6 ml-2" />
          </Button>
          <p className="text-gray-400 mt-4">
            Applications are reviewed manually. We'll reach out by email.
          </p>
        </div>
      </div>
    </div>
  );
}
