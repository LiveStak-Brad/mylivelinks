'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Video, Mic, MicOff } from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import type { CallType, CallStatus, CallParticipant } from './CallModal';

export interface CallMinimizedBubbleProps {
  isVisible: boolean;
  onRestore: () => void;
  onEndCall: () => void;
  callType: CallType;
  remoteParticipant: CallParticipant;
  status: CallStatus;
  duration?: number;
  isMuted?: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function CallMinimizedBubble({
  isVisible,
  onRestore,
  onEndCall,
  callType,
  remoteParticipant,
  status,
  duration = 0,
  isMuted = false,
  localVideoRef,
}: CallMinimizedBubbleProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(8, Math.min(newX, maxX)),
        y: Math.max(8, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setPosition({
        x: Math.max(8, Math.min(newX, maxX)),
        y: Math.max(8, Math.min(newY, maxY)),
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onRestore();
    }
  };

  if (!isVisible || !mounted) return null;

  const content = (
    <div
      className="fixed select-none touch-none"
      style={{
        zIndex: 99997,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Main bubble */}
      <div
        className="relative cursor-pointer"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
      >
        {/* Avatar/Video bubble */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-purple-500 shadow-xl bg-gray-800">
          {callType === 'video' && localVideoRef?.current ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <img
              src={getAvatarUrl(remoteParticipant.avatarUrl)}
              alt={remoteParticipant.username}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Call type indicator */}
        <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
          {callType === 'video' ? (
            <Video className="w-3 h-3 text-white" />
          ) : (
            <Phone className="w-3 h-3 text-white" />
          )}
        </div>

        {/* Muted indicator */}
        {isMuted && (
          <div className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Duration badge */}
        {status === 'active' && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/70 rounded-full">
            <span className="text-white text-[10px] font-medium whitespace-nowrap">
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {/* Connecting/Ringing animation */}
        {(status === 'connecting' || status === 'ringing') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
