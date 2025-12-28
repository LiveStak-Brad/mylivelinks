'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { uploadProfileMedia } from '@/lib/storage';
import VideoPlaylistPlayer, { type VideoPlaylistItem } from './VideoPlaylistPlayer';

type VideoType = 'upload' | 'youtube';

type ComedySpecialRow = {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  video_type: VideoType;
  video_url: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  rights_confirmed: boolean;
  rights_confirmed_at: string | null;
  created_at: string;
};

type Props = {
  profileId: string;
  isOwner: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
};

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;

  // Accept raw 11-char id
  const raw = v.match(/^[A-Za-z0-9_-]{11}$/);
  if (raw) return raw[0];

  const shortMatch = v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  const watchMatch = v.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  const embedMatch = v.match(/youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];

  return null;
}

async function uploadSpecialVideo(profileId: string, specialId: string, file: File): Promise<string> {
  const relPath = `comedy/specials/${specialId}/video`;
  return uploadProfileMedia(profileId, relPath, file, { upsert: true });
}

export default function ComedySpecials({ profileId, isOwner, cardStyle, borderRadiusClass = 'rounded-2xl' }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ComedySpecialRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ComedySpecialRow | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<VideoType>('youtube');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('youtube');
    setFormYoutubeUrl('');
    setFormFile(null);
    setRightsConfirmed(false);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (row: ComedySpecialRow) => {
    setEditing(row);
    setFormTitle(row.title || '');
    setFormDescription(row.description || '');
    setFormType(row.video_type);
    setFormYoutubeUrl(row.video_type === 'youtube' ? row.video_url : '');
    setFormFile(null);
    setRightsConfirmed(false);
    setShowModal(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_comedy_specials', { p_profile_id: profileId });
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as ComedySpecialRow[];
      setRows(list);
      setActiveId((prev) => prev ?? (list[0]?.id ?? null));
    } catch (e) {
      console.error('[ComedySpecials] load failed', e);
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
  const playlistItems: VideoPlaylistItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    video_type: r.video_type,
    video_url: r.video_url,
    youtube_id: r.youtube_id,
    subtitle: r.description,
  }));

  return (
    <>
      {loading ? (
        <div
          className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
          style={cardStyle}
        >
          <div className="py-10 text-center text-gray-600 dark:text-gray-400">Loading specials…</div>
        </div>
      ) : (
        <VideoPlaylistPlayer
          title="🎞️ Comedy Specials"
          items={playlistItems}
          isOwner={isOwner}
          onAdd={openAdd}
          onEdit={(it) => {
            const row = rows.find((r) => r.id === it.id);
            if (row) openEdit(row);
          }}
          onDelete={async (it) => {
            if (!confirm('Delete this special?')) return;
            try {
              const { error } = await supabase.rpc('delete_comedy_special', { p_id: it.id });
              if (error) throw error;
              await load();
            } catch (e) {
              console.error('[ComedySpecials] delete failed', e);
              alert('Failed to delete special.');
            }
          }}
          cardStyle={cardStyle}
          borderRadiusClass={borderRadiusClass}
          emptyTitle="No Comedy Specials Yet"
          emptyText="Add an uploaded video or a YouTube URL so visitors can watch your specials."
          emptyOwnerCTA="+ Add Special"
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => (!saving ? setShowModal(false) : null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                {editing ? 'Edit Comedy Special' : 'Add Comedy Special'}
              </div>
              <button
                className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:opacity-80"
                onClick={() => (!saving ? setShowModal(false) : null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="e.g., Live at The Apollo"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm min-h-[84px]"
                  placeholder="Short blurb about the special"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Source</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormType('youtube')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border ${
                      formType === 'youtube'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    YouTube URL
                  </button>
                  <button
                    onClick={() => setFormType('upload')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border ${
                      formType === 'upload'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    Upload Video
                  </button>
                </div>
              </div>

              {formType === 'youtube' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">YouTube URL</label>
                  <input
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Supports `watch`, `youtu.be`, `shorts`, and `embed` URLs.</div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
              )}

              <div className="rounded-xl border border-amber-200/70 dark:border-amber-700/40 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={(e) => setRightsConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    I own the rights or have permission to upload this content.
                    <div className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Posting copyrighted work without rights may risk profile deletion.</div>
                  </span>
                </label>
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
                    const title = formTitle.trim();
                    if (!title) {
                      alert('Title is required.');
                      return;
                    }
                    if (!rightsConfirmed) {
                      alert('You must confirm rights to post.');
                      return;
                    }

                    setSaving(true);
                    try {
                      let videoUrl = editing?.video_url ?? '';
                      let videoType: VideoType = formType;
                      let payloadUrl = '';

                      if (formType === 'youtube') {
                        const id = getYoutubeIdFromUrl(formYoutubeUrl);
                        if (!id) {
                          alert('Please enter a valid YouTube URL.');
                          return;
                        }
                        payloadUrl = formYoutubeUrl.trim();
                        videoType = 'youtube';
                        videoUrl = payloadUrl;
                      } else {
                        const specialId = editing?.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()));
                        if (formFile) {
                          videoUrl = await uploadSpecialVideo(profileId, String(specialId), formFile);
                        }
                        if (!videoUrl) {
                          alert('Please select a video file to upload.');
                          return;
                        }
                        videoType = 'upload';
                      }

                      const payload: any = {
                        title,
                        description: formDescription.trim() || null,
                        video_type: videoType,
                        video_url: videoUrl,
                        rights_confirmed: true,
                      };

                      const { error } = await supabase.rpc('upsert_comedy_special', {
                        p_id: editing?.id ?? null,
                        p_payload: payload,
                      });
                      if (error) throw error;

                      setShowModal(false);
                      resetForm();
                      await load();
                    } catch (e) {
                      console.error('[ComedySpecials] save failed', e);
                      alert('Failed to save special.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Special'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
