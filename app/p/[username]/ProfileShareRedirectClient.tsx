'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function ProfileShareRedirectClient({ username }: { username: string }) {
  useEffect(() => {
    let mounted = true;
    const go = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;
        const target = user ? `/${encodeURIComponent(username)}` : `/signup?next=/${encodeURIComponent(username)}`;
        if (!mounted) return;
        try {
          window.location.replace(target);
        } catch {
          window.location.href = target;
        }
      } catch {
        const target = `/signup?next=/${encodeURIComponent(username)}`;
        try {
          window.location.replace(target);
        } catch {
          window.location.href = target;
        }
      }
    };
    void go();
    return () => {
      mounted = false;
    };
  }, [username]);

  return null;
}
