'use client';

/**
 * BattleCooldownControls - Cooldown UI after battle ends
 * 
 * Shows three options:
 * - Stay Paired (continue co-hosting, no battle)
 * - Rematch (start new battle when both accept)
 * - Leave (disconnect from session)
 */

import { useState } from 'react';
import { Users, Swords, LogOut } from 'lucide-react';

interface BattleCooldownControlsProps {
  /** Callback when user wants to stay paired (continue as cohost) */
  onStayPaired: () => void;
  /** Callback when user wants to rematch */
  onRematch: () => void;
  /** Callback when user wants to leave */
  onLeave: () => void;
  /** Whether actions are disabled (loading) */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export default function BattleCooldownControls({
  onStayPaired,
  onRematch,
  onLeave,
  disabled = false,
  className = '',
}: BattleCooldownControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'stay' | 'rematch' | 'leave', callback: () => void) => {
    setLoading(action);
    try {
      await callback();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`w-full bg-black/60 backdrop-blur-sm py-3 px-4 ${className}`}>
      <div className="flex items-center justify-center gap-3">
        {/* Stay Paired */}
        <button
          onClick={() => handleAction('stay', onStayPaired)}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Users className="w-5 h-5" />
          <span>Stay Paired</span>
        </button>

        {/* Rematch */}
        <button
          onClick={() => handleAction('rematch', onRematch)}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Swords className="w-5 h-5" />
          <span>Rematch</span>
        </button>

        {/* Leave */}
        <button
          onClick={() => handleAction('leave', onLeave)}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="w-5 h-5" />
          <span>Leave</span>
        </button>
      </div>

      {/* Helper text */}
      <div className="text-center mt-2">
        <p className="text-white/60 text-xs">
          Battle ended! Choose your next action
        </p>
      </div>
    </div>
  );
}
