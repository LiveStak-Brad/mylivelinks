'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Minimize2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Gift,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import GiftModal from '@/components/GiftModal';

export type CallType = 'voice' | 'video';
export type CallStatus = 'connecting' | 'ringing' | 'active' | 'ended';

export interface CallParticipant {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  callType: CallType;
  localParticipant: CallParticipant;
  remoteParticipant: CallParticipant;
  status: CallStatus;
  duration?: number;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleSpeaker?: () => void;
  onEndCall?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  isIncoming?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeakerOn?: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function CallModal({
  isOpen,
  onClose,
  onMinimize,
  callType,
  localParticipant,
  remoteParticipant,
  status,
  duration = 0,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
  onAccept,
  onDecline,
  isIncoming = false,
  isMuted = false,
  isVideoOff = false,
  isSpeakerOn = true,
  localVideoRef,
  remoteVideoRef,
}: CallModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMinimize();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onMinimize]);

  const handleEndCall = useCallback(() => {
    onEndCall?.();
    onClose();
  }, [onEndCall, onClose]);

  const handleGiftSent = useCallback(() => {
    setShowGiftModal(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const statusText = {
    connecting: 'Connecting...',
    ringing: 'Ringing...',
    active: formatDuration(duration),
    ended: 'Call ended',
  }[status];

  const content = (
    <>
      {/* Full-screen call modal */}
      <div
        className="fixed inset-0 bg-gray-900 flex flex-col"
        style={{ zIndex: 99998 }}
      >
        {/* Safe area top padding for mobile */}
        <div className="pwa-safe-top" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button
            onClick={onMinimize}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
            title="Minimize"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-white/60 text-sm">
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </p>
            <p className="text-white text-xs">{statusText}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video/Avatar Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Self (top) - smaller preview */}
          <div className="absolute top-4 right-4 z-10 w-28 h-40 md:w-36 md:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-800">
            {callType === 'video' && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                <img
                  src={getAvatarUrl(localParticipant.avatarUrl)}
                  alt={localParticipant.username}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-white/30"
                />
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs font-medium truncate text-center bg-black/40 rounded-full px-2 py-0.5">
                You
              </p>
            </div>
            {isMuted && (
              <div className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Remote participant (main view - bottom/center) */}
          <div className="flex-1 flex items-center justify-center">
            {callType === 'video' && status === 'active' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img
                    src={getAvatarUrl(remoteParticipant.avatarUrl)}
                    alt={remoteParticipant.username}
                    className={`w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white/20 ${
                      status === 'ringing' ? 'animate-pulse' : ''
                    }`}
                  />
                  {status === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white text-xl font-semibold">
                    {remoteParticipant.displayName || remoteParticipant.username}
                  </p>
                  <p className="text-white/60 text-sm">@{remoteParticipant.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-4 pb-12 pt-4 pwa-safe-bottom">
          {/* Incoming call: show Accept/Decline buttons */}
          {isIncoming && status === 'ringing' ? (
            <div className="flex items-center justify-center gap-8">
              {/* Decline */}
              <button
                onClick={onDecline}
                className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-lg"
                title="Decline"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              {/* Accept */}
              <button
                onClick={onAccept}
                className="p-5 bg-green-500 hover:bg-green-600 text-white rounded-full transition shadow-lg"
                title="Accept"
              >
                <Phone className="w-8 h-8" />
              </button>
            </div>
          ) : (
            <>
              {/* Gift button row */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setShowGiftModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-full shadow-lg transition"
                >
                  <Gift className="w-5 h-5" />
                  <span>Send Gift</span>
                </button>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-center gap-4 md:gap-6">
                {/* Mute */}
                <button
                  onClick={onToggleMute}
                  className={`p-4 rounded-full transition ${
                    isMuted
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* Video toggle (only for video calls) */}
                {callType === 'video' && (
                  <button
                    onClick={onToggleVideo}
                    className={`p-4 rounded-full transition ${
                      isVideoOff
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}

                {/* Speaker toggle */}
                <button
                  onClick={onToggleSpeaker}
                  className={`p-4 rounded-full transition ${
                    !isSpeakerOn
                      ? 'bg-white/10 text-white/50'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isSpeakerOn ? 'Speaker off' : 'Speaker on'}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </button>

                {/* End call */}
                <button
                  onClick={handleEndCall}
                  className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-lg"
                  title="End call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftModal
          recipientId={remoteParticipant.id}
          recipientUsername={remoteParticipant.username}
          onGiftSent={handleGiftSent}
          onClose={() => setShowGiftModal(false)}
        />
      )}

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
}
