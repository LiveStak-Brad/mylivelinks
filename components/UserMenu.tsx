'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

interface UserMenuProps {
  className?: string;
}

export default function UserMenu({ className = '' }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      setUser(authUser);
      
      // Load profile - use maybeSingle() to avoid error if no profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, display_name')
        .eq('id', authUser.id)
        .maybeSingle();
      
      setProfile(profileData);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/login');
  };

  if (!user) {
    return (
      <a
        href="/login"
        className={`px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 lg:px-4 md:py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md md:rounded-lg hover:from-blue-600 hover:to-purple-700 transition whitespace-nowrap text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-medium shadow-md ${className}`}
      >
        Login
      </a>
    );
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 md:gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name || profile.username || 'User'}
            width={40}
            height={40}
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full object-cover border sm:border-2 border-blue-500"
          />
        ) : (
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-[9px] sm:text-xs md:text-sm border sm:border-2 border-blue-500">
            {(profile?.display_name || profile?.username || user.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-xl border border-border py-2 z-50 animate-scale-in">
          {profile && (
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                {profile.display_name || profile.username}
              </p>
              <p className="text-xs text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          )}
          
          <a
            href={`/${profile?.username || 'settings/profile'}`}
            onClick={() => setShowMenu(false)}
            className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition"
          >
            View Profile
          </a>
          
          <a
            href="/settings/profile"
            onClick={() => setShowMenu(false)}
            className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition"
          >
            Edit Profile
          </a>
          
          <div className="border-t border-border my-1" />
          
          <ThemeToggle variant="menu-item" />
          
          <div className="border-t border-border my-1" />
          
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}


