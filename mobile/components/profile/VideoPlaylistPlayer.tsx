import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';

let WebView: any = null;
try {
  // Optional dependency (not always installed in Expo builds)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview')?.WebView ?? null;
} catch {
  WebView = null;
}

import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

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
  accentColor?: string;
  cardOpacity?: number;
  emptyTitle: string;
  emptyText: string;
  emptyOwnerCTA: string;
};

function getYoutubeIdFromUrl(url: string): string | null {
  const v = String(url || '').trim();
  if (!v) return null;
  // Accept raw 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
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

function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`;
}

function youtubePlayerHtml(youtubeId: string) {
  const safeId = String(youtubeId || '').replace(/[^A-Za-z0-9_-]/g, '');
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; width: 100%; overflow: hidden; }
      #player { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      (function() {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var player = null;
        function post(msg) {
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(String(msg));
            }
          } catch (e) {}
        }

        window.onYouTubeIframeAPIReady = function() {
          try {
            player = new YT.Player('player', {
              videoId: '${safeId}',
              playerVars: {
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                controls: 1
              },
              events: {
                onReady: function() { post('ready'); },
                onStateChange: function(evt) {
                  if (!evt) return;
                  if (evt.data === 0) post('ended');
                  if (evt.data === 1) post('playing');
                  if (evt.data === 2) post('paused');
                }
              }
            });
          } catch (e) {
            post('error');
          }
        };

        window.playVideo = function() {
          try { player && player.playVideo && player.playVideo(); } catch (e) {}
        };
        window.pauseVideo = function() {
          try { player && player.pauseVideo && player.pauseVideo(); } catch (e) {}
        };
      })();
    </script>
  </body>
</html>`;
}

export function VideoPlaylistPlayer({
  title,
  items,
  isOwner,
  onAdd,
  onEdit,
  onDelete,
  accentColor = '#8B5CF6',
  cardOpacity = 0.95,
  emptyTitle,
  emptyText,
  emptyOwnerCTA,
}: Props) {
  const { theme } = useThemeMode();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(theme, accentColor, cardOpacity, windowWidth),
    [theme, accentColor, cardOpacity, windowWidth]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const ytRef = useRef<any>(null);

  const currentIndexRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    setCurrentIndex((idx) => {
      const max = Math.max(items.length - 1, 0);
      return Math.min(Math.max(idx, 0), max);
    });
  }, [items.length]);

  const current = items[currentIndex] ?? null;
  const youtubeId = current?.video_type === 'youtube' ? current.youtube_id || getYoutubeIdFromUrl(current.video_url) : null;

  const canRenderYoutubeInline = Boolean(WebView) && Boolean(youtubeId);

  const openYoutubeExternal = async () => {
    const url = String(current?.video_url || '').trim();
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Cannot open link', 'This device cannot open the YouTube link.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Cannot open link', 'Failed to open the YouTube link.');
    }
  };

  useEffect(() => {
    if (current?.video_type !== 'youtube') return;
    if (!canRenderYoutubeInline) return;
    if (!ytRef.current) return;
    try {
      if (isPlaying) {
        ytRef.current.injectJavaScript('try{window.playVideo&&window.playVideo();}catch(e){};true;');
      } else {
        ytRef.current.injectJavaScript('try{window.pauseVideo&&window.pauseVideo();}catch(e){};true;');
      }
    } catch {
      // ignore
    }
  }, [canRenderYoutubeInline, current?.id, current?.video_type, isPlaying]);

  const goNext = () => {
    if (!items.length) return;
    const nextIndex = (currentIndexRef.current + 1) % items.length;
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  };

  const goPrev = () => {
    if (!items.length) return;
    const prevIndex = (currentIndexRef.current - 1 + items.length) % items.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!current) return;
    if (current.video_type === 'youtube' && !canRenderYoutubeInline) {
      void openYoutubeExternal();
      return;
    }
    setIsPlaying((v) => !v);
  };

  // Requirement: no dummy videos. Empty state differs owner vs visitor.
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            {isOwner && onAdd ? (
              <Pressable onPress={onAdd} style={styles.addButton}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={48} color={theme.colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
            {isOwner && onAdd ? (
              <Pressable onPress={onAdd} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>{emptyOwnerCTA}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {current ? `Now playing: ${current.title}` : '—'}
            </Text>
          </View>
          {isOwner && onAdd ? (
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.playerCard}>
        <View style={styles.nowRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nowTitle} numberOfLines={1}>
              {current?.title ?? '—'}
            </Text>
            {!!current?.subtitle && (
              <Text style={styles.nowSubtitle} numberOfLines={2}>
                {current.subtitle}
              </Text>
            )}
            <Text style={styles.nowMeta} numberOfLines={1}>
              {current?.video_type === 'youtube' ? 'YouTube' : 'Uploaded'}
            </Text>
          </View>

          <Pressable onPress={() => setPlaylistOpen(true)} style={styles.playlistButton}>
            <Ionicons name="list" size={18} color={accentColor} />
            <Text style={styles.playlistButtonText}>Playlist ({items.length})</Text>
          </Pressable>
        </View>

        <View style={styles.videoBox}>
          {current?.video_type === 'youtube' ? (
            canRenderYoutubeInline ? (
              <WebView
                ref={ytRef}
                source={{ html: youtubePlayerHtml(youtubeId as string), baseUrl: 'https://www.youtube.com' }}
                style={styles.webview}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo
                onMessage={(evt: any) => {
                  const msg = String((evt as any)?.nativeEvent?.data || '').toLowerCase();
                  if (msg === 'ended') {
                    if (items.length <= 1) {
                      setIsPlaying(false);
                      return;
                    }
                    goNext();
                  }
                  if (msg === 'playing') setIsPlaying(true);
                  if (msg === 'paused') setIsPlaying(false);
                }}
              />
            ) : (
              <View style={styles.videoFallback}>
                <Ionicons name="warning-outline" size={48} color="rgba(255,255,255,0.6)" style={{ marginBottom: 12 }} />
                <Text style={styles.videoFallbackText}>
                  {youtubeId ? 'YouTube playback requires react-native-webview package' : 'Invalid YouTube video URL'}
                </Text>
                <Text style={[styles.videoFallbackText, { fontSize: 11, marginTop: 4, opacity: 0.7 }]}>
                  {youtubeId ? 'Install react-native-webview to play videos in-app' : 'Please check the video URL and try again'}
                </Text>
                {!!youtubeId && (
                  <Pressable style={styles.youtubeOpenButton} onPress={() => void openYoutubeExternal()}>
                    <Ionicons name="logo-youtube" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.youtubeOpenButtonText}>Watch on YouTube</Text>
                  </Pressable>
                )}
              </View>
            )
          ) : (
            current?.video_url ? (
              <Video
                source={{ uri: current.video_url }}
                style={styles.video}
                useNativeControls={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                videoStyle={{
                  width: '100%',
                  height: '100%',
                }}
                onError={() => {
                  setIsPlaying(false);
                }}
                onPlaybackStatusUpdate={(st: any) => {
                  if (!st?.isLoaded) return;
                  if (st.didJustFinish) {
                    if (items.length <= 1) {
                      setIsPlaying(false);
                      return;
                    }
                    goNext();
                  }
                }}
              />
            ) : (
              <View style={styles.videoFallback}>
                <Text style={styles.videoFallbackText}>Video URL missing</Text>
              </View>
            )
          )}
        </View>

        <View style={styles.controlsRow}>
          <Pressable onPress={goPrev} style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={20} color={theme.colors.textPrimary} />
          </Pressable>

          <Pressable onPress={togglePlay} style={styles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
          </Pressable>

          <Pressable onPress={goNext} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>
      </View>

      {/* Playlist Modal */}
      <Modal visible={playlistOpen} transparent animationType="fade" onRequestClose={() => setPlaylistOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPlaylistOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Playlist</Text>
              <Pressable onPress={() => setPlaylistOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {items.map((it, idx) => {
              const selected = it.id === current?.id;
              return (
                <View key={it.id} style={[styles.trackRow, selected && styles.trackRowSelected]}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(true);
                      setPlaylistOpen(false);
                    }}
                  >
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    {!!it.subtitle && (
                      <Text style={styles.trackSubtitle} numberOfLines={2}>
                        {it.subtitle}
                      </Text>
                    )}
                    <Text style={styles.trackMeta} numberOfLines={1}>
                      {it.video_type === 'youtube' ? 'YouTube' : 'Uploaded'}
                    </Text>
                  </Pressable>

                  {isOwner && (onEdit || onDelete) ? (
                    <View style={styles.trackActions}>
                      {onEdit ? (
                        <Pressable
                          onPress={() => {
                            onEdit(it);
                            setPlaylistOpen(false);
                          }}
                          style={styles.iconBtn}
                          accessibilityLabel="Edit"
                        >
                          <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
                        </Pressable>
                      ) : null}
                      {onDelete ? (
                        <Pressable
                          onPress={() => {
                            onDelete(it);
                            setPlaylistOpen(false);
                          }}
                          style={[styles.iconBtn, styles.iconBtnDanger]}
                          accessibilityLabel="Delete"
                        >
                          <Ionicons name="trash" size={18} color={theme.colors.danger} />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: ThemeDefinition, accentColor: string, cardOpacity: number, windowWidth: number) {
  const cardShadow = theme.elevations.card;
  // Use a flexible container that can adapt to any video orientation
  // Min 250px for portrait, max 400px for very wide screens
  const videoHeight = Math.max(250, Math.min(400, Math.round(windowWidth * 0.75)));
  return StyleSheet.create({
    container: {
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    sectionCard: {
      backgroundColor: theme.colors.surfaceCard,
      opacity: cardOpacity,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: cardShadow.color,
      shadowOffset: cardShadow.offset,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      elevation: cardShadow.elevation,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 0,
      gap: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: accentColor,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
      paddingHorizontal: 16,
      gap: 8,
    },
    emptyIcon: {
      marginBottom: 8,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '600',
      paddingHorizontal: 10,
    },
    primaryCta: {
      marginTop: 8,
      backgroundColor: accentColor,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
    },
    primaryCtaText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },
    playerCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
      padding: 12,
      gap: 12,
      marginHorizontal: 12,
      marginBottom: 16,
    },
    nowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    nowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    nowSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    nowMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
    playlistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playlistButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    videoBox: {
      width: '100%',
      height: videoHeight,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    video: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
    },
    webview: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
    },
    videoFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 8,
    },
    videoFallbackText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    youtubeOpenButton: { 
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: accentColor, 
      paddingHorizontal: 20, 
      paddingVertical: 12, 
      borderRadius: 999,
      marginTop: 8,
    },
    youtubeOpenButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingTop: 4,
    },
    controlBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceCard,
    },
    playBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accentColor,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    modalCard: {
      width: '100%',
      maxWidth: 520,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceCard,
      padding: 14,
      gap: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    trackRowSelected: {
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.18)',
      borderRadius: 12,
      paddingHorizontal: 10,
    },
    trackTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '900',
    },
    trackSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    trackMeta: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    trackActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
    },
    iconBtnDanger: {
      backgroundColor: theme.mode === 'light' ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.14)',
    },
  });
}
