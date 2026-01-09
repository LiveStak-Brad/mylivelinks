'use client';

/**
 * BoostRoundIndicator - Visual indicator for active boost rounds
 * 
 * Shows when boost is active with multiplier and remaining time
 */

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface BoostRoundIndicatorProps {
  /** Whether boost is currently active */
  active: boolean;
  /** Boost multiplier (e.g., 2 for 2x) */
  multiplier: number;
  /** When boost ends (ISO timestamp) */
  endsAt: string | null;
  /** Additional className */
  className?: string;
}

export default function BoostRoundIndicator({
  active,
  multiplier,
  endsAt,
  className = '',
}: BoostRoundIndicatorProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!active || !endsAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const end = new Date(endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [active, endsAt]);

  if (!active) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border-2 border-yellow-500 animate-pulse ${className}`}>
      <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
      <span className="text-yellow-500 font-bold text-sm">
        {multiplier}x BOOST
      </span>
      {remainingSeconds > 0 && (
        <span className="text-yellow-400 text-xs font-medium">
          {remainingSeconds}s
        </span>
      )}
    </div>
  );
}
