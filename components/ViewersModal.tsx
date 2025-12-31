'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import Image from 'next/image';

interface Viewer {
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_active: boolean;
  last_seen: string;
}

interface ViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStreamId?: number;
  roomId?: string;
}

export default function ViewersModal({ isOpen, onClose, liveStreamId, roomId }: ViewersModalProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  console.log('[ViewersModal] Render:', { isOpen, liveStreamId, roomId });

  useEffect(() => {
    if (!isOpen) return;
    console.log('[ViewersModal] Loading viewers...');
    loadViewers();
  }, [isOpen, liveStreamId, roomId]);

  const loadViewers = useCallback(async () => {
    setLoading(true);

    try {
      if (!liveStreamId && !roomId) {
        setViewers([]);
        return;
      }

      if (roomId && !liveStreamId) {
        setViewers([]);
        return;
      }

      if (!liveStreamId) {
        setViewers([]);
        return;
      }

      const cutoffIso = new Date(Date.now() - 60_000).toISOString();

      const { data, error } = await supabase
        .from('active_viewers')
        .select('viewer_id, is_active, last_active_at')
        .eq('live_stream_id', liveStreamId)
        .order('last_active_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = (data || []) as Array<{ viewer_id: string; is_active: boolean; last_active_at: string }>;
      const viewerIds = Array.from(new Set(rows.map((r) => r.viewer_id).filter(Boolean)));

      if (viewerIds.length === 0) {
        setViewers([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', viewerIds);

      if (profileError) throw profileError;

      const profileMap = new Map<string, { username: string; avatar_url?: string }>(
        (profiles || []).map((p: any) => [String(p.id), { username: String(p.username || 'Unknown'), avatar_url: p.avatar_url || undefined }])
      );

      const mapped: Viewer[] = rows
        .map((row) => {
          const profile = profileMap.get(row.viewer_id);
          if (!profile) return null;
          const isActive = Boolean(row.is_active) && row.last_active_at > cutoffIso;

          return {
            profile_id: row.viewer_id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            is_active: isActive,
            last_seen: row.last_active_at,
          };
        })
        .filter(Boolean) as Viewer[];

      setViewers(mapped);
    } catch (err) {
      console.error('[ViewersModal] Error loading viewers:', err);
      setViewers([]);
    } finally {
      setLoading(false);
    }
  }, [liveStreamId, roomId, supabase]);

  useEffect(() => {
    if (!isOpen) return;
    if (!liveStreamId) return;

    const channel = supabase
      .channel(`active-viewers-web-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          loadViewers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, liveStreamId, loadViewers, supabase]);

  if (!isOpen) return null;

  const activeViewers = viewers.filter(v => v.is_active);
  const leftViewers = viewers.filter(v => !v.is_active);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-0"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-b-2xl shadow-2xl max-w-md w-full max-h-[60vh] overflow-hidden flex flex-col animate-slideDown modal-fullscreen-mobile"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Viewers ({viewers.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Viewers */}
              {activeViewers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                    Currently Watching ({activeViewers.length})
                  </h3>
                  <div className="space-y-2">
                    {activeViewers.map((viewer) => (
                      <div
                        key={viewer.profile_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="relative">
                          <Image
                            src={getAvatarUrl(viewer.avatar_url)}
                            alt={viewer.username}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                          {/* Purple dot for active */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-purple-500 border-2 border-white dark:border-gray-700 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {viewer.username}
                          </p>
                          <p className="text-xs text-green-500">Watching now</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viewers Who Left */}
              {leftViewers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                    Recently Left ({leftViewers.length})
                  </h3>
                  <div className="space-y-2">
                    {leftViewers.map((viewer) => (
                      <div
                        key={viewer.profile_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg opacity-60"
                      >
                        <Image
                          src={getAvatarUrl(viewer.avatar_url)}
                          alt={viewer.username}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {viewer.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Left the stream</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No viewers yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
