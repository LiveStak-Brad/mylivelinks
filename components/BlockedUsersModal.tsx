'use client';

import { useState, useEffect } from 'react';
import { X, UserX, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_at: string;
  reason: string | null;
  blocked_profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlockedUsersModal({ isOpen, onClose }: BlockedUsersModalProps) {
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers();
    }
  }, [isOpen]);

  const loadBlockedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocks')
        .select(`
          id,
          blocked_id,
          blocked_at,
          reason,
          blocked_profile:profiles!blocks_blocked_id_fkey(username, display_name, avatar_url)
        `)
        .eq('blocker_id', user.id)
        .order('blocked_at', { ascending: false });

      if (error) {
        console.error('Error loading blocked users:', error);
        return;
      }

      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;

    setUnblocking(blockedId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try calling the RPC function first
      const { error: rpcError } = await (supabase.rpc as any)('unblock_user', {
        p_blocker_id: user.id,
        p_blocked_id: blockedId,
      });

      if (rpcError) {
        // Fallback to direct delete
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', blockedId);

        if (error) throw error;
      }

      // Remove from local state
      setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== blockedId));
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user. Please try again.');
    } finally {
      setUnblocking(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-500" />
            Blocked Users
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No blocked users</p>
              <p className="text-sm mt-1">Users you block will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                    {blocked.blocked_profile?.avatar_url ? (
                      <img
                        src={blocked.blocked_profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <UserX className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {blocked.blocked_profile?.display_name || blocked.blocked_profile?.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{blocked.blocked_profile?.username || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Blocked {formatDate(blocked.blocked_at)}
                    </p>
                  </div>

                  {/* Unblock Button */}
                  <button
                    onClick={() => handleUnblock(blocked.blocked_id)}
                    disabled={unblocking === blocked.blocked_id}
                    className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                  >
                    {unblocking === blocked.blocked_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Unblock'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Footer */}
        {blockedUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                Blocked users cannot see your streams, and you won't see their streams or chat messages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

