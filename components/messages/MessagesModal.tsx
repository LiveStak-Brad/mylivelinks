'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Edit } from 'lucide-react';
import { useMessages, Conversation } from './MessagesContext';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import FriendsList from './FriendsList';

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

      // Start position: align to button's right edge
      let left = buttonRect.right - modalWidth;
      let top = buttonRect.bottom + gap;

      // Ensure modal doesn't overflow right edge
      const maxLeft = window.innerWidth - modalWidth - viewportPadding;
      if (left > maxLeft) {
        left = maxLeft;
      }

      // Ensure modal doesn't overflow left edge
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      // Ensure modal doesn't overflow bottom edge
      const maxTop = window.innerHeight - modalHeight - viewportPadding;
      if (top > maxTop) {
        top = maxTop;
      }

      setModalPosition({ top, left });
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

  if (!isOpen || !mounted) return null;

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
        left: `${modalPosition.left}px`,
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
            <MessageThread conversation={activeConversation} />
          ) : (
            <EmptyThreadPlaceholder />
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at body level for proper z-index stacking
  return createPortal(
    isMobile ? mobileContent : desktopContent,
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

