'use client';

/**
 * BattleScoreSlider - Top bar showing score distribution by team colors
 * 
 * Shows a "tug-of-war" style progress bar where each team's combined
 * score is represented by their color, proportional to total score.
 * 
 * Colors are positioned to match the participant layout below (host is always first/left).
 * Shows only ONE label: how far the host is ahead or behind 1st place - this tells
 * viewers how much they need to "snipe" (gift) to win.
 * 
 * Works for:
 * - 1v1 (2 colors)
 * - Team battles (2-3 team colors, aggregated by team)
 * - FFA (up to 9 colors)
 */

import { useMemo } from 'react';
import type { BattleParticipantState, BattleMode } from './BattleTileOverlay';

interface BattleScoreSliderProps {
  /** Map of participant ID to their battle state */
  battleStates: Map<string, BattleParticipantState>;
  /** Battle mode - affects how scores are aggregated */
  battleMode?: BattleMode;
  /** Height of the slider bar */
  height?: number;
  /** Host participant ID (defaults to participant-1) */
  hostId?: string;
  /** Additional className */
  className?: string;
  /** Whether the score bar should use rounded corners */
  rounded?: boolean;
}

interface ScoreSegment {
  id: string; // team ID or participant ID
  score: number;
  color: string;
  percentage: number;
  isHost: boolean;
}

export default function BattleScoreSlider({
  battleStates,
  battleMode = 'ffa',
  height = 16,
  hostId = 'participant-1',
  className = '',
  rounded = true,
}: BattleScoreSliderProps) {
  // Calculate score segments - aggregate by team for team mode
  // Maintains original order to match participant positions (host first/left)
  const { segments, hostScore, leaderScore, hostColor } = useMemo(() => {
    const entries = Array.from(battleStates.entries());
    
    // Find host's team (for team modes)
    const hostState = battleStates.get(hostId);
    const hostTeamId = hostState?.teamId || 'A';
    
    if (battleMode === 'team' || battleMode === 'duel' || battleMode === '1vAll') {
      // Aggregate scores by team, preserving order
      const teamScores = new Map<string, { score: number; color: string; isHost: boolean }>();
      
      entries.forEach(([id, state]) => {
        const teamId = state.teamId || 'A';
        const existing = teamScores.get(teamId);
        const isHostTeam = teamId === hostTeamId;
        if (existing) {
          existing.score += state.score;
        } else {
          teamScores.set(teamId, { score: state.score, color: state.color, isHost: isHostTeam });
        }
      });
      
      const totalScore = Array.from(teamScores.values()).reduce((sum, t) => sum + t.score, 0);
      const maxScore = Math.max(...Array.from(teamScores.values()).map(t => t.score));
      const hostTeamData = teamScores.get(hostTeamId);
      
      // Convert to segments - host's team always first (left), then others
      const teamEntries = Array.from(teamScores.entries()).sort((a, b) => {
        // Host team comes first
        if (a[1].isHost && !b[1].isHost) return -1;
        if (!a[1].isHost && b[1].isHost) return 1;
        // Otherwise alphabetical
        return a[0].localeCompare(b[0]);
      });
      
      if (totalScore === 0) {
        const equalPct = 100 / teamEntries.length;
        return {
          segments: teamEntries.map(([id, data]) => ({
            id,
            score: 0,
            color: data.color,
            percentage: equalPct,
            isHost: data.isHost,
          })),
          hostScore: 0,
          leaderScore: 0,
          hostColor: hostTeamData?.color || '#888',
        };
      }
      
      return {
        segments: teamEntries.map(([id, data]) => ({
          id,
          score: data.score,
          color: data.color,
          percentage: (data.score / totalScore) * 100,
          isHost: data.isHost,
        })),
        hostScore: hostTeamData?.score || 0,
        leaderScore: maxScore,
        hostColor: hostTeamData?.color || '#888',
      };
    }
    
    // FFA: individual participant scores - maintain original order
    const totalScore = entries.reduce((sum, [, state]) => sum + state.score, 0);
    const maxScore = Math.max(...entries.map(([, state]) => state.score), 0);
    const hostScoreVal = hostState?.score || 0;
    
    if (totalScore === 0) {
      const equalPct = 100 / entries.length;
      return {
        segments: entries.map(([id, state]) => ({
          id,
          score: 0,
          color: state.color,
          percentage: equalPct,
          isHost: id === hostId,
        })),
        hostScore: 0,
        leaderScore: 0,
        hostColor: hostState?.color || '#888',
      };
    }
    
    // Keep original order (not sorted by score) so colors match participant positions
    return {
      segments: entries.map(([id, state]) => ({
        id,
        score: state.score,
        color: state.color,
        percentage: (state.score / totalScore) * 100,
        isHost: id === hostId,
      })),
      hostScore: hostScoreVal,
      leaderScore: maxScore,
      hostColor: hostState?.color || '#888',
    };
  }, [battleStates, battleMode, hostId]);
  
  // Calculate host's place (1st, 2nd, 3rd, etc.) and difference from 1st
  const { hostPlace, hostDiff } = useMemo(() => {
    if (segments.length === 0) return { hostPlace: null, hostDiff: null };
    
    // Sort by score descending to find positions
    const sorted = [...segments].sort((a, b) => b.score - a.score);
    const hostIndex = sorted.findIndex(s => s.isHost);
    const place = hostIndex + 1;
    
    // Format place as ordinal (1st, 2nd, 3rd, etc.)
    const getOrdinal = (n: number): string => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    if (leaderScore === 0) return { hostPlace: getOrdinal(place), hostDiff: null };
    
    const diff = hostScore - leaderScore; // positive = ahead, negative = behind
    
    const formatNum = (n: number): string => {
      const abs = Math.abs(n);
      if (abs >= 1000000) return `${(abs / 1000000).toFixed(1)}M`;
      if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K`;
      return abs.toString();
    };
    
    const prefix = diff >= 0 ? '+' : '-';
    return { 
      hostPlace: getOrdinal(place), 
      hostDiff: `${prefix}${formatNum(diff)}` 
    };
  }, [segments, hostScore, leaderScore]);

  if (segments.length === 0) return null;

  // Find host segment color for styling the labels
  const hostSegment = segments.find(s => s.isHost);

  const barShapeClass = rounded ? 'rounded-lg' : '';

  return (
    <div className={`w-full ${className}`}>
      {/* Labels above bar: Place on left, +/- diff on right */}
      <div className="flex justify-between items-center mb-1 px-0.5">
        {/* Left: Host's place */}
        <span 
          className="text-xs font-black"
          style={{ color: hostSegment?.color || '#fff' }}
        >
          {hostPlace}
        </span>
        
        {/* Right: +/- difference from 1st */}
        {hostDiff && (
          <span 
            className="text-xs font-black"
            style={{ color: hostSegment?.color || '#fff' }}
          >
            {hostDiff}
          </span>
        )}
      </div>
      
      {/* Slider bar - clean, no text */}
      <div 
        className={`w-full ${barShapeClass} overflow-hidden flex`}
        style={{ height: `${height}px`, backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        {segments.map((seg) => {
          const isLeader = seg.score === leaderScore && leaderScore > 0;
          
          return (
            <div
              key={seg.id}
              className="h-full transition-all duration-500 ease-out relative"
              style={{
                width: `${Math.max(seg.percentage, 2)}%`,
                backgroundColor: seg.color,
                // Add glow to leader
                boxShadow: isLeader 
                  ? `0 0 12px ${seg.color}, inset 0 0 8px rgba(255,255,255,0.3)` 
                  : `inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              {/* Gradient overlay for depth */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
