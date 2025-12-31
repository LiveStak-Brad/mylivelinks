'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Eye } from 'lucide-react';
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

  console.log('[ViewersModal] Render:', { isOpen, liveStreamId, roomId });

  useEffect(() => {
    if (!isOpen) return;
    loadViewers();
  }, [isOpen, liveStreamId, roomId, loadViewers]);

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

      const res = await fetch(`/api/active-viewers/list?live_stream_id=${liveStreamId}`);
      if (!res.ok) {
        console.error('[ViewersModal] list fetch failed:', res.status);
        setViewers([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.viewers)) {
        setViewers(data.viewers as Viewer[]);
      } else {
        setViewers([]);
      }
    } catch (err) {
      console.error('[ViewersModal] Error loading viewers:', err);
      setViewers([]);
    } finally {
      setLoading(false);
    }
  }, [liveStreamId]);

  // Poll while open to keep list fresh
  useEffect(() => {
    if (!isOpen || !liveStreamId) return;

    const interval = setInterval(() => {
      loadViewers();
    }, 15000);

    return () => clearInterval(interval);
  }, [isOpen, liveStreamId, loadViewers]);

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
