'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useMessages } from './MessagesContext';

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  is_live: boolean;
}

interface FriendsListProps {
  onSelectFriend: (friendId: string) => void;
  layout?: 'horizontal' | 'vertical';
}

export default function FriendsList({ onSelectFriend, layout = 'horizontal' }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUserId, setActiveConversationId } = useMessages();
  const supabase = createClient();

  const loadFriends = useCallback(async () => {
    if (!currentUserId) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      // Get mutual follows (friends = people you follow who also follow you back)
      const { data: followingData } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', currentUserId);

      const followingIds = (followingData || []).map((f: { followee_id: string }) => f.followee_id);

      if (followingIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get people who follow you back from the ones you follow
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followee_id', currentUserId)
        .in('follower_id', followingIds);

      const mutualFriendIds = (followersData || []).map((f: { follower_id: string }) => f.follower_id);

      if (mutualFriendIds.length === 0) {
        // If no mutual friends, show people you follow instead
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_live')
          .in('id', followingIds.slice(0, 20));

        // Check online status
        const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: onlineData } = await supabase
          .from('room_presence')
          .select('profile_id')
          .in('profile_id', followingIds)
          .gt('last_seen_at', cutoff);

        const onlineSet = new Set((onlineData || []).map((o: { profile_id: string }) => o.profile_id));

        const friendsList: Friend[] = (profiles || []).map((p: any) => ({
          id: p.id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          is_online: onlineSet.has(p.id),
          is_live: p.is_live === true,
        }));

        // Sort: live first, then online, then alphabetical
        friendsList.sort((a, b) => {
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          return (a.display_name || a.username).localeCompare(b.display_name || b.username);
        });

        setFriends(friendsList);
        setLoading(false);
        return;
      }

      // Get friend profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_live')
        .in('id', mutualFriendIds);

      // Check online status
      const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: onlineData } = await supabase
        .from('room_presence')
        .select('profile_id')
        .in('profile_id', mutualFriendIds)
        .gt('last_seen_at', cutoff);

      const onlineSet = new Set((onlineData || []).map((o: { profile_id: string }) => o.profile_id));

      const friendsList: Friend[] = (profiles || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        is_online: onlineSet.has(p.id),
        is_live: p.is_live === true,
      }));

      // Sort: live first, then online, then alphabetical
      friendsList.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return (a.display_name || a.username).localeCompare(b.display_name || b.username);
      });

      setFriends(friendsList);
    } catch (error) {
      console.error('[FriendsList] Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, supabase]);

  useEffect(() => {
    loadFriends();

    // Refresh every 30 seconds for online status
    const interval = setInterval(loadFriends, 30000);
    return () => clearInterval(interval);
  }, [loadFriends]);

  const handleFriendClick = (friend: Friend) => {
    setActiveConversationId(friend.id);
    onSelectFriend(friend.id);
  };

  // Filter friends by search query
  const filteredFriends = friends.filter(friend =>
    (friend.display_name || friend.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    if (layout === 'vertical') {
      return (
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-border">
            <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Friends</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-muted/50 animate-pulse" />
              <div className="w-10 h-2 bg-muted/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    if (layout === 'vertical') {
      return (
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Friends</span>
              <span className="text-xs text-muted-foreground/60">(0)</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">No friends yet</p>
          </div>
        </div>
      );
    }
    return null; // Don't show section if no friends (horizontal)
  }

  // Vertical layout for sidebar
  if (layout === 'vertical') {
    return (
      <div className="flex flex-col h-full">
        {/* Header with count */}
        <div className="px-3 py-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Friends</span>
            <span className="text-xs text-muted-foreground">({friends.length})</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends"
              className="w-full pl-8 pr-3 py-2 bg-muted/50 border-none rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Friends list - vertical scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredFriends.length === 0 ? (
            <div className="flex items-center justify-center py-8 px-4">
              <p className="text-xs text-muted-foreground text-center">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </p>
            </div>
          ) : (
            filteredFriends.map(friend => (
              <FriendRow
                key={friend.id}
                friend={friend}
                onClick={() => handleFriendClick(friend)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // Horizontal layout (original)
  return (
    <div className="px-3 py-2 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Friends</span>
        <span className="text-xs text-muted-foreground/60">({friends.length})</span>
      </div>
      
      <div 
        className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {friends.map(friend => (
          <FriendAvatar
            key={friend.id}
            friend={friend}
            onClick={() => handleFriendClick(friend)}
          />
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

function FriendAvatar({ friend, onClick }: { friend: Friend; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1 group"
    >
      {/* Avatar with indicators */}
      <div className="relative">
        {/* Red ring for live users */}
        <div className={`
          w-14 h-14 rounded-full p-[3px] transition-transform group-hover:scale-105
          ${friend.is_live 
            ? 'bg-gradient-to-tr from-red-500 via-pink-500 to-red-500 animate-pulse' 
            : 'bg-transparent'
          }
        `}>
          <div className="w-full h-full rounded-full bg-card p-[2px]">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {(friend.display_name || friend.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Live badge */}
        {friend.is_live && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded uppercase tracking-wide">
            Live
          </div>
        )}

        {/* Online indicator (purple dot) - only show if not live */}
        {!friend.is_live && friend.is_online && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-full border-2 border-card shadow-lg shadow-purple-500/50" />
        )}
      </div>

      {/* Name */}
      <span className="text-[10px] text-muted-foreground truncate max-w-[56px] group-hover:text-foreground transition-colors">
        {friend.display_name || friend.username}
      </span>
    </button>
  );
}

// Row-based friend display for vertical layout
function FriendRow({ friend, onClick }: { friend: Friend; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {/* Ring for live users */}
        <div className={`
          w-10 h-10 rounded-full p-[2px] transition-transform group-hover:scale-105
          ${friend.is_live 
            ? 'bg-gradient-to-tr from-red-500 via-pink-500 to-red-500 animate-pulse' 
            : 'bg-transparent'
          }
        `}>
          <div className="w-full h-full rounded-full bg-card p-[1px]">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                {(friend.display_name || friend.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Online indicator */}
        {!friend.is_live && friend.is_online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-full border-2 border-card" />
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">
          {friend.display_name || friend.username}
        </p>
        {friend.is_live && (
          <span className="text-[10px] text-red-500 font-semibold uppercase">● Live</span>
        )}
        {!friend.is_live && friend.is_online && (
          <span className="text-[10px] text-purple-400">Online</span>
        )}
      </div>
    </button>
  );
}

