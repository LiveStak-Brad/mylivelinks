'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { getLogoPath } from '@/lib/imageUtils';

interface SmartBrandLogoProps {
  size?: number;
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
  fallbackToPng?: boolean;
}

/**
 * Smart Brand Logo Component
 * Automatically detects and uses logo files based on:
 * - Theme (light/dark)
 * - Type (full logo vs icon)
 * - File naming convention
 */
export default function SmartBrandLogo({
  size = 200,
  iconOnly = false,
  className = '',
  priority = false,
  fallbackToPng = true,
}: SmartBrandLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  useEffect(() => {
    if (mounted) {
      // Use the transparent logo that actually exists
      setImgSrc('/branding/mylivelinkstransparent.png');
    }
  }, [mounted, isDark, iconOnly]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-gray-200 dark:bg-gray-800 animate-pulse ${className}`}
        aria-label="MyLiveLinks Logo"
      />
    );
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallbackToPng) {
      const target = e.target as HTMLImageElement;
      // Final fallback: use transparent logo
      const fallbackPath = '/branding/mylivelinkstransparent.png';
      if (!target.src.includes('mylivelinkstransparent')) {
        target.src = fallbackPath;
      }
    }
  };

  return (
    <Image
      src={imgSrc}
      alt="MyLiveLinks"
      width={size}
      height={size}
      className={className}
      priority={priority}
      onError={handleError}
    />
  );
}


