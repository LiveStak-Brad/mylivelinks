'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import SmartBrandLogo from './SmartBrandLogo';

export default function GlobalHeader() {
  const pathname = usePathname();
  
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
            <div className="relative group">
              <span
                className="text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
              >
                Live Streams
              </span>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Coming Soon! 🚀
              </div>
            </div>
          </nav>

          {/* User Menu */}
          <UserMenu />
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
          <div className="relative group">
            <span
              className="text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed whitespace-nowrap"
            >
              Live Streams
            </span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Coming Soon! 🚀
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

