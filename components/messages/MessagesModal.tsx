'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function MessagesModal({ isOpen, onClose, anchorRef }: MessagesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { conversations, activeConversationId, setActiveConversationId, totalUnreadCount } = useMessages();
  const [isMobile, setIsMobile] = useState(false);
  const [showThread, setShowThread] = useState(false);

  // Get active conversation object
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  if (!isOpen) return null;

  // Mobile: Full screen with single pane navigation (PWA-optimized)
  if (isMobile) {
    return (
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
  }

  // Desktop: Three-pane layout in modal (Friends | Messages | Thread)
  return (
    <div
      ref={modalRef}
      className="fixed right-4 top-16 mt-2 w-[900px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in z-[9999]"
      style={{ height: '550px', maxHeight: 'calc(100vh - 120px)' }}
    >
      <div className="flex h-full">
        {/* Left Pane: Friends List (vertical) */}
        <div className="w-52 border-r border-border flex flex-col bg-muted/20">
          <FriendsList onSelectFriend={() => {}} layout="vertical" />
        </div>

        {/* Middle Pane: Messages List */}
        <div className="w-72 border-r border-border flex flex-col">
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

        {/* Right Pane: Message Thread */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <MessageThread conversation={activeConversation} />
          ) : (
            <EmptyThreadPlaceholder />
          )}
        </div>
      </div>
    </div>
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

