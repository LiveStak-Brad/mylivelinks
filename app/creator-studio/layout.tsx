'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Upload,
  Layers,
  Mic,
  Clapperboard,
  Music,
  Music2,
  Settings,
  AlertTriangle,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/creator-studio', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/creator-studio/content', label: 'Content', icon: Film },
  { href: '/creator-studio/upload', label: 'Upload', icon: Upload },
  { href: '/creator-studio/series', label: 'Series', icon: Layers },
  { href: '/creator-studio/podcasts', label: 'Podcasts', icon: Mic },
  { href: '/creator-studio/movies', label: 'Movies', icon: Clapperboard },
  { href: '/creator-studio/music-videos', label: 'Music Videos', icon: Film },
  { href: '/creator-studio/music', label: 'Music', icon: Music2 },
  { href: '/creator-studio/settings', label: 'Settings', icon: Settings },
];

export default function CreatorStudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Rights Disclaimer Banner - ALWAYS VISIBLE */}
      <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Rights & Content Policy
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You must own or have legal rights to all audio, video, and visual content you upload. 
                Uploading copyrighted material without permission may result in content removal and account suspension.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wide mode: at 2xl+ expands container, below 2xl stays max-w-7xl */}
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 2xl:px-10 py-6">
        <div className="flex flex-col lg:flex-row gap-6 2xl:gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-56 2xl:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h1 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Film className="w-6 h-6 text-primary" />
                Creator Studio
              </h1>
              
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-200
                        ${active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
