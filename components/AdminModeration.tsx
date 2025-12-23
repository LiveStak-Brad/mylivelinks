'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface AdminModerationProps {
  userId: string;
  username: string;
}

/**
 * Admin Moderation Component
 * Global mute, timeout, ban functionality
 * Only visible to admins
 */
export default function AdminModeration({ userId, username }: AdminModerationProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [action, setAction] = useState<'mute' | 'timeout' | 'ban' | null>(null);
  const [duration, setDuration] = useState<number>(60); // minutes
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin (you'd have an admin table or role check)
      // For now, using a simple check - implement your admin logic
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // TODO: Implement proper admin check
      // For now, allow if username contains 'admin' (remove in production!)
      setIsAdmin((profile as any)?.username?.includes('admin') || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleMute = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setLoading(true);
    try {
      // Global mute: Update profile or create moderation record
      // This would typically go to a moderation_logs table
      const { error } = await (supabase.from('profiles') as any)
        .update({
          // Add muted_until timestamp or is_muted flag
          // This is a placeholder - implement your moderation schema
        })
        .eq('id', userId);

      if (error) throw error;

      // Remove from all grids and chat
      await removeFromAllGrids();
      await removeFromChat();

      alert(`User ${username} has been muted globally`);
      setAction(null);
    } catch (error) {
      console.error('Error muting user:', error);
      alert('Failed to mute user');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeout = async () => {
    if (!reason.trim() || duration <= 0) {
      alert('Please provide reason and duration');
      return;
    }

    setLoading(true);
    try {
      const timeoutUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();

      // Update profile with timeout
      const { error } = await (supabase.from('profiles') as any)
        .update({
          // Add timeout_until timestamp
          // Placeholder - implement your moderation schema
        })
        .eq('id', userId);

      if (error) throw error;

      await removeFromAllGrids();
      await removeFromChat();

      alert(`User ${username} timed out for ${duration} minutes`);
      setAction(null);
    } catch (error) {
      console.error('Error timing out user:', error);
      alert('Failed to timeout user');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for ban');
      return;
    }

    if (!confirm(`Are you sure you want to BAN ${username}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Ban user: Set is_banned flag
      const { error } = await (supabase.from('profiles') as any)
        .update({
          is_banned: true,
          // Add ban_reason, banned_at, etc.
        })
        .eq('id', userId);

      if (error) throw error;

      // Remove from all grids
      await removeFromAllGrids();

      // Remove from chat
      await removeFromChat();

      // End live stream if active
      await (supabase.from('live_streams') as any)
        .update({ live_available: false, ended_at: new Date().toISOString() })
        .eq('profile_id', userId);

      alert(`User ${username} has been banned`);
      setAction(null);
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    } finally {
      setLoading(false);
    }
  };

  const removeFromAllGrids = async () => {
    // Remove user from all user_grid_slots
    await supabase
      .from('user_grid_slots')
      .delete()
      .eq('streamer_id', userId);
  };

  const removeFromChat = async () => {
    // Optionally hide/delete chat messages
    // Or mark them as hidden
    // Implementation depends on your chat moderation strategy
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <h3 className="font-semibold text-red-700 dark:text-red-400 mb-3">
        Admin Moderation: {username}
      </h3>

      {!action ? (
        <div className="flex gap-2">
          <button
            onClick={() => setAction('mute')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Mute
          </button>
          <button
            onClick={() => setAction('timeout')}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Timeout
          </button>
          <button
            onClick={() => setAction('ban')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Ban
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {action === 'timeout' && (
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for moderation action..."
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={
                action === 'mute'
                  ? handleMute
                  : action === 'timeout'
                  ? handleTimeout
                  : handleBan
              }
              disabled={loading}
              className={`px-4 py-2 text-white rounded ${
                action === 'ban'
                  ? 'bg-red-500 hover:bg-red-600'
                  : action === 'timeout'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-yellow-500 hover:bg-yellow-600'
              } disabled:opacity-50`}
            >
              {loading ? 'Processing...' : `Confirm ${action}`}
            </button>
            <button
              onClick={() => {
                setAction(null);
                setReason('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


