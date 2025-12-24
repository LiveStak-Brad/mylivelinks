'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ComingSoonLanding from '@/components/ComingSoonLanding';

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in - show coming soon
        setShowComingSoon(true);
        setIsChecking(false);
        return;
      }

      // Admin allowlist (same as end-streams route)
      const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
      const hardcodedEmails = ['wcba.mo@gmail.com'];
      
      const userId = user.id;
      const userEmail = (user.email || '').toLowerCase();
      
      const isAdmin = hardcodedIds.includes(userId) || hardcodedEmails.includes(userEmail);

      if (isAdmin) {
        // Admin user - redirect to live room
        router.push('/live');
      } else {
        // Regular user - show coming soon
        setShowComingSoon(true);
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      // On error, show coming soon
      setShowComingSoon(true);
      setIsChecking(false);
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (showComingSoon) {
    return <ComingSoonLanding />;
  }

  return null;
}
