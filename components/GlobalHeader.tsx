'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Crown, Bell, MessageCircle, Trophy } from 'lucide-react';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';
import ThemeToggle from './ThemeToggle';
import LeaderboardModal from './LeaderboardModal';
import { createClient } from '@/lib/supabase';
import { LIVE_LAUNCH_ENABLED } from '@/lib/livekit-constants';
import { useNoties } from './noties';
import { useMessages } from './messages';
import NotiesModal from './noties/NotiesModal';
import MessagesModal from './messages/MessagesModal';

// Owner credentials
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
const OWNER_EMAILS = ['wcba.mo@gmail.com'];

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

  return (
    <>
      {/* Messages Icon */}
      <div className="relative">
        <button
          ref={messagesButtonRef}
          onClick={() => {
            setShowMessagesModal(!showMessagesModal);
            setShowNotiesModal(false);
          }}
          className={`relative p-2 rounded-full transition ${
            showMessagesModal
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Messages"
        >
          <MessageCircle className="w-5 h-5" />
          
          {/* Unread Badge */}
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>
        
        <MessagesModal
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          anchorRef={messagesButtonRef}
        />
      </div>

      {/* Noties Icon */}
      <div className="relative">
        <button
          ref={notiesButtonRef}
          onClick={() => {
            setShowNotiesModal(!showNotiesModal);
            setShowMessagesModal(false);
          }}
          className={`relative p-2 rounded-full transition ${
            showNotiesModal
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title="Noties"
        >
          <Bell className="w-5 h-5" />
          
          {/* Unread Badge */}
          {unreadNoties > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadNoties > 99 ? '99+' : unreadNoties}
            </span>
          )}
        </button>
        
        <NotiesModal
          isOpen={showNotiesModal}
          onClose={() => setShowNotiesModal(false)}
          anchorRef={notiesButtonRef}
        />
      </div>
    </>
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

  return (
    <header className="sticky top-0 z-[60] bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand + Trophy */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
              <SmartBrandLogo size={120} />
            </Link>
            
            {/* Trophy - Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="relative p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 group"
              title="Leaderboards"
              aria-label="View Leaderboards"
            >
              <Trophy className="w-5 h-5" />
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </button>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition ${
                pathname === '/'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Home
            </Link>
            {canOpenLive ? (
              <Link
                href="/live"
                className={`text-sm font-medium transition ${
                  pathname === '/live'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Live Streams
              </Link>
            ) : (
              <span
                className="text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                title="Live streaming coming soon"
              >
                Live Streams
              </span>
            )}
          </nav>

          {/* Right side - Theme + Icons + Owner button + User Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <ThemeToggle variant="icon" />
            
            {/* Messages & Noties Icons - Only show when logged in */}
            {isLoggedIn && <HeaderIcons />}

            {/* Owner Panel Quick Access */}
            {isOwner && (
              <Link
                href="/owner"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md ml-1"
                title="Owner Panel"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Owner</span>
              </Link>
            )}

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-4 pb-3 pt-1 overflow-x-auto">
          <Link
            href="/"
            className={`text-sm font-medium whitespace-nowrap transition ${
              pathname === '/'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Home
          </Link>
          {canOpenLive ? (
            <Link
              href="/live"
              className={`text-sm font-medium whitespace-nowrap transition ${
                pathname === '/live'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Live Streams
            </Link>
          ) : (
            <span
              className="text-sm font-medium whitespace-nowrap text-muted-foreground/50 cursor-not-allowed"
              title="Live streaming coming soon"
            >
              Live Streams
            </span>
          )}
        </nav>
      </div>
      
      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </header>
  );
}
