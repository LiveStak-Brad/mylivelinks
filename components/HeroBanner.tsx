'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface HeroBannerProps {
  height?: string;
  className?: string;
  showOverlay?: boolean;
}

export default function HeroBanner({ 
  height = '600px',
  className = '',
  showOverlay = true 
}: HeroBannerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  if (!mounted) {
    return (
      <div 
        style={{ height }} 
        className={`bg-gray-200 dark:bg-gray-800 ${className}`}
      />
    );
  }

  const bannerPath = `/branding/banner/banner-${isDark ? 'dark' : 'light'}.jpg`;
  const heroPath = `/branding/banner/hero-${isDark ? 'dark' : 'light'}.jpg`;

  return (
    <div 
      className={`relative w-full ${className}`}
      style={{ height }}
    >
      <Image
        src={heroPath}
        alt="MyLiveLinks Hero"
        fill
        className="object-cover"
        priority
        onError={(e) => {
          // Fallback to banner if hero doesn't exist
          const target = e.target as HTMLImageElement;
          target.src = bannerPath;
        }}
      />
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
      )}
    </div>
  );
}


