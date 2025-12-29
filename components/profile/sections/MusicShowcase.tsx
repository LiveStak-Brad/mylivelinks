/**
 * Music Showcase Section (Musician/Artist profile type)
 *
 * Requirements:
 * - REAL audio player (HTMLAudioElement): play/pause, next/back, cycles playlist
 * - Playlist dropdown showing current track title
 * - Owner-only playlist management: add/remove/reorder (UI support; persistence wired later)
 * - No dummy audio sources in production UI: if empty, show owner-only "Add Track" empty state
 * - Add flow must include rights checkbox text + removal risk warning
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { getEmptyStateText } from '@/lib/mockDataProviders';
import type { ProfileType } from '@/lib/profileTypeConfig';
import { createClient } from '@/lib/supabase';
import { uploadProfileMedia } from '@/lib/storage';

export type MusicTrackRow = {
  id: string;
  title: string;
  artist_name?: string | null;
  audio_url: string;
  cover_art_url?: string | null;
  sort_order?: number | null;
  rights_confirmed?: boolean | null;
};

interface MusicShowcaseProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  /** Real data when available (from `profile_music_tracks`). */
  tracks?: MusicTrackRow[];
  /** UI-only callback; persistence wired later. */
  onTracksChange?: (nextTracks: MusicTrackRow[]) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

function safeUuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `tmp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

export default function MusicShowcase({
  profileType,
  isOwner = false,
  tracks,
  onTracksChange,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
}: MusicShowcaseProps) {
  const supabase = useMemo(() => createClient(), []);
  const emptyState = getEmptyStateText('music_showcase', profileType);

  // IMPORTANT: No mock audio in production UI. If tracks aren't passed, default to empty.
  const [uiTracks, setUiTracks] = useState<MusicTrackRow[]>(() => (tracks ? tracks : []));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newAudioSource, setNewAudioSource] = useState<'url' | 'upload'>('url');
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newCoverSource, setNewCoverSource] = useState<'url' | 'upload'>('url');
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [tracksLoaded, setTracksLoaded] = useState(false);

  const loadTracks = async (pid: string) => {
    const { data, error } = await supabase.rpc('get_music_tracks', { p_profile_id: pid });
    if (error) throw error;
    const rows = Array.isArray(data) ? (data as any[]) : [];
    const next = rows.map((r) => ({
      id: String(r?.id ?? ''),
      title: String(r?.title ?? ''),
      artist_name: r?.artist_name ?? null,
      audio_url: String(r?.audio_url ?? ''),
      cover_art_url: r?.cover_art_url ?? null,
      sort_order: r?.sort_order ?? null,
      rights_confirmed: r?.rights_confirmed ?? null,
    })) as MusicTrackRow[];
    setUiTracks(next);
    onTracksChange?.(next);
    setCurrentIndex((idx) => {
      const max = Math.max(next.length - 1, 0);
      return Math.min(Math.max(idx, 0), max);
    });
    return next;
  };

  // Resolve profile id from URL username (so we don't need parent wiring).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (typeof window === 'undefined') return;
        const path = window.location?.pathname ?? '';
        const parts = path.split('/').filter(Boolean);
        const uname = parts?.[0] ? decodeURIComponent(parts[0]) : '';
        if (!uname) return;
        const { data, error } = await supabase.from('profiles').select('id').ilike('username', uname).maybeSingle();
        if (cancelled) return;
        if (error || !data?.id) return;
        setProfileId(String((data as any).id));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Load persisted tracks once we know profile id.
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadTracks(profileId);
      } catch (e) {
        console.error('[MusicShowcase] Failed to load tracks', e);
      } finally {
        if (!cancelled) setTracksLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    // Only treat `tracks` as an initial fallback until we load persisted tracks.
    if (!tracks) return;
    if (tracksLoaded) return;
    setUiTracks(tracks);
    setCurrentIndex((idx) => {
      const max = Math.max(tracks.length - 1, 0);
      return Math.min(Math.max(idx, 0), max);
    });
  }, [tracks]);

  const currentTrack = uiTracks[currentIndex] ?? null;
  const canPlay = !!currentTrack?.audio_url;

  const setTracks = (next: MusicTrackRow[]) => {
    setUiTracks(next);
    onTracksChange?.(next);
  };

  // Keep audio element in sync with track + play state.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!currentTrack?.audio_url) {
      el.pause();
      el.removeAttribute('src');
      setIsPlaying(false);
      return;
    }

    if (el.src !== currentTrack.audio_url) {
      el.src = currentTrack.audio_url;
      el.load();
    }

    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [currentTrack?.audio_url, isPlaying]);

  // Cycle playlist on end.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => {
      if (uiTracks.length <= 1) {
        setIsPlaying(false);
        return;
      }
      setCurrentIndex((i) => (i + 1) % uiTracks.length);
      setIsPlaying(true);
    };
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [uiTracks.length]);

  const togglePlay = () => {
    if (!canPlay) return;
    setIsPlaying((v) => !v);
  };

  const goNext = () => {
    if (!uiTracks.length) return;
    setCurrentIndex((i) => (i + 1) % uiTracks.length);
    setIsPlaying(true);
  };

  const goPrev = () => {
    if (!uiTracks.length) return;
    setCurrentIndex((i) => (i - 1 + uiTracks.length) % uiTracks.length);
    setIsPlaying(true);
  };

  const removeTrack = async (id: string) => {
    const idx = uiTracks.findIndex((t) => t.id === id);
    const next = uiTracks.filter((t) => t.id !== id);

    if (isOwner && profileId) {
      try {
        const { error } = await supabase.rpc('delete_music_track', { p_id: id });
        if (error) throw error;
        if (next.length) {
          await supabase.rpc('reorder_music_tracks', {
            p_ordered_ids: next.map((t) => t.id),
          });
        }
      } catch (e) {
        console.error('[MusicShowcase] delete failed', e);
        alert('Failed to delete track.');
        // best-effort refresh
        try {
          await loadTracks(profileId);
        } catch {
          // ignore
        }
        return;
      }
    }

    setTracks(next);
    if (currentTrack?.id === id) {
      try {
        audioRef.current?.pause();
      } catch {
        // ignore
      }
      setIsPlaying(false);
    }
    if (!next.length) {
      setCurrentIndex(0);
      return;
    }
    if (idx >= 0) {
      setCurrentIndex((cur) => Math.min(cur, next.length - 1));
    }
  };

  const moveTrack = async (id: string, dir: -1 | 1) => {
    const idx = uiTracks.findIndex((t) => t.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= uiTracks.length) return;
    const next = [...uiTracks];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    setTracks(next);
    const selectedId = currentTrack?.id ?? item.id;
    setCurrentIndex(next.findIndex((t) => t.id === selectedId));

    if (isOwner && profileId) {
      try {
        const { error } = await supabase.rpc('reorder_music_tracks', {
          p_ordered_ids: next.map((t) => t.id),
        });
        if (error) throw error;
      } catch (e) {
        console.error('[MusicShowcase] reorder failed', e);
        // revert by reloading server order
        try {
          await loadTracks(profileId);
        } catch {
          // ignore
        }
      }
    }
  };

  const openAdd = () => {
    setFormError(null);
    setNewTitle('');
    setNewArtist('');
    setNewAudioUrl('');
    setNewAudioSource('url');
    setNewAudioFile(null);
    setNewCoverUrl('');
    setNewCoverSource('url');
    setNewCoverFile(null);
    setRightsConfirmed(false);
    setShowAddModal(true);
  };

  const submitAdd = async () => {
    setFormError(null);
    const title = newTitle.trim();
    let audioUrl = newAudioUrl.trim();
    const artist = newArtist.trim();
    let coverUrl = newCoverUrl.trim();

    if (!title) return setFormError('Track title is required.');
    if (!rightsConfirmed) return setFormError('You must confirm you own the rights or have permission.');

    if (newAudioSource === 'upload') {
      if (!newAudioFile) return setFormError('Please select an MP3 or WAV file to upload.');
      const name = String(newAudioFile.name || '').toLowerCase();
      const type = String(newAudioFile.type || '').toLowerCase();
      const isMp3 = type === 'audio/mpeg' || name.endsWith('.mp3');
      const isWav = type === 'audio/wav' || type === 'audio/x-wav' || name.endsWith('.wav');
      if (!isMp3 && !isWav) return setFormError('Only MP3 or WAV files are supported.');
      if (newAudioFile.size > 50 * 1024 * 1024) return setFormError('Audio file too large (max 50MB).');
    }

    if (newCoverSource === 'upload') {
      if (!newCoverFile) return setFormError('Please select a cover image to upload.');
      const name = String(newCoverFile.name || '').toLowerCase();
      const type = String(newCoverFile.type || '').toLowerCase();
      const isJpg = type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
      const isPng = type === 'image/png' || name.endsWith('.png');
      const isWebp = type === 'image/webp' || name.endsWith('.webp');
      if (!isJpg && !isPng && !isWebp) return setFormError('Cover art must be a JPG, PNG, or WEBP image.');
      if (newCoverFile.size > 10 * 1024 * 1024) return setFormError('Cover image too large (max 10MB).');
    }

    if (newAudioSource === 'upload' && profileId) {
      try {
        const storageId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : safeUuid();
        audioUrl = await uploadProfileMedia(profileId, `music/tracks/${storageId}/audio`, newAudioFile as File, { upsert: false });
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to upload audio.';
        console.error('[MusicShowcase] audio upload failed', e);
        return setFormError(msg);
      }
    }

    if (newCoverSource === 'upload') {
      if (!profileId) {
        return setFormError('Unable to upload cover art right now. Please try again after reloading the page.');
      }
      try {
        const storageId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : safeUuid();
        coverUrl = await uploadProfileMedia(profileId, `music/tracks/${storageId}/cover`, newCoverFile as File, { upsert: false });
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : 'Failed to upload cover art.';
        console.error('[MusicShowcase] cover upload failed', e);
        return setFormError(msg);
      }
    }

    if (!audioUrl) return setFormError('Audio URL is required.');

    if (!profileId) {
      // Fallback: keep UI working even if we couldn't resolve profileId (should be rare).
      const nextTrack: MusicTrackRow = {
        id: safeUuid(),
        title,
        artist_name: artist || null,
        audio_url: audioUrl,
        cover_art_url: coverUrl || null,
        rights_confirmed: true,
      };
      const next = [...uiTracks, nextTrack];
      setTracks(next);
      setCurrentIndex(next.length - 1);
      setIsPlaying(true);
      setShowAddModal(false);
      setPlaylistOpen(false);
      return;
    }

    try {
      const payload: any = {
        title,
        artist_name: artist || null,
        audio_url: audioUrl,
        cover_art_url: coverUrl || null,
        sort_order: uiTracks.length,
        rights_confirmed: true,
      };
      const { data, error } = await supabase.rpc('upsert_music_track', { p_id: null, p_payload: payload });
      if (error) throw error;
      const row: any = data ?? null;
      if (!row?.id) throw new Error('Missing track id from RPC');

      const nextTrack: MusicTrackRow = {
        id: String(row.id),
        title: String(row.title ?? title),
        artist_name: row.artist_name ?? (artist || null),
        audio_url: String(row.audio_url ?? audioUrl),
        cover_art_url: row.cover_art_url ?? (coverUrl || null),
        sort_order: row.sort_order ?? uiTracks.length,
        rights_confirmed: row.rights_confirmed ?? true,
      };
      const next = [...uiTracks, nextTrack];
      setTracks(next);
      setCurrentIndex(next.length - 1);
      setIsPlaying(true);
      setShowAddModal(false);
      setPlaylistOpen(false);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to save track.';
      console.error('[MusicShowcase] save failed', e);
      setFormError(msg);
    }
  };

  // Empty state (owner-only)
  if (!uiTracks.length) {
    if (!isOwner) return null;
    return (
      <div
        className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            🎵 Music
          </h2>
        </div>

        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyState.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyState.text}</p>
          <button
            onClick={openAdd}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            {emptyState.ownerCTA || 'Add Track'}
          </button>
        </div>

        {showAddModal && (
          <AddTrackModal
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newArtist={newArtist}
            setNewArtist={setNewArtist}
            newAudioUrl={newAudioUrl}
            setNewAudioUrl={setNewAudioUrl}
            newAudioSource={newAudioSource}
            setNewAudioSource={setNewAudioSource}
            newAudioFile={newAudioFile}
            setNewAudioFile={setNewAudioFile}
            newCoverUrl={newCoverUrl}
            setNewCoverUrl={setNewCoverUrl}
            newCoverSource={newCoverSource}
            setNewCoverSource={setNewCoverSource}
            newCoverFile={newCoverFile}
            setNewCoverFile={setNewCoverFile}
            rightsConfirmed={rightsConfirmed}
            setRightsConfirmed={setRightsConfirmed}
            formError={formError}
            onClose={() => setShowAddModal(false)}
            onSubmit={submitAdd}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          🎵 Music
        </h2>
        {isOwner && (
          <button
            onClick={openAdd}
            className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            + Add Track
          </button>
        )}
      </div>

      <audio ref={audioRef} className="hidden" preload="metadata" />

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Now Playing</div>
            <div className="text-base font-extrabold text-gray-900 dark:text-white truncate">
              {currentTrack?.title ?? '—'}
            </div>
            {!!currentTrack?.artist_name && (
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">
                {currentTrack.artist_name}
              </div>
            )}
            {!canPlay && (
              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                This track needs an audio URL to play.
              </div>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setPlaylistOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-black/20 border border-purple-200/60 dark:border-purple-700/30 text-sm font-bold text-gray-900 dark:text-white"
            >
              Playlist ({uiTracks.length})
              <ChevronDown className={`w-4 h-4 transition-transform ${playlistOpen ? 'rotate-180' : ''}`} />
            </button>

            {playlistOpen && (
              <div className="absolute right-0 mt-2 w-[340px] max-w-[80vw] z-20 rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="max-h-80 overflow-auto">
                  {uiTracks.map((t, idx) => {
                    const selected = currentTrack?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 ${
                          selected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => {
                            setCurrentIndex(idx);
                            setIsPlaying(true);
                            setPlaylistOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                {t.title}
                              </div>
                              {!!t.artist_name && (
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate">
                                  {t.artist_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveTrack(t.id, -1)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                              title="Move up (UI only)"
                            >
                              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveTrack(t.id, 1)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                              title="Move down (UI only)"
                            >
                              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTrack(t.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Remove track"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isOwner && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={openAdd}
                      className="w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold"
                    >
                      + Add Track
                    </button>
                    <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                      Reordering is UI-only for now (saving is wired later).
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-purple-200/60 dark:border-purple-700/30 flex items-center justify-center"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!canPlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
              canPlay ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={goNext}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-purple-200/60 dark:border-purple-700/30 flex items-center justify-center"
            title="Next"
          >
            <SkipForward className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddTrackModal
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newArtist={newArtist}
          setNewArtist={setNewArtist}
          newAudioUrl={newAudioUrl}
          setNewAudioUrl={setNewAudioUrl}
          newAudioSource={newAudioSource}
          setNewAudioSource={setNewAudioSource}
          newAudioFile={newAudioFile}
          setNewAudioFile={setNewAudioFile}
          newCoverUrl={newCoverUrl}
          setNewCoverUrl={setNewCoverUrl}
          newCoverSource={newCoverSource}
          setNewCoverSource={setNewCoverSource}
          newCoverFile={newCoverFile}
          setNewCoverFile={setNewCoverFile}
          rightsConfirmed={rightsConfirmed}
          setRightsConfirmed={setRightsConfirmed}
          formError={formError}
          onClose={() => setShowAddModal(false)}
          onSubmit={submitAdd}
        />
      )}
    </div>
  );
}

function AddTrackModal(props: {
  newTitle: string;
  setNewTitle: (v: string) => void;
  newArtist: string;
  setNewArtist: (v: string) => void;
  newAudioUrl: string;
  setNewAudioUrl: (v: string) => void;
  newAudioSource: 'url' | 'upload';
  setNewAudioSource: (v: 'url' | 'upload') => void;
  newAudioFile: File | null;
  setNewAudioFile: (v: File | null) => void;
  newCoverUrl: string;
  setNewCoverUrl: (v: string) => void;
  newCoverSource: 'url' | 'upload';
  setNewCoverSource: (v: 'url' | 'upload') => void;
  newCoverFile: File | null;
  setNewCoverFile: (v: File | null) => void;
  rightsConfirmed: boolean;
  setRightsConfirmed: (v: boolean) => void;
  formError: string | null;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div
        className="fixed inset-0 bg-black/60"
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
        onClick={props.onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-5"
        style={{ zIndex: 'var(--z-modal)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-extrabold text-gray-900 dark:text-white">Add Track</div>
          <button
            type="button"
            onClick={props.onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
          >
            Close
          </button>
        </div>

        {props.formError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-bold text-red-700 dark:text-red-300">
            {props.formError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Track Title *</label>
            <input
              value={props.newTitle}
              onChange={(e) => props.setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
              placeholder="e.g. Midnight Dreams"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Artist Name</label>
            <input
              value={props.newArtist}
              onChange={(e) => props.setNewArtist(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
              placeholder="e.g. Jane Artist"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Audio Source *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => props.setNewAudioSource('url')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-extrabold border ${
                  props.newAudioSource === 'url' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                Audio URL
              </button>
              <button
                type="button"
                onClick={() => props.setNewAudioSource('upload')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-extrabold border ${
                  props.newAudioSource === 'upload' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                Upload MP3/WAV
              </button>
            </div>

            {props.newAudioSource === 'url' ? (
              <div className="mt-2">
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Audio URL *</label>
                <input
                  value={props.newAudioUrl}
                  onChange={(e) => props.setNewAudioUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                  placeholder="https://.../track.mp3"
                />
              </div>
            ) : (
              <div className="mt-2">
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Audio File *</label>
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,.mp3,.wav"
                  onChange={(e) => props.setNewAudioFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {!!props.newAudioFile && (
                  <div className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Selected: {props.newAudioFile.name}</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Cover Art (optional)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => props.setNewCoverSource('url')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-extrabold border ${
                  props.newCoverSource === 'url' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                Cover URL
              </button>
              <button
                type="button"
                onClick={() => props.setNewCoverSource('upload')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-extrabold border ${
                  props.newCoverSource === 'upload' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                Upload Image
              </button>
            </div>

            {props.newCoverSource === 'url' ? (
              <div className="mt-2">
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Cover Art URL</label>
                <input
                  value={props.newCoverUrl}
                  onChange={(e) => props.setNewCoverUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                  placeholder="https://.../cover.jpg"
                />
              </div>
            ) : (
              <div className="mt-2">
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1">Cover Art File</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => props.setNewCoverFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {!!props.newCoverFile && (
                  <div className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Selected: {props.newCoverFile.name}</div>
                )}
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <input
              type="checkbox"
              checked={props.rightsConfirmed}
              onChange={(e) => props.setRightsConfirmed(e.target.checked)}
              className="mt-1"
            />
            <div className="text-sm">
              <div className="font-extrabold text-gray-900 dark:text-white">
                I own the rights or have permission to upload this content.
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1">
                Removing tracks later may break shares/embeds and can affect existing listeners.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onSubmit}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold"
          >
            Add Track
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


