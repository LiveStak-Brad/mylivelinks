'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Shield, Star, TrendingUp } from 'lucide-react';

export function MllProHero() {
  const router = useRouter();

  return (
    <div className="w-full bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-xl overflow-hidden shadow-lg mb-6">
      <div className="relative">
        {/* Gradient Background with Icons */}
        <div className="relative w-full p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20" />
          <div className="absolute top-4 right-4 opacity-10">
            <Shield className="w-32 h-32 text-white" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-10">
            <Star className="w-24 h-24 text-white" />
          </div>

        {/* Content */}
        <div className="relative flex flex-col justify-end">
          <div className="max-w-4xl">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3">
              MLL PRO is where top streamers build real communities.
            </h2>
            <p className="text-sm md:text-lg text-gray-200 mb-4 md:mb-6 max-w-3xl">
              Get recognized across the app, featured placement when live, and help grow the platform by bringing your community with you. No contracts. No quotas. Just quality + intent.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push('/mll-pro/apply')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-3 text-base"
              >
                Apply for MLL PRO
              </Button>
              <Button
                onClick={() => router.push('/mll-pro')}
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-semibold px-6 py-3 text-base"
              >
                What is MLL PRO?
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
