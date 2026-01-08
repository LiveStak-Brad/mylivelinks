'use client';

/**
 * CooldownSheet - Action sheet shown during battle cooldown
 * 
 * Speed mode actions: Rematch / Back to Pool / Quit
 * Standard mode actions: Rematch / End
 */

import { useState } from 'react';
import { RefreshCw, Zap, X, LogOut, Loader2 } from 'lucide-react';
import BottomSheetModal from '../BottomSheetModal';
import BattleTimer from './BattleTimer';

interface CooldownSheetProps {
  isOpen: boolean;
  mode: 'speed' | 'standard';
  remainingSeconds: number;
  opponentName: string;
  onRematch: () => Promise<void>;
  onBackToPool: () => Promise<void>;
  onQuit: () => Promise<void>;
  onClose: () => void;
}

export default function CooldownSheet({
  isOpen,
  mode,
  remainingSeconds,
  opponentName,
  onRematch,
  onBackToPool,
  onQuit,
  onClose,
}: CooldownSheetProps) {
  const [loading, setLoading] = useState<'rematch' | 'pool' | 'quit' | null>(null);
  
  const isSpeed = mode === 'speed';
  
  const handleAction = async (action: 'rematch' | 'pool' | 'quit') => {
    setLoading(action);
    try {
      if (action === 'rematch') {
        await onRematch();
      } else if (action === 'pool') {
        await onBackToPool();
      } else {
        await onQuit();
      }
    } catch (err) {
      console.error('[CooldownSheet] Action error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <BottomSheetModal
      open={isOpen}
      onClose={onClose}
      title="Battle Ended"
      titleIcon={
        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-500" />
        </div>
      }
      maxHeightVh={45}
    >
      <div className="p-6 space-y-6">
        {/* Timer */}
        <div className="flex justify-center">
          <BattleTimer
            remainingSeconds={remainingSeconds}
            phase="cooldown"
            mode={mode}
          />
        </div>
        
        {/* Info */}
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Battle with <span className="font-medium text-gray-900 dark:text-white">{opponentName}</span> has ended.
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Choose what to do next before the cooldown ends.
          </p>
        </div>
        
        {/* Actions */}
        <div className="space-y-3">
          {/* Rematch - Always available */}
          <button
            onClick={() => handleAction('rematch')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {loading === 'rematch' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Rematch
          </button>
          
          {/* Speed Mode: Back to Pool */}
          {isSpeed && (
            <button
              onClick={() => handleAction('pool')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {loading === 'pool' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              Back to Pool
            </button>
          )}
          
          {/* Quit / End */}
          <button
            onClick={() => handleAction('quit')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {loading === 'quit' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSpeed ? (
              <LogOut className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            {isSpeed ? 'Quit' : 'End Session'}
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
