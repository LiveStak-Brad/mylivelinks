'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Volume2, VolumeX, Gift, Maximize2, Minimize2, AlertTriangle, LayoutGrid, Video } from 'lucide-react';
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
}

// Grid configurations for different orientations and screen sizes
const PORTRAIT_ROWS = 4;
const PORTRAIT_COLS = 3;
const LANDSCAPE_ROWS = 3;
const LANDSCAPE_COLS = 4;

/**
 * Mobile Web Watch Layout - Video-only experience for phone browsers
 * 
 * Features:
 * - Full-screen black background
 * - Always shows grid (even empty slots) - 4x3 portrait, 3x4 landscape
 * - Focus mode: tap to focus single tile, tap again to return
 * - Adaptive grid based on orientation
 * - Gift button + volume controls
 * - No chat UI at all
 */
export default function MobileWebWatchLayout({
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

  // Handle gift button for focused tile or first active tile
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

  // Handle report
  const handleReport = useCallback(() => {
    const targetSlot = focusedSlot || activeSlots[0];
    if (targetSlot?.streamer) {
      setReportModalTarget({
        reportedUserId: targetSlot.streamer.profile_id,
        reportType: 'stream',
        reportedUsername: targetSlot.streamer.username,
      });
    }
  }, [focusedSlot, activeSlots]);

  return (
    <div className="fixed inset-0 bg-black z-[9998] flex flex-col mobile-no-bounce">
      {/* Top Bar - Minimal controls with safe area handling */}
      <div className="absolute top-0 left-0 right-0 z-50 px-3 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent mobile-safe-top mobile-safe-left mobile-safe-right">
        <div className="flex items-center justify-between">
          {/* Left: Back button */}
          <button
            onClick={onLeave}
            className="flex items-center gap-2 text-white/90 hover:text-white transition p-2 -ml-2"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Leave</span>
          </button>

          {/* Center: Grid info (LIVE badge removed - if visible, they're live) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-white/90 text-sm">
              <Video size={14} />
              <span>{activeCount}/{totalSlots}</span>
            </div>
          </div>

          {/* Right: Focus mode indicator / exit */}
          {focusedSlotIndex !== null && (
            <button
              onClick={handleExitFocus}
              className="flex items-center gap-1 text-white/90 hover:text-white transition p-2 -mr-2"
            >
              <LayoutGrid size={18} />
              <span className="text-xs">Grid</span>
            </button>
          )}
          {focusedSlotIndex === null && (
            <div className="flex items-center gap-2 p-2 -mr-2">
              <div className="flex items-center gap-1 text-white/50 text-xs">
                <Users size={14} />
                <span>{viewerCount}</span>
              </div>
              {currentUserId && (
                <div className="scale-125 origin-right">
                  <GoLiveButton 
                    sharedRoom={sharedRoom} 
                    isRoomConnected={isRoomConnected} 
                    onGoLive={onGoLive}
                    onPublishingChange={onPublishingChange}
                    publishAllowed={publishAllowed}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Area - Full screen */}
      <div className="flex-1 flex items-center justify-center overflow-hidden pt-12 pb-16">
        {/* Focus Mode - Single tile maximized */}
        {focusedSlotIndex !== null && focusedSlot?.streamer ? (
          <div className="w-full h-full relative" key={`${focusedSlot.slotIndex}:${focusedSlot.streamer.profile_id}`}>
            <Tile
              streamerId={focusedSlot.streamer.profile_id}
              streamerUsername={focusedSlot.streamer.username}
              streamerAvatar={focusedSlot.streamer.avatar_url}
              isLive={focusedSlot.streamer.live_available}
              viewerCount={focusedSlot.streamer.viewer_count}
              gifterLevel={focusedSlot.streamer.gifter_level}
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
          /* Grid Mode - Always show full grid */
          <div 
            className="w-full h-full p-1 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            }}
          >
            {displaySlots.map((slot, index) => {
              const hasStreamer = slot.streamer?.live_available;
              
              const occupantKey = slot.streamer?.profile_id || 'empty';
              return (
                <div
                  key={`${slot.slotIndex}:${occupantKey}`}
                  className={`relative rounded-lg overflow-hidden ${
                    hasStreamer 
                      ? 'cursor-pointer' 
                      : 'cursor-default'
                  } ${
                    focusedSlotIndex === slot.slotIndex 
                      ? 'ring-2 ring-blue-500' 
                      : ''
                  }`}
                  onClick={() => hasStreamer && handleTileTap(slot.slotIndex, true)}
                >
                  {hasStreamer && slot.streamer ? (
                    <Tile
                      streamerId={slot.streamer.profile_id}
                      streamerUsername={slot.streamer.username}
                      streamerAvatar={slot.streamer.avatar_url}
                      isLive={slot.streamer.live_available}
                      viewerCount={slot.streamer.viewer_count}
                      gifterLevel={slot.streamer.gifter_level}
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                      <Video size={isLandscape ? 20 : 24} className="opacity-30" />
                      <span className="text-[10px] mt-1 opacity-50">Available</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Bar - Gift + Volume controls with safe area handling */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent mobile-safe-bottom mobile-safe-left mobile-safe-right">
        <div className="flex items-center justify-between">
          {/* Left: Report button */}
          <button
            onClick={handleReport}
            disabled={activeCount === 0}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Report"
          >
            <AlertTriangle size={18} />
          </button>

          {/* Center: Gift button */}
          <button
            onClick={handleGiftPress}
            disabled={activeCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Gift size={18} />
            <span>Send Gift</span>
          </button>

          {/* Right: Volume toggle */}
          <button
            onClick={handleGlobalMuteToggle}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition ${
              globalMuted 
                ? 'bg-red-500/80 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
            title={globalMuted ? 'Unmute All' : 'Mute All'}
          >
            {globalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
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

