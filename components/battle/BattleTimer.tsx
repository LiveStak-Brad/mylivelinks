'use client';

/**
 * BattleTimer - Countdown timer display for battles
 * 
 * Shows remaining time in battle or cooldown phase.
 * Uses server timestamps to prevent drift.
 */

import { useMemo } from 'react';
import { Timer, Zap, Trophy } from 'lucide-react';
import { formatTimer } from '@/lib/battle-session';

interface BattleTimerProps {
  /** Remaining seconds */
  remainingSeconds: number;
  /** Current phase: 'active' = battle, 'cooldown' = cooldown */
  phase: 'active' | 'cooldown';
  /** Battle mode */
  mode: 'speed' | 'standard';
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

export default function BattleTimer({
  remainingSeconds,
  phase,
  mode,
  compact = false,
  className = '',
}: BattleTimerProps) {
  const timeDisplay = useMemo(() => formatTimer(remainingSeconds), [remainingSeconds]);
  
  const isLowTime = remainingSeconds <= 10;
  const isCritical = remainingSeconds <= 5;
  
  const bgColor = phase === 'cooldown' 
    ? 'bg-blue-500/90' 
    : isCritical 
      ? 'bg-red-500/90 animate-pulse' 
      : isLowTime 
        ? 'bg-orange-500/90' 
        : mode === 'speed' 
          ? 'bg-yellow-500/90' 
          : 'bg-orange-500/90';
  
  const Icon = phase === 'cooldown' ? Timer : mode === 'speed' ? Zap : Trophy;
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColor} text-white shadow-lg ${className}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="font-mono font-bold text-sm tabular-nums">{timeDisplay}</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bgColor} text-white shadow-lg ${className}`}>
      <Icon className="w-5 h-5" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider opacity-80">
          {phase === 'cooldown' ? 'Cooldown' : mode === 'speed' ? 'Speed Battle' : 'Battle'}
        </span>
        <span className="font-mono font-bold text-xl tabular-nums leading-none">{timeDisplay}</span>
      </div>
    </div>
  );
}
