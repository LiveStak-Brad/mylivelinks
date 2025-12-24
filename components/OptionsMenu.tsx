'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface OptionsMenuProps {
  className?: string;
}

export default function OptionsMenu({ className = '' }: OptionsMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showMenu, setShowMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [endingAllStreams, setEndingAllStreams] = useState(false);
  const [muteAllTiles, setMuteAllTiles] = useState(false);
  const [autoplayTiles, setAutoplayTiles] = useState(true);
  const [showPreviewLabels, setShowPreviewLabels] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
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

  const isAllowedAdmin = (
    userId?: string | null,
    email?: string | null,
  ) => {
    const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
    const hardcodedEmails = ['wcba.mo@gmail.com'];
    const idMatch = userId && (envIds.includes(userId) || hardcodedIds.includes(userId));
    const emailMatch = email && (envEmails.includes(email.toLowerCase()) || hardcodedEmails.includes(email.toLowerCase()));
    return !!(idMatch || emailMatch);
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user is admin (you can customize this logic)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email, role')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(
        isAllowedAdmin(
          user.id,
          (profile as any)?.email || user.email || null,
        )
      );
    }
  };

  const handleEndAllStreams = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm('End ALL live streams now? This will stop everyone immediately.');
    if (!confirmed) return;
    setEndingAllStreams(true);
    try {
      const res = await fetch('/api/admin/end-streams', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to end streams');
      }
      alert('All streams have been ended.');
      setShowMenu(false);
    } catch (err: any) {
      console.error('Failed to end all streams', err);
      alert(err.message || 'Failed to end all streams');
    } finally {
      setEndingAllStreams(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition whitespace-nowrap text-sm sm:text-base font-medium shadow-md flex items-center gap-2"
      >
        <span>⚙️</span>
        <span>Options</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-[80vh] overflow-y-auto">
          {/* Account Section */}
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Account</h3>
            <div className="space-y-1">
              <a
                href="/settings/profile"
                onClick={() => setShowMenu(false)}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                My Profile
              </a>
              <a
                href="/settings/profile"
                onClick={() => setShowMenu(false)}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Edit Profile
              </a>
              <button
                onClick={() => {
                  // Navigate to wallet/coins page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Wallet
              </button>
              <button
                onClick={() => {
                  // Navigate to transactions page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                My Gifts / Transactions
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* Room / Live Section */}
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Room / Live</h3>
            <div className="space-y-1">
              <a
                href="/apply"
                onClick={() => setShowMenu(false)}
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Apply for a Room
              </a>
              <button
                onClick={() => {
                  // Navigate to room rules page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Room Rules
              </button>
              <button
                onClick={() => {
                  // Navigate to help/FAQ page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Help / FAQ
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* Preferences Section */}
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Preferences</h3>
            <div className="space-y-1">
              <label className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition">
                <span>Mute All Tiles</span>
                <input
                  type="checkbox"
                  checked={muteAllTiles}
                  onChange={(e) => setMuteAllTiles(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition">
                <span>Autoplay Tiles</span>
                <input
                  type="checkbox"
                  checked={autoplayTiles}
                  onChange={(e) => setAutoplayTiles(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition">
                <span>Show Preview Mode Labels</span>
                <input
                  type="checkbox"
                  checked={showPreviewLabels}
                  onChange={(e) => setShowPreviewLabels(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* Safety Section */}
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Safety</h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  // Open report user modal/page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Report a User
              </button>
              <button
                onClick={() => {
                  // Navigate to blocked users page
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Blocked Users
              </button>
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Admin</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      // Navigate to moderation panel
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    Moderation Panel
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to room applications
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    Approve Room Applications
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to gift/coin management
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                  >
                    Manage Gift Types / Coin Packs
                  </button>
                  <button
                    onClick={handleEndAllStreams}
                    disabled={endingAllStreams}
                    className="w-full text-left px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition disabled:opacity-60"
                  >
                    {endingAllStreams ? 'Ending all streams...' : 'End ALL streams'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

