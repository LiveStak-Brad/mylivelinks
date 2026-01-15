'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  User as UserIcon,
  Settings,
  Wallet,
  ShoppingBag,
  Bell,
  MessageCircle,
  LogOut,
  Lock,
  ShieldCheck,
  Moon,
  Sun,
  BarChart3,
  Film,
  Radio,
  Gift,
  Link2,
  Users,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';

import { MenuItemRow } from './MenuItemRow';
import { useToast } from '@/components/ui/Toast';

type SheetMenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  intent?: 'default' | 'destructive';
  action?: 'logout' | 'comingSoon';
  badge?: string;
  comingSoonMessage?: string;
};

export default function UserMenuSheet({
  className = '',
}: {
  className?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const close = () => setIsOpen(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url, display_name, is_live')
          .eq('id', authUser.id)
          .maybeSingle();
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load, supabase]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    // Clear the home redirect flag so next login will redirect to watch
    try { sessionStorage.removeItem('mll:home_redirected'); } catch {}
    close();
    router.push('/login');
  }, [router, supabase]);

  const handleComingSoon = useCallback(
    (message: string) => {
      toast({
        title: 'Coming soon',
        description: message,
        variant: 'info',
      });
    },
    [toast]
  );

  const username = profile?.username as string | undefined;
  const displayName = profile?.display_name || username || 'User';
  const profileHref = username ? `/${username}` : '/settings/profile';

  const authedItems: SheetMenuItem[] = [
    { label: 'My Profile', href: profileHref, icon: UserIcon },
    { label: 'Edit Profile', href: '/settings/profile', icon: Settings },
    { label: 'Account Settings', href: '/settings/account', icon: ShieldCheck },
    { label: 'Login & Security', href: '/settings/password', icon: Lock },
    { label: 'Wallet & Coins', href: '/wallet', icon: Wallet },
    { label: 'Referrals', href: '/referrals', icon: Gift },
    { label: 'Notifications', href: '/noties', icon: Bell },
    { label: 'Messages', href: '/messages', icon: MessageCircle },
    { label: 'Link Profile', href: '/link/profile', icon: Link2 },
    { label: 'Link Mutuals', href: '/link/mutuals', icon: Users },
    { label: 'Creator Analytics', href: '/me/analytics', icon: BarChart3 },
    { label: 'Creator Studio', href: '/creator-studio', icon: Film },
    { label: 'Go Live', href: '/live/host', icon: Radio },
    {
      label: 'Purchases',
      icon: ShoppingBag,
      action: 'comingSoon',
      badge: 'Soon',
      comingSoonMessage: 'Purchases history is shipping after the payments revamp.',
    },
    { label: 'Logout', icon: LogOut, action: 'logout', intent: 'destructive' },
  ];

  const guestItems: SheetMenuItem[] = [
    { label: 'Login', href: '/login', icon: UserIcon },
    { label: 'Create Account', href: '/signup', icon: UserPlus },
    { label: 'Help & Safety', href: '/policies', icon: ShieldCheck },
  ];

  const menuItems: SheetMenuItem[] = user ? authedItems : guestItems;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open user menu"
        className={
          'h-12 w-12 rounded-full flex items-center justify-center hover:bg-muted/70 transition-colors ' +
          className
        }
      >
        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ) : user && profile?.avatar_url ? (
          <Image
            src={getAvatarUrl(profile.avatar_url)}
            alt={displayName}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <UserIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0" style={{ zIndex: 20000 }}>
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={close}
            style={{ zIndex: 19900 }}
          />

          <div
            className="absolute right-0 top-0 h-full w-[85vw] max-w-[340px] bg-background border-l border-border shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="User menu"
            style={{ zIndex: 20000 }}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
                {username && <div className="text-xs text-muted-foreground truncate">@{username}</div>}
              </div>
              <button
                type="button"
                aria-label="Close"
                className="mobile-touch-target rounded-lg hover:bg-muted transition-colors"
                onClick={close}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-2 flex-1 overflow-y-auto">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-between w-full px-3 py-3 mb-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                  {resolvedTheme === 'dark' ? (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                  {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <span className="text-xs text-muted-foreground">Tap to switch</span>
              </button>

              <div className="flex flex-col">
                {menuItems.map((item) => {
                  const row = (
                    <MenuItemRow
                      icon={item.icon}
                      label={item.label}
                      intent={item.intent}
                      badge={item.badge}
                      disabled={item.action === 'comingSoon'}
                    />
                  );

                  if (item.href) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={close}
                      >
                        {row}
                      </Link>
                    );
                  }

                  if (item.action === 'logout') {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className="text-left"
                        onClick={handleLogout}
                      >
                        {row}
                      </button>
                    );
                  }

                  if (item.action === 'comingSoon') {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className="text-left"
                        aria-disabled="true"
                        onClick={() => {
                          handleComingSoon(item.comingSoonMessage ?? 'This feature is on the roadmap.');
                          close();
                        }}
                      >
                        {row}
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
