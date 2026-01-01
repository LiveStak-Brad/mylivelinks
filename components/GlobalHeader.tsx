'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy, Tv, Shuffle, Eye, Gift as GiftIcon, Sparkles, Volume2, Focus, Settings, Rss, Home, Video, Link2 } from 'lucide-react';
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
      className={`group relative p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 transition-all duration-200 hover:scale-110 ${
        isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'
      }`}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
    >
      {Icon && <Icon className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 ${getIconColor(item.label)}`} strokeWidth={2} />}
      
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
    <div className="flex items-center gap-0.5 sm:gap-1" onKeyDown={handleKeyDown}>
      {/* Messages Icon */}
      <div className="relative z-[70]">
        <button
          ref={messagesButtonRef}
          onClick={() => {
            setShowMessagesModal(!showMessagesModal);
            setShowNotiesModal(false);
          }}
          className={`group relative p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 transition-all duration-200 hover:scale-110 ${
            showMessagesModal ? 'scale-110' : 'opacity-70 hover:opacity-100'
          }`}
          aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ''}`}
          aria-expanded={showMessagesModal}
          aria-haspopup="dialog"
          title="Messages"
        >
          <MessageCircle className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
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
          className={`group relative p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 transition-all duration-200 hover:scale-110 ${
            showNotiesModal ? 'scale-110' : 'opacity-70 hover:opacity-100'
          }`}
          aria-label={`Noties${unreadNoties > 0 ? `, ${unreadNoties} unread` : ''}`}
          aria-expanded={showNotiesModal}
          aria-haspopup="dialog"
          title="Noties"
        >
          <Bell className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-amber-500 dark:text-amber-400" strokeWidth={2} />
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
  const isLiveRoom = pathname === '/live'; // Check if we're on the live room page

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
        {/* FAR LEFT - 4 nav icons (ONLY when on live room) - Fixed to viewport edge */}
        {isLiveRoom && (
          <div className="fixed left-0 top-0 flex items-center gap-0.5 sm:gap-1 md:gap-1 z-[70] h-16 lg:h-[72px] pl-1 sm:pl-2 md:pl-4 lg:pl-6 xl:pl-8 2xl:pl-[60px]">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100"
              aria-label="View Leaderboards"
              title="Leaderboards"
            >
              <Trophy className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-amber-500" strokeWidth={2} />
            </button>
            <Link href="/liveTV" className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100" title="Rooms">
              <Tv className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-pink-500" strokeWidth={2} />
            </Link>
            <Link href="/" className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100" title="Home">
              <Home className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-purple-500" strokeWidth={2} />
            </Link>
            <Link href="/feed" className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100" title="Feed">
              <Rss className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-blue-500" strokeWidth={2} />
            </Link>
          </div>
        )}

        {/* FAR LEFT - Non-live room nav (Trophy, Rooms, Link, Nav) - Fixed to viewport edge */}
        {!isLiveRoom && (
          <div className="fixed left-0 top-0 flex items-center gap-0.5 sm:gap-1 md:gap-1 z-[70] h-16 lg:h-[72px] pl-1 sm:pl-2 md:pl-4 lg:pl-6 xl:pl-8 2xl:pl-[60px]">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100"
              aria-label="View Leaderboards"
              title="Leaderboards"
            >
              <Trophy className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-amber-500" strokeWidth={2} />
            </button>
            <Link href="/liveTV" className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100" title="Rooms">
              <Tv className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-pink-500" strokeWidth={2} />
            </Link>
            
            {/* Link or Nah Icon with gradient - Upright chainlink like app icon */}
            <Link 
              href="/link" 
              className="group relative p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 transition-all duration-200 hover:scale-110 opacity-70 hover:opacity-100"
              title="Link or Nah"
            >
              <div className="relative">
                <svg 
                  className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="link-gradient-upright" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                      <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                    </linearGradient>
                  </defs>
                  {/* Top link - rounded rectangle */}
                  <rect 
                    x="7" 
                    y="3" 
                    width="10" 
                    height="7" 
                    rx="3.5" 
                    stroke="url(#link-gradient-upright)" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                  {/* Bottom link - rounded rectangle */}
                  <rect 
                    x="7" 
                    y="14" 
                    width="10" 
                    height="7" 
                    rx="3.5" 
                    stroke="url(#link-gradient-upright)" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                  {/* Connecting vertical bars */}
                  <line 
                    x1="9" 
                    y1="10" 
                    x2="9" 
                    y2="14" 
                    stroke="url(#link-gradient-upright)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  <line 
                    x1="15" 
                    y1="10" 
                    x2="15" 
                    y2="14" 
                    stroke="url(#link-gradient-upright)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              
              {/* Hover tooltip */}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[100] hidden md:block">
                Link or Nah
              </span>
            </Link>
            
            {/* Navigation items - Hide on mobile */}
            <nav className="hidden md:flex items-center gap-1 ml-2" role="navigation" aria-label="Main navigation">
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
        )}

        {/* FAR RIGHT - User menu + icons - Fixed to viewport edge */}
        <div className="fixed right-0 top-0 flex items-center gap-0.5 sm:gap-1 md:gap-1 z-[70] h-16 lg:h-[72px] pr-1 sm:pr-2 md:pr-4 lg:pr-6 xl:pr-8 2xl:pr-[60px]">
          {/* Camera/Go Live button - only on live room */}
          {isLiveRoom && isLoggedIn && (
            <button
              onClick={() => {
                // Trigger the hidden GoLiveButton in LiveRoom
                const goLiveContainer = document.getElementById('liveroom-go-live-button');
                const goLiveBtn = goLiveContainer?.querySelector('button');
                if (goLiveBtn) {
                  goLiveBtn.click();
                } else {
                  console.error('GoLiveButton not found in LiveRoom');
                }
              }}
              className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100"
              title="Go Live"
              aria-label="Go Live in Room"
            >
              <Video className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-red-500 dark:text-red-400" strokeWidth={2} />
            </button>
          )}
          
          {/* Messages & Noties - Hide on mobile */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-0.5 sm:gap-1">
              <HeaderIcons />
            </div>
          )}

          {/* Settings (Options) - only needed on live room */}
          {isLiveRoom && <OptionsMenu />}

          {/* Owner Panel */}
          {isOwner && (
            <Link
              href="/owner"
              className="p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 hover:scale-110 transition opacity-70 hover:opacity-100"
              title="Owner Panel"
            >
              <Crown className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 xl:w-13 xl:h-13 2xl:w-14 2xl:h-14 text-violet-500 dark:text-violet-400" strokeWidth={2} />
            </Link>
          )}

          {/* User Menu (Photo) */}
          <UserMenu />
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

            {/* LEFT MIDDLE - Sort buttons (ONLY on live room page) - Fixed distance from left edge */}
            {isLiveRoom && (
              <div className="hidden md:flex absolute items-center gap-0.5 md:gap-1 left-[120px] md:left-[160px] lg:left-[200px] xl:left-[260px] 2xl:left-[340px]">
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Randomize">
                  <Shuffle className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-purple-500" strokeWidth={2} />
                </button>
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Most Viewed">
                  <Eye className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-cyan-500" strokeWidth={2} />
                </button>
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Most Gifted">
                  <GiftIcon className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-pink-500" strokeWidth={2} />
                </button>
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Newest">
                  <Sparkles className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-yellow-500" strokeWidth={2} />
                </button>
              </div>
            )}

            {/* RIGHT MIDDLE - Live controls (ONLY on live room page) - Fixed distance from right edge, closer to center */}
            {isLiveRoom && (
              <div className="hidden md:flex absolute items-center gap-0.5 md:gap-1 right-[200px] md:right-[240px] lg:right-[280px] xl:right-[340px] 2xl:right-[420px]">
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Unmute All">
                  <Volume2 className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-green-500" strokeWidth={2} />
                </button>
                <button className="p-0.5 md:p-1 lg:p-1.5 xl:p-2 hover:scale-110 transition opacity-70 hover:opacity-100" title="Focus Mode">
                  <Focus className="w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 text-indigo-500" strokeWidth={2} />
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
