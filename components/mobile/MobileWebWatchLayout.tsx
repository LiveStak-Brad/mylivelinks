'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Gift, Maximize2, Volume2, Share2, Settings, Sparkles, Video as VideoIcon } from 'lucide-react';
import { Room } from 'livekit-client';
import Tile from '@/components/Tile';
import GoLiveButton from '@/components/GoLiveButton';
import GiftModal from '@/components/GiftModal';
import ReportModal from '@/components/ReportModal';
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
  gridSlots: GridSlot[];
  sharedRoom: Room | null;
  isRoomConnected: boolean;
  currentUserId: string | null;
  isCurrentUserPublishing: boolean;
  viewerCount?: number;
  onGoLive?: (liveStreamId: number, profileId: string) => void;
  publishAllowed?: boolean;
  onPublishingChange?: (isPublishing: boolean) => void;
  onLeave: () => void;
  onMuteTile: (slotIndex: number) => void;
  onVolumeChange: (slotIndex: number, volume: number) => void;
  onCloseTile: (slotIndex: number) => void;
  streamingMode?: 'solo' | 'group'; // Streaming mode for database
}

// Grid configurations for different orientations
const PORTRAIT_ROWS = 3;
const PORTRAIT_COLS = 4;
const LANDSCAPE_ROWS = 3;
const LANDSCAPE_COLS = 4;

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
  gridSlots,
  sharedRoom,
  isRoomConnected,
  currentUserId,
  isCurrentUserPublishing,
  viewerCount = 0,
  onGoLive,
  publishAllowed = true,
  onPublishingChange,
  onLeave,
  onMuteTile,
  onVolumeChange,
  onCloseTile,
  streamingMode = 'group', // Default to group mode for backward compat
}: MobileWebWatchLayoutProps) {
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
  } | null>(null);
  
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
        volume: 100,
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

  // Handle focus mode toggle - only for slots with active streamers
  const handleTileTap = useCallback((slotIndex: number, hasStreamer: boolean) => {
    if (!hasStreamer) return; // Can't focus empty slots
    
    if (focusedSlotIndex === slotIndex) {
      // Already focused - exit focus mode
      setFocusedSlotIndex(null);
    } else {
      // Enter focus mode on this tile
      setFocusedSlotIndex(slotIndex);
    }
  }, [focusedSlotIndex]);

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
        liveStreamId: streamer.id && streamer.live_available 
          ? (() => {
              const idStr = streamer.id.toString();
              if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) return undefined;
              const parsed = parseInt(idStr);
              return parsed > 0 ? parsed : undefined;
            })()
          : undefined,
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
      const url = `${window.location.origin}/liveTV`;
      await navigator.share({
        title: 'Join Live Central',
        text: 'Watch live streamers on MyLiveLinks!',
        url: url,
      });
    } catch (err) {
      // Share failed or cancelled - silent fail
      console.log('Share cancelled or failed');
    }
  }, []);

  // Handle options (placeholder)
  const handleOptionsPress = useCallback(() => {
    // TODO: Open options overlay/modal
    alert('Options menu coming soon');
  }, []);

  // Handle filter (placeholder)
  const handleFilterPress = useCallback(() => {
    // TODO: Open filter options
    alert('Filters coming soon');
  }, []);

  return (
    <div className="mobile-live-container">
      {/* LEFT RAIL - Controller buttons (1/1/1/1/1 distribution) */}
      <div className="mobile-live-left-rail">
        {/* 1. Back Button */}
        <button
          onClick={onLeave}
          className="mobile-live-button mobile-live-color-back"
          aria-label="Leave"
        >
          <ArrowLeft />
        </button>

        {/* 2. Spacer (maintains even distribution) */}
        <div className="mobile-live-button-spacer" />

        {/* 3. Spacer (maintains even distribution) */}
        <div className="mobile-live-button-spacer" />

        {/* 4. Filter Button */}
        <button
          onClick={handleFilterPress}
          className="mobile-live-button mobile-live-color-filter"
          aria-label="Filters"
        >
          <Sparkles />
        </button>

        {/* 5. Go Live Camera Button */}
        {currentUserId && (
          <div className="mobile-live-button mobile-live-button-primary">
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
        {!currentUserId && <div className="mobile-live-button-spacer" />}
      </div>

      {/* CENTER GRID - Camera grid area */}
      <div className="mobile-live-grid-area">
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
                        ? (() => {
                            const idStr = slot.streamer.id.toString();
                            if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) return undefined;
                            const parsed = parseInt(idStr);
                            return parsed > 0 ? parsed : undefined;
                          })()
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
      </div>

      {/* RIGHT RAIL - Controller buttons (1/1/1/1/1 distribution) */}
      <div className="mobile-live-right-rail">
        {/* 1. Gift Button */}
        <button
          onClick={handleGiftPress}
          disabled={activeCount === 0}
          className="mobile-live-button mobile-live-button-primary mobile-live-color-gift"
          aria-label="Send Gift"
        >
          <Gift />
        </button>

        {/* 2. PiP / Focus Toggle Button */}
        <button
          onClick={handlePiPToggle}
          disabled={activeCount === 0}
          className={`mobile-live-button mobile-live-color-pip ${focusedSlotIndex !== null ? 'mobile-live-button-active' : ''}`}
          aria-label={focusedSlotIndex !== null ? 'Exit Focus' : 'Focus Mode'}
        >
          <Maximize2 />
        </button>

        {/* 3. Mixer / Volume Button */}
        <button
          onClick={handleMixerPress}
          className={`mobile-live-button mobile-live-color-mixer ${globalMuted ? 'mobile-live-button-active' : ''}`}
          aria-label={globalMuted ? 'Unmute All' : 'Mute All'}
        >
          <Volume2 />
        </button>

        {/* 4. Share Button */}
        <button
          onClick={handleSharePress}
          className="mobile-live-button mobile-live-color-share"
          aria-label="Share"
        >
          <Share2 />
        </button>

        {/* 5. Options Button */}
        <button
          onClick={handleOptionsPress}
          className="mobile-live-button mobile-live-color-options"
          aria-label="Options"
        >
          <Settings />
        </button>
      </div>

      {/* Gift Modal */}
      {giftModalTarget && (
        <GiftModal
          recipientId={giftModalTarget.recipientId}
          recipientUsername={giftModalTarget.recipientUsername}
          slotIndex={giftModalTarget.slotIndex}
          liveStreamId={giftModalTarget.liveStreamId}
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
          onClose={() => setReportModalTarget(null)}
        />
      )}
    </div>
  );
}
