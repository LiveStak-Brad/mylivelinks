'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Wallet, 
  BarChart3, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  ExternalLink,
  Film 
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import ThemeToggle from './ThemeToggle';

interface UserMenuProps {
  className?: string;
}

// Menu item component for consistent styling
function MenuItem({ 
  href, 
  onClick, 
  icon: Icon, 
  iconColor,
  label, 
  external = false,
  destructive = false,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  label: string;
  external?: boolean;
  destructive?: boolean;
}) {
  const baseStyles = `
    w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg
    transition-all duration-150 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
    ${destructive 
      ? 'text-destructive hover:bg-destructive/10' 
      : 'text-foreground hover:bg-muted'
    }
  `;

  const content = (
    <>
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor || (destructive ? 'text-destructive' : 'text-muted-foreground')}`} />
      <span className="flex-1 text-left">{label}</span>
      {external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseStyles} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseStyles} onClick={onClick}>
      {content}
    </button>
  );
}

// Divider component
function MenuDivider() {
  return <div className="my-1 border-t border-border" />;
}

export default function UserMenu({ className = '' }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Handle click outside
  useEffect(() => {
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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setShowMenu(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const firstItem = menuRef.current?.querySelector('a, button') as HTMLElement;
        firstItem?.focus();
        break;
    }
  }, []);

  const checkUser = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/login');
  };

  const closeMenu = () => setShowMenu(false);

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-9 h-9 rounded-full bg-muted animate-pulse ${className}`} />
    );
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <Link
        href="/login"
        className={`
          inline-flex items-center gap-2 px-4 py-2
          bg-gradient-to-r from-primary to-accent text-white
          text-sm font-semibold rounded-xl
          hover:opacity-90 active:scale-[0.98]
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          shadow-md hover:shadow-lg
          ${className}
        `}
      >
        Login
      </Link>
    );
  }

  const displayName = profile?.display_name || profile?.username || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className={`relative ${className}`} ref={menuRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`
          flex items-center gap-2 p-1 pr-2 rounded-full
          transition-all duration-200
          hover:bg-muted/70
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${showMenu ? 'bg-muted/70' : ''}
        `}
        aria-expanded={showMenu}
        aria-haspopup="menu"
        aria-label={`User menu for ${displayName}`}
      >
        {/* Avatar */}
        <Image
          src={getAvatarUrl(profile?.avatar_url)}
          alt={displayName}
          width={36}
          height={36}
          className="w-8 h-8 lg:w-9 lg:h-9 rounded-full object-cover ring-2 ring-primary/20"
        />
        
        {/* Chevron indicator */}
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in z-[1200]"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Info Header */}
          {profile && (
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-3">
                <Image
                  src={getAvatarUrl(profile.avatar_url)}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{profile.username}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Menu Items */}
          <div className="p-2">
            {/* Profile Actions */}
            <MenuItem
              href={`/${profile?.username || 'settings/profile'}`}
              onClick={closeMenu}
              icon={User}
              iconColor="text-blue-500"
              label="View Profile"
            />
            
            <MenuItem
              href="/settings/profile"
              onClick={closeMenu}
              icon={Settings}
              iconColor="text-gray-500"
              label="Edit Profile"
            />
            
            <MenuDivider />
            
            {/* Account Actions */}
            <MenuItem
              href="/wallet"
              onClick={closeMenu}
              icon={Wallet}
              iconColor="text-amber-500"
              label="Wallet"
            />
            
            <MenuItem
              href="/me/analytics"
              onClick={closeMenu}
              icon={BarChart3}
              iconColor="text-purple-500"
              label="Analytics"
            />
            
            <MenuItem
              href="/composer"
              onClick={closeMenu}
              icon={Film}
              iconColor="text-pink-500"
              label="Composer"
            />
            
            <MenuDivider />
            
            {/* Theme Toggle */}
            <ThemeToggle variant="menu-item" />
            
            <MenuDivider />
            
            {/* Logout */}
            <MenuItem
              onClick={handleLogout}
              icon={LogOut}
              label="Logout"
              destructive
            />
          </div>
        </div>
      )}
    </div>
  );
}
