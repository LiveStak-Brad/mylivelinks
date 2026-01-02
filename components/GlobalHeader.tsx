'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy, Shuffle, Eye, Gift as GiftIcon, Sparkles, Volume2, Focus, Settings, Rss, Home, Video, Tv, Users, Search, Camera } from 'lucide-react';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';
import LeaderboardModal from './LeaderboardModal';
import OptionsMenu from './OptionsMenu';
import { createClient } from '@/lib/supabase';
import { LIVE_LAUNCH_ENABLED } from '@/lib/livekit-constants';
import { isRouteActive, MAIN_NAV_ITEMS, type NavItem } from '@/lib/navigation';
import { useNoties } from './noties';
import { useMessages } from './messages';
import NotiesModal from './noties/NotiesModal';
import MessagesModal from './messages/MessagesModal';

const HEADER_ICON_CLASS = 'global-header-icon';

// Owner credentials
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'];
const OWNER_EMAILS = ['wcba.mo@gmail.com', 'brad@mylivelinks.com'];

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
      className={`group relative nav-icon-button ${
        isActive ? 'nav-icon-button-active' : ''
      }`}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
    >
      {Icon && <Icon className={`${HEADER_ICON_CLASS} ${getIconColor(item.label)}`} strokeWidth={2} />}
      
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

function LinkOrNahIconLink({ className = '' }: { className?: string }) {
  const gradientId = useId();
  return (
    <Link 
      href="/link" 
      className={`group relative nav-icon-button ${className}`.trim()}
      title="Link or Nah"
    >
      <div className="relative">
        <svg 
          className={HEADER_ICON_CLASS} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke={`url(#${gradientId})`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(37, 99, 235)" />
              <stop offset="100%" stopColor="rgb(168, 85, 247)" />
            </linearGradient>
          </defs>
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
          />
        </svg>
      </div>
      
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
        Link or Nah
      </span>
    </Link>
  );
}

// Header icons component that uses the contexts
function HeaderIcons() {
  const [showNotiesModal, setShowNotiesModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const rawPathname = usePathname();
  const pathname = rawPathname ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams ?? new URLSearchParams();
  
  const notiesButtonRef = useRef<HTMLButtonElement>(null);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);
  
  const { unreadCount: unreadNoties } = useNoties();
  const { totalUnreadCount: unreadMessages, openConversationWith } = useMessages();

  // Handle ?dm= query param to open messages
  useEffect(() => {
    const dm = query.get('dm');
    if (!dm) return;

    void (async () => {
      setShowMessagesModal(true);
      setShowNotiesModal(false);
      await openConversationWith(dm);

      const next = new URLSearchParams(query.toString());
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
    <div className="header-icon-cluster flex items-center" onKeyDown={handleKeyDown}>
      {/* Messages Icon */}
      <div className="relative z-[70]">
        <button
          ref={messagesButtonRef}
          onClick={() => {
            setShowMessagesModal(!showMessagesModal);
            setShowNotiesModal(false);
          }}
          className={`group relative nav-icon-button ${showMessagesModal ? 'nav-icon-button-active' : ''}`}
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
          aria-expanded={showMessagesModal}
          aria-haspopup="dialog"
          title="Messages"
        >
          <MessageCircle className={`${HEADER_ICON_CLASS} text-emerald-500 dark:text-emerald-400`} strokeWidth={2} />
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
          className={`group relative nav-icon-button ${showNotiesModal ? 'nav-icon-button-active' : ''}`}
          aria-label={`Noties${unreadNoties > 0 ? `, ${unreadNoties} unread` : ''}`}
          aria-expanded={showNotiesModal}
          aria-haspopup="dialog"
          title="Noties"
        >
          <Bell className={`${HEADER_ICON_CLASS} text-amber-500 dark:text-amber-400`} strokeWidth={2} />
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
  const rawPathname = usePathname();
  const pathname = rawPathname ?? '';
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const supabase = createClient();

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
  
  // Don't show header on certain pages
  const hideHeader = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding';
  
  if (hideHeader) {
    return null;
  }

  const canOpenLive = LIVE_LAUNCH_ENABLED || isOwner;
  const isLiveRoom = pathname === '/live' || pathname?.startsWith('/room/'); // Check if we're on a live room page

  const handleTeamsShortcut = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // If already on teams pages, just scroll to top
    if (pathname === '/teams' || pathname.startsWith('/teams/')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new Event('teams:focusSearch'));
      return;
    }

    // Check if teams onboarding is completed
    const onboardingCompleted = localStorage.getItem('mylivelinks_teams_onboarding_completed') === 'true';
    
    if (!onboardingCompleted) {
      // First time - route to setup
      router.push('/teams/setup');
    } else {
      // Onboarding done - route to main teams page
      router.push('/teams');
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.dispatchEvent(new Event('teams:focusSearch'));
      }, 250);
    }
  }, [pathname, router]);

  const handleSoloGoLive = useCallback(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    router.push('/live/host');
  }, [isLoggedIn, router]);

  return (
    <>
      {/* Skip Link for accessibility */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header 
        className="global-header-bar sticky top-0 z-[60] bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm"
        role="banner"
      >
        {/* FAR LEFT - 4 nav icons (ONLY when on live room) - Fixed to viewport edge */}
        {isLiveRoom && (
          <div className="fixed left-0 top-0 flex items-center header-icon-cluster z-[70] h-16 lg:h-[72px] pl-1 sm:pl-2 md:pl-4 lg:pl-6 xl:pl-8 2xl:pl-[60px]">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="nav-icon-button"
              aria-label="View Leaderboards"
              title="Leaderboards"
            >
              <Trophy className={`${HEADER_ICON_CLASS} text-amber-500`} strokeWidth={2} />
            </button>
            <button
              onClick={handleTeamsShortcut}
              className="nav-icon-button"
              aria-label="Teams"
              title="Teams"
              type="button"
            >
              <Users className={`${HEADER_ICON_CLASS} text-cyan-500`} strokeWidth={2} />
            </button>
            <Link href="/" className="nav-icon-button" title="Home">
              <Home className={`${HEADER_ICON_CLASS} text-purple-500`} strokeWidth={2} />
            </Link>
            <Link href="/feed" className="nav-icon-button" title="Feed">
              <Rss className={`${HEADER_ICON_CLASS} text-blue-500`} strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* FAR LEFT - Non-live room nav */}
        {!isLiveRoom && (
          <>
            {/* Desktop: Leaderboards, Home, Feed, LiveTV, Link or Nah, Teams */}
            <div className="fixed left-0 top-0 hidden lg:flex items-center header-icon-cluster z-[70] h-16 lg:h-[72px] pl-1 sm:pl-2 md:pl-4 lg:pl-6 xl:pl-8 2xl:pl-[60px]">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="nav-icon-button"
                aria-label="View Leaderboards"
                title="Leaderboards"
              >
                <Trophy className={`${HEADER_ICON_CLASS} text-amber-500`} strokeWidth={2} />
              </button>
              <Link
                href="/"
                className="nav-icon-button"
                title="Home"
              >
                <Home className={`${HEADER_ICON_CLASS} text-purple-500`} strokeWidth={2} />
              </Link>
              <Link
                href="/feed"
                className="nav-icon-button"
                title="Feed"
              >
                <Rss className={`${HEADER_ICON_CLASS} text-blue-500`} strokeWidth={2} />
              </Link>
              <Link
                href="/liveTV"
                className="nav-icon-button"
                title="LiveTV"
              >
                <Tv className={`${HEADER_ICON_CLASS} text-rose-500`} strokeWidth={2} />
              </Link>
              <LinkOrNahIconLink />
              <button
                onClick={handleTeamsShortcut}
                className="nav-icon-button"
                aria-label="Teams"
                title="Teams"
                type="button"
              >
                <Users className={`${HEADER_ICON_CLASS} text-cyan-500`} strokeWidth={2} />
              </button>
            </div>

            {/* Tablet & below: Legacy layout */}
            <div className="fixed left-0 top-0 flex lg:hidden items-center header-icon-cluster z-[70] h-16 lg:h-[72px] pl-1 sm:pl-2 md:pl-4 lg:pl-6 xl:pl-8 2xl:pl-[60px]">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="nav-icon-button"
                aria-label="View Leaderboards"
                title="Leaderboards"
              >
                <Trophy className={`${HEADER_ICON_CLASS} text-amber-500`} strokeWidth={2} />
              </button>
              <button
                onClick={handleTeamsShortcut}
                className="nav-icon-button"
                aria-label="Teams"
                title="Teams"
                type="button"
              >
                <Users className={`${HEADER_ICON_CLASS} text-cyan-500`} strokeWidth={2} />
              </button>

              <LinkOrNahIconLink />
              
              <nav className="hidden md:flex header-icon-cluster ml-2" role="navigation" aria-label="Main navigation">
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
          </>
        )}

        {/* FAR RIGHT - User menu + icons - Fixed to viewport edge */}
        <div className="fixed right-0 top-0 z-[70] h-16 lg:h-[72px] pr-1 sm:pr-2 md:pr-4 lg:pr-6 xl:pr-8 2xl:pr-[60px]">
          <div className="flex items-center header-icon-cluster justify-end h-full">
            {isLiveRoom ? (
              <>
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      const goLiveContainer = document.getElementById('liveroom-go-live-button');
                      const goLiveBtn = goLiveContainer?.querySelector('button');
                      if (goLiveBtn) {
                        goLiveBtn.click();
                      } else {
                        console.error('GoLiveButton not found in LiveRoom');
                      }
                    }}
                    className="nav-icon-button"
                    title="Go Live"
                    aria-label="Go Live in Room"
                  >
                    <Video className={`${HEADER_ICON_CLASS} text-red-500 dark:text-red-400`} strokeWidth={2} />
                  </button>
                )}

                {isLoggedIn && (
                  <div className="hidden md:flex header-icon-cluster">
                    <HeaderIcons />
                  </div>
                )}

                {isLiveRoom && <OptionsMenu />}

                <Link
                  href="/search"
                  className="group relative nav-icon-button"
                  title="Search"
                >
                  <Search className={`${HEADER_ICON_CLASS} text-sky-500 dark:text-sky-400`} strokeWidth={2} />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
                    Search
                  </span>
                </Link>

                {isOwner && (
                  <Link
                    href="/owner"
                    className="nav-icon-button"
                    title="Owner Panel"
                  >
                    <Crown className={`${HEADER_ICON_CLASS} text-violet-500 dark:text-violet-400`} strokeWidth={2} />
                  </Link>
                )}

                <UserMenu className="ml-0.5 sm:ml-1 header-profile-trigger" />
              </>
            ) : (
              <>
                {canOpenLive && isLoggedIn && (
                  <div className="hidden lg:block">
                    <button
                      onClick={handleSoloGoLive}
                      className="nav-icon-button"
                      title="Go Live (Solo)"
                      aria-label="Go Live (Solo)"
                    >
                      <Camera className={`${HEADER_ICON_CLASS} text-red-500 dark:text-red-400`} strokeWidth={2} />
                    </button>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="hidden md:flex header-icon-cluster">
                    <HeaderIcons />
                  </div>
                )}

                <Link
                  href="/search"
                  className="group relative nav-icon-button"
                  title="Search"
                >
                  <Search className={`${HEADER_ICON_CLASS} text-sky-500 dark:text-sky-400`} strokeWidth={2} />
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
                    Search
                  </span>
                </Link>

                {isOwner && (
                  <Link
                    href="/owner"
                    className="nav-icon-button"
                    title="Owner Panel"
                  >
                    <Crown className={`${HEADER_ICON_CLASS} text-violet-500 dark:text-violet-400`} strokeWidth={2} />
                  </Link>
                )}

                <UserMenu className="ml-0.5 sm:ml-1 header-profile-trigger" />
              </>
            )}
          </div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className={`flex items-center h-16 lg:h-[72px] relative ${isLiveRoom ? 'justify-center' : 'justify-center'}`}>
            
            {/* Center Logo (ALL pages) */}
            <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <Link 
                href="/" 
                className="flex items-center pointer-events-auto hover:opacity-90 transition-opacity"
                aria-label="MyLiveLinks Home"
              >
                <SmartBrandLogo size={120} />
              </Link>
            </div>

            {/* LEFT MIDDLE - Sort buttons (ONLY on live room page) - Close to logo */}
            {isLiveRoom && (
              <div className="hidden md:flex absolute items-center header-icon-cluster header-icon-cluster-tight left-[50%] -translate-x-[200px] md:-translate-x-[240px] lg:-translate-x-[280px] xl:-translate-x-[340px] 2xl:-translate-x-[420px]">
                <button className="nav-icon-button nav-icon-button-compact" title="Randomize">
                  <Shuffle className={`${HEADER_ICON_CLASS} text-purple-500`} strokeWidth={2} />
                </button>
                <button className="nav-icon-button nav-icon-button-compact" title="Most Viewed">
                  <Eye className={`${HEADER_ICON_CLASS} text-cyan-500`} strokeWidth={2} />
                </button>
                <button className="nav-icon-button nav-icon-button-compact" title="Most Gifted">
                  <GiftIcon className={`${HEADER_ICON_CLASS} text-pink-500`} strokeWidth={2} />
                </button>
                <button className="nav-icon-button nav-icon-button-compact" title="Newest">
                  <Sparkles className={`${HEADER_ICON_CLASS} text-yellow-500`} strokeWidth={2} />
                </button>
              </div>
            )}

            {/* RIGHT MIDDLE - Live controls (ONLY on live room page) - Mirror distance from logo */}
            {isLiveRoom && (
              <div className="hidden md:flex absolute items-center header-icon-cluster header-icon-cluster-tight left-[50%] translate-x-[80px] md:translate-x-[100px] lg:translate-x-[120px] xl:translate-x-[140px] 2xl:translate-x-[180px]">
                <button className="nav-icon-button nav-icon-button-compact" title="Unmute All">
                  <Volume2 className={`${HEADER_ICON_CLASS} text-green-500`} strokeWidth={2} />
                </button>
                <button className="nav-icon-button nav-icon-button-compact" title="Focus Mode">
                  <Focus className={`${HEADER_ICON_CLASS} text-indigo-500`} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </>
  );
}
