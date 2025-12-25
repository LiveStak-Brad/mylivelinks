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

  // Use the transparent logo that actually exists
  const logoPath = '/branding/mylivelinkstransparent.png';

  return (
    <Image
      src={logoPath}
      alt="MyLiveLinks"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}


