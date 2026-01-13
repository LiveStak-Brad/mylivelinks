'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Rss, Video, Tv, User, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';
import { canUserGoLive } from '@/lib/livekit-constants';
import { Modal } from './ui/Modal';

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
  const [isOwner, setIsOwner] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
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
      const canGoLive = canUserGoLive(user ? { id: user.id, email: user.email } : null);
      setIsOwner(canGoLive);
      
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
      setIsOwner(false);
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
                  if (isOwner) {
                    // Owner: Route to dedicated host stream page
                    router.push('/live/host');
                    return;
                  }
                  // Non-owner: show coming soon modal
                  setShowGoLiveModal(true);
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

      <Modal
        isOpen={showGoLiveModal}
        onClose={() => setShowGoLiveModal(false)}
        title="Go Live (Coming Soon)"
        description="Go Live is currently limited to the owner account. Everyone can still watch live streams."
        footer={
          <button
            type="button"
            onClick={() => setShowGoLiveModal(false)}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            Got it
          </button>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              <div className="font-semibold text-foreground">Go Live</div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              This feature is rolling out soon.
            </div>
          </div>
        </div>
      </Modal>
    </nav>
  );
}

