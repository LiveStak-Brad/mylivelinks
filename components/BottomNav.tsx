'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Rss, Video, Tv, User, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';

interface NavItem {
  href: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  matchType?: 'exact' | 'prefix';
  requiresAuth?: boolean;
}

/**
 * BottomNav Component v3.0
 * 
 * Mobile-first bottom navigation bar for web and mobile app.
 * 
 * Items (in order):
 * 1. Watch - TikTok-style vertical feed
 * 2. Home - Landing/dashboard
 * 3. Feed - Community posts
 * 4. Go Live - Start streaming
 * 5. LiveTV - Browse live streams
 * 6. Profile - User profile
 * 
 * Features:
 * - 6 primary navigation items
 * - Active state indicators
 * - Responsive: shows on mobile/tablet, hidden on desktop
 * - Consistent with iOS/Android bottom navigation patterns
 * - Safe area padding for mobile devices
 */
export default function BottomNav() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserId(user?.id ?? null);
      
      // Get username for profile link
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setUsername(profile?.username ?? null);
      } else {
        setUsername(null);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setUserId(null);
      setUsername(null);
    }
  };

  // Don't show bottom nav on certain pages
  const hideBottomNav = pathname === '/login' || 
                        pathname === '/signup' || 
                        pathname === '/onboarding' ||
                        pathname?.startsWith('/owner');
  
  if (hideBottomNav) {
    return null;
  }

  // Profile href - use username if available, otherwise /login
  const profileHref = isLoggedIn && username ? `/${username}` : '/login';

  const navItems: NavItem[] = [
    {
      href: '/watch',
      ariaLabel: 'Watch',
      icon: Play,
      matchType: 'exact',
    },
    {
      href: '/home',
      ariaLabel: 'Home',
      icon: Home,
      matchType: 'exact',
    },
    {
      href: '/feed',
      ariaLabel: 'Feed',
      icon: Rss,
      matchType: 'exact',
    },
    {
      href: '/room/live-central',
      ariaLabel: 'Go Live',
      icon: Video,
      matchType: 'prefix',
    },
    {
      href: '/liveTV',
      ariaLabel: 'LiveTV',
      icon: Tv,
      matchType: 'exact',
    },
    {
      href: profileHref,
      ariaLabel: 'Profile',
      icon: User,
      matchType: 'prefix',
      requiresAuth: true,
    },
  ];

  return (
    <nav 
      className="bottom-nav"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(pathname, item.href, { 
            matchType: item.matchType 
          });

          const effectiveHref = item.requiresAuth && !isLoggedIn ? '/login' : item.href;

          if (item.href === '/room/live-central') {
            return (
              <button
                key={item.href}
                type="button"
                data-href={item.href}
                onClick={() => {
                  // Everyone can go live - route to host stream page
                  if (!isLoggedIn) {
                    router.push('/login');
                    return;
                  }
                  router.push('/live/host');
                }}
                className={`bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
                aria-label={item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon />
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={effectiveHref}
              data-href={item.href}
              className={`bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

