'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function ProfileCarousel({ title, currentUserId }: ProfileCarouselProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfiles();
  }, [currentUserId]);

  const loadProfiles = async () => {
    try {
      if (currentUserId) {
        // Get recommended profiles based on similar follows
        const recommended = await getRecommendedProfiles(currentUserId);
        setProfiles(recommended);
      } else {
        // Get most popular profiles for non-logged-in users
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
          .not('username', 'is', null)
          .order('follower_count', { ascending: false })
          .limit(20);
        
        setProfiles(data || []);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedProfiles = async (userId: string): Promise<Profile[]> => {
    try {
      // Get users the current user follows
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId);
      
      const followingIds = following?.map((f: { followee_id: string }) => f.followee_id) || [];

      if (followingIds.length === 0) {
        // If not following anyone, show most popular
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
          .not('username', 'is', null)
          .neq('id', userId)
          .order('follower_count', { ascending: false })
          .limit(20);
        
        return data || [];
      }

      // Get users who are followed by people the current user follows (similar interests)
      const { data: similarFollows } = await supabase
        .from('follows')
        .select('followee_id')
        .in('follower_id', followingIds)
        .neq('followee_id', userId)
        .not('followee_id', 'in', `(${followingIds.join(',')})`);
      
      // Count occurrences to find most commonly followed
      const followCounts = new Map<string, number>();
      similarFollows?.forEach((f: { followee_id: string }) => {
        followCounts.set(f.followee_id, (followCounts.get(f.followee_id) || 0) + 1);
      });

      // Get top recommended profile IDs
      const recommendedIds = Array.from(followCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      // Get most popular profiles to fill the rest
      const { data: popular } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .not('username', 'is', null)
        .neq('id', userId)
        .not('id', 'in', `(${[...followingIds, ...recommendedIds].join(',')})`)
        .order('follower_count', { ascending: false })
        .limit(10);

      // Fetch profile details for recommended
      const { data: recommended } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .in('id', recommendedIds);

      // Combine: recommended first (sorted by follow count), then popular, prioritize live users
      const combined = [...(recommended || []), ...(popular || [])];
      
      // Sort: Live users first, then by follower count
      combined.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return b.follower_count - a.follower_count;
      });

      return combined.slice(0, 20);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback to popular profiles
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_live, location_zip, location_city, location_region, location_country, location_label, location_hidden, location_show_zip')
        .not('username', 'is', null)
        .neq('id', userId)
        .order('follower_count', { ascending: false })
        .limit(20);
      
      return data || [];
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
    scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return null;
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
              // Update follower count in UI
              setProfiles(prev => prev.map(p => 
                p.id === profileId 
                  ? { ...p, follower_count: p.follower_count + (isFollowing ? 1 : -1) }
                  : p
              ));
            }}
          />
        ))}
      </div>

      {/* Gradient indicators on edges */}
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

