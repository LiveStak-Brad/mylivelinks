'use client';

/**
 * LEGACY REDIRECT: /[username]/watch/[id] → /replay/[username]/[id]
 * 
 * This route now redirects to the canonical Replay player.
 * Long-form content should use /replay/[username]/[id]
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyWatchRedirect() {
  const params = useParams<{ username: string; id: string }>();
  const router = useRouter();
  const username = params?.username ?? '';
  const videoId = params?.id ?? '';

  useEffect(() => {
    if (username && videoId) {
      // Hard redirect to canonical replay URL
      router.replace(`/replay/${username}/${videoId}`);
    }
  }, [username, videoId, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
