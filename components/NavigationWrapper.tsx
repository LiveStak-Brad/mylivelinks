'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import GlobalHeader from './GlobalHeader';
import BottomNav from './BottomNav';

export default function NavigationWrapper() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      // iPad and smaller (1024px and below)
      setIsMobile(window.innerWidth <= 1024);
    };

    // Check immediately on mount
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide navigation on live streaming pages
  // - /host: hide on ALL screen sizes (immersive streaming experience)
  // - /live/[username] and /live: hide on mobile/tablet only
  const shouldHideNav = mounted && (
    pathname === '/live/host' ||      // Host page: hide on all screens
    ((pathname === '/live' || pathname?.startsWith('/live/') || pathname?.startsWith('/room/')) && isMobile)  // Viewer/live pages: hide on mobile only
  );

  // Only show debug on /live/[username] pages
  const isLiveStreamView = pathname?.startsWith('/live/') && pathname !== '/live/host';

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
