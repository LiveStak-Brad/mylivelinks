'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy, Menu, X } from 'lucide-react';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';
import LeaderboardModal from './LeaderboardModal';
import { IconButton } from './ui';
import { createClient } from '@/lib/supabase';
import { LIVE_LAUNCH_ENABLED } from '@/lib/livekit-constants';
import { isRouteActive, MAIN_NAV_ITEMS, type NavItem } from '@/lib/navigation';
import { useNoties } from './noties';
import { useMessages } from './messages';
import NotiesModal from './noties/NotiesModal';
import MessagesModal from './messages/MessagesModal';

// Owner credentials
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
const OWNER_EMAILS = ['wcba.mo@gmail.com'];

// Notification badge component
function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  
  return (
    <span 
      className="notification-badge"
      aria-label={`${count} ${count === 1 ? 'notification' : 'notifications'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// Premium nav link component with consistent styling (vector icons only)
function NavLink({ 
  item,
  isActive, 
  disabled = false,
  onClick,
}: { 
  item: NavItem;
  isActive: boolean; 
  disabled?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  
  if (disabled) {
    return null; // Don't show disabled items (Live Streams when not owner)
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group relative p-2 md:p-3 lg:p-4 transition-all duration-200 hover:scale-110 ${
        isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'
      }`}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
    >
      {Icon && <Icon className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ${getIconColor(item.label)}`} strokeWidth={2} />}
      
      {/* Hover tooltip for desktop */}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
        {item.label}
      </span>
    </Link>
  );
}

// Icon color helper - matches BottomNav colors
function getIconColor(label: string) {
  switch (label) {
    case 'Home':
      return 'text-purple-500 dark:text-purple-400';
    case 'Feed':
      return 'text-blue-500 dark:text-blue-400';
    case 'Rooms':
      return 'text-pink-500 dark:text-pink-400';
    case 'Live Streams':
      return 'text-red-500 dark:text-red-400';
    default:
      return 'text-gray-700 dark:text-white';
  }
}

// Header icons component that uses the contexts
function HeaderIcons() {
  const [showNotiesModal, setShowNotiesModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const notiesButtonRef = useRef<HTMLButtonElement>(null);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);
  
  const { unreadCount: unreadNoties } = useNoties();
  const { totalUnreadCount: unreadMessages, openConversationWith } = useMessages();

  // Handle ?dm= query param to open messages
  useEffect(() => {
    const dm = searchParams?.get('dm');
    if (!dm) return;

    void (async () => {
      setShowMessagesModal(true);
      setShowNotiesModal(false);
      await openConversationWith(dm);

      const next = new URLSearchParams(searchParams.toString());
      next.delete('dm');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    })();
  }, [openConversationWith, pathname, router, searchParams]);

  // Keyboard handler for closing modals
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowNotiesModal(false);
      setShowMessagesModal(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-1" onKeyDown={handleKeyDown}>
      {/* Messages Icon */}
      <div className="relative z-[70]">
        <button
          ref={messagesButtonRef}
          onClick={() => {
            setShowMessagesModal(!showMessagesModal);
            setShowNotiesModal(false);
          }}
          className={`group relative p-2 md:p-3 lg:p-4 transition-all duration-200 hover:scale-110 ${
            showMessagesModal ? 'scale-110' : 'opacity-70 hover:opacity-100'
          }`}
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
          aria-expanded={showMessagesModal}
          aria-haspopup="dialog"
          title="Messages"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
          {unreadMessages > 0 && (
            <span className="notification-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
          )}
          
          {/* Hover tooltip */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
            Messages
          </span>
        </button>
        
        <MessagesModal
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          anchorRef={messagesButtonRef}
        />
      </div>

      {/* Noties Icon */}
      <div className="relative z-[70]">
        <button
          ref={notiesButtonRef}
          onClick={() => {
            setShowNotiesModal(!showNotiesModal);
            setShowMessagesModal(false);
          }}
          className={`group relative p-2 md:p-3 lg:p-4 transition-all duration-200 hover:scale-110 ${
            showNotiesModal ? 'scale-110' : 'opacity-70 hover:opacity-100'
          }`}
          aria-label={`Noties${unreadNoties > 0 ? `, ${unreadNoties} unread` : ''}`}
          aria-expanded={showNotiesModal}
          aria-haspopup="dialog"
          title="Noties"
        >
          <Bell className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-amber-500 dark:text-amber-400" strokeWidth={2} />
          {unreadNoties > 0 && (
            <span className="notification-badge">{unreadNoties > 99 ? '99+' : unreadNoties}</span>
          )}
          
          {/* Hover tooltip */}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
            Noties
          </span>
        </button>
        
        <NotiesModal
          isOpen={showNotiesModal}
          onClose={() => setShowNotiesModal(false)}
          anchorRef={notiesButtonRef}
        />
      </div>
    </div>
  );
}

export default function GlobalHeader() {
  const pathname = usePathname();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const supabase = createClient();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOwnerStatus();
  }, []);

  const checkOwnerStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const ownerStatus = OWNER_IDS.includes(user.id) || 
          OWNER_EMAILS.includes(user.email?.toLowerCase() || '');
        setIsOwner(ownerStatus);
      } else {
        setIsLoggedIn(false);
        setIsOwner(false);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkOwnerStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('scroll-lock');
      return () => {
        document.body.classList.remove('scroll-lock');
      };
    }
  }, [mobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      // Small delay to prevent immediate close on the same click that opened it
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  // Don't show header on certain pages
  const hideHeader = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding';
  
  if (hideHeader) {
    return null;
  }

  const canOpenLive = LIVE_LAUNCH_ENABLED || isOwner;

  return (
    <>
      {/* Skip Link for accessibility */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header 
        className="sticky top-0 z-[60] bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm"
        role="banner"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Left section: Logo + Nav */}
            <div className="flex items-center gap-0">
              {/* Logo/Brand */}
              <Link 
                href="/" 
                className="flex items-center gap-2 hover:opacity-90 transition-opacity focus-visible-ring rounded-lg"
                aria-label="MyLiveLinks Home"
              >
                <SmartBrandLogo size={110} />
              </Link>
              
              {/* Trophy - Leaderboard Button - Right next to logo */}
              <button
                onClick={() => setShowLeaderboard(true)}
                className="-ml-2 p-2 rounded-lg hover:bg-muted/50 transition-colors focus-visible-ring"
                aria-label="View Leaderboards"
              >
                <Trophy className="w-7 h-7 text-amber-500" />
              </button>

              {/* Navigation - Desktop */}
              <nav 
                className="hidden md:flex items-center gap-1" 
                role="navigation" 
                aria-label="Main navigation"
              >
                {MAIN_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isRouteActive(pathname, item.href, { 
                      matchType: item.matchType,
                      excludePaths: item.excludePaths,
                    })}
                    disabled={item.requiresLive && !canOpenLive}
                  />
                ))}
              </nav>
            </div>

            {/* Right section: Actions + User */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Messages & Noties Icons - Only show when logged in and on desktop */}
              {isLoggedIn && (
                <div className="hidden md:flex">
                  <HeaderIcons />
                </div>
              )}

              {/* Owner Panel Quick Access */}
              {isOwner && (
                <Link
                  href="/owner"
                  className="group relative p-2 md:p-3 lg:p-4 transition-all duration-200 hover:scale-110"
                  title="Owner Panel"
                >
                  <Crown className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-violet-500 dark:text-violet-400" strokeWidth={2} />
                  
                  {/* Hover tooltip */}
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
                    Owner Panel
                  </span>
                </Link>
              )}

              {/* User Menu */}
              <UserMenu />

              {/* Mobile Menu Toggle */}
              <IconButton
                className="md:hidden"
                variant="ghost"
                size="md"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </IconButton>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in z-[64]" 
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Menu Container */}
            <div 
              ref={mobileMenuRef}
              id="mobile-menu"
              className="md:hidden fixed top-16 left-0 right-0 bg-background border-b border-border shadow-xl animate-slide-down z-[65] max-h-[calc(100vh-4rem)] overflow-y-auto"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
                {MAIN_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isRouteActive(pathname, item.href, {
                      matchType: item.matchType,
                      excludePaths: item.excludePaths,
                    })}
                    disabled={item.requiresLive && !canOpenLive}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                
                {/* Owner link in mobile menu */}
                {isOwner && (
                  <Link
                    href="/owner"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Owner Panel
                  </Link>
                )}
              </nav>
            </div>
          </>
        )}
      </header>
      
      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </>
  );
}
