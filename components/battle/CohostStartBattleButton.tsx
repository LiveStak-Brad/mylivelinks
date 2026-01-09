'use client';

/**
 * CohostStartBattleButton - Button for hosts to start a battle from cohost mode
 * 
 * Shows "Start Battle" button during cohost sessions
 * Other host must accept to begin battle
 */

import { useState } from 'react';
import { Swords } from 'lucide-react';

interface CohostStartBattleButtonProps {
  /** Callback when user clicks Start Battle */
  onStartBattle: () => Promise<void>;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export default function CohostStartBattleButton({
  onStartBattle,
  disabled = false,
  className = '',
}: CohostStartBattleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onStartBattle();
    } catch (err) {
      console.error('[CohostStartBattleButton] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Swords className="w-5 h-5" />
      <span>{loading ? 'Starting...' : 'Start Battle'}</span>
    </button>
  );
}
