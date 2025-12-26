'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { User, Newspaper, Camera } from 'lucide-react';

/* =============================================================================
   PROFILE LAYOUT
   
   Shared layout for user profile pages (/[username], /[username]/feed, /[username]/photos).
   
   Provides:
   - Profile navigation subnav (Profile, Feed, Photos)
   - Consistent spacing and typography
   - Seamless transitions between profile sections
   
   NOTE: GlobalHeader is rendered in root layout.tsx, NOT here.
   This layout only provides the profile-specific subnav.
============================================================================= */

interface ProfileNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

function ProfileNav({ username }: { username: string }) {
  const pathname = usePathname();
  
  const navItems: ProfileNavItem[] = [
    { 
      label: 'Profile', 
      href: `/${username}`, 
      icon: User,
      matchExact: true 
    },
    { 
      label: 'Feed', 
      href: `/${username}/feed`, 
      icon: Newspaper 
    },
    { 
      label: 'Photos', 
      href: `/${username}/photos`, 
      icon: Camera 
    },
  ];
  
  const isActive = (item: ProfileNavItem) => {
    if (item.matchExact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav 
      className="sticky top-16 lg:top-[72px] z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm"
      aria-label="Profile navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 whitespace-nowrap min-w-fit
                  ${active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && (
                  <span 
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const username = params.username as string;

  return (
    <>
      <ProfileNav username={username} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
