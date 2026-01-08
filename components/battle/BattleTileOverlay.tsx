'use client';

/**
 * BattleTileOverlay - HUD overlay for each participant tile during battles
 * 
 * Supports:
 * - Team battles (1v1, 2v2, 3v3, etc.) - participants share team colors
 * - Free-for-all (FFA) - each participant has their own color
 * - Up to 9 participants
 * 
 * Shows:
 * - Participant's battle color (border glow + indicator)
 * - Individual score (coins received)
 * - Rank position in FFA mode
 * - Win/lose indicators
 */

import { useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

// Predefined battle colors for FFA (up to 9 distinct colors)
// Matches MyLiveLinks aesthetic: vibrant, modern, not typical red/blue
export const BATTLE_COLORS = [
  '#E879F9', // Fuchsia/Magenta (purple-pink)
  '#22D3EE', // Cyan (electric teal)
  '#FBBF24', // Amber/Gold
  '#A78BFA', // Violet (soft purple)
  '#FB7185', // Rose (coral pink)
  '#34D399', // Emerald (mint green)
  '#F97316', // Orange (warm)
  '#60A5FA', // Sky blue
  '#C084FC', // Purple (bright)
] as const;

// Team colors for team battles - distinct and vibrant
export const TEAM_COLORS = {
  A: '#E879F9', // Fuchsia/Magenta
  B: '#22D3EE', // Cyan
  C: '#FBBF24', // Amber/Gold (for 3-team battles)
} as const;

export type BattleMode = 'duel' | 'team' | 'ffa' | '1vAll';

export interface BattleParticipantState {
  participantId: string;
  score: number;
  color: string;
  teamId?: string; // For team battles
  rank?: number; // Position in FFA (1 = winning)
  isLeading?: boolean;
  scoreChange?: number; // Recent score change for animation
}

interface BattleTileOverlayProps {
  participantId: string;
  battleState: BattleParticipantState;
  battleMode: BattleMode;
  showRank?: boolean;
  compact?: boolean; // For smaller tiles
}

export default function BattleTileOverlay({
  participantId,
  battleState,
  battleMode,
  showRank = true,
  compact = false,
}: BattleTileOverlayProps) {
  const { score, color, rank, isLeading, scoreChange } = battleState;
  
  // Format score for display
  const formattedScore = useMemo(() => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  }, [score]);
  
  // Determine rank indicator
  const RankIcon = useMemo(() => {
    if (rank === 1) return Trophy;
    if (isLeading) return TrendingUp;
    return null;
  }, [rank, isLeading]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Color glow effect on border */}
      <div 
        className="absolute inset-0 rounded-sm opacity-60"
        style={{
          boxShadow: `inset 0 0 0 2px ${color}, 0 0 20px ${color}40`,
        }}
      />
      
      {/* Top-right: Score display - compact pill with just the number */}
      <div 
        className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full ${compact ? 'text-[9px]' : 'text-[10px]'}`}
        style={{ 
          backgroundColor: `${color}DD`,
          color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        <span className="font-bold tabular-nums">{formattedScore}</span>
      </div>
      
      
      {/* Leading indicator glow */}
      {isLeading && (
        <div 
          className="absolute inset-0 rounded-sm animate-pulse"
          style={{
            boxShadow: `0 0 30px ${color}80, 0 0 60px ${color}40`,
          }}
        />
      )}
    </div>
  );
}

/**
 * Helper to generate battle states for preview/testing
 */
export function generateMockBattleStates(
  participantIds: string[],
  mode: BattleMode
): Map<string, BattleParticipantState> {
  const states = new Map<string, BattleParticipantState>();
  
  // Sort by random scores for rank calculation
  const scored = participantIds.map((id, index) => ({
    id,
    score: Math.floor(Math.random() * 10000),
    colorIndex: index,
  })).sort((a, b) => b.score - a.score);
  
  // For team mode, determine number of teams based on grid layout
  // 9 participants = 3x3 grid = 3 vertical teams (columns)
  // 6 participants = 3x2 grid = 3 vertical teams
  // 4 participants = 2x2 grid = 2 vertical teams
  // 2 participants = 1x2 grid = 2 teams
  const participantCount = participantIds.length;
  const numTeams = participantCount >= 6 ? 3 : 2;
  const teamPerRow = numTeams; // Teams are vertical columns
  
  scored.forEach((p, rankIndex) => {
    let color: string;
    let teamId: string | undefined;
    
    if (mode === 'ffa') {
      // FFA: each participant gets their own color
      color = BATTLE_COLORS[p.colorIndex % BATTLE_COLORS.length];
    } else if (mode === '1vAll') {
      // 1vAll: first participant (host) vs everyone else
      // Host = Team A (index 0), everyone else = Team B
      if (p.colorIndex === 0) {
        teamId = 'A';
        color = TEAM_COLORS.A;
      } else {
        teamId = 'B';
        color = TEAM_COLORS.B;
      }
    } else if (mode === 'team') {
      // Team: assign by column position (vertical teams)
      // For 3x3: indices 0,3,6 = Team A (col 0), 1,4,7 = Team B (col 1), 2,5,8 = Team C (col 2)
      const columnIndex = p.colorIndex % teamPerRow;
      if (columnIndex === 0) {
        teamId = 'A';
        color = TEAM_COLORS.A;
      } else if (columnIndex === 1) {
        teamId = 'B';
        color = TEAM_COLORS.B;
      } else {
        teamId = 'C';
        color = TEAM_COLORS.C;
      }
    } else {
      // Duel: 2 colors
      color = p.colorIndex === 0 ? TEAM_COLORS.A : TEAM_COLORS.B;
    }
    
    states.set(p.id, {
      participantId: p.id,
      score: p.score,
      color,
      teamId,
      rank: rankIndex + 1,
      isLeading: rankIndex === 0,
    });
  });
  
  return states;
}
