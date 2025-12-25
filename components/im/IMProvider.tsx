'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import IMManager from './IMManager';

/**
 * IMProvider - Wrapper that provides IM functionality throughout the app
 * 
 * Add this to your layout to enable instant messaging anywhere.
 * Chat windows will appear as floating, draggable mini windows.
 */
export default function IMProvider() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Only render IMManager if user is logged in
  if (!currentUserId) return null;

  return <IMManager currentUserId={currentUserId} />;
}

