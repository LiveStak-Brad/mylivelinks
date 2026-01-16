'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Edit } from 'lucide-react';
import { useMessages, Conversation } from './MessagesContext';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import FriendsList from './FriendsList';
import { CallModal, CallMinimizedBubble } from '@/components/call';
import type { CallType, CallStatus, CallParticipant } from '@/components/call';
import { useCallSessionWeb } from '@/hooks/useCallSessionWeb';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

interface ModalPosition {
  top: number;
  left: number;
  right?: number;
}

export default function MessagesModal({ isOpen, onClose, anchorRef }: MessagesModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { conversations, activeConversationId, setActiveConversationId, totalUnreadCount } = useMessages();
  const [isMobile, setIsMobile] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [modalPosition, setModalPosition] = useState<ModalPosition>({ top: 0, left: 0 });

  // Call session hook - always enabled to receive incoming calls even when modal is closed
  const callSession = useCallSessionWeb({
    enabled: true,
    onIncomingCall: (call) => {
      console.log('[MessagesModal] Incoming call:', call);
    },
    onCallEnded: (reason) => {
      console.log('[MessagesModal] Call ended:', reason);
    },
  });

  // Call UI state
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Map call session status to CallStatus type
  const mapCallStatus = (status: string): CallStatus => {
    switch (status) {
      case 'initiating':
      case 'connecting':
        return 'connecting';
      case 'ringing':
        return 'ringing';
      case 'connected':
        return 'active';
      case 'ended':
      case 'declined':
      case 'missed':
      case 'failed':
        return 'ended';
      default:
        return 'connecting';
    }
  };

  // Derive call state from hook
  const isCallActive = callSession.status !== 'idle' && callSession.status !== 'ended';
  const callStatus = mapCallStatus(callSession.status);
  const callType: CallType = callSession.activeCall?.callType || callSession.incomingCall?.callType || 'voice';
  const isIncomingCall = !!callSession.incomingCall && !callSession.activeCall;
  
  const callParticipant: CallParticipant | null = callSession.activeCall ? {
    id: callSession.activeCall.otherParticipant.id,
    username: callSession.activeCall.otherParticipant.username,
    avatarUrl: callSession.activeCall.otherParticipant.avatarUrl,
  } : callSession.incomingCall ? {
    id: callSession.incomingCall.caller.id,
    username: callSession.incomingCall.caller.username,
    avatarUrl: callSession.incomingCall.caller.avatarUrl,
  } : null;

  // Get active conversation object
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate modal position based on anchor button
  useEffect(() => {
    if (!isOpen || isMobile || !anchorRef?.current) return;

    const calculatePosition = () => {
      const buttonRect = anchorRef.current!.getBoundingClientRect();
      const modalWidth = 1100; // Increased from 900
      const modalHeight = 550;
      const gap = 12; // Gap between button and modal
      const viewportPadding = 16; // Minimum distance from viewport edge

      // Start position: align modal's right edge to button's right edge (opens under button on right side)
      let right = window.innerWidth - buttonRect.right;
      let top = buttonRect.bottom + gap;

      // Ensure modal doesn't overflow left edge (right value too large means left edge goes negative)
      const maxRight = window.innerWidth - modalWidth - viewportPadding;
      if (right > maxRight) {
        right = maxRight;
      }

      // Ensure modal doesn't overflow right edge
      if (right < viewportPadding) {
        right = viewportPadding;
      }

      // Ensure modal doesn't overflow bottom edge
      const maxTop = window.innerHeight - modalHeight - viewportPadding;
      if (top > maxTop) {
        top = maxTop;
      }

      setModalPosition({ top, left: 0, right });
    };

    calculatePosition();

    // Recalculate on resize
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);
    
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [isOpen, isMobile, anchorRef]);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalRef.current && 
        !modalRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, onClose, anchorRef]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showThread && isMobile) {
          setShowThread(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showThread, isMobile, onClose]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobile, isOpen]);

  // Reset thread view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowThread(false);
      setActiveConversationId(null);
    }
  }, [isOpen, setActiveConversationId]);

  const handleSelectConversation = (conv: Conversation) => {
    if (isMobile) {
      setShowThread(true);
    }
  };

  const handleBack = () => {
    setShowThread(false);
    setActiveConversationId(null);
  };

  // Start a call with the active conversation recipient (using real hook)
  const handleStartVoiceCall = useCallback(async () => {
    console.log('[MessagesModal] handleStartVoiceCall called, activeConversation:', activeConversation?.recipientId);
    if (!activeConversation) {
      console.error('[MessagesModal] No active conversation');
      return;
    }
    console.log('[MessagesModal] Starting voice call to:', activeConversation.recipientId);
    const result = await callSession.initiateCall(activeConversation.recipientId, 'voice');
    console.log('[MessagesModal] Voice call initiate result:', result);
  }, [activeConversation, callSession]);

  const handleStartVideoCall = useCallback(async () => {
    console.log('[MessagesModal] handleStartVideoCall called, activeConversation:', activeConversation?.recipientId);
    if (!activeConversation) {
      console.error('[MessagesModal] No active conversation');
      return;
    }
    console.log('[MessagesModal] Starting video call to:', activeConversation.recipientId);
    const result = await callSession.initiateCall(activeConversation.recipientId, 'video');
    console.log('[MessagesModal] Video call initiate result:', result);
  }, [activeConversation, callSession]);

  const handleEndCall = useCallback(async () => {
    console.log('[MessagesModal] Ending call, activeCall:', callSession.activeCall?.callId, 'incomingCall:', callSession.incomingCall?.callId);
    const result = await callSession.endCall();
    console.log('[MessagesModal] End call result:', result);
  }, [callSession]);

  const handleAcceptCall = useCallback(async () => {
    console.log('[MessagesModal] Accepting call');
    await callSession.acceptCall();
  }, [callSession]);

  const handleDeclineCall = useCallback(async () => {
    console.log('[MessagesModal] Declining call');
    await callSession.declineCall();
  }, [callSession]);

  const handleMinimizeCall = useCallback(() => {
    setIsCallMinimized(true);
  }, []);

  const handleRestoreCall = useCallback(() => {
    setIsCallMinimized(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    console.log('[MessagesModal] Toggle mute clicked');
    callSession.toggleAudio();
  }, [callSession]);

  const handleToggleVideo = useCallback(() => {
    console.log('[MessagesModal] Toggle video clicked');
    callSession.toggleVideo();
  }, [callSession]);

  const handleToggleSpeaker = useCallback(() => {
    console.log('[MessagesModal] Toggle speaker clicked');
    callSession.toggleSpeaker();
  }, [callSession]);

  // Get current user info for local participant
  const localParticipant: CallParticipant = {
    id: 'current-user',
    username: 'You',
    displayName: 'You',
  };

  // Derive mute/video state from hook
  const isMuted = !callSession.isAudioEnabled;
  const isVideoOff = !callSession.isVideoEnabled;
  const isSpeakerOn = callSession.isSpeakerEnabled;
  
  // Call duration timer
  const [callDuration, setCallDuration] = useState(0);
  useEffect(() => {
    if (callSession.status === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [callSession.status]);

  // Attach video tracks when refs and remote participant/track are available
  useEffect(() => {
    console.log('[MessagesModal] Video attach effect - status:', callSession.status, 'callType:', callType, 'callStatus:', callStatus);
    console.log('[MessagesModal] remoteVideoRef.current:', !!remoteVideoRef.current, 'localVideoRef.current:', !!localVideoRef.current);
    
    if (callSession.status === 'connected') {
      // Attach local video
      if (localVideoRef.current) {
        callSession.attachLocalVideo(localVideoRef.current);
      }
      
      // Attach remote video - try immediately and also when remoteParticipant changes
      if (remoteVideoRef.current) {
        console.log('[MessagesModal] Attaching remote video to ref');
        callSession.attachRemoteVideo(remoteVideoRef.current);
      } else {
        console.log('[MessagesModal] remoteVideoRef not available yet');
      }
    }
  }, [callSession.status, callSession.remoteParticipant, callSession, callType, callStatus]);
  
  // Retry attaching remote video with delays to handle timing issues
  useEffect(() => {
    if (callSession.status === 'connected' && callType === 'video') {
      // Multiple retries with increasing delays
      const timers = [100, 500, 1000, 2000].map(delay => 
        setTimeout(() => {
          if (remoteVideoRef.current) {
            console.log('[MessagesModal] Retry attaching remote video after', delay, 'ms');
            callSession.attachRemoteVideo(remoteVideoRef.current);
          }
        }, delay)
      );
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [callSession.status, callSession, callType]);

  // Always render call UI even when modal is closed, but only show messages content when open
  if (!mounted) return null;

  // Mobile: Full screen with single pane navigation (PWA-optimized)
  const mobileContent = (
    <>
      {/* Backdrop - solid background to prevent content bleeding through */}
      <div className="fixed inset-0 z-[9999] bg-background" aria-hidden="true" />
      
      {/* Modal Content - PWA safe area aware */}
      <div className="fixed inset-0 z-[9999] flex flex-col bg-background animate-slide-up pwa-messages-container pwa-no-overscroll">
        {/* Show thread or conversation list */}
        {showThread && activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            onBack={handleBack}
            showBackButton={true}
            onStartVoiceCall={handleStartVoiceCall}
            onStartVideoCall={handleStartVideoCall}
          />
        ) : (
          <>
            {/* Mobile Header - iOS notch aware */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0 pwa-header">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Messages</h2>
                {totalUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition">
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Friends List + Conversation List - scrollable with safe bottom */}
            <div className="flex-1 bg-background overflow-y-auto pwa-messages-scroll pwa-safe-bottom">
              <FriendsList onSelectFriend={() => setShowThread(true)} />
              <ConversationList onSelectConversation={handleSelectConversation} />
            </div>
          </>
        )}
      </div>
    </>
  );

  // Desktop: Three-pane layout in modal (Friends | Messages | Thread)
  const desktopContent = (
    <div
      ref={modalRef}
      className="fixed w-[1100px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in z-[9999]"
      style={{ 
        top: `${modalPosition.top}px`,
        right: `${modalPosition.right}px`,
        height: '550px', 
        // Use dvh for better iOS Safari support
        maxHeight: 'calc(100dvh - 120px)' 
      }}
    >
      <div className="grid grid-cols-[220px_400px_1fr] h-full">
        {/* Left Pane: Friends List (vertical) - FIXED WIDTH */}
        <div className="border-r border-border flex flex-col bg-muted/20 overflow-hidden">
          <FriendsList onSelectFriend={() => {}} layout="vertical" />
        </div>

        {/* Middle Pane: Messages List - FIXED WIDTH */}
        <div className="border-r border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Messages</h3>
              {totalUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          
          {/* Conversations List */}
          <div className="flex-1 overflow-hidden">
            <ConversationList onSelectConversation={handleSelectConversation} />
          </div>
        </div>

        {/* Right Pane: Message Thread - FILLS REMAINING SPACE */}
        <div className="flex flex-col overflow-hidden">
          {activeConversation ? (
            <MessageThread
              conversation={activeConversation}
              onStartVoiceCall={handleStartVoiceCall}
              onStartVideoCall={handleStartVideoCall}
            />
          ) : (
            <EmptyThreadPlaceholder />
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at body level for proper z-index stacking
  return createPortal(
    <>
      {/* Only show messages content when modal is open */}
      {isOpen && (isMobile ? mobileContent : desktopContent)}

      {/* Call Modal - Full screen when active and not minimized (shows even when messages modal is closed) */}
      {isCallActive && !isCallMinimized && callParticipant && (
        <CallModal
          isOpen={true}
          onClose={isIncomingCall ? handleDeclineCall : handleEndCall}
          onMinimize={handleMinimizeCall}
          callType={callType}
          localParticipant={localParticipant}
          remoteParticipant={callParticipant}
          status={callStatus}
          duration={callDuration}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleSpeaker={handleToggleSpeaker}
          onEndCall={handleEndCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          isIncoming={isIncomingCall}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isSpeakerOn={isSpeakerOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
        />
      )}

      {/* Minimized Call Bubble - Shows when call is active but minimized */}
      {isCallActive && isCallMinimized && callParticipant && (
        <CallMinimizedBubble
          isVisible={true}
          onRestore={handleRestoreCall}
          onEndCall={handleEndCall}
          callType={callType}
          remoteParticipant={callParticipant}
          status={callStatus}
          duration={callDuration}
          isMuted={isMuted}
          localVideoRef={localVideoRef}
        />
      )}
    </>,
    document.body
  );
}

// Empty state when no conversation is selected
function EmptyThreadPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">Your Messages</h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        Select a conversation to start messaging
      </p>
    </div>
  );
}

