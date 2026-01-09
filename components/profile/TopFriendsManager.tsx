'use client';

import { useState, useEffect } from 'react';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import Image from 'next/image';
import { X, Search, Users, GripVertical, Trash2, Check } from 'lucide-react';

interface TopFriend {
  id: string;
  profile_id: string;
  friend_id: string;
  position: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_live: boolean;
  follower_count: number;
  total_gifts_received: number;
  gifter_level: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
  follower_count: number;
}

interface TopFriendsManagerProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  accentColor?: string;
}

export default function TopFriendsManager({
  profileId,
  isOpen,
  onClose,
  onSave,
  accentColor = '#3B82F6',
}: TopFriendsManagerProps) {
  const [topFriends, setTopFriends] = useState<TopFriend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTopFriends();
    }
  }, [isOpen, profileId]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadTopFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/top-friends?profileId=${profileId}`);
      const data = await response.json();

      if (response.ok) {
        setTopFriends(data.topFriends || []);
      } else {
        console.error('[TOP_FRIENDS_MANAGER] Error loading:', data.error);
      }
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const response = await fetch(
        `/api/search/users?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      const data = await response.json();

      if (response.ok) {
        // Filter out users already in top friends
        const friendIds = new Set(topFriends.map((f) => f.friend_id));
        const filtered = (data.users || []).filter(
          (u: UserProfile) => u.id !== profileId && !friendIds.has(u.id)
        );
        setSearchResults(filtered);
      } else {
        console.error('[TOP_FRIENDS_MANAGER] Search error:', data.error);
      }
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Search error:', error);
    }
  };

  const addFriend = async (user: UserProfile) => {
    console.log('[TOP_FRIENDS_MANAGER] Current friends:', topFriends.length);
    console.log('[TOP_FRIENDS_MANAGER] Positions:', topFriends.map(f => f.position));
    
    if (topFriends.length >= 8) {
      alert('You can only have up to 8 top friends!');
      return;
    }

    try {
      setSaving(true);
      // Find the next available position (in case there are gaps)
      const maxPosition = topFriends.length > 0 
        ? Math.max(...topFriends.map(f => f.position))
        : 0;
      const nextPosition = maxPosition + 1;
      
      console.log('[TOP_FRIENDS_MANAGER] Adding friend to position:', nextPosition);

      const response = await fetch('/api/profile/top-friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId: user.id,
          position: nextPosition,
        }),
      });

      const data = await response.json();
      
      console.log('[TOP_FRIENDS_MANAGER] Add response:', response.status, data);

      if (response.ok && data.success) {
        // Reload top friends
        await loadTopFriends();
        setSearchQuery('');
        setSearchResults([]);
      } else {
        alert(data.error || 'Failed to add friend');
      }
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Error adding friend:', error);
      alert('Failed to add friend');
    } finally {
      setSaving(false);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm('Remove this friend from your top friends?')) return;

    try {
      setSaving(true);

      const response = await fetch(
        `/api/profile/top-friends?friendId=${friendId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Reload and compact positions
        await loadTopFriends();
        await compactPositions();
      } else {
        alert(data.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Error removing friend:', error);
      alert('Failed to remove friend');
    } finally {
      setSaving(false);
    }
  };

  // Compact positions to remove gaps (1,2,4,5 becomes 1,2,3,4)
  const compactPositions = async () => {
    try {
      // Reload to get current state
      const response = await fetch(`/api/profile/top-friends?profileId=${profileId}`);
      const data = await response.json();
      
      if (!response.ok) return;
      
      const friends = (data.topFriends || []) as TopFriend[];
      if (friends.length === 0) return;
      
      // Sort by position and reassign sequential positions
      const sorted = friends.sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < sorted.length; i++) {
        const expectedPosition = i + 1;
        if (sorted[i].position !== expectedPosition) {
          // Update position
          await fetch('/api/profile/top-friends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              friendId: sorted[i].friend_id,
              position: expectedPosition,
            }),
          });
        }
      }
      
      // Final reload
      await loadTopFriends();
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Error compacting positions:', error);
    }
  };

  const reorderFriend = async (friendId: string, newPosition: number) => {
    console.log('[TOP_FRIENDS_MANAGER] Reordering friend:', friendId, 'to position:', newPosition);
    try {
      const response = await fetch('/api/profile/top-friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, newPosition }),
      });

      const data = await response.json();
      console.log('[TOP_FRIENDS_MANAGER] Reorder response:', response.status, data);

      if (response.ok && data.success) {
        // Reload top friends
        await loadTopFriends();
      } else {
        console.error('[TOP_FRIENDS_MANAGER] Reorder failed:', data);
        alert(data.error || 'Failed to reorder friend');
      }
    } catch (error) {
      console.error('[TOP_FRIENDS_MANAGER] Error reordering friend:', error);
      alert('Failed to reorder friend');
    }
  };

  const handleDragStart = (index: number) => {
    console.log('[TOP_FRIENDS_MANAGER] Drag started from index:', index);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    console.log('[TOP_FRIENDS_MANAGER] Dropped at index:', dropIndex, 'from index:', draggedIndex);

    setDropTargetIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log('[TOP_FRIENDS_MANAGER] Ignoring drop - same position or null');
      setDraggedIndex(null);
      return;
    }

    const draggedFriend = topFriends[draggedIndex];
    const newPosition = dropIndex + 1;
    
    console.log('[TOP_FRIENDS_MANAGER] Moving friend:', draggedFriend.username, 'from position:', draggedFriend.position, 'to position:', newPosition);

    await reorderFriend(draggedFriend.friend_id, newPosition);
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <div className="flex items-center gap-3">
            <Users size={28} style={{ color: accentColor }} />
            <div>
              <h2 className="text-2xl font-bold">Manage Top Friends</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add up to 8 friends ({topFriends.length}/8)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Add Friends</h3>
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-offset-0"
                style={{}}
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                            style={{ backgroundColor: accentColor }}
                          >
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <UserNameWithBadges
                          profileId={user.id}
                          name={user.display_name || user.username}
                          textSize="text-base"
                          nameClassName="font-semibold"
                          showGifterBadge={false}
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => addFriend(user)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: accentColor }}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Top Friends */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Your Top Friends ({topFriends.length}/8)
            </h3>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent mx-auto"></div>
              </div>
            )}

            {!loading && topFriends.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  No top friends yet. Search and add your favorite people!
                </p>
              </div>
            )}

            {!loading && topFriends.length > 0 && (
              <div className="space-y-2">
                {topFriends.map((friend, index) => (
                  <div
                    key={friend.friend_id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center justify-between p-4 rounded-lg transition cursor-move ${
                      draggedIndex === index 
                        ? 'opacity-40 bg-gray-100 dark:bg-gray-700' 
                        : dropTargetIndex === index
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical
                        size={20}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        {friend.position}
                      </div>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                        {friend.avatar_url ? (
                          <Image
                            src={friend.avatar_url}
                            alt={friend.username}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                            style={{ backgroundColor: accentColor }}
                          >
                            {friend.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <UserNameWithBadges
                          profileId={friend.friend_id}
                          name={friend.display_name || friend.username}
                          textSize="text-base"
                          nameClassName="font-semibold truncate"
                          showGifterBadge={false}
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriend(friend.friend_id)}
                      disabled={saving}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drag and Drop Hint */}
            {topFriends.length > 1 && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                💡 Drag and drop to reorder your top friends
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-lg font-semibold text-white transition hover:opacity-80 flex items-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            <Check size={20} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

