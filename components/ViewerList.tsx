'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import GifterBadge from './GifterBadge';
import MiniProfile from './MiniProfile';

interface Viewer {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
  is_active: boolean;
  last_active_at: string;
  is_live_available?: boolean; // Whether they're live streaming/available
  live_stream_id?: number; // Their live stream ID if available
}

interface ViewerListProps {
  onDragStart?: (viewer: Viewer) => void;
}

export default function ViewerList({ onDragStart }: ViewerListProps = {}) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    profileId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    gifterLevel?: number;
    badgeName?: string;
    badgeColor?: string;
    isLive?: boolean;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setCurrentUserId(user?.id || null);
    });

    loadViewers();

    // Realtime subscriptions (replaces polling)
    const activeViewersChannel = supabase
      .channel('viewers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_viewers',
        },
        () => {
          // Reload viewers when active_viewers changes
          loadViewers();
        }
      )
      .subscribe();

    const liveStreamsChannel = supabase
      .channel('live-streams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          // Reload viewers when live status changes
          loadViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activeViewersChannel);
      supabase.removeChannel(liveStreamsChannel);
    };
  }, []);

  const loadViewers = async () => {
    try {
      // Get current user ID if not set
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setCurrentUserId(user.id);
      }

      // Use filtered viewer list RPC function to exclude blocked users
      const { data, error } = await supabase.rpc('get_viewer_list_filtered', {
        p_viewer_id: currentUserId || '',
        p_live_stream_id: null,
      });

      if (error) throw error;

      // Get badge info and live stream info
      const profileIds = [...new Set((data || []).map((item: any) => item.viewer_id))];
      
      // Check which profiles are live available
      const { data: liveStreams } = await supabase
        .from('live_streams')
        .select('profile_id, id, live_available')
        .in('profile_id', profileIds)
        .eq('live_available', true);

      const liveStreamMap = new Map(
        (liveStreams || []).map((ls: any) => [ls.profile_id, { isLive: true, streamId: ls.id }])
      );

      const viewersWithBadges = await Promise.all(
        (data || []).map(async (item: any) => {
          let badgeInfo = null;
          if (item.gifter_level !== null && item.gifter_level > 0) {
            const { data: badge } = await supabase
              .from('gifter_levels')
              .select('*')
              .eq('level', item.gifter_level)
              .single();
            badgeInfo = badge;
          }

          const liveInfo = liveStreamMap.get(item.viewer_id) as { isLive: boolean; streamId: number } | undefined;

          return {
            profile_id: item.viewer_id,
            username: item.username,
            avatar_url: item.avatar_url,
            gifter_level: item.gifter_level || 0,
            badge_name: badgeInfo?.badge_name,
            badge_color: badgeInfo?.badge_color,
            is_active: true,
            last_active_at: item.joined_at,
            is_live_available: liveInfo?.isLive || false,
            live_stream_id: liveInfo?.streamId,
          };
        })
      );

      setViewers(viewersWithBadges);
    } catch (error) {
      console.error('Error loading viewers:', error);
      // Fallback to regular query if RPC fails
      try {
        const { data, error: fallbackError } = await supabase
          .from('active_viewers')
          .select(`
            viewer_id,
            is_active,
            last_active_at,
            live_stream_id,
            profiles!inner (
              id,
              username,
              avatar_url,
              gifter_level
            )
          `)
          .eq('is_active', true)
          .gt('last_active_at', new Date(Date.now() - 60000).toISOString())
          .order('last_active_at', { ascending: false })
          .limit(50);

        if (!fallbackError && data) {
          const profileIds = [...new Set((data || []).map((item: any) => item.profiles.id))];
          
          const { data: liveStreams } = await supabase
            .from('live_streams')
            .select('profile_id, id, live_available')
            .in('profile_id', profileIds)
            .eq('live_available', true);

          const liveStreamMap = new Map(
            (liveStreams || []).map((ls: any) => [ls.profile_id, { isLive: true, streamId: ls.id }])
          );

          const viewersWithBadges = await Promise.all(
            (data || []).map(async (item: any) => {
              const profile = item.profiles;
              let badgeInfo = null;

              if (profile.gifter_level !== null) {
                const { data: badge } = await supabase
                  .from('gifter_levels')
                  .select('*')
                  .eq('level', profile.gifter_level)
                  .single();
                badgeInfo = badge;
              }

              const liveInfo = liveStreamMap.get(profile.id) as { isLive: boolean; streamId: number } | undefined;

              return {
                profile_id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                gifter_level: profile.gifter_level || 0,
                badge_name: badgeInfo?.badge_name,
                badge_color: badgeInfo?.badge_color,
                is_active: item.is_active,
                last_active_at: item.last_active_at,
                is_live_available: liveInfo?.isLive || false,
                live_stream_id: liveInfo?.streamId,
              };
            })
          );

          setViewers(viewersWithBadges);
        }
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold">Viewers in Room</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}
        </p>
      </div>

      {/* Viewer List - Scrollable, Takes Remaining Space */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : viewers.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            No viewers yet
          </div>
        ) : (
          <div className="space-y-1">
            {viewers.map((viewer) => (
              <div
                key={viewer.profile_id}
                draggable={viewer.is_live_available}
                onDragStart={(e) => {
                  if (viewer.is_live_available) {
                    e.dataTransfer.effectAllowed = 'move';
                    const dragData = {
                      type: 'viewer',
                      profile_id: viewer.profile_id,
                      username: viewer.username,
                      avatar_url: viewer.avatar_url,
                      live_stream_id: viewer.live_stream_id,
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                    e.dataTransfer.setData('text/plain', viewer.profile_id); // Fallback
                    console.log('Drag started:', dragData);
                    if (onDragStart) {
                      onDragStart(viewer);
                    }
                  } else {
                    e.preventDefault();
                  }
                }}
                className={`
                  flex items-center gap-2 p-2 rounded transition cursor-pointer
                  ${viewer.is_live_available 
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-grab active:cursor-grabbing' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900 cursor-default'
                  }
                `}
              >
                {/* Live Camera Icon - Webcam Style */}
                {viewer.is_live_available && (
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg border border-red-400">
                      <svg 
                        className="w-5 h-5 text-white" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        {/* Webcam body - rectangular */}
                        <rect x="5" y="7" width="14" height="9" rx="1.5" fill="white" opacity="0.9"/>
                        <rect x="5" y="7" width="14" height="9" rx="1.5" stroke="currentColor"/>
                        {/* Webcam lens - circular */}
                        <circle cx="12" cy="11.5" r="2.5" fill="currentColor" opacity="0.3"/>
                        <circle cx="12" cy="11.5" r="1.5" fill="currentColor" opacity="0.5"/>
                        <circle cx="12" cy="11.5" r="0.8" fill="currentColor"/>
                        {/* Webcam stand/base - triangular */}
                        <path d="M9 16 L12 19 L15 16" fill="white" opacity="0.9" stroke="currentColor"/>
                        <line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
                      <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                    </div>
                  </div>
                )}

                {/* Avatar */}
                {viewer.avatar_url ? (
                  <img
                    src={viewer.avatar_url}
                    alt={viewer.username}
                    className={`w-8 h-8 rounded-full flex-shrink-0 ${viewer.is_live_available ? 'ring-2 ring-red-500' : ''}`}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${viewer.is_live_available ? 'ring-2 ring-red-500' : ''}`}>
                    {viewer.username[0].toUpperCase()}
                  </div>
                )}

                {/* Username + Badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedProfile({
                          profileId: viewer.profile_id,
                          username: viewer.username,
                          avatarUrl: viewer.avatar_url,
                          gifterLevel: viewer.gifter_level,
                          badgeName: viewer.badge_name,
                          badgeColor: viewer.badge_color,
                          isLive: viewer.is_live_available,
                        });
                      }}
                      className={`text-sm font-medium truncate hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer ${viewer.is_live_available ? 'text-red-600 dark:text-red-400' : ''}`}
                    >
                      {viewer.username}
                    </button>
                    {viewer.gifter_level > 0 && (
                      <GifterBadge
                        level={viewer.gifter_level}
                        badgeName={viewer.badge_name}
                        badgeColor={viewer.badge_color}
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                {/* Active Indicator */}
                {viewer.is_active && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Active" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mini Profile Modal */}
      {selectedProfile && (
        <MiniProfile
          profileId={selectedProfile.profileId}
          username={selectedProfile.username}
          displayName={selectedProfile.displayName}
          avatarUrl={selectedProfile.avatarUrl}
          gifterLevel={selectedProfile.gifterLevel}
          badgeName={selectedProfile.badgeName}
          badgeColor={selectedProfile.badgeColor}
          isLive={selectedProfile.isLive}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

