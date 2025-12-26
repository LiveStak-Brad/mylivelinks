'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy, Menu, X } from 'lucide-react';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';
import ThemeToggle from './ThemeToggle';
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

// Premium nav link component with consistent styling
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
  if (disabled) {
    return (
      <span
        className="nav-link nav-link-disabled"
        title="Coming soon"
        aria-disabled="true"
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {item.label}
      {isActive && <span className="nav-link-indicator" />}
    </Link>
  );
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
        <IconButton
          ref={messagesButtonRef}
          onClick={() => {
            setShowMessagesModal(!showMessagesModal);
            setShowNotiesModal(false);
          }}
          variant={showMessagesModal ? 'primary' : 'ghost'}
          size="md"
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
          aria-expanded={showMessagesModal}
          aria-haspopup="dialog"
        >
          <MessageCircle className="w-5 h-5" />
        </IconButton>
        <NotificationBadge count={unreadMessages} />
        <span className="icon-label">Messages</span>
        
        <MessagesModal
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          anchorRef={messagesButtonRef}
        />
      </div>

      {/* Noties Icon */}
      <div className="relative z-[70]">
        <IconButton
          ref={notiesButtonRef}
          onClick={() => {
            setShowNotiesModal(!showNotiesModal);
            setShowMessagesModal(false);
          }}
          variant={showNotiesModal ? 'primary' : 'ghost'}
          size="md"
          aria-label={`Noties${unreadNoties > 0 ? `, ${unreadNoties} unread` : ''}`}
          aria-expanded={showNotiesModal}
          aria-haspopup="dialog"
        >
          <Bell className="w-5 h-5" />
        </IconButton>
        <NotificationBadge count={unreadNoties} />
        <span className="icon-label">Noties</span>
        
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
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Logo/Brand */}
              <Link 
                href="/" 
                className="flex items-center gap-2 hover:opacity-90 transition-opacity focus-visible-ring rounded-lg"
                aria-label="MyLiveLinks Home"
              >
                <SmartBrandLogo size={110} />
              </Link>
              
              {/* Trophy - Leaderboard Button */}
              <IconButton
                onClick={() => setShowLeaderboard(true)}
                variant="primary"
                size="md"
                aria-label="View Leaderboards"
                className="bg-gradient-to-br from-amber-400 to-yellow-500 text-white hover:from-amber-500 hover:to-yellow-600 shadow-md hover:shadow-lg"
              >
                <Trophy className="w-5 h-5" />
              </IconButton>

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
              {/* Theme Toggle */}
              <ThemeToggle variant="icon" />
              
              {/* Messages & Noties Icons - Only show when logged in */}
              {isLoggedIn && <HeaderIcons />}

              {/* Owner Panel Quick Access */}
              {isOwner && (
                <Link
                  href="/owner"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg focus-visible-ring"
                  title="Owner Panel"
                >
                  <Crown className="w-4 h-4" />
                  <span>Owner</span>
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
