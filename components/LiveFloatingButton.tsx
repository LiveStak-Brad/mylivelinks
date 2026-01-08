'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type LiveFloatingButtonProps = {
  liveUsername: string;
  isLive: boolean;
  onPress: () => void;
};

export default function LiveFloatingButton({ liveUsername, isLive, onPress }: LiveFloatingButtonProps) {
  const initial = (liveUsername?.[0] ?? 'L').toUpperCase();

  if (!isLive) return null;

  return (
    <button
      type="button"
      onClick={onPress}
      className={
        'fixed left-3 z-[55] hidden sm:flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/90 text-white shadow-lg backdrop-blur-md ' +
        'px-3 py-2 text-sm font-semibold hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/60'
      }
      style={{ top: 'var(--live-float-top, 72px)' }}
      aria-label={`${liveUsername} is live. Click to watch.`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 ring-1 ring-white/20">
        <span className="text-sm font-bold">{initial}</span>
      </span>
      <span className="whitespace-nowrap">
        {liveUsername} is LIVE
      </span>
    </button>
  );
}

type LiveCandidate = {
  username: string;
  is_live: boolean;
};

export function GlobalLiveFloatingButton() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [topPx, setTopPx] = useState<number>(72);

  const candidates = useMemo(() => ['CannaStreams', 'MyLiveLinksOfficial'], []);

  useEffect(() => {
    const computeTop = () => {
      const header = document.querySelector('header[role="banner"]');
      const height = header instanceof HTMLElement ? header.getBoundingClientRect().height : 64;
      setTopPx(Math.round(height + 8));
    };

    computeTop();
    window.addEventListener('resize', computeTop);
    return () => window.removeEventListener('resize', computeTop);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--live-float-top', `${topPx}px`);
    return () => {
      document.documentElement.style.removeProperty('--live-float-top');
    };
  }, [topPx]);

  const shouldHide = pathname === '/live' || pathname?.startsWith('/live/') || pathname?.startsWith('/room/');

  useEffect(() => {
    if (shouldHide) {
      setActiveUsername(null);
      return;
    }

    let cancelled = false;

    const fetchLive = async () => {
      try {
        // Check live_streams.live_available (source of truth) instead of profiles.is_live
        // This ensures we only show the button when streamer is actually live
        const { data, error } = await supabase
          .from('live_streams')
          .select('profile_id, profiles!inner(username)')
          .eq('live_available', true)
          .eq('streaming_mode', 'solo');

        if (cancelled) return;
        if (error) {
          setActiveUsername(null);
          return;
        }

        const rows = (data ?? []) as { profile_id: string; profiles: { username: string } }[];

        // Build map of live usernames
        const liveUsernames = new Set<string>();
        for (const row of rows) {
          const username = row.profiles?.username?.toLowerCase();
          if (username) liveUsernames.add(username);
        }

        // Check candidates in priority order
        for (const candidate of candidates) {
          if (liveUsernames.has(candidate.toLowerCase())) {
            setActiveUsername(candidate);
            return;
          }
        }

        setActiveUsername(null);
      } catch {
        if (!cancelled) setActiveUsername(null);
      }
    };

    fetchLive();

    // Refetch when tab becomes visible (user switches back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = window.setInterval(fetchLive, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [candidates, shouldHide, supabase]);

  if (!activeUsername) return null;

  return (
    <LiveFloatingButton
      liveUsername={activeUsername}
      isLive={true}
      onPress={() => router.push(`/live/${activeUsername}`)}
    />
  );
}
