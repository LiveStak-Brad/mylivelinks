'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Streamer {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  live_available: boolean;
  is_published: boolean;
}

interface StreamerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (streamerId: string) => void;
  currentUserId?: string | null;
}

export default function StreamerSelectionModal({
  isOpen,
  onClose,
  onSelect,
  currentUserId,
}: StreamerSelectionModalProps) {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    const loadStreamers = async () => {
      setLoading(true);
      try {
        // Load from database
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .order('username')
            .limit(50);

          if (error) throw error;

          // Get live_streams to check live_available and is_published
          const { data: liveStreams } = await supabase
            .from('live_streams')
            .select('profile_id, live_available, is_published');

          const liveMap = new Map<string, { live_available: boolean; is_published: boolean }>(
            (liveStreams || []).map((ls: any) => [
              ls.profile_id,
              { live_available: ls.live_available, is_published: ls.is_published }
            ])
          );

          setStreamers((data || []).map((profile: any) => ({
            profile_id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            live_available: liveMap.get(profile.id)?.live_available || false,
            is_published: liveMap.get(profile.id)?.is_published || false,
          })));
      } catch (error) {
        console.error('Error loading streamers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStreamers();
  }, [isOpen, supabase]);

  const filteredStreamers = streamers.filter(s =>
    s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Select Streamer</h2>
          <input
            type="text"
            placeholder="Search streamers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredStreamers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No streamers found</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredStreamers.map((streamer) => (
                <button
                  key={streamer.profile_id}
                  onClick={() => {
                    onSelect(streamer.profile_id);
                    onClose();
                  }}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {streamer.avatar_url ? (
                      <img
                        src={streamer.avatar_url}
                        alt={streamer.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300">
                          {streamer.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {streamer.display_name || streamer.username}
                      </div>
                      <div className="text-xs text-gray-500 truncate">@{streamer.username}</div>
                    </div>
                  </div>
                  {streamer.live_available && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      streamer.is_published
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {streamer.is_published ? 'LIVE' : 'PREVIEW'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


