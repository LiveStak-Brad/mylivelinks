'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Home,
  Rss,
  Flame,
  Tv,
  Users,
  Trophy,
  Sparkles,
  Link2,
  Search,
  Shield,
  FileText,
  Lock,
  X,
  type LucideIcon,
} from 'lucide-react';

import { MenuItemRow } from './MenuItemRow';

type AppMenuItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  action?: 'search';
};

const APP_MENU_ITEMS: AppMenuItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Feed', href: '/feed', icon: Rss },
  { label: 'Trending', href: '/trending', icon: Flame },
  { label: 'Live TV', href: '/liveTV', icon: Tv },
  { label: 'Teams', href: '/teams', icon: Users },
  { label: 'Leaderboards', href: '/leaderboards', icon: Trophy },
  { label: 'Gifter Levels', href: '/gifter-levels', icon: Sparkles },
  { label: 'Link', href: '/link', icon: Link2 },
  { label: 'Search', icon: Search, action: 'search' },
  { label: 'Help & Safety', href: '/policies', icon: Shield },
  { label: 'Terms', href: '/policies/terms-of-service', icon: FileText },
  { label: 'Privacy', href: '/policies/privacy-policy', icon: Lock },
];

export default function AppMenuDrawer({
  isOpen,
  onClose,
  onOpenSearch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 20000 }}>
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ zIndex: 19900 }}
      />

      <div
        className="absolute left-0 top-0 h-full w-[85vw] max-w-[320px] bg-background border-r border-border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="App menu"
        style={{ zIndex: 20000 }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Menu</div>
          <button
            type="button"
            aria-label="Close"
            className="mobile-touch-target rounded-lg hover:bg-muted transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="p-2">
          <div className="flex flex-col">
            {APP_MENU_ITEMS.map((item) => {
              const row = <MenuItemRow icon={item.icon} label={item.label} />;

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} onClick={onClose}>
                    {row}
                  </Link>
                );
              }

              if (item.action === 'search') {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="text-left"
                    onClick={() => {
                      onOpenSearch();
                      onClose();
                    }}
                  >
                    {row}
                  </button>
                );
              }

              return null;
            })}
          </div>
        </nav>
      </div>
    </div>,
    document.body
  );
}
