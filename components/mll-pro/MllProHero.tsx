'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Shield, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import newProBadge from '@/newprobadge.png';
import { createClient } from '@/lib/supabase';

export function MllProHero() {
  const router = useRouter();
  const [userIsPro, setUserIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    const checkProStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserIsPro(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_mll_pro')
        .eq('id', user.id)
        .single();

      setUserIsPro(data?.is_mll_pro === true);
    };

    void checkProStatus();
  }, []);

  // Don't show hero if user already has PRO
  if (userIsPro === true) {
    return null;
  }

  // Don't render until we know the status
  if (userIsPro === null) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-xl overflow-hidden shadow-lg mb-6">
      <div className="relative">
        {/* Gradient Background */}
        <div className="relative w-full p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20" />

        {/* Content */}
        <div className="relative">
          {/* Title with Badge */}
          <div className="flex items-start gap-2 md:gap-3 mb-3">
            <h2 className="flex-1 text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
              MLL PRO is where top streamers build real communities.
            </h2>
            <div className="relative w-32 h-32 md:w-44 md:h-44 lg:w-56 lg:h-56 flex-shrink-0 -mt-2 -mb-8 md:-mb-12 lg:-mb-16">
              <Image
                src={newProBadge}
                alt="MLL PRO Badge"
                fill
                className="object-contain drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))' }}
              />
            </div>
          </div>

          {/* Description - Full Width */}
          <p className="text-sm md:text-base text-gray-200 mb-4">
            Get recognized across the app, featured placement when live, and help grow the platform by bringing your community with you. No contracts. No quotas. Just quality + intent.
          </p>

          {/* Buttons */}
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
  );
}
