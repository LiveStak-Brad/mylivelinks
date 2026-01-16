'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clapperboard, Trash2, X } from 'lucide-react';
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
        {canEdit && hasAny && (
          <Link
            href="/creator-studio/upload?type=vlog"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-colors"
          >
            + Creator Studio
          </Link>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">Loading {String(contentLabel || 'vlog')}…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <div className="text-gray-600 dark:text-gray-400">No {String(contentLabel || 'vlog')} yet.</div>
          {canEdit && (
            <Link
              href="/creator-studio/upload?type=vlog"
              className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              + Creator Studio
            </Link>
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
                aria-label={r.caption || 'View vlog'}
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
    </div>
  );
}
