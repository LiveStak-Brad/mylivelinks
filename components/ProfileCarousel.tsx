'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ProfileCard from './ProfileCard';
import { createClient } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  is_live: boolean;
  location_zip?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  location_label?: string | null;
  location_hidden?: boolean | null;
  location_show_zip?: boolean | null;
}

interface ProfileCarouselProps {
  title: string;
  currentUserId: string | null;
}

interface CachedData {
  profiles: Profile[];
  timestamp: number;
  userId: string | null;
}

const CACHE_KEY = 'mll_recommended_profiles';
const CACHE_TTL = 5 * 60 * 1000;
const FETCH_TIMEOUT = 8000;
const RETRY_DELAY = 500;

export default function ProfileCarousel({ title, currentUserId }: ProfileCarouselProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const fetchInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCacheKey = (userId: string | null) => `${CACHE_KEY}_${userId || 'public'}`;

  const loadFromCache = useCallback((userId: string | null): Profile[] | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(getCacheKey(userId));
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      
      if (age > CACHE_TTL || data.userId !== userId) {
        localStorage.removeItem(getCacheKey(userId));
        return null;
      }
      
      return data.profiles;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((userId: string | null, profiles: Profile[]) => {
    if (typeof window === 'undefined') return;
    try {
      const data: CachedData = {
        profiles,
        timestamp: Date.now(),
        userId
      };
      localStorage.setItem(getCacheKey(userId), JSON.stringify(data));
    } catch (err) {
      console.warn('[ProfileCarousel] Cache save failed:', err);
    }
  }, []);

  const fetchWithTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
  };

  const loadProfiles = useCallback(async (isRetry = false) => {
    if (fetchInProgressRef.current) return;
    if (!authResolved) return;
    
    fetchInProgressRef.current = true;
    if (isRetry) setRetrying(true);
    setError(null);

    try {
      let result: Profile[];
      
      if (currentUserId) {
        result = await fetchWithTimeout(
          getRecommendedProfiles(currentUserId),
          FETCH_TIMEOUT
        );
      } else {
        const { data } = await fetchWithTimeout(
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
            .not('username', 'is', null)
            .order('follower_count', { ascending: false })
            .limit(15),
          FETCH_TIMEOUT
        );
        result = data || [];
      }

      if (mountedRef.current) {
        setProfiles(result);
        saveToCache(currentUserId, result);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error('[ProfileCarousel] Fetch error:', err);
      
      if (!isRetry && mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            loadProfiles(true);
          }
        }, RETRY_DELAY);
      } else if (mountedRef.current) {
        setError('Unable to load recommendations');
        setLoading(false);
      }
    } finally {
      fetchInProgressRef.current = false;
      if (mountedRef.current) {
        setRetrying(false);
      }
    }
  }, [currentUserId, authResolved, supabase, saveToCache]);

  const getRecommendedProfiles = async (userId: string): Promise<Profile[]> => {
    try {
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId)
        .limit(100);
      
      const followingIds = following?.map((f: { followee_id: string }) => f.followee_id) || [];

      if (followingIds.length === 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
          .not('username', 'is', null)
          .neq('id', userId)
          .order('follower_count', { ascending: false })
          .limit(15);
        
        return data || [];
      }

      const { data: similarFollows } = await supabase
        .from('follows')
        .select('followee_id')
        .in('follower_id', followingIds.slice(0, 50))
        .neq('followee_id', userId)
        .limit(200);
      
      const followCounts = new Map<string, number>();
      similarFollows?.forEach((f: { followee_id: string }) => {
        if (!followingIds.includes(f.followee_id)) {
          followCounts.set(f.followee_id, (followCounts.get(f.followee_id) || 0) + 1);
        }
      });

      const recommendedIds = Array.from(followCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);

      if (recommendedIds.length === 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
          .not('username', 'is', null)
          .neq('id', userId)
          .not('id', 'in', `(${followingIds.join(',')})`)
          .order('follower_count', { ascending: false })
          .limit(15);
        
        return data || [];
      }

      const { data: recommended } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .in('id', recommendedIds);

      const excludeIds = [...followingIds, ...recommendedIds];
      const { data: popular } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .not('username', 'is', null)
        .neq('id', userId)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('follower_count', { ascending: false })
        .limit(7);

      const combined = [...(recommended || []), ...(popular || [])];
      
      combined.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return b.follower_count - a.follower_count;
      });

      return combined.slice(0, 15);
    } catch (error) {
      console.error('[ProfileCarousel] Recommendation error:', error);
      
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId)
        .limit(100);
      
      const followingIds = following?.map((f: { followee_id: string }) => f.followee_id) || [];
      
      const query = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .not('username', 'is', null)
        .neq('id', userId);
      
      if (followingIds.length > 0) {
        query.not('id', 'in', `(${followingIds.join(',')})`);
      }
      
      const { data } = await query
        .order('follower_count', { ascending: false })
        .limit(15);
      
      return data || [];
    }
  };

  useEffect(() => {
    const resolveAuth = async () => {
      try {
        await supabase.auth.getSession();
        if (mountedRef.current) {
          setAuthResolved(true);
        }
      } catch (err) {
        console.error('[ProfileCarousel] Auth resolution error:', err);
        if (mountedRef.current) {
          setAuthResolved(true);
        }
      }
    };

    resolveAuth();
  }, [supabase]);

  useEffect(() => {
    if (!authResolved) return;

    const cached = loadFromCache(currentUserId);
    if (cached && cached.length > 0) {
      setProfiles(cached);
      setLoading(false);
    }

    loadProfiles();
  }, [authResolved, currentUserId, loadProfiles, loadFromCache]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
    scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="py-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && profiles.length === 0 && !error) {
    return (
      <div className="py-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
        <div className="flex items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            No recommendations available yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  if (error && profiles.length === 0) {
    return (
      <div className="py-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-center mb-4">{error}</p>
          <button
            onClick={() => loadProfiles()}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scroll to discover more profiles →
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 md:p-3 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 md:p-3 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </div>
      </div>

      {error && profiles.length > 0 && (
        <div className="mb-4 flex items-center justify-between px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Showing cached results. Unable to refresh.
          </p>
          <button
            onClick={() => loadProfiles()}
            disabled={retrying}
            className="text-sm text-yellow-900 dark:text-yellow-100 hover:underline disabled:opacity-50"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            currentUserId={currentUserId}
            onFollow={(profileId, isFollowing) => {
              setProfiles(prev => prev.map(p => 
                p.id === profileId 
                  ? { ...p, follower_count: p.follower_count + (isFollowing ? 1 : -1) }
                  : p
              ));
            }}
          />
        ))}
      </div>

      <div className="absolute left-0 top-20 bottom-0 w-12 bg-gradient-to-r from-white dark:from-gray-800 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-20 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-800 to-transparent pointer-events-none" />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

