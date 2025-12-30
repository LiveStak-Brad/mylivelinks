/**
 * BattleControls - Bottom control bar for battles
 * Includes gift button, share, report, and optional chat
 */

'use client';

import { useState } from 'react';
import type { BattleSide } from '@/types/battle';
import BattleGiftButton from './BattleGiftButton';

interface BattleControlsProps {
  battleId: string;
  selectedSide: BattleSide | null;
  onSelectSide: (side: BattleSide) => void;
  onSendGift: (side: BattleSide) => void;
  onShare: () => void;
  onReport: () => void;
  onOpenChat?: () => void;
  teamAColor: string;
  teamBColor: string;
  showChatButton?: boolean;
  className?: string;
}

export default function BattleControls({
  battleId,
  selectedSide,
  onSelectSide,
  onSendGift,
  onShare,
  onReport,
  onOpenChat,
  teamAColor,
  teamBColor,
  showChatButton = true,
  className = ''
}: BattleControlsProps) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-black/50 backdrop-blur-md ${className}`}>
      {/* Left Side - Optional Chat Button */}
      {showChatButton && onOpenChat ? (
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="text-xl">💬</span>
          <span className="text-white text-sm font-medium">Chat</span>
        </button>
      ) : (
        <div /> // Spacer
      )}

      {/* Center - Gift Button */}
      <div className="flex-1 flex justify-center">
        <BattleGiftButton
          selectedSide={selectedSide}
          onSelectSide={onSelectSide}
          onSendGift={onSendGift}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
        />
      </div>

      {/* Right Side - Share & Report */}
      <div className="flex items-center gap-2">
        {/* Share Button */}
        <button
          onClick={onShare}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Share battle"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Report Button */}
        <button
          onClick={onReport}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Report battle"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

