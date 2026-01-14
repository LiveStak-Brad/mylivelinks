'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Gift, Pause, Play, SkipBack, SkipForward, Video as VideoIcon } from 'lucide-react';
import GiftModal from '@/components/GiftModal';

export type VideoPlaylistSourceType = 'upload' | 'youtube';

export type VideoPlaylistItem = {
  id: string;
  title: string;
  video_type: VideoPlaylistSourceType;
  video_url: string;
  youtube_id?: string | null;
  subtitle?: string | null;
};

type Props = {
  title: string;
  items: VideoPlaylistItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: VideoPlaylistItem) => void;
  onDelete?: (item: VideoPlaylistItem) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  emptyTitle: string;
  emptyText: string;
  emptyOwnerCTA: string;
  /** Profile ID of the artist (for gifting) */
  artistProfileId?: string;
  /** Username of the artist (for gifting) */
  artistUsername?: string;
  /** Optional function to build canonical URL for an item */
  itemLinkBuilder?: (item: VideoPlaylistItem) => string | null;
};

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

export default function VideoPlaylistPlayer({
  title,
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  emptyTitle,
  emptyText,
  emptyOwnerCTA,
  artistProfileId,
  artistUsername,
  itemLinkBuilder,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);

  const current = items[currentIndex] ?? null;

  useEffect(() => {
    setCurrentIndex((idx) => {
      const max = Math.max(items.length - 1, 0);
      return Math.min(Math.max(idx, 0), max);
    });
  }, [items.length]);

  const goNext = () => {
    if (!items.length) return;
    setCurrentIndex((i) => (i + 1) % items.length);
    setIsPlaying(true);
  };

  const goPrev = () => {
    if (!items.length) return;
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!current) return;
    setIsPlaying((v) => !v);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnded = () => {
      if (items.length <= 1) {
        setIsPlaying(false);
        return;
      }
      goNext();
    };

    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!current || current.video_type !== 'upload' || !current.video_url) {
      try {
        el.pause();
      } catch {
        // ignore
      }
      el.removeAttribute('src');
      setIsPlaying(false);
      return;
    }

    if (el.src !== current.video_url) {
      el.src = current.video_url;
      el.load();
    }

    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [current?.id, current?.video_type, current?.video_url, isPlaying]);

  useEffect(() => {
    if (!current || current.video_type !== 'youtube') return;

    const youtubeId = current.youtube_id || getYoutubeIdFromUrl(current.video_url);
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
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
              if (isPlaying) {
                try {
                  ytPlayerRef.current?.playVideo?.();
                } catch {
                  // ignore
                }
              }
            },
            onStateChange: (evt: any) => {
              if (evt?.data === 0) {
                if (items.length <= 1) {
                  setIsPlaying(false);
                  return;
                }
                goNext();
              }
              if (evt?.data === 1) setIsPlaying(true);
              if (evt?.data === 2) setIsPlaying(false);
            },
          },
        });
      } else {
        try {
          ytPlayerRef.current?.loadVideoById?.(youtubeId);
        } catch {
          // ignore
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (!current || current.video_type !== 'youtube') {
      try {
        ytPlayerRef.current?.stopVideo?.();
      } catch {
        // ignore
      }
      return;
    }

    if (!ytPlayerRef.current || !ytReadyRef.current) return;

    try {
      if (isPlaying) ytPlayerRef.current?.playVideo?.();
      else ytPlayerRef.current?.pauseVideo?.();
    } catch {
      // ignore
    }
  }, [current?.video_type, isPlaying]);

  const headerRight = isOwner && onAdd ? (
    <button
      onClick={onAdd}
      className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
    >
      + Add
    </button>
  ) : null;

  if (!items.length) {
    return (
      <div
        className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-purple-500" />
            {title}
          </h2>
          {headerRight}
        </div>

        <div className="text-center py-12">
          <VideoIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyTitle}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyText}</p>
          {isOwner && onAdd && (
            <button
              onClick={onAdd}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyOwnerCTA}
            </button>
          )}
        </div>
      </div>
    );
  }

  const playlistLabel = useMemo(() => {
    const count = items.length;
    return `Playlist (${count})`;
  }, [items.length]);

  return (
    <div
      className={`backdrop-blur-sm ${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 relative`}
      style={{ ...cardStyle, isolation: 'isolate', zIndex: 1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <VideoIcon className="w-5 h-5 text-purple-500" />
          {title}
        </h2>
        {headerRight}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60 bg-black/5 dark:bg-black/30">
        <div className="px-4 py-3 flex items-start justify-between gap-3 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Now Playing</div>
            <div className="text-base font-extrabold text-gray-900 dark:text-white truncate">{current?.title ?? '—'}</div>
            {!!current?.subtitle && (
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">{current.subtitle}</div>
            )}
            {/* Open full page link for current item */}
            {current && itemLinkBuilder && (() => {
              const href = itemLinkBuilder(current);
              if (!href) return null;
              return (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  Open full page
                  <ExternalLink className="w-3 h-3" />
                </Link>
              );
            })()}
          </div>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setPlaylistOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-black/20 border border-purple-200/60 dark:border-purple-700/30 text-sm font-bold text-gray-900 dark:text-white"
            >
              {playlistLabel}
              <ChevronDown className={`w-4 h-4 transition-transform ${playlistOpen ? 'rotate-180' : ''}`} />
            </button>

            {playlistOpen && (
              <div className="absolute right-0 mt-2 w-[360px] max-w-[80vw] z-20 rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="max-h-80 overflow-auto">
                  {items.map((it, idx) => {
                    const selected = current?.id === it.id;
                    return (
                      <div
                        key={it.id}
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
                          <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{it.title}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {it.video_type === 'youtube' ? 'YouTube' : 'Uploaded'}
                          </div>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Open in full page link */}
                          {itemLinkBuilder && (() => {
                            const href = itemLinkBuilder(it);
                            if (!href) return null;
                            return (
                              <Link
                                href={href}
                                className="px-2 py-1 rounded-md text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => setPlaylistOpen(false)}
                              >
                                Open
                              </Link>
                            );
                          })()}
                          
                          {isOwner && onEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                onEdit(it);
                                setPlaylistOpen(false);
                              }}
                              className="px-2 py-1 rounded-md text-xs font-bold bg-gray-200/70 dark:bg-gray-800/70 hover:bg-gray-200 dark:hover:bg-gray-800"
                            >
                              Edit
                            </button>
                          )}
                          {isOwner && onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(it);
                                setPlaylistOpen(false);
                              }}
                              className="px-2 py-1 rounded-md text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="aspect-video w-full bg-black">
          {current?.video_type === 'youtube' ? (
            <div className="w-full h-full" ref={ytHostRef} />
          ) : (
            <video ref={videoRef} className="w-full h-full" playsInline />
          )}
        </div>

        <div className="py-4 flex items-center justify-center gap-3 bg-white/40 dark:bg-gray-900/30">
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
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors bg-purple-600 hover:bg-purple-700"
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

          {!isOwner && artistProfileId && artistUsername && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGiftModal(true);
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex items-center justify-center shadow-lg transition-all"
              title="Send Gift"
            >
              <Gift className="w-5 h-5 text-white" />
            </button>
          )}

          {/* View full page link */}
          {current && itemLinkBuilder && (() => {
            const href = itemLinkBuilder(current);
            if (!href) return null;
            return (
              <Link
                href={href}
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-purple-200/60 dark:border-purple-700/30 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Open full page"
              >
                <ExternalLink className="w-4 h-4 text-gray-900 dark:text-white" />
              </Link>
            );
          })()}
        </div>
      </div>

      {showGiftModal && artistProfileId && artistUsername && (
        <GiftModal
          recipientId={artistProfileId}
          recipientUsername={artistUsername}
          onGiftSent={() => {
            setShowGiftModal(false);
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}
    </div>
  );
}
