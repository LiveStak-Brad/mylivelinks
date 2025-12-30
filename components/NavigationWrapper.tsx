'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import GlobalHeader from './GlobalHeader';
import BottomNav from './BottomNav';

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // iPad and smaller (1024px and below)
      setIsMobile(window.innerWidth <= 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide navigation on /rooms page on mobile/tablet
  const shouldHideNav = pathname === '/rooms' && isMobile;

  if (shouldHideNav) {
    return null;
  }

  return (
    <>
      <GlobalHeader />
      <BottomNav />
    </>
  );
}
