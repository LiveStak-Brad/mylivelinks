'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Plus, Trash2, X } from 'lucide-react';
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
  title?: string;
  contentLabel?: string;
  allowEdit?: boolean;
};

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

async function getVideoDurationSeconds(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const d = Number(video.duration);
        if (!Number.isFinite(d) || d <= 0) reject(new Error('Invalid video duration'));
        else resolve(d);
      };
      video.onerror = () => reject(new Error('Failed to read video duration'));
      video.src = url;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadVlogVideo(profileId: string, vlogId: string, file: File): Promise<string> {
  const supabase = createClient();
  const filePath = `${profileId}/vlogs/${vlogId}/video`;

  const { error } = await supabase.storage.from('profile-media').upload(filePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from('profile-media').getPublicUrl(filePath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('Failed to get public URL');
  return publicUrl;
}
export default function VlogReelsClient({
  profileId,
  isOwner,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  title,
  contentLabel,
  allowEdit,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<VlogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_vlogs', { p_profile_id: profileId });
      if (error) throw error;
      setRows((Array.isArray(data) ? data : []) as VlogRow[]);
    } catch (e) {
      console.error('[VlogReels] load failed', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = allowEdit ?? isOwner;

  const openUploader = () => {
    setCaption('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploaderOpen(true);
  };

  const onPickFile = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    const maxBytes = 250 * 1024 * 1024;
    if (next.size > maxBytes) {
      alert('Video must be 250MB or less');
      return;
    }

    setFile(next);
  };

  const saveVlog = async () => {
    if (!file) {
      alert('Please select a video file');
      return;
    }

    setSaving(true);
    try {
      const duration = Math.ceil(await getVideoDurationSeconds(file));
      if (duration > 60) {
        alert('VLOG must be 60 seconds or less');
        return;
      }

      const vlogId =
        typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
          ? (crypto as any).randomUUID()
          : String(Date.now());

      const videoUrl = await uploadVlogVideo(profileId, vlogId, file);

      const payload: any = {
        video_url: videoUrl,
        caption: caption.trim() || null,
        duration_seconds: duration,
      };

      const { error } = await supabase.rpc('create_vlog', { p_payload: payload });
      if (error) throw error;

      setUploaderOpen(false);
      await load();
    } catch (e) {
      console.error('[VlogReels] save failed', e);
      alert('Failed to upload VLOG');
    } finally {
      setSaving(false);
    }
  };

  const deleteVlog = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Delete this VLOG?')) return;
    try {
      const { error } = await supabase.rpc('delete_vlog', { p_id: id });
      if (error) throw error;
      await load();
    } catch (e) {
      console.error('[VlogReels] delete failed', e);
      alert('Failed to delete VLOG');
    }
  };

  const hasAny = rows.length > 0;

  if (!isOwner && !hasAny && !loading) {
    return (
      <div className={`${borderRadiusClass} overflow-hidden shadow-lg`} style={cardStyle}>
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">No {String(contentLabel || 'vlog')} yet.</div>
      </div>
    );
  }

  return (
    <div className={`${borderRadiusClass} overflow-hidden shadow-lg`} style={cardStyle}>
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-purple-500" />
          <div className="font-extrabold text-gray-900 dark:text-white">{String(title || 'Vlog')}</div>
        </div>
        {canEdit && (
          <button
            onClick={openUploader}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            <Plus className="w-4 h-4" />
            Add VLOG
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">Loading {String(contentLabel || 'vlog')}…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <div className="text-gray-600 dark:text-gray-400">No {String(contentLabel || 'vlog')} yet.</div>
          {canEdit && (
            <button
              onClick={openUploader}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              + Add VLOG
            </button>
          )}
        </div>
      ) : (
        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
            {rows.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => {
                  setViewerIndex(idx);
                  setViewerOpen(true);
                }}
                className="aspect-square relative overflow-hidden bg-black/5 dark:bg-black/30"
                aria-label={r.caption || 'View reel'}
              >
                <video
                  src={r.video_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold">
                  {formatDuration(r.duration_seconds)}
                </div>
                {canEdit && (
                  <div
                    className="absolute bottom-2 right-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void deleteVlog(r.id);
                    }}
                  >
                    <div className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewerOpen && rows.length > 0 && (
        <div className="fixed inset-0 z-[1400] bg-black" role="dialog" aria-modal="true">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="h-full w-full overflow-y-auto snap-y snap-mandatory"
            style={{ scrollSnapType: 'y mandatory' }}
            onScroll={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              const h = el.clientHeight;
              if (h <= 0) return;
              const idx = Math.round(el.scrollTop / h);
              if (idx !== viewerIndex) setViewerIndex(Math.max(0, Math.min(rows.length - 1, idx)));
            }}
            ref={(el) => {
              if (!el) return;
              requestAnimationFrame(() => {
                el.scrollTo({ top: viewerIndex * el.clientHeight, behavior: 'instant' as any });
              });
            }}
          >
            {rows.map((r) => (
              <div key={r.id} className="h-screen w-full snap-start relative" style={{ scrollSnapAlign: 'start' }}>
                <video
                  src={r.video_url}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
                {!!r.caption && (
                  <div className="absolute bottom-6 left-4 right-4 text-white font-semibold drop-shadow">
                    {r.caption}
                  </div>
                )}
                {canEdit && (
                  <button
                    onClick={() => void deleteVlog(r.id)}
                    className="absolute top-4 left-4 z-10 px-3 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold inline-flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploaderOpen && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => (!saving ? setUploaderOpen(false) : null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">Add VLOG</div>
              <button
                className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:opacity-80"
                onClick={() => (!saving ? setUploaderOpen(false) : null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Caption (optional)</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Say something…"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Video (≤ 60s)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Vertical videos work best. Max 250MB.</div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700"
                  disabled={saving}
                  onClick={() => setUploaderOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60"
                  disabled={saving}
                  onClick={() => void saveVlog()}
                >
                  {saving ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
