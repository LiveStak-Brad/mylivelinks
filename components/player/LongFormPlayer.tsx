'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Gift,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music2,
  Film,
  Mic,
  Clapperboard,
  BookOpen,
  Layers,
} from 'lucide-react';
import GiftModal from '@/components/GiftModal';
import { CommentModal } from '@/components/CommentModal';
import { createClient } from '@/lib/supabase';

export type ContentType = 'music' | 'music_video' | 'movie' | 'podcast' | 'series_episode' | 'education' | 'vlog' | 'comedy_special' | 'other';
export type MediaSourceType = 'upload' | 'youtube';

export interface LongFormContentItem {
  id: string;
  title: string;
  description?: string | null;
  content_type: ContentType;
  media_type: MediaSourceType;
  media_url: string;
  youtube_id?: string | null;
  artwork_url?: string | null;
  thumb_url?: string | null;
  duration_seconds?: number | null;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
}

interface Props {
  item: LongFormContentItem;
  artistProfileId: string;
  artistUsername: string;
  artistDisplayName?: string;
  artistAvatarUrl?: string | null;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  playlist?: LongFormContentItem[];
  onPlaylistItemSelect?: (item: LongFormContentItem) => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;

  const shortMatch = v.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) return shortMatch[1];

  const watchMatch = v.match(/[?&]v=([^?&/]+)/i);
  if (watchMatch?.[1]) return watchMatch[1];

  const embedMatch = v.match(/youtube\.com\/(?:embed|shorts)\/([^?&/]+)/i);
  if (embedMatch?.[1]) return embedMatch[1];

  return null;
}

function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.getElementById('youtube-iframe-api');
    if (existing) {
      const check = () => {
        if (window.YT && window.YT.Player) resolve();
        else setTimeout(check, 50);
      };
      check();
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } finally {
        resolve();
      }
    };

    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case 'music': return Music2;
    case 'music_video': return Film;
    case 'movie': return Clapperboard;
    case 'podcast': return Mic;
    case 'series_episode': return Layers;
    case 'education': return BookOpen;
    default: return Film;
  }
}

function getContentTypeLabel(type: ContentType): string {
  switch (type) {
    case 'music': return 'Music';
    case 'music_video': return 'Music Video';
    case 'movie': return 'Movie';
    case 'podcast': return 'Podcast';
    case 'series_episode': return 'Episode';
    case 'education': return 'Education';
    case 'vlog': return 'Vlog';
    case 'comedy_special': return 'Comedy';
    default: return 'Video';
  }
}

function isAudioOnlyType(type: ContentType): boolean {
  return type === 'music' || type === 'podcast';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function LongFormPlayer({
  item,
  artistProfileId,
  artistUsername,
  artistDisplayName,
  artistAvatarUrl,
  isOwner = false,
  onEdit,
  onDelete,
  playlist,
  onPlaylistItemSelect,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const [isLiked, setIsLiked] = useState(item.is_liked ?? false);
  const [isSaved, setIsSaved] = useState(item.is_saved ?? false);
  const [likesCount, setLikesCount] = useState(item.likes_count ?? 0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);

  const isAudioOnly = isAudioOnlyType(item.content_type);
  const ContentIcon = getContentTypeIcon(item.content_type);

  const currentIndex = playlist?.findIndex(p => p.id === item.id) ?? -1;
  const hasPlaylist = playlist && playlist.length > 1;

  const goNext = () => {
    if (!playlist || !onPlaylistItemSelect) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    onPlaylistItemSelect(playlist[nextIndex]);
  };

  const goPrev = () => {
    if (!playlist || !onPlaylistItemSelect) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    onPlaylistItemSelect(playlist[prevIndex]);
  };

  const togglePlay = () => {
    setIsPlaying((v) => !v);
  };

  useEffect(() => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;

    const onEnded = () => {
      if (hasPlaylist) {
        goNext();
      } else {
        setIsPlaying(false);
      }
    };

    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [hasPlaylist, isAudioOnly]);

  useEffect(() => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;

    if (item.media_type !== 'upload' || !item.media_url) {
      try { el.pause(); } catch {}
      el.removeAttribute('src');
      setIsPlaying(false);
      return;
    }

    if (el.src !== item.media_url) {
      el.src = item.media_url;
      el.load();
    }

    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [item.id, item.media_type, item.media_url, isPlaying, isAudioOnly]);

  useEffect(() => {
    if (item.media_type !== 'youtube') return;

    const youtubeId = item.youtube_id || getYoutubeIdFromUrl(item.media_url);
    if (!youtubeId) {
      setIsPlaying(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      await ensureYouTubeIframeApi();
      if (cancelled) return;
      if (!ytHostRef.current) return;

      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player(ytHostRef.current, {
          videoId: youtubeId,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
              if (isPlaying) {
                try { ytPlayerRef.current?.playVideo?.(); } catch {}
              }
            },
            onStateChange: (evt: any) => {
              if (evt?.data === 0) {
                if (hasPlaylist) goNext();
                else setIsPlaying(false);
              }
              if (evt?.data === 1) setIsPlaying(true);
              if (evt?.data === 2) setIsPlaying(false);
            },
          },
        });
      } else {
        try { ytPlayerRef.current?.loadVideoById?.(youtubeId); } catch {}
      }
    })();

    return () => { cancelled = true; };
  }, [item.id]);

  useEffect(() => {
    if (item.media_type !== 'youtube') {
      try { ytPlayerRef.current?.stopVideo?.(); } catch {}
      return;
    }

    if (!ytPlayerRef.current || !ytReadyRef.current) return;

    try {
      if (isPlaying) ytPlayerRef.current?.playVideo?.();
      else ytPlayerRef.current?.pauseVideo?.();
    } catch {}
  }, [item.media_type, isPlaying]);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await supabase.rpc('unlike_creator_studio_item', { p_item_id: item.id });
        setIsLiked(false);
        setLikesCount(c => Math.max(0, c - 1));
      } else {
        await supabase.rpc('like_creator_studio_item', { p_item_id: item.id });
        setIsLiked(true);
        setLikesCount(c => c + 1);
      }
    } catch (e) {
      console.error('Like action failed:', e);
    }
  };

  const handleSave = async () => {
    try {
      if (isSaved) {
        await supabase.rpc('unsave_creator_studio_item', { p_item_id: item.id });
        setIsSaved(false);
      } else {
        await supabase.rpc('save_creator_studio_item', { p_item_id: item.id });
        setIsSaved(true);
      }
    } catch (e) {
      console.error('Save action failed:', e);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60 bg-card shadow-lg">
        <div className="px-4 py-3 flex items-start justify-between gap-3 bg-white/60 dark:bg-gray-900/40 backdrop-blur border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ContentIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">{getContentTypeLabel(item.content_type)}</span>
            </div>
            <h1 className="text-lg font-extrabold text-foreground truncate">{item.title}</h1>
            {artistDisplayName && (
              <p className="text-sm text-muted-foreground">{artistDisplayName}</p>
            )}
          </div>

          {hasPlaylist && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setPlaylistOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-black/20 border border-primary/20 text-sm font-bold text-foreground"
              >
                Playlist ({playlist!.length})
                <ChevronDown className={`w-4 h-4 transition-transform ${playlistOpen ? 'rotate-180' : ''}`} />
              </button>

              {playlistOpen && (
                <div className="absolute right-0 mt-2 w-[360px] max-w-[80vw] z-20 rounded-xl overflow-hidden bg-card border border-border shadow-xl">
                  <div className="max-h-80 overflow-auto">
                    {playlist!.map((it) => {
                      const selected = item.id === it.id;
                      const Icon = getContentTypeIcon(it.content_type);
                      return (
                        <button
                          key={it.id}
                          type="button"
                          className={`w-full flex items-center gap-3 px-3 py-2 border-b border-border text-left ${
                            selected ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => {
                            onPlaylistItemSelect?.(it);
                            setPlaylistOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-foreground truncate">{it.title}</div>
                            <div className="text-xs text-muted-foreground">{getContentTypeLabel(it.content_type)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isAudioOnly ? (
          <div className="aspect-square max-h-[400px] w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
            {item.artwork_url || item.thumb_url ? (
              <img
                src={item.artwork_url || item.thumb_url || ''}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music2 className="w-24 h-24 text-primary/40" />
            )}
            <audio ref={audioRef} className="hidden" />
          </div>
        ) : (
          <div className="aspect-video w-full bg-black">
            {item.media_type === 'youtube' ? (
              <div className="w-full h-full" ref={ytHostRef} />
            ) : (
              <video ref={videoRef} className="w-full h-full" playsInline controls={false} />
            )}
          </div>
        )}

        <div className="py-4 flex items-center justify-center gap-3 bg-white/40 dark:bg-gray-900/30 border-t border-gray-200/50 dark:border-gray-700/50">
          {hasPlaylist && (
            <button
              type="button"
              onClick={goPrev}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 text-foreground" />
            </button>
          )}

          <button
            type="button"
            onClick={togglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors bg-primary hover:bg-primary/90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          {hasPlaylist && (
            <button
              type="button"
              onClick={goNext}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-900/20">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLiked ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => setShowCommentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {(item.comments_count ?? 0) > 0 && <span>{item.comments_count}</span>}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSaved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {!isOwner && (
            <button
              type="button"
              onClick={() => setShowGiftModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg transition-all"
            >
              <Gift className="w-4 h-4" />
              Send Gift
            </button>
          )}
        </div>

        {item.description && (
          <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          </div>
        )}
      </div>

      {showGiftModal && (
        <GiftModal
          recipientId={artistProfileId}
          recipientUsername={artistUsername}
          onGiftSent={() => setShowGiftModal(false)}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {showCommentModal && (
        <CommentModal
          postId={item.id}
          isOpen={showCommentModal}
          onClose={() => setShowCommentModal(false)}
        />
      )}
    </div>
  );
}
