'use client';

/**
 * MultiHostGrid - Reusable grid layout for Cohosting & Battles
 * 
 * Supports:
 * - 2 participants: 1v1 (duo)
 * - 4 participants: 2x2 (squad)
 * - 9 participants: 3x3 (ffa)
 * - Partial fills with host emphasis
 * 
 * UI-only component. No streaming logic.
 */

import { useMemo } from 'react';
import GridTile, { GridTileParticipant } from './GridTile';

export type GridMode = 'duo' | 'squad' | 'ffa';

/** Volume state for a single participant */
export interface ParticipantVolume {
  participantId: string;
  volume: number; // 0-1
  isMuted: boolean;
}

interface MultiHostGridProps {
  /** Array of participants. First participant with isHost=true gets emphasis when grid isn't full. */
  participants: GridTileParticipant[];
  /** Grid mode: 'duo' (2 max), 'squad' (4 max), 'ffa' (9 max) */
  mode?: GridMode;
  /** Max slots override. If not provided, inferred from mode. */
  maxSlots?: 2 | 4 | 9;
  /** Optional overlay renderer for battle HUD */
  renderOverlay?: (participant: GridTileParticipant) => React.ReactNode;
  /** Custom className for the grid container */
  className?: string;
  /** Current user's participant ID (their tile won't have volume controls) */
  currentUserId?: string;
  /** Volume states for all participants */
  volumes?: ParticipantVolume[];
  /** Callback when volume changes for a participant */
  onVolumeChange?: (participantId: string, volume: number) => void;
  /** Callback when mute is toggled for a participant */
  onMuteToggle?: (participantId: string) => void;
  /** Currently maximized participant ID (null = none maximized) */
  maximizedParticipantId?: string | null;
  /** Callback when maximize is toggled for a participant */
  onMaximizeToggle?: (participantId: string) => void;
  /** Set of participant IDs with hidden video */
  hiddenVideoIds?: Set<string>;
  /** Callback when video visibility is toggled for a participant */
  onVideoHiddenToggle?: (participantId: string) => void;
  /** Is battle mode active? (removes host gold highlight) */
  isBattleMode?: boolean;
}

/**
 * Layout Rules:
 * 
 * FULL GRIDS:
 * - 2 participants, maxSlots=2: Side by side (1x2)
 * - 4 participants, maxSlots=4: 2x2 grid
 * - 9 participants, maxSlots=9: 3x3 grid
 * 
 * PARTIAL FILLS (host emphasis):
 * - Host gets larger/primary tile
 * - Others fill remaining space uniformly
 * 
 * Examples:
 * - 3 participants in squad (4-slot): Host 50% left, 2 others stacked 50% right
 * - 5 participants in ffa (9-slot): Host portrait left, 4 others in 2x2 right
 * - 7 participants in ffa (9-slot): Host top-left large, 6 others in 2x3 around
 */

function getMaxSlotsFromMode(mode: GridMode): 2 | 4 | 9 {
  switch (mode) {
    case 'duo': return 2;
    case 'squad': return 4;
    case 'ffa': return 9;
    default: return 4;
  }
}

export default function MultiHostGrid({
  participants,
  mode = 'squad',
  maxSlots: maxSlotsOverride,
  renderOverlay,
  className = '',
  currentUserId,
  volumes = [],
  onVolumeChange,
  onMuteToggle,
  maximizedParticipantId = null,
  onMaximizeToggle,
  hiddenVideoIds = new Set(),
  onVideoHiddenToggle,
  isBattleMode = false,
}: MultiHostGridProps) {
  const maxSlots = maxSlotsOverride ?? getMaxSlotsFromMode(mode);
  
  // Clamp participants to maxSlots
  const displayParticipants = useMemo(() => 
    participants.slice(0, maxSlots),
    [participants, maxSlots]
  );
  
  const count = displayParticipants.length;
  
  // Helper to get volume state for a participant
  const getVolumeState = (participantId: string): { volume: number; isMuted: boolean } => {
    const vol = volumes.find(v => v.participantId === participantId);
    return vol ? { volume: vol.volume, isMuted: vol.isMuted } : { volume: 0.7, isMuted: false };
  };
  
  // Helper to render a GridTile with volume, maximize, and video hidden props
  const renderTile = (
    participant: GridTileParticipant, 
    emphasis: 'primary' | 'normal' = 'normal'
  ) => {
    const volState = getVolumeState(participant.id);
    return (
      <GridTile
        key={participant.id}
        participant={participant}
        emphasis={emphasis}
        renderOverlay={renderOverlay}
        isSelf={participant.id === currentUserId}
        volume={volState.volume}
        isMuted={volState.isMuted}
        onVolumeChange={onVolumeChange}
        onMuteToggle={onMuteToggle}
        isMaximized={maximizedParticipantId === participant.id}
        onMaximizeToggle={onMaximizeToggle}
        isVideoHidden={hiddenVideoIds.has(participant.id)}
        onVideoHiddenToggle={onVideoHiddenToggle}
        isBattleMode={isBattleMode}
      />
    );
  };
  
  // Find host (first participant with isHost=true, or first participant)
  const hostIndex = useMemo(() => {
    const idx = displayParticipants.findIndex(p => p.isHost);
    return idx >= 0 ? idx : 0;
  }, [displayParticipants]);
  
  const host = displayParticipants[hostIndex];
  const others = displayParticipants.filter((_, i) => i !== hostIndex);
  
  // Is grid full?
  const isFull = count === maxSlots;
  
  // Find the maximized participant if any
  const maximizedParticipant = maximizedParticipantId 
    ? displayParticipants.find(p => p.id === maximizedParticipantId)
    : null;
  
  // Render based on layout logic
  const renderGrid = () => {
    // MAXIMIZED MODE: Single participant fills the screen (like solo view)
    if (maximizedParticipant) {
      return renderTile(maximizedParticipant, 'primary');
    }
    
    // Empty state
    if (count === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/40">
          No participants
        </div>
      );
    }
    
    // Single participant - full screen
    if (count === 1) {
      return renderTile(displayParticipants[0], 'primary');
    }
    
    // === FULL GRIDS ===
    
    // 2 participants, full duo: side by side
    if (count === 2 && maxSlots === 2) {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-px">
          {displayParticipants.map(p => renderTile(p, 'normal'))}
        </div>
      );
    }
    
    // 4 participants, full squad: 2x2
    if (count === 4 && maxSlots === 4) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
          {displayParticipants.map(p => renderTile(p, 'normal'))}
        </div>
      );
    }
    
    // 9 participants, full ffa: 3x3
    if (count === 9 && maxSlots === 9) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px">
          {displayParticipants.map(p => renderTile(p, 'normal'))}
        </div>
      );
    }
    
    // === PARTIAL FILLS WITH HOST EMPHASIS ===
    
    // 2 participants in a larger grid: equal side by side (same as duo)
    if (count === 2 && maxSlots > 2) {
      return (
        <div className="w-full h-full flex gap-px">
          <div className="flex-1 h-full">
            {renderTile(host, 'primary')}
          </div>
          <div className="flex-1 h-full">
            {renderTile(others[0], 'normal')}
          </div>
        </div>
      );
    }
    
    // 3 participants: host portrait LEFT (spans 2 rows), 2 stacked on RIGHT
    if (count === 3) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
          {/* Host: column 1, spans both rows */}
          <div className="row-span-2 h-full">
            {renderTile(host, 'primary')}
          </div>
          {/* 2 others stacked on right column */}
          {renderTile(others[0], 'normal')}
          {renderTile(others[1], 'normal')}
        </div>
      );
    }
    
    // 4 participants in 9-slot: simple 2x2 grid (same as squad)
    if (count === 4 && maxSlots === 9) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
          {displayParticipants.map((p, i) => renderTile(p, i === hostIndex ? 'primary' : 'normal'))}
        </div>
      );
    }
    
    // 5 participants: host portrait LEFT (spans 2 rows), 4 in 2x2 on RIGHT
    if (count === 5) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px">
          {/* Host: column 1, spans both rows */}
          <div className="row-span-2 h-full">
            {renderTile(host, 'primary')}
          </div>
          {/* 4 others in 2x2 grid on right */}
          {others.map(p => renderTile(p, 'normal'))}
        </div>
      );
    }
    
    // 6 participants: 2x3 grid, host gets emphasis badge only
    if (count === 6) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-px">
          {displayParticipants.map((p, i) => renderTile(p, i === hostIndex ? 'primary' : 'normal'))}
        </div>
      );
    }
    
    // 7 participants: host FULL LEFT column (spans all 3 rows), 6 others in 2x3 on right
    if (count === 7) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px">
          {/* Host: column 1, spans all 3 rows */}
          <div className="row-span-3 h-full">
            {renderTile(host, 'primary')}
          </div>
          {/* 6 others fill cols 2-3, rows 1-3 (2x3 grid) */}
          {others.map(p => renderTile(p, 'normal'))}
        </div>
      );
    }
    
    // 8 participants: 2 equal tiles on left (each 1.5x height), 6 others in 2x3 on right
    if (count === 8) {
      return (
        <div className="w-full h-full flex gap-px">
          {/* Left column: 2 equal tiles stacked (host + 1 other) */}
          <div className="flex-1 flex flex-col gap-px">
            <div className="flex-1">
              {renderTile(host, 'primary')}
            </div>
            <div className="flex-1">
              {renderTile(others[6], 'normal')}
            </div>
          </div>
          {/* Right side: 6 others in 2x3 grid */}
          <div className="flex-[2] grid grid-cols-2 grid-rows-3 gap-px">
            {renderTile(others[0], 'normal')}
            {renderTile(others[1], 'normal')}
            {renderTile(others[2], 'normal')}
            {renderTile(others[3], 'normal')}
            {renderTile(others[4], 'normal')}
            {renderTile(others[5], 'normal')}
          </div>
        </div>
      );
    }
    
    // Fallback: uniform grid based on count
    const cols = count <= 2 ? 2 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    
    return (
      <div 
        className="w-full h-full grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {displayParticipants.map((p, i) => renderTile(p, !isFull && i === hostIndex ? 'primary' : 'normal'))}
      </div>
    );
  };
  
  return (
    <div className={`w-full h-full ${className}`}>
      {renderGrid()}
    </div>
  );
}

/**
 * Default Battle Overlay Placeholder
 * Use as reference for implementing actual battle HUD
 */
export function BattleOverlayPlaceholder({ participant }: { participant: GridTileParticipant }) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-2">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
        <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
          ⚔️ BATTLE HUD
        </span>
      </div>
    </div>
  );
}
