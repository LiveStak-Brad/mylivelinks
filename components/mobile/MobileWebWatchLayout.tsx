'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Users, Volume2, VolumeX, Gift, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { Room } from 'livekit-client';
import Tile from '@/components/Tile';
import GiftModal from '@/components/GiftModal';
import ReportModal from '@/components/ReportModal';

interface LiveStreamer {
  id: string;
  profile_id: string;
  username: string;
  avatar_url?: string;
  live_available: boolean;
  viewer_count: number;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
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
  onLeave: () => void;
  onMuteTile: (slotIndex: number) => void;
  onVolumeChange: (slotIndex: number, volume: number) => void;
  onCloseTile: (slotIndex: number) => void;
}

/**
 * Mobile Web Watch Layout - Video-only experience for phone browsers
 * 
 * Features:
 * - Full-screen black background
 * - Grid mode (default): up to 12 tiles
 * - Focus mode: tap to focus single tile
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
  onLeave,
  onMuteTile,
  onVolumeChange,
  onCloseTile,
}: MobileWebWatchLayoutProps) {
  // Focus mode state - which tile is focused (null = grid view)
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);
  
  // Gift modal state
  const [giftModalTarget, setGiftModalTarget] = useState<{
    recipientId: string;
    recipientUsername: string;
    slotIndex: number;
    liveStreamId?: number;
  } | null>(null);
  
  // Report modal state
  const [reportModalTarget, setReportModalTarget] = useState<{
    targetId: string;
    targetType: 'user' | 'stream' | 'profile' | 'message';
    targetName?: string;
  } | null>(null);
  
  // Global mute state
  const [globalMuted, setGlobalMuted] = useState(false);
  
  // Count active streamers
  const activeSlots = gridSlots.filter(slot => slot.streamer?.live_available);
  const activeCount = activeSlots.length;
  
  // Get focused slot data
  const focusedSlot = focusedSlotIndex !== null 
    ? gridSlots.find(s => s.slotIndex === focusedSlotIndex) 
    : null;

  // Handle focus mode toggle
  const handleTileTap = useCallback((slotIndex: number) => {
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
        targetId: targetSlot.streamer.profile_id,
        targetType: 'stream',
        targetName: targetSlot.streamer.username,
      });
    }
  }, [focusedSlot, activeSlots]);

  // Calculate grid layout based on number of active tiles
  const getGridClass = (count: number): string => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4'; // 10-12 tiles
  };

  return (
    <div className="fixed inset-0 bg-black z-[9998] flex flex-col">
      {/* Top Bar - Minimal controls */}
      <div className="absolute top-0 left-0 right-0 z-50 px-3 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {/* Left: Back button */}
          <button
            onClick={onLeave}
            className="flex items-center gap-2 text-white/90 hover:text-white transition p-2 -ml-2"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Leave</span>
          </button>

          {/* Center: Live indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
            {viewerCount > 0 && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <Users size={14} />
                <span>{viewerCount}</span>
              </div>
            )}
          </div>

          {/* Right: Focus mode indicator / exit */}
          {focusedSlotIndex !== null && (
            <button
              onClick={handleExitFocus}
              className="flex items-center gap-1 text-white/90 hover:text-white transition p-2 -mr-2"
            >
              <Minimize2 size={18} />
              <span className="text-xs">Grid</span>
            </button>
          )}
          {focusedSlotIndex === null && (
            <div className="w-16" /> // Spacer for balance
          )}
        </div>
      </div>

      {/* Video Area - Full screen */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {/* Focus Mode - Single tile */}
        {focusedSlotIndex !== null && focusedSlot?.streamer ? (
          <div className="w-full h-full">
            <Tile
              streamerId={focusedSlot.streamer.profile_id}
              streamerUsername={focusedSlot.streamer.username}
              streamerAvatar={focusedSlot.streamer.avatar_url}
              isLive={focusedSlot.streamer.live_available}
              viewerCount={focusedSlot.streamer.viewer_count}
              gifterLevel={focusedSlot.streamer.gifter_level}
              badgeName={focusedSlot.streamer.badge_name}
              badgeColor={focusedSlot.streamer.badge_color}
              slotIndex={focusedSlot.slotIndex}
              liveStreamId={focusedSlot.streamer.id && focusedSlot.streamer.live_available 
                ? (() => {
                    const idStr = focusedSlot.streamer.id.toString();
                    if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) return undefined;
                    const parsed = parseInt(idStr);
                    return parsed > 0 ? parsed : undefined;
                  })()
                : undefined
              }
              sharedRoom={sharedRoom}
              isRoomConnected={isRoomConnected}
              isCurrentUserPublishing={isCurrentUserPublishing}
              onClose={() => onCloseTile(focusedSlot.slotIndex)}
              onMute={() => onMuteTile(focusedSlot.slotIndex)}
              isMuted={globalMuted || focusedSlot.isMuted}
              volume={focusedSlot.volume}
              onVolumeChange={(vol) => onVolumeChange(focusedSlot.slotIndex, vol)}
              isFullscreen={true}
              onExitFullscreen={handleExitFocus}
            />
          </div>
        ) : (
          /* Grid Mode - Multiple tiles */
          <div className={`grid ${getGridClass(activeCount)} gap-1 w-full h-full p-1`}>
            {gridSlots.map((slot) => {
              if (!slot.streamer?.live_available) return null;
              
              return (
                <div
                  key={slot.slotIndex}
                  className="relative aspect-video cursor-pointer"
                  onClick={() => handleTileTap(slot.slotIndex)}
                >
                  <Tile
                    streamerId={slot.streamer.profile_id}
                    streamerUsername={slot.streamer.username}
                    streamerAvatar={slot.streamer.avatar_url}
                    isLive={slot.streamer.live_available}
                    viewerCount={slot.streamer.viewer_count}
                    gifterLevel={slot.streamer.gifter_level}
                    badgeName={slot.streamer.badge_name}
                    badgeColor={slot.streamer.badge_color}
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
                    onExpand={() => handleTileTap(slot.slotIndex)}
                  />
                </div>
              );
            })}

            {/* Empty state */}
            {activeCount === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-white/60">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Users size={32} />
                </div>
                <p className="text-sm">No active streams</p>
                <p className="text-xs mt-1 text-white/40">Waiting for streamers to go live...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar - Gift + Volume controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {/* Left: Report button */}
          <button
            onClick={handleReport}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition"
            title="Report"
          >
            <AlertTriangle size={18} />
          </button>

          {/* Center: Gift button */}
          <button
            onClick={handleGiftPress}
            disabled={activeCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          targetId={reportModalTarget.targetId}
          targetType={reportModalTarget.targetType}
          targetName={reportModalTarget.targetName}
          onClose={() => setReportModalTarget(null)}
        />
      )}
    </div>
  );
}

