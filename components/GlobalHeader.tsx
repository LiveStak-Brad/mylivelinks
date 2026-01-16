'use client';

import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy, Video, Menu, Search } from 'lucide-react';
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
import GlobalSearchTrigger from './search/GlobalSearchTrigger';
import AppMenuDrawer from './navigation/AppMenuDrawer';
import UserMenuSheet from './navigation/UserMenuSheet';
import { IconButton } from '@/components/ui/IconButton';

const HEADER_ICON_CLASS = 'global-header-icon';

// Owner credentials - env vars with hardcoded fallback
const FALLBACK_OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'];
const FALLBACK_OWNER_EMAILS = ['wcba.mo@gmail.com', 'brad@mylivelinks.com'];

function getOwnerIds(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_OWNER_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : FALLBACK_OWNER_IDS;
}
function getOwnerEmails(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_OWNER_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : FALLBACK_OWNER_EMAILS;
}

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
    return null;
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group relative nav-icon-button ${isActive ? 'nav-icon-button-active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
    >
      {Icon && <Icon className={`${HEADER_ICON_CLASS} ${getIconColor(item.label)}`} strokeWidth={2} />}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
        {item.label}
      </span>
    </Link>
  );
}

function getIconColor(label: string) {
  switch (label) {
    case 'Home':
      return 'text-purple-500 dark:text-purple-400';
    case 'Feed':
      return 'text-pink-500 dark:text-pink-400';
    case 'Rooms':
      return 'text-pink-500 dark:text-pink-400';
    case 'Teams':
      return 'text-cyan-500 dark:text-cyan-400';
    case 'LiveTV':
      return 'text-rose-500 dark:text-rose-400';
    default:
      return 'text-gray-700 dark:text-white';
  }
}

function LinkOrNahIconLink({
  className = '',
  isActive = false,
}: {
  className?: string;
  isActive?: boolean;
}) {
  const gradientId = useId();
  return (
    <Link
      href="/link"
      className={`group relative nav-icon-button ${isActive ? 'nav-icon-button-active' : ''} ${className}`.trim()}
      title="Link or Nah"
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        <svg className={HEADER_ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke={`url(#${gradientId})`}>
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

function HeaderIcons({
  showMessagesModal,
  setShowMessagesModal,
  showNotiesModal,
  setShowNotiesModal,
  messagesButtonRef,
  notiesButtonRef,
}: {
  showMessagesModal: boolean;
  setShowMessagesModal: (v: boolean) => void;
  showNotiesModal: boolean;
  setShowNotiesModal: (v: boolean) => void;
  messagesButtonRef: React.RefObject<HTMLButtonElement>;
  notiesButtonRef: React.RefObject<HTMLButtonElement>;
}) {
  const { unreadCount: unreadNoties } = useNoties();
  const { totalUnreadCount: unreadMessages } = useMessages();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowNotiesModal(false);
      setShowMessagesModal(false);
    }
  }, [setShowMessagesModal, setShowNotiesModal]);

  return (
    <div className="header-icon-cluster flex items-center" onKeyDown={handleKeyDown}>
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
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
          Messages
        </span>
      </button>

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
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
          Noties
        </span>
      </button>
    </div>
  );
}

export default function GlobalHeader() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showNotiesModal, setShowNotiesModal] = useState(false);
  const messagesButtonRef = useRef<HTMLButtonElement>(null);
  const notiesButtonRef = useRef<HTMLButtonElement>(null);
  const dmHandledRef = useRef<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const { openConversationWith } = useMessages();

  // Handle dm query param - runs once in parent, not in each HeaderIcons instance
  useEffect(() => {
    const query = searchParams ?? new URLSearchParams();
    const dm = query.get('dm');
    if (!dm) return;
    // Prevent double-execution when openConversationWith reference changes
    if (dmHandledRef.current === dm) return;
    dmHandledRef.current = dm;

    void (async () => {
      setShowMessagesModal(true);
      setShowNotiesModal(false);
      await openConversationWith(dm);

      const next = new URLSearchParams(query.toString());
      next.delete('dm');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      // Reset after URL is cleaned so future dm params work
      dmHandledRef.current = null;
    })();
  }, [openConversationWith, pathname, router, searchParams]);

  const checkOwnerStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const ownerStatus =
          getOwnerIds().includes(user.id) || getOwnerEmails().includes(user.email?.toLowerCase() || '');
        setIsOwner(ownerStatus);
      } else {
        setIsLoggedIn(false);
        setIsOwner(false);
      }
    } catch {
      // no-op
    }
  }, [supabase]);

  useEffect(() => {
    void checkOwnerStatus();
  }, [checkOwnerStatus]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkOwnerStatus();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [checkOwnerStatus, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setAppMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hideHeader =
    pathname === '/login' || pathname === '/signup' || pathname === '/onboarding';

  const canOpenLive = LIVE_LAUNCH_ENABLED || isOwner;
  const isLiveRoom = pathname === '/live' || pathname?.startsWith('/room/');
  const linkNavActive = isRouteActive(pathname, '/link', { matchType: 'prefix' });

  const handleTeamsShortcut = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (pathname === '/teams') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new Event('teams:focusSearch'));
      return;
    }
    router.push('/teams');
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new Event('teams:focusSearch'));
    }, 250);
  }, [pathname, router]);

  const handleSoloGoLive = useCallback(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    router.push('/live/host');
  }, [isLoggedIn, router]);

  if (hideHeader) {
    return null;
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header
        className="global-header-bar sticky top-0 z-[60] bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm"
        role="banner"
      >
        <div className="mx-auto flex h-14 sm:h-16 lg:h-[60px] w-full items-center justify-between gap-4 px-3 md:px-6 lg:px-8">
          {/* MOBILE TOP BAR: Hamburger | Search Bar | Messages | Noties | Avatar */}
          <div className="flex w-full items-center gap-2 md:hidden">
            {/* Hamburger menu */}
            <IconButton
              aria-label="Open app menu"
              size="lg"
              variant="ghost"
              onClick={() => setAppMenuOpen(true)}
              className="flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </IconButton>

            {/* Replay (popcorn icon) */}
            <Link
              href="/replay"
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Replay"
            >
              <span className="global-header-icon flex items-center justify-center text-[length:var(--global-header-icon-size)]">🍿</span>
            </Link>

            {/* Search bar - takes remaining space */}
            <div className="flex-1 min-w-0">
              <GlobalSearchTrigger className="w-full" mobileVariant="none" />
            </div>

            {/* Right side: Messages + Noties + Avatar */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isLoggedIn && <HeaderIcons showMessagesModal={showMessagesModal} setShowMessagesModal={setShowMessagesModal} showNotiesModal={showNotiesModal} setShowNotiesModal={setShowNotiesModal} messagesButtonRef={messagesButtonRef} notiesButtonRef={notiesButtonRef} />}
              <UserMenuSheet className="header-profile-trigger flex-shrink-0" />
            </div>
          </div>

          <div className="hidden w-full items-center gap-4 md:flex">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Link href="/home" aria-label="MyLiveLinks Home" className="flex items-center flex-shrink-0">
                <SmartBrandLogo size={140} className="h-8 w-auto" />
              </Link>
              <div className="w-full max-w-xl">
                <GlobalSearchTrigger className="w-full" mobileVariant="none" />
              </div>
            </div>

            <div className="flex flex-none items-center justify-center gap-2 lg:gap-3 px-2">
              {/* Replay (popcorn icon) */}
              <Link
                href="/replay"
                className="group relative nav-icon-button"
                title="Replay"
              >
                <span className="global-header-icon flex items-center justify-center text-[length:var(--global-header-icon-size)]">🍿</span>
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
                  Replay
                </span>
              </Link>

              <nav
                className="flex items-center gap-1 xl:gap-2"
                role="navigation"
                aria-label="Primary navigation"
              >
                {MAIN_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    onClick={item.href === '/teams' ? handleTeamsShortcut : undefined}
                    isActive={isRouteActive(pathname, item.href, {
                      matchType: item.matchType,
                      excludePaths: item.excludePaths,
                    })}
                    disabled={item.requiresLive && !canOpenLive}
                  />
                ))}
                <LinkOrNahIconLink isActive={linkNavActive} />
              </nav>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="nav-icon-button"
                aria-label="View Leaderboards"
                title="Leaderboards"
                type="button"
              >
                <Trophy className={`${HEADER_ICON_CLASS} text-amber-500`} strokeWidth={2} />
              </button>
              {canOpenLive && isLoggedIn && (
                <button
                  onClick={handleSoloGoLive}
                  className="nav-icon-button"
                  title="Go Live (Solo)"
                  aria-label="Go Live (Solo)"
                  type="button"
                >
                  <Video className={`${HEADER_ICON_CLASS} text-red-500 dark:text-red-400`} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex min-w-[220px] flex-1 items-center justify-end gap-2">
              {isLoggedIn && <HeaderIcons showMessagesModal={showMessagesModal} setShowMessagesModal={setShowMessagesModal} showNotiesModal={showNotiesModal} setShowNotiesModal={setShowNotiesModal} messagesButtonRef={messagesButtonRef} notiesButtonRef={notiesButtonRef} />}
              {isOwner && (
                <Link
                  href="/owner"
                  className="nav-icon-button"
                  title="Owner Panel"
                  aria-label="Owner Panel"
                >
                  <Crown className={`${HEADER_ICON_CLASS} text-violet-500 dark:text-violet-400`} strokeWidth={2} />
                </Link>
              )}
              {isLiveRoom && <OptionsMenu />}
              <UserMenu className="header-profile-trigger" />
            </div>
          </div>
        </div>


        <AppMenuDrawer
          isOpen={appMenuOpen}
          onClose={() => setAppMenuOpen(false)}
          onOpenSearch={() => {
            setAppMenuOpen(false);
            router.push('/search');
          }}
          isOwner={isOwner}
        />
      </header>

      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
      <MessagesModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        anchorRef={messagesButtonRef}
      />
      <NotiesModal
        isOpen={showNotiesModal}
        onClose={() => setShowNotiesModal(false)}
        anchorRef={notiesButtonRef}
      />
    </>
  );
}

