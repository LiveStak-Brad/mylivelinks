/**
 * BattleViewer - Main Web Battle Viewer Component
 * TikTok-style split screen battle layout
 * Works for all battle types (web vs web, web vs mobile, mobile vs mobile)
 * Enforces cameras-only layout when any web participant is present
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Battle, BattleSide } from '@/types/battle';
import BattleScoreBar from './BattleScoreBar';
import BattleTile from './BattleTile';
import BattleTopSupporters from './BattleTopSupporters';
import BattleControls from './BattleControls';
import GiftModal from '@/components/GiftModal';

interface BattleViewerProps {
  battle: Battle;
  onClose?: () => void;
  className?: string;
}

export default function BattleViewer({ battle, onClose, className = '' }: BattleViewerProps) {
  const [selectedSide, setSelectedSide] = useState<BattleSide | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftRecipientId, setGiftRecipientId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(battle.remaining_seconds || battle.duration_seconds);
  const [showChat, setShowChat] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (battle.status !== 'active') return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [battle.status]);

  const handleSendGift = useCallback((side: BattleSide) => {
    setSelectedSide(side);
    
    // Get team leader as recipient (or first participant)
    const team = side === 'A' ? battle.team_a : battle.team_b;
    const leader = team.participants.find(p => p.is_team_leader) || team.participants[0];
    
    if (leader) {
      setGiftRecipientId(leader.id);
      setShowGiftModal(true);
    }
  }, [battle]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/battles/${battle.id}`;
    const text = `Watch this epic battle on MyLiveLinks!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Battle', text, url });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Battle link copied to clipboard!');
    }
  }, [battle.id]);

  const handleReport = useCallback(() => {
    // TODO: Implement report modal
    alert('Report functionality coming soon');
  }, []);

  const handleOpenChat = useCallback(() => {
    setShowChat(!showChat);
  }, [showChat]);

  // Calculate grid layout based on participant count per side
  const getGridCols = (participantCount: number) => {
    if (participantCount === 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  const teamAGridCols = getGridCols(battle.team_a.participants.length);
  const teamBGridCols = getGridCols(battle.team_b.participants.length);

  return (
    <div className={`relative w-full h-screen bg-black flex flex-col overflow-hidden ${className}`}>
      {/* Score Bar - Top */}
      <div className="relative z-20 bg-black/50 backdrop-blur-md">
        <BattleScoreBar
          teamA={battle.team_a}
          teamB={battle.team_b}
          remainingSeconds={remainingSeconds}
        />
      </div>

      {/* Main Battle Area - Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDE A */}
        <div className="flex-1 flex flex-col relative">
          {/* Video Grid - Side A */}
          <div className={`flex-1 grid ${teamAGridCols} gap-1 p-2 bg-black`}>
            {battle.team_a.participants.map((participant, index) => (
              <BattleTile
                key={participant.id}
                participant={participant}
                side="A"
                sideColor={battle.team_a.color}
                isTeamLeader={participant.is_team_leader}
              />
            ))}
          </div>

          {/* Top Supporters Overlay - Side A */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <BattleTopSupporters
              supporters={battle.team_a.top_supporters}
              side="A"
              sideColor={battle.team_a.color}
            />
          </div>
        </div>

        {/* Center Divider */}
        <div className="w-1 bg-gradient-to-b from-transparent via-white/30 to-transparent" />

        {/* SIDE B */}
        <div className="flex-1 flex flex-col relative">
          {/* Video Grid - Side B */}
          <div className={`flex-1 grid ${teamBGridCols} gap-1 p-2 bg-black`}>
            {battle.team_b.participants.map((participant, index) => (
              <BattleTile
                key={participant.id}
                participant={participant}
                side="B"
                sideColor={battle.team_b.color}
                isTeamLeader={participant.is_team_leader}
              />
            ))}
          </div>

          {/* Top Supporters Overlay - Side B */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <BattleTopSupporters
              supporters={battle.team_b.top_supporters}
              side="B"
              sideColor={battle.team_b.color}
            />
          </div>
        </div>
      </div>

      {/* Controls - Bottom */}
      <div className="relative z-20">
        <BattleControls
          battleId={battle.id}
          selectedSide={selectedSide}
          onSelectSide={setSelectedSide}
          onSendGift={handleSendGift}
          onShare={handleShare}
          onReport={handleReport}
          onOpenChat={handleOpenChat}
          teamAColor={battle.team_a.color}
          teamBColor={battle.team_b.color}
          showChatButton={true}
        />
      </div>

      {/* Chat Overlay (Optional) */}
      {showChat && (
        <div className="absolute bottom-20 right-4 w-80 h-96 bg-black/90 backdrop-blur-md rounded-lg border border-white/10 z-30 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-white font-semibold">Battle Chat</span>
            <button
              onClick={() => setShowChat(false)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-white/40 text-sm text-center">
              Chat functionality coming soon
            </div>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showGiftModal && giftRecipientId && (
        <GiftModal
          recipientId={giftRecipientId}
          recipientUsername={
            selectedSide === 'A' 
              ? battle.team_a.participants.find(p => p.id === giftRecipientId)?.username || 'Side A'
              : battle.team_b.participants.find(p => p.id === giftRecipientId)?.username || 'Side B'
          }
          slotIndex={0}
          liveStreamId={undefined}
          onGiftSent={() => {
            setShowGiftModal(false);
            // Refresh battle data to update scores
          }}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Battle Status Indicator */}
      <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wide animate-pulse">
        🔴 Live Battle
      </div>
    </div>
  );
}

