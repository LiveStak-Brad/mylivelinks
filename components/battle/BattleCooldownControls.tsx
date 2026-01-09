'use client';

/**
 * BattleCooldownControls - Cooldown UI after battle ends
 * 
 * Shows only Rematch option during cooldown.
 * If user declines or timer expires, automatically returns to cohost mode.
 */

import { useState } from 'react';
import { Swords } from 'lucide-react';

interface BattleCooldownControlsProps {
  /** Callback when user wants to rematch */
  onRematch: () => void;
  /** Remaining cooldown seconds */
  cooldownSeconds?: number;
  /** Whether actions are disabled (loading) */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export default function BattleCooldownControls({
  onRematch,
  cooldownSeconds = 0,
  disabled = false,
  className = '',
}: BattleCooldownControlsProps) {
  const [loading, setLoading] = useState(false);

  const handleRematch = async () => {
    setLoading(true);
    try {
      await onRematch();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full bg-black/60 backdrop-blur-sm py-4 px-4 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-3">
        {/* Rematch Button */}
        <button
          onClick={handleRematch}
          disabled={disabled || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Swords className="w-6 h-6" />
          <span>Rematch</span>
        </button>

        {/* Helper text */}
        <p className="text-white/70 text-sm text-center">
          Battle ended! Want a rematch?
          {cooldownSeconds > 0 && (
            <span className="block text-white/50 text-xs mt-1">
              Returning to cohost in {cooldownSeconds}s...
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
