'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface BrandLogoProps {
  size?: number;
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({ 
  size = 200, 
  iconOnly = false,
  className = '',
  priority = false 
}: BrandLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={className}
        aria-label="MyLiveLinks Logo"
      />
    );
  }

  const logoPath = iconOnly
    ? `/branding/logo/logo-icon-${isDark ? 'dark' : 'light'}.svg`
    : `/branding/logo/logo-${isDark ? 'dark' : 'light'}.svg`;

  return (
    <Image
      src={logoPath}
      alt="MyLiveLinks"
      width={size}
      height={size}
      className={className}
      priority={priority}
      onError={(e) => {
        // Fallback to PNG if SVG fails
        const target = e.target as HTMLImageElement;
        target.src = logoPath.replace('.svg', '.png');
      }}
    />
  );
}


