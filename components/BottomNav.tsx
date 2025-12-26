'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Rss, Video, MessageCircle, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { isRouteActive } from '@/lib/navigation';
import { useMessages } from './messages';
import { useNoties } from './noties';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchType?: 'exact' | 'prefix';
  badge?: number;
  requiresAuth?: boolean;
}

/**
 * BottomNav Component
 * 
 * Mobile-first bottom navigation bar for web and mobile app.
 * Features:
 * - 5 primary navigation items
 * - Active state indicators
 * - Badge support for messages
 * - Responsive: shows on mobile/tablet, hidden on desktop
 * - Consistent with iOS/Android bottom navigation patterns
 * - Safe area padding for mobile devices
 */
export default function BottomNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { totalUnreadCount: unreadMessages } = useMessages();
  const { unreadCount: unreadNoties } = useNoties();
  const supabase = createClient();

  useEffect(() => {
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
    } catch (error) {
      setIsLoggedIn(false);
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
      href: '/rooms',
      label: 'Rooms',
      icon: Video,
      matchType: 'prefix',
    },
    {
      href: '/messages',
      label: 'Messages',
      icon: MessageCircle,
      matchType: 'prefix',
      badge: unreadMessages,
      requiresAuth: true,
    },
    {
      href: '/noties',
      label: 'Noties',
      icon: Bell,
      matchType: 'exact',
      badge: unreadNoties,
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
                
                {/* Dot indicator for unread items */}
                {item.badge && item.badge > 0 && (
                  <span className="bottom-nav-badge-dot" />
                )}
              </div>
              
              <span className="bottom-nav-label">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

