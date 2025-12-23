'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

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
      
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, display_name')
        .eq('id', authUser.id)
        .single();
      
      setProfile(profileData);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/live');
  };

  if (!user) {
    return (
      <a
        href="/login"
        className={`px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition whitespace-nowrap text-sm sm:text-base font-medium shadow-md ${className}`}
      >
        Login
      </a>
    );
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name || profile.username || 'User'}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold border-2 border-blue-500">
            {(profile?.display_name || profile?.username || user.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          {profile && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {profile.display_name || profile.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{profile.username}
              </p>
            </div>
          )}
          
          <a
            href={`/${profile?.username || 'settings/profile'}`}
            onClick={() => setShowMenu(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            View Profile
          </a>
          
          <a
            href="/settings/profile"
            onClick={() => setShowMenu(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Edit Profile
          </a>
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}


