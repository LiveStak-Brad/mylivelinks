'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Play, Video as VideoIcon, SkipBack, SkipForward, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { uploadProfileMedia } from '@/lib/storage';

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
};

async function uploadVlogVideo(profileId: string, file: File): Promise<string> {
  const vlogId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
  const relPath = `vlogs/${vlogId}/video`;
  return uploadProfileMedia(profileId, relPath, file, { upsert: true });
}

export default function Vlogs({ profileId, isOwner, cardStyle, borderRadiusClass = 'rounded-2xl' }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VlogRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [formCaption, setFormCaption] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openAdd = () => {
    setFormCaption('');
    setFormFile(null);
    setDurationSeconds(null);
    setShowModal(true);
  };

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
      className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <VideoIcon className="w-5 h-5 text-purple-500" />
          🎞️ Vlogs
        </h2>
        {isOwner && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            <Plus className="w-4 h-4" />
            Add Vlog
          </button>
        )}
      </div>

      {!loading && !hasAny && isOwner && (
        <div className="text-center py-12">
          <VideoIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Vlogs Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Upload a short (≤ 60s) vlog clip.</p>
          <button
            onClick={openAdd}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            + Add Vlog
          </button>
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => (!saving ? setShowModal(false) : null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">Add Vlog</div>
              <button
                className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:opacity-80"
                onClick={() => (!saving ? setShowModal(false) : null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Caption (optional)</label>
                <input
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Say something…"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Video (≤ 60s)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFormFile(f);
                    setDurationSeconds(null);
                    if (!f) return;

                    try {
                      const tmpUrl = URL.createObjectURL(f);
                      const el = document.createElement('video');
                      el.preload = 'metadata';
                      el.src = tmpUrl;
                      await new Promise<void>((resolve, reject) => {
                        el.onloadedmetadata = () => resolve();
                        el.onerror = () => reject(new Error('Failed to read video metadata'));
                      });
                      URL.revokeObjectURL(tmpUrl);
                      const d = Math.ceil(Number(el.duration || 0));
                      setDurationSeconds(Number.isFinite(d) ? d : null);
                    } catch (err) {
                      console.error('[Vlogs] duration read failed', err);
                      setDurationSeconds(null);
                    }
                  }}
                  className="w-full text-sm"
                />
                {typeof durationSeconds === 'number' && (
                  <div className={`mt-1 text-xs font-semibold ${durationSeconds > 60 ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    Duration: {durationSeconds}s
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60"
                  disabled={saving}
                  onClick={async () => {
                    if (!formFile) {
                      alert('Please select a video file.');
                      return;
                    }
                    if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds)) {
                      alert('Could not determine video duration.');
                      return;
                    }
                    if (durationSeconds > 60) {
                      alert('Vlogs must be 60 seconds or less.');
                      return;
                    }

                    setSaving(true);
                    try {
                      const videoUrl = await uploadVlogVideo(profileId, formFile);
                      const payload: any = {
                        video_url: videoUrl,
                        caption: formCaption.trim() || null,
                        thumbnail_url: null,
                        duration_seconds: durationSeconds,
                      };

                      const { error } = await supabase.rpc('create_vlog', { p_payload: payload });
                      if (error) throw error;

                      setShowModal(false);
                      setFormCaption('');
                      setFormFile(null);
                      setDurationSeconds(null);
                      await load();
                    } catch (e) {
                      console.error('[Vlogs] save failed', e);
                      alert('Failed to save vlog.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Add Vlog'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
