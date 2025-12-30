/**
 * BattleScoreBar - Top bar showing scores, timer, and side colors
 * Works on both mobile and web
 */

'use client';

import { useEffect, useState } from 'react';
import type { BattleTeam } from '@/types/battle';

interface BattleScoreBarProps {
  teamA: BattleTeam;
  teamB: BattleTeam;
  remainingSeconds: number;
  className?: string;
}

export default function BattleScoreBar({ teamA, teamB, remainingSeconds, className = '' }: BattleScoreBarProps) {
  const [timeDisplay, setTimeDisplay] = useState('0:00');

  useEffect(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, [remainingSeconds]);

  const totalScore = teamA.score + teamB.score;
  const teamAPercentage = totalScore > 0 ? (teamA.score / totalScore) * 100 : 50;
  const teamBPercentage = totalScore > 0 ? (teamB.score / totalScore) * 100 : 50;

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Score Display */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Team A Score */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: teamA.color }}
          />
          <span className="text-white font-bold text-lg">
            {teamA.score.toLocaleString()}
          </span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <div className="text-white/60 text-xs font-medium">TIME</div>
          <div className="text-white font-bold text-xl tabular-nums">
            {timeDisplay}
          </div>
        </div>

        {/* Team B Score */}
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">
            {teamB.score.toLocaleString()}
          </span>
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: teamB.color }}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div 
          className="absolute left-0 top-0 h-full transition-all duration-300"
          style={{ 
            backgroundColor: teamA.color,
            width: `${teamAPercentage}%` 
          }}
        />
        <div 
          className="absolute right-0 top-0 h-full transition-all duration-300"
          style={{ 
            backgroundColor: teamB.color,
            width: `${teamBPercentage}%` 
          }}
        />
      </div>
    </div>
  );
}

