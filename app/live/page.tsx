'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import LiveRoom from '@/components/LiveRoom';

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if auth is disabled for testing
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if disabled for testing
      if (authDisabled) {
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          // Not authenticated - redirect to login with return URL
          const returnUrl = searchParams.get('returnUrl') || '/live';
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }
        
        // User is authenticated
        setIsAuthenticated(true);
        setIsChecking(false);
      } catch (err) {
        console.error('Auth check error:', err);
        const returnUrl = searchParams.get('returnUrl') || '/live';
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      }
    };

    checkAuth();

    // Listen for auth state changes (only if method exists)
    let subscription: any = null;
    if (supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
      const result = supabase.auth.onAuthStateChange((event: string, session: any) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          setIsChecking(false);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          const returnUrl = searchParams.get('returnUrl') || '/live';
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
      });
      subscription = result?.data?.subscription;
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [router, searchParams, supabase, authDisabled]);

  // Show loading state while checking auth
  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, show LiveRoom
  return <LiveRoom />;
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}


