'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /live page - now redirects to /room/live-central
 * The LiveRoom component is now a template used by the room system.
 * All live streaming happens through /room/[slug] routes.
 */
export default function LiveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new Live Central room
    router.replace('/room/live-central');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground">Redirecting to Live Central...</p>
      </div>
    </div>
  );
}
