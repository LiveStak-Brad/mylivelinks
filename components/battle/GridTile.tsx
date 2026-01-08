'use client';

/**
 * GridTile - Video tile for MultiHostGrid
 * 
 * Renders a participant's video track with controls.
 * 
 * Features:
 * - Per-tile volume control (for non-self tiles)
 * - Vertical slider on left side
 * - Mute/unmute toggle
 * - Video track attachment
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { User, Volume2, VolumeX, VideoOff, Video } from 'lucide-react';

export interface GridTileParticipant {
  id: string;
  name: string;
  isHost?: boolean;
  avatarUrl?: string;
  videoTrack?: any; // LiveKit video track
  audioTrack?: any; // LiveKit audio track
}

interface GridTileProps {
  participant: GridTileParticipant;
  /** Size emphasis: 'primary' for host when grid isn't full, 'normal' for others */
  emphasis?: 'primary' | 'normal';
  /** Optional slot for battle overlay HUD */
  renderOverlay?: (participant: GridTileParticipant) => React.ReactNode;
  /** Custom className for the tile container */
  className?: string;
  /** Is this the current user's own tile? (no volume control on self) */
  isSelf?: boolean;
  /** Current volume (0-1), controlled externally */
  volume?: number;
  /** Volume change callback */
  onVolumeChange?: (participantId: string, volume: number) => void;
  /** Is muted? */
  isMuted?: boolean;
  /** Mute toggle callback */
  onMuteToggle?: (participantId: string) => void;
  /** Is this tile currently maximized? */
  isMaximized?: boolean;
  /** Callback to toggle maximize state */
  onMaximizeToggle?: (participantId: string) => void;
  /** Is this participant's video hidden (camera muted from viewer's perspective)? */
  isVideoHidden?: boolean;
  /** Callback to toggle video visibility */
  onVideoHiddenToggle?: (participantId: string) => void;
  /** Is battle mode active? (hides host gold border) */
  isBattleMode?: boolean;
}

export default function GridTile({
  participant,
  emphasis = 'normal',
  renderOverlay,
  className = '',
  isSelf = false,
  volume = 0.7,
  onVolumeChange,
  isMuted = false,
  onMuteToggle,
  isMaximized = false,
  onMaximizeToggle,
  isVideoHidden = false,
  onVideoHiddenToggle,
  isBattleMode = false,
}: GridTileProps) {
  const isPrimary = emphasis === 'primary';
  const isHost = participant.isHost;
  // In battle mode, don't show host gold highlight (colors determined by battle overlay)
  const showHostHighlight = isHost && !isBattleMode;
  
  // Handle maximize button click
  const handleMaximizeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMaximizeToggle?.(participant.id);
  }, [onMaximizeToggle, participant.id]);
  
  // Handle video hide toggle
  const handleVideoHideClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onVideoHiddenToggle?.(participant.id);
  }, [onVideoHiddenToggle, participant.id]);
  
  // Local state for showing/hiding the volume slider
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Track last click time for double-tap detection (volume button)
  const lastVolumeClickRef = useRef(0);
  // Track last click time for double-tap detection (tile - maximize)
  const lastTileClickRef = useRef(0);
  const DOUBLE_TAP_DELAY = 300; // ms
  
  // Handle volume button click - single tap toggles slider, double tap mutes
  const handleVolumeButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const now = Date.now();
    const timeSinceLastClick = now - lastVolumeClickRef.current;
    lastVolumeClickRef.current = now;
    
    // Double tap detected - mute/unmute
    if (timeSinceLastClick < DOUBLE_TAP_DELAY) {
      onMuteToggle?.(participant.id);
      return;
    }
    
    // Single tap - toggle slider visibility
    setShowVolumeSlider(prev => !prev);
  }, [onMuteToggle, participant.id]);
  
  // Handle volume slider change
  const handleVolumeSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    onVolumeChange?.(participant.id, newVolume);
  }, [onVolumeChange, participant.id]);
  
  // Unified handler for both click (mouse) and touch
  // Works for: desktop mouse clicks, mobile taps, and mouse in mobile-sized preview
  const handleTileClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTileClickRef.current;
    lastTileClickRef.current = now;
    
    // Double tap/click detected - toggle maximize
    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      onMaximizeToggle?.(participant.id);
      // Reset to prevent triple-tap triggering again
      lastTileClickRef.current = 0;
      return;
    }
    
    // Single tap/click - hide volume slider if open
    if (showVolumeSlider) {
      setShowVolumeSlider(false);
    }
  }, [showVolumeSlider, onMaximizeToggle, participant.id]);

  // Determine effective volume state
  const effectiveVolume = isMuted ? 0 : volume;
  const VolumeIcon = isMuted || effectiveVolume === 0 ? VolumeX : Volume2;
  
  // Video element ref for track attachment
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  
  // Track if we have active video
  const hasVideoTrack = !!participant.videoTrack;
  const hasAudioTrack = !!participant.audioTrack;
  
  // Attach video track when available
  useEffect(() => {
    const videoEl = videoElementRef.current;
    const track = participant.videoTrack;
    
    if (!videoEl) return;

    if (track) {
      // Attach the track to the video element
      track.attach(videoEl);
      return () => {
        track.detach(videoEl);
      };
    }

    // No track: clear any previous media
    (videoEl as any).srcObject = null;
  }, [participant.videoTrack]);
  
  // Attach audio track when available
  useEffect(() => {
    const audioEl = audioElementRef.current;
    const track = participant.audioTrack;
    
    if (!audioEl) return;

    if (track) {
      // Attach the track to the audio element
      track.attach(audioEl);
      audioEl.volume = effectiveVolume;
      return () => {
        track.detach(audioEl);
      };
    }

    // No track: clear any previous media
    (audioEl as any).srcObject = null;
  }, [participant.audioTrack, effectiveVolume]);
  
  // Update audio volume when it changes
  useEffect(() => {
    const audioEl = audioElementRef.current;
    if (audioEl) {
      audioEl.volume = effectiveVolume;
    }
  }, [effectiveVolume]);

  return (
    <div
      className={`
        relative w-full h-full rounded-sm overflow-hidden
        bg-gradient-to-br from-gray-800 to-gray-900
        border-2 transition-all duration-300
        ${showHostHighlight 
          ? 'border-amber-500/70 shadow-lg shadow-amber-500/20' 
          : 'border-white/10'
        }
        ${isPrimary && !isBattleMode ? 'ring-2 ring-amber-400/50' : ''}
        ${className}
      `}
      data-participant-id={participant.id}
      data-is-host={isHost}
      data-emphasis={emphasis}
      onClick={handleTileClick}
    >
      {/* Video element - rendered when track is available */}
      {hasVideoTrack && !isVideoHidden && (
        <video
          ref={videoElementRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      )}
      
      {/* Audio element for remote audio */}
      {hasAudioTrack && !isSelf && (
        <audio
          ref={audioElementRef}
          autoPlay
          playsInline
        />
      )}
      
      {/* Placeholder content - shown when no video track or video hidden */}
      {(!hasVideoTrack || isVideoHidden) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isVideoHidden ? (
            /* Video hidden state - show logo/avatar with overlay */
            <div className="flex flex-col items-center gap-2">
              <div className={`
                rounded-full bg-gradient-to-br from-gray-600 to-gray-700
                flex items-center justify-center
                ${isPrimary ? 'w-20 h-20' : 'w-12 h-12'}
              `}>
                <VideoOff className={isPrimary ? 'w-10 h-10' : 'w-6 h-6'} color="white" opacity={0.5} />
              </div>
              <span className="text-[10px] text-white/50">Video Hidden</span>
            </div>
          ) : (
            /* Normal avatar placeholder */
            <>
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.name}
                  className={`rounded-full object-cover ${
                    isPrimary ? 'w-24 h-24' : 'w-16 h-16'
                  }`}
                />
              ) : (
                <div className={`
                  rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                  flex items-center justify-center
                  ${isPrimary ? 'w-24 h-24' : 'w-16 h-16'}
                `}>
                  <User className={isPrimary ? 'w-12 h-12' : 'w-8 h-8'} color="white" />
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Top-left controls area */}
      <div className="absolute top-1.5 left-1.5 z-20 flex flex-col items-start gap-1">
        {/* Volume control button - only show for non-self tiles */}
        {!isSelf && (
          <button
            onClick={handleVolumeButtonClick}
            className={`
              p-0.5 transition-all duration-200 drop-shadow-lg
              ${isMuted ? 'text-red-400' : 'text-white'}
              hover:scale-110
            `}
            aria-label={isMuted ? 'Unmute' : 'Volume'}
          >
            <VolumeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>
      
      
      {/* Vertical volume slider - left side, no container */}
      {!isSelf && showVolumeSlider && (
        <div 
          className="absolute left-3 top-20 bottom-10 z-30 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeSliderChange}
            className="volume-slider-vertical h-full appearance-none bg-transparent cursor-pointer"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              width: '24px',
            }}
            aria-label={`Volume for ${participant.name}`}
          />
          {/* Volume percentage indicator */}
          <div className="ml-1 text-[10px] text-white/70 font-mono">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </div>
        </div>
      )}

      {/* Battle Overlay Slot */}
      {renderOverlay && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {renderOverlay(participant)}
        </div>
      )}

      {/* Bottom bar - camera button left, name right */}
      <div className="absolute bottom-1 left-1 right-1 z-10 flex items-center justify-between">
        {/* Camera hide button - only show for non-self tiles */}
        {!isSelf && onVideoHiddenToggle ? (
          <button
            onClick={handleVideoHideClick}
            className={`
              p-0.5 transition-all duration-200 drop-shadow-lg
              ${isVideoHidden ? 'text-red-400' : 'text-white/70'}
              hover:scale-110
            `}
            aria-label={isVideoHidden ? 'Show video' : 'Hide video'}
          >
            {isVideoHidden ? (
              <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </button>
        ) : (
          <div /> 
        )}
        
        {/* Name - smaller, right aligned */}
        <span className="text-[10px] sm:text-xs font-medium text-white drop-shadow-lg truncate max-w-[70%]">
          {participant.name}
        </span>
      </div>
    </div>
  );
}
