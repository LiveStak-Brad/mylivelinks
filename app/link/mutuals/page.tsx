'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LinkMutual } from '@/lib/link/api';
import * as linkApi from '@/lib/link/api';

export default function MutualsPage() {
  const router = useRouter();
  const [mutuals, setMutuals] = useState<LinkMutual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMutuals();
  }, []);

  const loadMutuals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getMyMutuals();
      setMutuals(data);
    } catch (err) {
      console.error('Failed to load mutuals:', err);
      setError('Failed to load mutuals.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading mutuals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/link')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">My Mutuals</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {mutuals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">No Mutuals Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start swiping to build your network!
            </p>
            <button
              onClick={() => router.push('/link/regular/swipe')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              Start Swiping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mutuals.map((mutual) => (
              <div
                key={mutual.profile_id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={mutual.avatar_url || (mutual.photos && mutual.photos[0]) || '/placeholder-avatar.png'}
                    alt={mutual.display_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">{mutual.display_name}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                        Mutual
                      </span>
                    </div>
                    {mutual.username && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{mutual.username}</p>
                    )}
                    {mutual.tags && mutual.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {mutual.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold transition-all">
                      View
                    </button>
                    <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors">
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
