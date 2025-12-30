/**
 * BattleGiftButton - Button to send gifts to a battle side
 * Shows side selection and opens gift modal
 */

'use client';

import { useState } from 'react';
import type { BattleSide } from '@/types/battle';

interface BattleGiftButtonProps {
  selectedSide: BattleSide | null;
  onSelectSide: (side: BattleSide) => void;
  onSendGift: (side: BattleSide) => void;
  teamAColor: string;
  teamBColor: string;
  disabled?: boolean;
  className?: string;
}

export default function BattleGiftButton({ 
  selectedSide,
  onSelectSide,
  onSendGift,
  teamAColor,
  teamBColor,
  disabled = false,
  className = '' 
}: BattleGiftButtonProps) {
  const [showSideSelector, setShowSideSelector] = useState(false);

  const handleGiftClick = () => {
    if (selectedSide) {
      // Side already selected, send gift
      onSendGift(selectedSide);
    } else {
      // No side selected, show selector
      setShowSideSelector(!showSideSelector);
    }
  };

  const handleSideSelect = (side: BattleSide) => {
    onSelectSide(side);
    setShowSideSelector(false);
    // Immediately open gift modal
    onSendGift(side);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Gift Button */}
      <button
        onClick={handleGiftClick}
        disabled={disabled}
        className={`
          flex items-center justify-center gap-2 px-4 py-3 rounded-full
          bg-gradient-to-r from-amber-500 to-orange-500
          text-white font-bold shadow-lg
          hover:from-amber-600 hover:to-orange-600
          active:scale-95 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className="text-2xl">🎁</span>
        <span className="text-sm uppercase tracking-wide">
          {selectedSide ? `Gift Side ${selectedSide}` : 'Send Gift'}
        </span>
        {selectedSide && (
          <div 
            className="w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: selectedSide === 'A' ? teamAColor : teamBColor }}
          />
        )}
      </button>

      {/* Side Selector Popup */}
      {showSideSelector && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 flex gap-2 bg-black/90 backdrop-blur-md rounded-lg p-2 shadow-xl border border-white/10">
          {/* Side A */}
          <button
            onClick={() => handleSideSelect('A')}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold border-2 border-white"
              style={{ backgroundColor: teamAColor }}
            >
              A
            </div>
            <span className="text-white text-xs font-medium">Side A</span>
          </button>

          {/* Side B */}
          <button
            onClick={() => handleSideSelect('B')}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold border-2 border-white"
              style={{ backgroundColor: teamBColor }}
            >
              B
            </div>
            <span className="text-white text-xs font-medium">Side B</span>
          </button>
        </div>
      )}
    </div>
  );
}

