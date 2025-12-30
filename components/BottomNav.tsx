'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Rss, Video, MessageCircle, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';
import { canUserGoLive } from '@/lib/livekit-constants';
import { useMessages } from './messages';
import { useNoties } from './noties';
import { Modal } from './ui/Modal';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchType?: 'exact' | 'prefix';
  badge?: number;
  requiresAuth?: boolean;
}

/**
 * BottomNav Component v2.0
 * 
 * Mobile-first bottom navigation bar for web and mobile app.
 * Features:
 * - 5 primary navigation items with ONLY TEXT LABELS (NO NUMBERS!)
 * - Active state indicators
 * - Dot badge for unread items (NO COUNT NUMBERS)
 * - Responsive: shows on mobile/tablet, hidden on desktop
 * - Consistent with iOS/Android bottom navigation patterns
 * - Safe area padding for mobile devices
 */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const { totalUnreadCount: unreadMessages } = useMessages();
  const { unreadCount: unreadNoties } = useNoties();
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

  const [username, setUsername] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      const canGoLive = canUserGoLive(user ? { id: user.id, email: user.email } : null);
      setIsOwner(canGoLive);
      
      // Fetch username for solo stream routing
      if (user && canGoLive) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        setUsername(profile?.username || null);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setIsOwner(false);
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

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      matchType: 'exact',
    },
    {
      href: '/feed',
      label: 'Feed',
      icon: Rss,
      matchType: 'exact',
    },
    {
      href: '/live',
      label: 'Go Live',
      icon: Video,
      matchType: 'prefix',
    },
    {
      href: '/messages',
      label: 'Messages',
      icon: MessageCircle,
      matchType: 'prefix',
      badge: mounted && unreadMessages > 0 ? unreadMessages : undefined,
      requiresAuth: true,
    },
    {
      href: '/noties',
      label: 'Noties',
      icon: Bell,
      matchType: 'exact',
      badge: mounted && unreadNoties > 0 ? unreadNoties : undefined,
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

          // Hide auth-required items if not logged in
          if (item.requiresAuth && !isLoggedIn) {
            return null;
          }

          if (item.href === '/live') {
            return (
              <button
                key={item.href}
                type="button"
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
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon />
                </div>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon />
                
                {/* Dot indicator for unread items - NEVER show count as text */}
                {mounted && item.badge && item.badge > 0 && (
                  <span className="bottom-nav-badge-dot" aria-label={`${item.badge} unread`} />
                )}
              </div>
              
              <span className="bottom-nav-label">
                {item.label}
              </span>
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

