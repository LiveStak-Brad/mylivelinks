'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface PrivacySettingsProps {
  userId: string;
}

export default function PrivacySettings({ userId }: PrivacySettingsProps) {
  const [hideFollowing, setHideFollowing] = useState(false);
  const [hideFollowers, setHideFollowers] = useState(false);
  const [hideFriends, setHideFriends] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  // Load current privacy settings
  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('hide_following, hide_followers, hide_friends')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (data) {
          setHideFollowing(data.hide_following || false);
          setHideFollowers(data.hide_followers || false);
          setHideFriends(data.hide_friends || false);
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
        setMessage({ type: 'error', text: 'Failed to load privacy settings' });
      } finally {
        setLoading(false);
      }
    };

    loadPrivacySettings();
  }, [userId, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('update_user_profile', {
        user_id: userId,
        new_hide_following: hideFollowing,
        new_hide_followers: hideFollowers,
        new_hide_friends: hideFriends,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Privacy settings saved!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setMessage({ type: 'error', text: 'Failed to save privacy settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Privacy Settings</h2>
        <p className="text-sm text-gray-400 mb-4">
          Control who can see your social connections
        </p>
      </div>

      {/* Hide Following */}
      <div className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="hideFollowing"
          checked={hideFollowing}
          onChange={(e) => setHideFollowing(e.target.checked)}
          className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
        />
        <div className="flex-1">
          <label htmlFor="hideFollowing" className="font-medium cursor-pointer">
            Hide Following List
          </label>
          <p className="text-sm text-gray-400 mt-1">
            Only you will be able to see who you follow
          </p>
        </div>
      </div>

      {/* Hide Followers */}
      <div className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="hideFollowers"
          checked={hideFollowers}
          onChange={(e) => setHideFollowers(e.target.checked)}
          className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
        />
        <div className="flex-1">
          <label htmlFor="hideFollowers" className="font-medium cursor-pointer">
            Hide Followers List
          </label>
          <p className="text-sm text-gray-400 mt-1">
            Only you will be able to see who follows you
          </p>
        </div>
      </div>

      {/* Hide Friends */}
      <div className="flex items-start space-x-3 p-4 bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="hideFriends"
          checked={hideFriends}
          onChange={(e) => setHideFriends(e.target.checked)}
          className="mt-1 w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
        />
        <div className="flex-1">
          <label htmlFor="hideFriends" className="font-medium cursor-pointer">
            Hide Friends List
          </label>
          <p className="text-sm text-gray-400 mt-1">
            Only you will be able to see your mutual connections
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {saving ? 'Saving...' : 'Save Privacy Settings'}
      </button>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info Note */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> When enabled, these privacy settings will hide your lists from other users,
          but you&apos;ll always be able to see your own connections.
        </p>
      </div>
    </div>
  );
}

