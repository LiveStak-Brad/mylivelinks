'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Trash2, Play, Video as VideoIcon, SkipBack, SkipForward, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type VlogRow = {
  id: string;
  profile_id: string;
  video_url: string;
  caption: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  created_at: string;
};

type Props = {
  profileId: string;
  isOwner: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
};

export default function Vlogs({ profileId, isOwner, cardStyle, borderRadiusClass = 'rounded-2xl', buttonColor = '#DB2777' }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VlogRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_vlogs', { p_profile_id: profileId });
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as VlogRow[];
      setRows(list);
      setActiveId((prev) => prev ?? (list[0]?.id ?? null));
    } catch (e) {
      console.error('[Vlogs] load failed', e);
      setRows([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const active = rows.find((r) => r.id === activeId) ?? rows[0] ?? null;
  const hasAny = rows.length > 0;

  if (!isOwner && !hasAny && !loading) return null;

  const goNext = () => {
    if (!rows.length) return;
    const idx = rows.findIndex((r) => r.id === activeId);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % rows.length;
    setActiveId(rows[nextIdx].id);
  };

  const goPrev = () => {
    if (!rows.length) return;
    const idx = rows.findIndex((r) => r.id === activeId);
    const prevIdx = idx < 0 ? 0 : (idx - 1 + rows.length) % rows.length;
    setActiveId(rows[prevIdx].id);
  };

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <VideoIcon className="w-5 h-5 text-purple-500" />
          🎞️ Vlogs
        </h2>
        {isOwner && hasAny && (
          <Link
            href="/creator-studio/upload?type=vlog"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Creator Studio
          </Link>
        )}
      </div>

      {!loading && !hasAny && isOwner && (
        <div className="text-center py-12">
          <VideoIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Vlogs Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Short videos throughout your day to keep fans updated.</p>
          <Link
            href="/creator-studio/upload?type=vlog"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Creator Studio
          </Link>
        </div>
      )}

      {loading && <div className="py-10 text-center text-gray-600 dark:text-gray-400">Loading vlogs…</div>}

      {!loading && hasAny && active && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60 bg-black/5 dark:bg-black/30">
            <div className="px-4 py-3 flex items-center justify-between bg-white/60 dark:bg-gray-900/40 backdrop-blur gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                  {active.caption || 'Vlog'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{active.duration_seconds}s</div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={goPrev}
                  className="w-9 h-9 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                  title="Previous"
                >
                  <SkipBack className="w-4 h-4 text-gray-900 dark:text-white" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="w-9 h-9 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                  title="Next"
                >
                  <SkipForward className="w-4 h-4 text-gray-900 dark:text-white" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPlaylistOpen((v) => !v)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-black/20 border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white"
                  >
                    Playlist ({rows.length})
                    <ChevronDown className={`w-4 h-4 transition-transform ${playlistOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {playlistOpen && (
                    <div className="absolute right-0 mt-2 w-[320px] max-w-[80vw] z-20 rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
                      <div className="max-h-80 overflow-auto">
                        {rows.map((r) => {
                          const selected = r.id === active.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              className={`w-full text-left px-3 py-2 border-b border-gray-100 dark:border-gray-800 ${
                                selected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                              }`}
                              onClick={() => {
                                setActiveId(r.id);
                                setPlaylistOpen(false);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                    {r.caption || 'Vlog'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{r.duration_seconds}s</div>
                                </div>
                                <Play className="w-4 h-4 text-purple-600" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Delete this vlog?')) return;
                      try {
                        const { error } = await supabase.rpc('delete_vlog', { p_id: active.id });
                        if (error) throw error;
                        await load();
                      } catch (e) {
                        console.error('[Vlogs] delete failed', e);
                        alert('Failed to delete vlog.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="aspect-video w-full bg-black">
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                playsInline
                src={active.video_url}
                onError={() => {
                  // Keep it minimal; no UI redesign
                  console.error('[Vlogs] video playback error');
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
