/**
 * Music Videos Section (Musician Profile Type)
 *
 * CREATOR STUDIO PROFILE WIRING
 * =============================
 * This component reads from BOTH data sources:
 * 1. Creator Studio: creator_studio_items (item_type='music_video') - PRIMARY
 * 2. Legacy: profile_music_videos - FALLBACK for backward compatibility
 * 
 * Creator Studio items appear first, deduped by title.
 * Navigation links only work for Creator Studio items (canonical routes).
 * 
 * Canonical route: /[username]/music-video/[id]
 * See docs/CREATOR_STUDIO_PROFILE_WIRING.md for full documentation.
 *
 * Owner:
 * - Add uploaded video OR YouTube URL
 * - Mandatory rights confirmation checkbox + warning
 * - Edit/Delete actions
 *
 * Visitor:
 * - Browse + play only (no add/edit controls)
 */

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Play, Music, Film } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { uploadProfileMedia } from '@/lib/storage';
import { useCreatorStudioItems, type CreatorStudioItem } from '@/hooks/useCreatorStudioItems';

type VideoPlaylistItem = {
  id: string;
  title: string;
  video_type: 'upload' | 'youtube';
  video_url: string;
  youtube_id?: string | null;
  thumbnail_url?: string | null;
};

type VideoType = 'upload' | 'youtube';

type MusicVideoRow = {
  id: string;
  profile_id: string;
  title: string;
  description?: string | null;
  video_type: VideoType;
  video_url: string;
  youtube_id: string | null;
  thumbnail_url?: string | null;
  views_count: number;
  sort_order: number;
  rights_confirmed: boolean;
  rights_confirmed_at: string | null;
  created_at: string;
  updated_at?: string;
};

type Props = {
  profileId: string;
  isOwner: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  /** Username of the artist (for gifting) */
  artistUsername?: string;
  buttonColor?: string;
};

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;

  // Accept raw 11-char id
  const raw = v.match(/^[A-Za-z0-9_-]{11}$/);
  if (raw) return raw[0];

  // youtu.be/{id}
  const shortMatch = v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  // youtube.com/watch?v={id}
  const watchMatch = v.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  // youtube.com/embed/{id} or youtube.com/shorts/{id}
  const embedMatch = v.match(/youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];

  return null;
}

async function uploadToProfileMedia(profileId: string, videoId: string, file: File, upsert: boolean): Promise<string> {
  const relPath = `music/videos/${videoId}/video`;
  return uploadProfileMedia(profileId, relPath, file, { upsert });
}

export default function MusicVideos({ profileId, isOwner, cardStyle, borderRadiusClass = 'rounded-2xl', artistUsername, buttonColor = '#DB2777' }: Props) {
  // Pill button style for Creator Studio link
  const pillButtonClass = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80";
  const pillButtonLightClass = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-opacity hover:opacity-80";
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MusicVideoRow[]>([]);
  
  // Also fetch Creator Studio music_video items
  const { items: creatorStudioItems, loading: csLoading } = useCreatorStudioItems({
    profileId,
    itemType: 'music_video',
  });
  
  // Track which items came from Creator Studio (by ID) for link building
  const creatorStudioIds = useMemo(() => new Set(creatorStudioItems.map(i => i.id)), [creatorStudioItems]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MusicVideoRow | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<VideoType>('youtube');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formThumbnailFile, setFormThumbnailFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const resetForm = () => {
    setEditing(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('youtube');
    setFormYoutubeUrl('');
    setFormFile(null);
    setFormThumbnailFile(null);
    setRightsConfirmed(false);
    setUploadProgress(null);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (row: MusicVideoRow) => {
    setEditing(row);
    setFormTitle(row.title || '');
    setFormDescription(row.description || '');
    setFormType(row.video_type);
    setFormYoutubeUrl(row.video_type === 'youtube' ? row.video_url : '');
    setFormFile(null);
    setFormThumbnailFile(null);
    // Always force explicit checkbox on save to meet policy (even if DB has old data).
    setRightsConfirmed(false);
    setUploadProgress(null);
    setShowModal(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_music_videos', { p_profile_id: profileId });
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as MusicVideoRow[];
      setRows(list);
      setActiveId((prev) => prev ?? (list[0]?.id ?? null));
    } catch (e) {
      console.error('[MusicVideos] load failed', e);
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
  
  // Convert Creator Studio items to playlist format
  const csPlaylistItems: VideoPlaylistItem[] = creatorStudioItems.map((item) => ({
    id: item.id,
    title: item.title,
    video_type: item.media_url?.includes('youtube') ? 'youtube' as const : 'upload' as const,
    video_url: item.media_url || '',
    youtube_id: item.media_url?.includes('youtube') ? extractYoutubeId(item.media_url) : null,
  }));
  
  // Convert legacy items to playlist format
  const legacyPlaylistItems: VideoPlaylistItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    video_type: r.video_type,
    video_url: r.video_url,
    youtube_id: r.youtube_id,
  }));
  
  // Combine: Creator Studio first, then legacy (dedupe by title to avoid duplicates)
  const seenTitles = new Set<string>();
  const playlistItems: VideoPlaylistItem[] = [];
  
  for (const item of csPlaylistItems) {
    if (!seenTitles.has(item.title.toLowerCase())) {
      playlistItems.push(item);
      seenTitles.add(item.title.toLowerCase());
    }
  }
  for (const item of legacyPlaylistItems) {
    if (!seenTitles.has(item.title.toLowerCase())) {
      playlistItems.push(item);
      seenTitles.add(item.title.toLowerCase());
    }
  }
  
  const hasAny = playlistItems.length > 0;
  
  // DEV-ONLY: Log warning if profile has legacy items but no Creator Studio items
  // This helps detect profiles that haven't migrated to Creator Studio
  if (process.env.NODE_ENV === 'development' && !csLoading && !loading) {
    if (legacyPlaylistItems.length > 0 && csPlaylistItems.length === 0) {
      console.warn(
        `[MusicVideos] Profile ${profileId} has ${legacyPlaylistItems.length} legacy items but 0 Creator Studio items. ` +
        `Consider migrating to Creator Studio for canonical route support.`
      );
    }
  }
  
  // Link builder for canonical routes (only for Creator Studio items)
  const itemLinkBuilder = useCallback((item: VideoPlaylistItem): string | null => {
    if (!artistUsername) return null;
    // Only Creator Studio items have canonical routes
    if (creatorStudioIds.has(item.id)) {
      return `/${artistUsername}/music-video/${item.id}`;
    }
    return null;
  }, [artistUsername, creatorStudioIds]);

  // Helper to extract YouTube ID
  function extractYoutubeId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&/]+)/i);
    return match?.[1] || null;
  }

  // Get YouTube thumbnail URL
  const getYoutubeThumbnail = (item: VideoPlaylistItem): string | null => {
    const videoId = item.youtube_id || getYoutubeIdFromUrl(item.video_url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  // Build replay URL for video (canonical long-form player)
  const getWatchUrl = (item: VideoPlaylistItem): string => {
    if (!artistUsername) return '#';
    // Creator Studio items use music-video route, legacy items use replay route
    if (creatorStudioIds.has(item.id)) {
      return `/${artistUsername}/music-video/${item.id}`;
    }
    return `/replay/${artistUsername}/${item.id}`;
  };

  return (
    <>
      <div
        className={`${borderRadiusClass} p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        {/* Header with Creator Studio button */}
        {isOwner && hasAny && (
          <div className="flex justify-end mb-3">
            <Link
              href="/creator-studio/upload?type=music_video"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: buttonColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Creator Studio
            </Link>
          </div>
        )}

        {/* Loading state */}
        {(loading || csLoading) && (
          <div className="py-10 text-center text-gray-600 dark:text-gray-400">Loading videos…</div>
        )}

        {/* Empty state */}
        {!loading && !csLoading && !hasAny && (
          <div className="text-center py-12">
            <Film className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Music Videos Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Add videos so fans can watch in-app.</p>
            {isOwner && (
              <Link
                href="/creator-studio/upload?type=music_video"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: buttonColor }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Creator Studio
              </Link>
            )}
          </div>
        )}

        {/* Video Grid - 3 columns matching mobile */}
        {!loading && !csLoading && hasAny && (
          <div className="grid grid-cols-3 gap-0.5">
            {playlistItems.map((item) => {
              const thumbnailUrl = item.thumbnail_url || getYoutubeThumbnail(item);
              const watchUrl = getWatchUrl(item);
              
              return (
                <Link
                  key={item.id}
                  href={watchUrl}
                  className="relative aspect-square bg-gray-900 overflow-hidden group"
                >
                  {/* Thumbnail */}
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Music className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white opacity-90 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: buttonColor }}
                    >
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* Music badge */}
                  <div 
                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: buttonColor }}
                  >
                    <Music className="w-2.5 h-2.5 text-white" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => (!saving ? setShowModal(false) : null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">
                {editing ? 'Edit Music Video' : 'Add Music Video'}
              </div>
              <button
                className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:opacity-80"
                onClick={() => (!saving ? setShowModal(false) : null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="e.g., New Single (Official Video)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm resize-none"
                  placeholder="Add a description for your music video..."
                  rows={3}
                  maxLength={2000}
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
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Supports `watch`, `youtu.be`, `shorts`, and `embed` URLs.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Video File *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                        className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-700 dark:file:text-purple-300 file:font-semibold file:cursor-pointer"
                      />
                    </div>
                    {formFile && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <span>✓</span> {formFile.name} ({(formFile.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      MP4/H.264 recommended. Max 500MB.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Custom Thumbnail (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setFormThumbnailFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300 file:font-semibold file:cursor-pointer"
                    />
                    {formThumbnailFile && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <span>✓</span> {formThumbnailFile.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadProgress && (
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3">
                  <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {uploadProgress}
                  </div>
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
                    <div className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Posting music without rights may risk profile deletion.
                    </div>
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
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: buttonColor }}
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
                      let thumbnailUrl = editing?.thumbnail_url ?? null;
                      let videoType: VideoType = formType;
                      let rpcId: string | null = editing?.id ?? null;
                      const storageId = editing?.id ?? crypto.randomUUID();

                      if (formType === 'youtube') {
                        const id = getYoutubeIdFromUrl(formYoutubeUrl);
                        if (!id) {
                          alert('Please enter a valid YouTube URL.');
                          setSaving(false);
                          return;
                        }
                        videoUrl = formYoutubeUrl.trim();
                      } else {
                        if (formFile) {
                          // Validate file size (500MB max)
                          if (formFile.size > 500 * 1024 * 1024) {
                            alert('Video file must be 500MB or less.');
                            setSaving(false);
                            return;
                          }
                          setUploadProgress('Uploading video...');
                          // Canonical storage path: profile-media/{profile_id}/music/videos/{video_id}/video
                          videoUrl = await uploadToProfileMedia(profileId, storageId, formFile, Boolean(editing));
                          setUploadProgress('Video uploaded!');
                        }
                        if (!videoUrl) {
                          alert('Please select a video file to upload.');
                          setSaving(false);
                          return;
                        }
                        videoType = 'upload';
                        rpcId = editing?.id ?? null;
                      }

                      // Upload thumbnail if provided
                      if (formThumbnailFile) {
                        setUploadProgress('Uploading thumbnail...');
                        const thumbPath = `music/videos/${storageId}/thumb`;
                        thumbnailUrl = await uploadProfileMedia(profileId, thumbPath, formThumbnailFile, { upsert: true });
                      }

                      setUploadProgress('Saving...');

                      const payload: any = {
                        title,
                        description: formDescription.trim() || null,
                        video_type: videoType,
                        video_url: videoUrl,
                        thumbnail_url: thumbnailUrl,
                        rights_confirmed: true,
                      };

                      const { error } = await supabase.rpc('upsert_music_video', {
                        p_id: rpcId,
                        p_payload: payload,
                      });
                      if (error) throw error;

                      setShowModal(false);
                      resetForm();
                      await load();
                    } catch (e) {
                      console.error('[MusicVideos] save failed', e);
                      alert('Failed to save video. ' + (e instanceof Error ? e.message : ''));
                    } finally {
                      setSaving(false);
                      setUploadProgress(null);
                    }
                  }}
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Video'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


