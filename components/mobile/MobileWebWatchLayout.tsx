'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gift, MessageCircle, Users, Trophy, SlidersHorizontal, Share2, Video as VideoIcon, X, Volume2, Maximize2, User, MessageSquare } from 'lucide-react';
import { Room } from 'livekit-client';
import Tile from '@/components/Tile';
import GoLiveButton from '@/components/GoLiveButton';
import GiftModal from '@/components/GiftModal';
import ReportModal from '@/components/ReportModal';
import Chat from '@/components/Chat';
import ViewerList from '@/components/ViewerList';
import Leaderboard from '@/components/Leaderboard';
import { useIM } from '@/components/im';
import type { GifterStatus } from '@/lib/gifter-status';

interface LiveStreamer {
  id: string;
  profile_id: string;
  username: string;
  avatar_url?: string;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  gifter_status?: GifterStatus | null;
}

interface GridSlot {
  slotIndex: number;
  streamer: LiveStreamer | null;
  isPinned: boolean;
  isMuted: boolean;
  isEmpty: boolean;
  volume: number;
}

interface MobileWebWatchLayoutProps {
  mode?: 'solo' | 'battle';
  layoutStyle?: 'tiktok-viewer' | 'twitch-viewer' | 'battle-cameras';
  roomId?: string;
  roomName?: string;
  gridSlots: GridSlot[];
  sharedRoom: Room | null;
  isRoomConnected: boolean;
  currentUserId: string | null;
  isCurrentUserPublishing: boolean;
  viewerCount?: number;
  onGoLive?: (liveStreamId: number, profileId: string) => void;
  publishAllowed?: boolean;
  onPublishingChange?: (isPublishing: boolean) => void;
  onGiftClick?: () => void;
  onShareClick?: () => void;
  onSettingsClick?: () => void;
  onLeave: () => void;
  onMuteTile: (slotIndex: number) => void;
  onVolumeChange: (slotIndex: number, volume: number) => void;
  onCloseTile: (slotIndex: number) => void;
  streamingMode?: 'solo' | 'group'; // Streaming mode for database
}

// Grid configurations for different orientations
const PORTRAIT_ROWS = 4;
const PORTRAIT_COLS = 3;
const LANDSCAPE_ROWS = 3;
const LANDSCAPE_COLS = 4;

type BottomSheetKey = 'chat' | 'viewers' | 'leaderboard' | 'options' | null;

type BottomSheetProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function BottomSheet({ isOpen, title, onClose, children }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Mobile Web Watch Layout v2.0 - NATIVE MOBILE PARITY
 * 
 * Matches native mobile LiveRoomScreen exactly:
 * - 3-column layout: [LEFT RAIL] [GRID] [RIGHT RAIL]
 * - LEFT rail: 5 buttons evenly distributed (Back, [spacer], [spacer], Filter, Go Live)
 * - RIGHT rail: 5 buttons evenly distributed (Gift, PiP, Mixer, Share, Options)
 * - Full-screen black background
 * - Landscape-first orientation
 * - All touch targets ≥44px
 * 
 * Mode support:
 * - solo: Normal 12-grid layout
 * - battle: Cameras-only battle layout (minimal UI, portrait preferred)
 */
export default function MobileWebWatchLayout({
  mode = 'solo',
  layoutStyle = 'tiktok-viewer',
  roomId,
  roomName,
  gridSlots,
  sharedRoom,
  isRoomConnected,
  currentUserId,
  isCurrentUserPublishing,
  viewerCount = 0,
  onGoLive,
  publishAllowed = true,
  onPublishingChange,
  onGiftClick,
  onShareClick,
  onSettingsClick,
  onLeave,
  onMuteTile,
  onVolumeChange,
  onCloseTile,
  streamingMode = 'group', // Default to group mode for backward compat
}: MobileWebWatchLayoutProps) {
  const router = useRouter();
  const { openChat } = useIM();

  // Focus mode state - which tile is focused (null = grid view)
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);
  
  // Track orientation
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Gift modal state
  const [giftModalTarget, setGiftModalTarget] = useState<{
    recipientId: string;
    recipientUsername: string;
    slotIndex: number;
    liveStreamId?: number;
  } | null>(null);
  
  // Report modal state
  const [reportModalTarget, setReportModalTarget] = useState<{
    reportedUserId: string;
    reportType: 'user' | 'stream' | 'profile' | 'chat';
    reportedUsername?: string;
    contextDetails?: string;
  } | null>(null);

  const [activeSheet, setActiveSheet] = useState<BottomSheetKey>(null);

  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [selectedActionSlotIndex, setSelectedActionSlotIndex] = useState<number | null>(null);
  
  // Global mute state
  const [globalMuted, setGlobalMuted] = useState(false);
  
  // Track orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);
  
  // Calculate grid dimensions based on orientation
  const gridRows = isLandscape ? LANDSCAPE_ROWS : PORTRAIT_ROWS;
  const gridCols = isLandscape ? LANDSCAPE_COLS : PORTRAIT_COLS;
  const totalSlots = gridRows * gridCols;
  
  // Extend gridSlots to fill all slots (showing empty placeholders)
  const displaySlots: GridSlot[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const slotIndex = i + 1;
    const existingSlot = gridSlots.find(s => s.slotIndex === slotIndex);
    if (existingSlot) {
      displaySlots.push(existingSlot);
    } else {
      // Create empty placeholder slot
      displaySlots.push({
        slotIndex: slotIndex,
        streamer: null,
        isPinned: false,
        isMuted: false,
        isEmpty: true,
        volume: 0.5,
      });
    }
  }
  
  // Count active streamers
  const activeSlots = displaySlots.filter(slot => slot.streamer?.live_available);
  const activeCount = activeSlots.length;
  
  // Get focused slot data
  const focusedSlot = focusedSlotIndex !== null 
    ? displaySlots.find(s => s.slotIndex === focusedSlotIndex) 
    : null;

  const selectedActionSlot = selectedActionSlotIndex !== null
    ? displaySlots.find((s) => s.slotIndex === selectedActionSlotIndex) || null
    : null;

  const parseLiveStreamId = (raw: unknown): number | undefined => {
    const idStr = raw ? String(raw) : '';
    if (!idStr) return undefined;
    if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) return undefined;
    const parsed = parseInt(idStr);
    return parsed > 0 ? parsed : undefined;
  };

  const handleTileTap = useCallback((slotIndex: number, hasStreamer: boolean) => {
    if (!hasStreamer) return;
    setIsChromeVisible(true);
    setSelectedActionSlotIndex(slotIndex);
    setActiveSheet('options');
  }, []);

  // Handle exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusedSlotIndex(null);
  }, []);

  // Handle global mute toggle
  const handleGlobalMuteToggle = useCallback(() => {
    setGlobalMuted(prev => !prev);
    // Mute/unmute all tiles
    gridSlots.forEach(slot => {
      if (slot.streamer?.live_available) {
        // Toggle mute for each active tile
        if (!globalMuted && !slot.isMuted) {
          onMuteTile(slot.slotIndex);
        } else if (globalMuted && slot.isMuted) {
          onMuteTile(slot.slotIndex);
        }
      }
    });
  }, [globalMuted, gridSlots, onMuteTile]);

  // Handle gift button
  const handleGiftPress = useCallback(() => {
    const targetSlot = focusedSlot || activeSlots[0];
    if (targetSlot?.streamer) {
      const streamer = targetSlot.streamer;
      setGiftModalTarget({
        recipientId: streamer.profile_id,
        recipientUsername: streamer.username,
        slotIndex: targetSlot.slotIndex,
        liveStreamId: streamer.id && streamer.live_available ? parseLiveStreamId(streamer.id) : undefined,
      });
    }
  }, [focusedSlot, activeSlots]);

  // Handle PiP toggle (focus mode)
  const handlePiPToggle = useCallback(() => {
    if (focusedSlotIndex !== null) {
      handleExitFocus();
    } else if (activeSlots.length > 0) {
      setFocusedSlotIndex(activeSlots[0].slotIndex);
    }
  }, [focusedSlotIndex, activeSlots, handleExitFocus]);

  // Handle mixer (volume control)
  const handleMixerPress = useCallback(() => {
    handleGlobalMuteToggle();
  }, [handleGlobalMuteToggle]);

  // Handle share
  const handleSharePress = useCallback(async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.share({
        title: roomName || 'Join Live Room',
        text: 'Join the live room on MyLiveLinks!',
        url: url,
      });
    } catch (err) {
      // Share failed or cancelled - silent fail
      console.log('Share cancelled or failed');
    }
  }, [roomName]);

  const getPrimaryReportTarget = useCallback(() => {
    const targetSlot = focusedSlot || activeSlots[0];
    if (!targetSlot?.streamer) return null;
    return targetSlot.streamer;
  }, [activeSlots, focusedSlot]);

  const handleReportStream = useCallback(() => {
    const streamer = getPrimaryReportTarget();
    if (!streamer) return;

    const rawId = streamer.id ? String(streamer.id) : '';
    const parsedLiveStreamId = rawId && !rawId.startsWith('stream-') && !rawId.startsWith('seed-') ? Number(rawId) : null;
    const liveStreamId = Number.isFinite(parsedLiveStreamId) && parsedLiveStreamId && parsedLiveStreamId > 0 ? parsedLiveStreamId : null;
    const reportUrl = typeof window !== 'undefined' ? `${window.location.origin}/liveTV` : null;

    setActiveSheet(null);
    setReportModalTarget({
      reportType: 'stream',
      reportedUserId: streamer.profile_id,
      reportedUsername: streamer.username,
      contextDetails: JSON.stringify({
        content_kind: 'live_stream',
        stream_profile_id: streamer.profile_id,
        stream_username: streamer.username,
        live_stream_id: liveStreamId,
        slot_index: focusedSlotIndex ?? null,
        url: reportUrl,
        surface: 'mobile_web_watch_layout',
      }),
    });
  }, [focusedSlotIndex, getPrimaryReportTarget]);

  const handleReportUser = useCallback(() => {
    const streamer = getPrimaryReportTarget();
    if (!streamer) return;

    const reportUrl = typeof window !== 'undefined' ? `${window.location.origin}/liveTV` : null;

    setActiveSheet(null);
    setReportModalTarget({
      reportType: 'user',
      reportedUserId: streamer.profile_id,
      reportedUsername: streamer.username,
      contextDetails: JSON.stringify({
        content_kind: 'profile',
        profile_id: streamer.profile_id,
        username: streamer.username,
        slot_index: focusedSlotIndex ?? null,
        url: reportUrl,
        surface: 'mobile_web_watch_layout',
      }),
    });
  }, [getPrimaryReportTarget]);

  const safeRoomId = roomId || 'live-central';

  const handleGiftAction = useCallback(() => {
    if (onGiftClick) {
      onGiftClick();
      return;
    }
    handleGiftPress();
  }, [handleGiftPress, onGiftClick]);

  const handleShareAction = useCallback(() => {
    if (onShareClick) {
      onShareClick();
      return;
    }
    handleSharePress();
  }, [handleSharePress, onShareClick]);

  const handleOpenSheet = useCallback((key: BottomSheetKey) => {
    setIsChromeVisible(true);
    setActiveSheet((prev) => (prev === key ? null : key));
  }, []);

  const handleCloseSheet = useCallback(() => {
    setActiveSheet(null);
    setSelectedActionSlotIndex(null);
  }, []);

  return (
    <div className={`mobile-live-container mobile-live-v3 ${isChromeVisible ? '' : 'mobile-live-chrome-hidden'}`}>
      {/* TOP BAR - Full width */}
      <div className="mobile-live-topbar">
        <button
          onClick={onLeave}
          className="mobile-live-topbar-btn"
          aria-label="Leave"
        >
          <ArrowLeft />
        </button>

        <button
          type="button"
          className="mobile-live-topbar-title"
          onClick={() => setIsChromeVisible((prev) => !prev)}
          aria-label="Toggle room controls"
        >
          <div className="mobile-live-topbar-roomname">{roomName || 'Live Room'}</div>
          <div className="mobile-live-topbar-subtitle">{activeCount} Live</div>
        </button>

        <div className="mobile-live-topbar-actions">
          {currentUserId && (
            <div className="mobile-live-topbar-golive">
              <GoLiveButton
                sharedRoom={sharedRoom}
                isRoomConnected={isRoomConnected}
                onGoLive={onGoLive}
                onPublishingChange={onPublishingChange}
                publishAllowed={publishAllowed}
                mode={streamingMode}
              />
            </div>
          )}

          <button
            onClick={handleSharePress}
            className="mobile-live-topbar-btn"
            aria-label="Share"
          >
            <Share2 />
          </button>
        </div>
      </div>

      {/* GRID WRAP */}
      <div className="mobile-live-grid-wrap">
        {/* Focus Mode - Single tile maximized */}
        {focusedSlotIndex !== null && focusedSlot?.streamer ? (
          <div className="mobile-live-focus-tile" key={`${focusedSlot.slotIndex}:${focusedSlot.streamer.profile_id}`}>
            <Tile
              streamerId={focusedSlot.streamer.profile_id}
              streamerUsername={focusedSlot.streamer.username}
              streamerAvatar={focusedSlot.streamer.avatar_url}
              isLive={focusedSlot.streamer.live_available}
              viewerCount={focusedSlot.streamer.viewer_count}
              gifterStatus={focusedSlot.streamer.gifter_status}
              slotIndex={focusedSlot.slotIndex}
              liveStreamId={focusedSlot.streamer.id && focusedSlot.streamer.live_available ? (() => {
                const idStr = focusedSlot.streamer.id.toString();
                if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) return undefined;
                const parsed = parseInt(idStr);
                return parsed > 0 ? parsed : undefined;
              })() : undefined}
              sharedRoom={sharedRoom}
              isRoomConnected={isRoomConnected}
              isCurrentUserPublishing={isCurrentUserPublishing}
              onClose={() => onCloseTile(focusedSlot.slotIndex)}
              onMute={() => onMuteTile(focusedSlot.slotIndex)}
              isMuted={focusedSlot.isMuted || globalMuted}
              volume={focusedSlot.volume}
              onVolumeChange={(volume) => onVolumeChange(focusedSlot.slotIndex, volume)}
              isFullscreen={true}
              onExitFullscreen={handleExitFocus}
            />
          </div>
        ) : (
          /* Grid Mode - Show full grid */
          /* Battle mode: cameras-only layout (minimal UI, portrait optimized) */
          /* Solo mode: standard 12-grid layout */
          <div 
            className={`mobile-live-grid ${mode === 'battle' ? 'mobile-live-grid-battle' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            }}
          >
            {displaySlots.map((slot) => {
              const hasStreamer = slot.streamer?.live_available;
              const occupantKey = slot.streamer?.profile_id || 'empty';
              
              return (
                <div
                  key={`${slot.slotIndex}:${occupantKey}`}
                  className={hasStreamer ? 'mobile-live-grid-tile' : 'mobile-live-grid-tile mobile-live-grid-tile-empty'}
                  onClick={() => hasStreamer && handleTileTap(slot.slotIndex, true)}
                >
                  {hasStreamer && slot.streamer ? (
                    <Tile
                      streamerId={slot.streamer.profile_id}
                      streamerUsername={slot.streamer.username}
                      streamerAvatar={slot.streamer.avatar_url}
                      isLive={slot.streamer.live_available}
                      viewerCount={slot.streamer.viewer_count}
                      gifterStatus={slot.streamer.gifter_status}
                      slotIndex={slot.slotIndex}
                      liveStreamId={slot.streamer.id && slot.streamer.live_available 
                        ? parseLiveStreamId(slot.streamer.id)
                        : undefined
                      }
                      sharedRoom={sharedRoom}
                      isRoomConnected={isRoomConnected}
                      isCurrentUserPublishing={isCurrentUserPublishing}
                      onClose={() => onCloseTile(slot.slotIndex)}
                      onMute={() => onMuteTile(slot.slotIndex)}
                      isMuted={globalMuted || slot.isMuted}
                      volume={slot.volume}
                      onVolumeChange={(vol) => onVolumeChange(slot.slotIndex, vol)}
                      onExpand={() => handleTileTap(slot.slotIndex, true)}
                    />
                  ) : (
                    /* Empty slot placeholder */
                    <>
                      <VideoIcon size={isLandscape ? 20 : 24} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>Available</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM TAB BAR */}
        {isChromeVisible && (
        <div className="mobile-live-bottombar">
          <button
            onClick={() => handleOpenSheet('chat')}
            className={`mobile-live-tab ${activeSheet === 'chat' ? 'mobile-live-tab-active' : ''}`}
            aria-label="Chat"
          >
            <MessageCircle />
            <span>Chat</span>
          </button>
          <button
            onClick={() => handleOpenSheet('viewers')}
            className={`mobile-live-tab ${activeSheet === 'viewers' ? 'mobile-live-tab-active' : ''}`}
            aria-label="Viewers"
          >
            <Users />
            <span>Viewers</span>
          </button>
          <button
            onClick={() => handleOpenSheet('leaderboard')}
            className={`mobile-live-tab ${activeSheet === 'leaderboard' ? 'mobile-live-tab-active' : ''}`}
            aria-label="Leaderboard"
          >
            <Trophy />
            <span>Top</span>
          </button>
          <button
            onClick={handleGiftAction}
            disabled={activeCount === 0}
            className="mobile-live-tab mobile-live-tab-gift"
            aria-label="Gift"
          >
            <Gift />
            <span>Gift</span>
          </button>
          <button
            onClick={() => handleOpenSheet('options')}
            className={`mobile-live-tab ${activeSheet === 'options' ? 'mobile-live-tab-active' : ''}`}
            aria-label="Controls"
          >
            <SlidersHorizontal />
            <span>Controls</span>
          </button>
        </div>
        )}
      </div>

      {/* Gift Modal */}
      {giftModalTarget && (
        <GiftModal
          recipientId={giftModalTarget.recipientId}
          recipientUsername={giftModalTarget.recipientUsername}
          slotIndex={giftModalTarget.slotIndex}
          liveStreamId={giftModalTarget.liveStreamId}
          roomSlug={safeRoomId}
          onGiftSent={() => setGiftModalTarget(null)}
          onClose={() => setGiftModalTarget(null)}
        />
      )}

      {/* Report Modal */}
      {reportModalTarget && (
        <ReportModal
          isOpen={true}
          reportType={reportModalTarget.reportType}
          reportedUserId={reportModalTarget.reportedUserId}
          reportedUsername={reportModalTarget.reportedUsername}
          contextDetails={reportModalTarget.contextDetails}
          onClose={() => setReportModalTarget(null)}
        />
      )}

      <BottomSheet
        isOpen={activeSheet === 'chat'}
        title="Chat"
        onClose={handleCloseSheet}
      >
        <Chat
          roomSlug={safeRoomId}
          readOnly={!currentUserId}
          onGiftClick={handleGiftAction}
          onShareClick={handleShareAction}
          onSettingsClick={onSettingsClick}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={activeSheet === 'viewers'}
        title="Viewers"
        onClose={handleCloseSheet}
      >
        <ViewerList roomId={safeRoomId} />
      </BottomSheet>

      <BottomSheet
        isOpen={activeSheet === 'leaderboard'}
        title="Leaderboard"
        onClose={handleCloseSheet}
      >
        <Leaderboard roomSlug={safeRoomId} roomName={roomName} />
      </BottomSheet>

      <BottomSheet
        isOpen={activeSheet === 'options'}
        title={selectedActionSlot?.streamer?.username ? `${selectedActionSlot.streamer.username}` : 'Controls'}
        onClose={handleCloseSheet}
      >
        {selectedActionSlot?.streamer ? (
          <div className="space-y-2">
            <button
              onClick={() => {
                if (!selectedActionSlotIndex) return;
                onMuteTile(selectedActionSlotIndex);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
            >
              <span>{selectedActionSlot.isMuted || globalMuted ? 'Unmute' : 'Mute'}</span>
              <Volume2 className="w-5 h-5" />
            </button>

            <div className="w-full px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center justify-between gap-3 text-gray-900 dark:text-gray-100 font-semibold">
                <span>Volume</span>
                <span className="text-sm opacity-70">{Math.round((selectedActionSlot.volume ?? 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={Math.max(0, Math.min(1, selectedActionSlot.volume ?? 0))}
                onChange={(e) => {
                  if (!selectedActionSlotIndex) return;
                  onVolumeChange(selectedActionSlotIndex, Number(e.target.value));
                }}
                className="w-full mt-3"
              />
            </div>

            <button
              onClick={() => {
                const streamer = selectedActionSlot.streamer;
                if (!streamer) return;
                setActiveSheet(null);
                setGiftModalTarget({
                  recipientId: streamer.profile_id,
                  recipientUsername: streamer.username,
                  slotIndex: selectedActionSlot.slotIndex,
                  liveStreamId: streamer.id && streamer.live_available ? parseLiveStreamId(streamer.id) : undefined,
                });
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
            >
              <span>Send gift</span>
              <Gift className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setActiveSheet(null);
                setFocusedSlotIndex(selectedActionSlot.slotIndex);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold ${focusedSlotIndex === selectedActionSlot.slotIndex ? 'ring-2 ring-purple-500' : ''}`}
            >
              <span>Maximize</span>
              <Maximize2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const streamer = selectedActionSlot.streamer;
                if (!streamer) return;
                setActiveSheet(null);
                router.push(`/${encodeURIComponent(streamer.username)}`);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
            >
              <span>View profile</span>
              <User className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const streamer = selectedActionSlot.streamer;
                if (!streamer) return;
                setActiveSheet(null);
                openChat(streamer.profile_id, streamer.username, streamer.avatar_url);
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
            >
              <span>Instant message</span>
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
          <button
            onClick={handleGiftAction}
            disabled={activeCount === 0}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold disabled:opacity-50"
          >
            <span>Send gift</span>
            <Gift className="w-5 h-5" />
          </button>
          <button
            onClick={handleShareAction}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
          >
            <span>Share room</span>
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleMixerPress}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold ${globalMuted ? 'ring-2 ring-purple-500' : ''}`}
          >
            <span>{globalMuted ? 'Unmute all' : 'Mute all'}</span>
            <Volume2 className="w-5 h-5" />
          </button>
          <button
            onClick={handlePiPToggle}
            disabled={activeCount === 0}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold disabled:opacity-50 ${focusedSlotIndex !== null ? 'ring-2 ring-purple-500' : ''}`}
          >
            <span>{focusedSlotIndex !== null ? 'Exit focus' : 'Focus mode'}</span>
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              handleCloseSheet();
              onSettingsClick?.();
            }}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold"
          >
            <span>Settings</span>
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={handleReportStream}
            disabled={activeCount === 0}
            className="w-full text-left px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold disabled:opacity-50"
          >
            Report stream
          </button>

          <button
            onClick={handleReportUser}
            disabled={activeCount === 0}
            className="w-full text-left px-3 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold disabled:opacity-50"
          >
            Report user
          </button>
        </div>
        )}
      </BottomSheet>
    </div>
  );
}
