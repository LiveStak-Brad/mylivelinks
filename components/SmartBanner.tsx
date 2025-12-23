'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getBannerPath } from '@/lib/imageUtils';

interface SmartBannerProps {
  type?: 'banner' | 'hero';
  height?: string;
  className?: string;
  showOverlay?: boolean;
  priority?: boolean;
}

/**
 * Smart Banner Component
 * Automatically detects and uses banner files based on:
 * - Theme (light/dark)
 * - Type (banner vs hero)
 * - File naming convention
 */
export default function SmartBanner({
  type = 'banner',
  height = type === 'hero' ? '600px' : '200px',
  className = '',
  showOverlay = type === 'hero',
  priority = false,
}: SmartBannerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  useEffect(() => {
    if (mounted) {
      const path = getBannerPath(isDark ? 'dark' : 'light', type);
      setImgSrc(path);
    }
  }, [mounted, isDark, type]);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className={`bg-gray-200 dark:bg-gray-800 animate-pulse ${className}`}
      />
    );
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    // Fallback: try alternate format or theme
    if (imgSrc.endsWith('.jpg')) {
      target.src = imgSrc.replace('.jpg', '.png');
    } else if (imgSrc.endsWith('.png')) {
      target.src = imgSrc.replace('.png', '.jpg');
    } else {
      // Final fallback: try light theme
      target.src = getBannerPath('light', type);
    }
  };

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height }}
    >
      <Image
        src={imgSrc}
        alt={`MyLiveLinks ${type === 'hero' ? 'Hero' : 'Banner'}`}
        fill
        className="object-cover"
        priority={priority}
        onError={handleError}
      />
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
      )}
    </div>
  );
}


