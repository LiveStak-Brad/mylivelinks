'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { LIVE_LAUNCH_ENABLED, isLiveOwnerUser } from '@/lib/livekit-constants';

interface ProfileBannerProps {
  profileId: string;
  username: string;
  isLive: boolean;
  liveStreamId?: number;
  className?: string;
  height?: string;
}

/**
 * Profile Banner Component
 * Clickable banner at top of profile that directs to live stream
 * Auto-detects images from branding/ and photos/ folders
 */
export default function ProfileBanner({
  profileId,
  username,
  isLive,
  liveStreamId,
  className = '',
  height = '300px',
}: ProfileBannerProps) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [bannerSrc, setBannerSrc] = useState<string>('');
  const [canOpenLive, setCanOpenLive] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCanOpenLive(LIVE_LAUNCH_ENABLED || isLiveOwnerUser({ id: user?.id, email: user?.email }));
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Try multiple image sources in priority order:
    // 1. User-specific banner from photos/ folder
    // 2. Theme-specific banner from branding/ folder
    // 3. Generic banner fallback

    const imageSources = [
      // User-specific banner (if exists)
      `/photos/banners/${username}-banner-${isDark ? 'dark' : 'light'}.jpg`,
      `/photos/banners/${username}-banner-${isDark ? 'dark' : 'light'}.png`,
      `/photos/banners/${username}-banner.jpg`,
      `/photos/banners/${username}-banner.png`,
      
      // Theme-specific branding banner
      `/branding/banner/banner-${isDark ? 'dark' : 'light'}.jpg`,
      `/branding/banner/banner-${isDark ? 'dark' : 'light'}.png`,
      
      // Generic fallback
      `/branding/banner/banner.jpg`,
      `/photos/banners/default-banner.jpg`,
    ];

    // Try first source, will fallback on error
    setBannerSrc(imageSources[0]);
  }, [mounted, isDark, username]);

  const handleBannerClick = () => {
    if (!canOpenLive) return;
    if (isLive) {
      // Navigate to solo stream viewer (Twitch-style)
      router.push(`/live/${username}`);
    } else {
      // Navigate to main live room (they'll see when user goes live)
      router.push(`/live`);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const currentSrc = target.src;
    
    // Try next fallback images
    const fallbacks = [
      `/photos/banners/${username}-banner-${isDark ? 'dark' : 'light'}.png`,
      `/photos/banners/${username}-banner.jpg`,
      `/branding/banner/banner-${isDark ? 'dark' : 'light'}.jpg`,
      `/branding/banner/banner.jpg`,
      `/photos/banners/default-banner.jpg`,
    ];

    const currentIndex = fallbacks.findIndex(fallback => 
      currentSrc.includes(fallback.split('/').pop() || '')
    );

    if (currentIndex < fallbacks.length - 1) {
      target.src = fallbacks[currentIndex + 1];
    } else {
      // Final fallback: solid color
      target.style.display = 'none';
    }
  };

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className={`bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800 animate-pulse ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative w-full group overflow-hidden ${className} ${canOpenLive ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
      style={{ height }}
      onClick={handleBannerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBannerClick();
        }
      }}
      aria-label={isLive ? `Watch ${username} live` : `Go to live room`}
    >
      {/* Banner Image */}
      {bannerSrc && (
        <Image
          src={bannerSrc}
          alt={`${username}'s banner`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority
          onError={handleImageError}
        />
      )}

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />

      {/* Live Indicator (if live) */}
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="font-semibold text-sm">LIVE NOW</span>
        </div>
      )}

      {/* Click to Watch CTA */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
          <h2 className="text-2xl font-bold mb-1">{username}</h2>
          {isLive ? (
            <p className="text-sm opacity-90 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Click to watch live stream →
            </p>
          ) : (
            <p className="text-sm opacity-90">
              {canOpenLive ? 'Click to go to live room →' : 'Live streaming coming soon'}
            </p>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
    </div>
  );
}


