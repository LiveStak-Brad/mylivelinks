'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown } from 'lucide-react';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';
import { createClient } from '@/lib/supabase';

// Owner credentials
const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
const OWNER_EMAILS = ['wcba.mo@gmail.com'];

export default function GlobalHeader() {
  const pathname = usePathname();
  const [isOwner, setIsOwner] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkOwnerStatus();
  }, []);

  const checkOwnerStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ownerStatus = OWNER_IDS.includes(user.id) || 
          OWNER_EMAILS.includes(user.email?.toLowerCase() || '');
        setIsOwner(ownerStatus);
      }
    } catch (error) {
      // Silent fail
    }
  };
  
  // Don't show header on certain pages
  const hideHeader = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding';
  
  if (hideHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand - Larger size */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <SmartBrandLogo size={120} />
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition ${
                pathname === '/'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Home
            </Link>
            <Link
              href="/live"
              className={`text-sm font-medium transition ${
                pathname === '/live'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Live Streams
            </Link>
          </nav>

          {/* Right side - Owner button + User Menu */}
          <div className="flex items-center gap-3">
            {/* Owner Panel Quick Access */}
            {isOwner && (
              <Link
                href="/owner"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
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
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Home
          </Link>
          <Link
            href="/live"
            className={`text-sm font-medium whitespace-nowrap transition ${
              pathname === '/live'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Live Streams
          </Link>
        </nav>
      </div>
    </header>
  );
}
