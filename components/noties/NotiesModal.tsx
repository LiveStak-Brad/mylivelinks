'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Gift, UserPlus, AtSign, MessageCircle, Trophy, Package, Settings, X, Users, UserCheck } from 'lucide-react';
import { useNoties, NotieType, Notie } from './NotiesContext';
import { acceptTeamInvite, declineTeamInvite } from '@/lib/teamInvites';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import { useToast } from '@/components/ui';
import { getNotificationDestination } from '@/lib/noties/getNotificationDestination';
import GiftQuickReplies from './GiftQuickReplies';
import { createClient } from '@/lib/supabase';

type TabType = 'all' | 'mentions' | 'gifts' | 'system';

interface NotiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

interface ModalPosition {
  top: number;
  left: number;
  right?: number;
}

export default function NotiesModal({ isOpen, onClose, anchorRef }: NotiesModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalPosition, setModalPosition] = useState<ModalPosition>({ top: 0, left: 0 });
  const { noties, unreadCount, isLoading, markAsRead, markAllAsRead } = useNoties();
  const { toast } = useToast();
  
  // Gift quick replies state - persisted to localStorage
  const [dismissedGiftIds, setDismissedGiftIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const showGiftQuickReplies = true; // Setting enabled by default
  
  const HANDLED_GIFTS_KEY = 'handledGiftIds';
  
  // Load handled gift IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HANDLED_GIFTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedGiftIds(new Set(parsed.map(String)));
        }
      }
    } catch (err) {
      console.warn('[NotiesModal] Failed to load handled gift IDs:', err);
    }
  }, []);
  
  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);
  
  const handleDismissGiftReply = (giftId: string) => {
    setDismissedGiftIds(prev => {
      const next = new Set([...prev, giftId]);
      // Persist to localStorage
      try {
        localStorage.setItem(HANDLED_GIFTS_KEY, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn('[NotiesModal] Failed to persist handled gift IDs:', err);
      }
      return next;
    });
  };
  
  const handleSendGiftReply = async (
    recipientId: string,
    message: string,
    giftId?: string,
    postId?: string,
    creatorStudioItemId?: string
  ): Promise<boolean> => {
    if (!currentUserId) return false;
    const supabase = createClient();
    
    try {
      // Determine routing based on gift context
      // Priority: post_id > creator_studio_item_id > DM
      
      // If we have a post_id, create a post comment
      if (postId) {
        const { error } = await supabase
          .from('post_comments')
          .insert({
            post_id: postId,
            author_id: currentUserId,
            content: message,
          });
        if (error) throw error;
        return true;
      }
      
      // If we have a creator_studio_item_id, create a watch comment
      // Note: creator_studio_comments table may not exist yet - fall through to DM if it fails
      if (creatorStudioItemId) {
        try {
          const { error } = await supabase
            .from('creator_studio_comments')
            .insert({
              item_id: creatorStudioItemId,
              author_id: currentUserId,
              content: message,
            });
          if (!error) return true;
          console.warn('[NotiesModal] creator_studio_comments insert failed, falling back to DM:', error.message);
        } catch (err) {
          console.warn('[NotiesModal] creator_studio_comments not available, falling back to DM');
        }
      }
      
      // If we have a giftId but no context, try to look up the gift context
      if (giftId) {
        // Check if this gift is associated with a post
        const { data: postGift } = await supabase
          .from('post_gifts')
          .select('post_id')
          .eq('gift_id', giftId)
          .maybeSingle();
        
        if (postGift?.post_id) {
          const { error } = await supabase
            .from('post_comments')
            .insert({
              post_id: postGift.post_id,
              author_id: currentUserId,
              content: message,
            });
          if (error) throw error;
          return true;
        }
        
        // Check if this gift is associated with a creator studio item
        // Note: creator_studio_item_gifts table may not exist yet - skip if query fails
        try {
          const { data: watchGift } = await supabase
            .from('creator_studio_item_gifts')
            .select('item_id')
            .eq('gift_id', giftId)
            .maybeSingle();
          
          if (watchGift?.item_id) {
            const { error } = await supabase
              .from('creator_studio_comments')
              .insert({
                item_id: watchGift.item_id,
                author_id: currentUserId,
                content: message,
              });
            if (!error) return true;
            console.warn('[NotiesModal] creator_studio_comments insert failed, falling back to DM:', error.message);
          }
        } catch (err) {
          // Table doesn't exist yet, skip this lookup
        }
      }
      
      // Fallback: Send as DM (for message-based gifts or when context lookup fails)
      const { error } = await supabase
        .from('instant_messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content: message,
        });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[NotiesModal] Failed to send gift reply:', err);
      return false;
    }
  };

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
      const modalWidth = 384; // w-96 = 384px
      const modalMaxHeight = 500; // Approximate height
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
      const maxTop = window.innerHeight - modalMaxHeight - viewportPadding;
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
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobile, isOpen]);

  if (!isOpen || !mounted) return null;

  // Filter notifications by tab
  const filterNoties = (tab: TabType): Notie[] => {
    switch (tab) {
      case 'mentions':
        return noties.filter(n => n.type === 'mention' || n.type === 'comment');
      case 'gifts':
        return noties.filter(n => n.type === 'gift' || n.type === 'level_up');
      case 'system':
        return noties.filter(n => n.type === 'system' || n.type === 'purchase');
      default:
        return noties;
    }
  };

  const filteredNoties = filterNoties(activeTab);

  const getNotieIcon = (type: NotieType) => {
    switch (type) {
      case 'gift': return <Gift className="w-4 h-4 text-pink-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'mention': return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'level_up': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'purchase': return <Package className="w-4 h-4 text-emerald-500" />;
      case 'system': return <Settings className="w-4 h-4 text-gray-500" />;
      case 'team_invite': return <Users className="w-4 h-4 text-teal-500" />;
      case 'team_invite_accepted': return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'team_join_request': return <UserPlus className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotieClick = (notie: Notie) => {
    markAsRead(notie.id);
    const destination = getNotificationDestination({
      type: notie.type,
      actionUrl: notie.actionUrl,
      metadata: notie.metadata,
    });

    if (destination.toast) {
      toast({
        title: destination.toast.title,
        description: destination.toast.description,
        variant: destination.toast.variant,
        action:
          destination.toast.secondaryLabel && destination.toast.secondaryHref
            ? {
                label: destination.toast.secondaryLabel,
                onClick: () => router.push(destination.toast!.secondaryHref!),
              }
            : undefined,
      });
    }

    if (destination.kind === 'external') {
      try {
        window.open(destination.url, '_blank', 'noopener,noreferrer');
      } catch {
        router.push('/noties');
      }
    } else {
      router.push(destination.href);
    }
    onClose();
  };

  const handleAcceptInvite = async (inviteId: number) => {
    const result = await acceptTeamInvite(inviteId);
    if (result.success && result.team_slug) {
      router.push(`/teams/${result.team_slug}`);
      onClose();
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    await declineTeamInvite(inviteId);
    // Refresh noties to remove the declined invite
    window.location.reload();
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'gifts', label: 'Gifts' },
    { key: 'system', label: 'System' },
  ];

  // Mobile: Full screen slide-up
  const mobileContent = (
    <>
      {/* Backdrop - solid background to prevent content bleeding through */}
      <div className="fixed inset-0 z-[9999] bg-background" aria-hidden="true" />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-[9999] flex flex-col bg-background animate-slide-up">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <h2 className="text-lg font-bold text-foreground">Noties</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-muted rounded-lg transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card overflow-x-auto scrollbar-hidden flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[80px] px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - explicit background to prevent any bleed-through */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNoties.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-border bg-background">
              {filteredNoties.map(notie => (
                <NotieItem
                  key={notie.id}
                  notie={notie}
                  icon={getNotieIcon(notie.type)}
                  timeAgo={formatTimeAgo(notie.createdAt)}
                  onClick={() => handleNotieClick(notie)}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                  showQuickReplies={
                    showGiftQuickReplies &&
                    notie.type === 'gift' &&
                    !!notie.metadata?.sender_id &&
                    !!notie.metadata?.gift_id &&
                    !dismissedGiftIds.has(String(notie.metadata.gift_id))
                  }
                  onSendGiftReply={handleSendGiftReply}
                  onDismissGiftReply={handleDismissGiftReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Desktop: Dropdown anchored to icon
  const desktopContent = (
    <div
      ref={modalRef}
      className="fixed w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in z-[9999]"
      style={{ 
        top: `${modalPosition.top}px`,
        right: `${modalPosition.right}px`,
        // Use dvh for better iOS Safari support
        maxHeight: 'calc(100dvh - 120px)' 
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Noties</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-muted rounded-lg transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/30">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNoties.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {filteredNoties.map(notie => (
              <NotieItem
                key={notie.id}
                notie={notie}
                icon={getNotieIcon(notie.type)}
                timeAgo={formatTimeAgo(notie.createdAt)}
                onClick={() => handleNotieClick(notie)}
                onAcceptInvite={handleAcceptInvite}
                onDeclineInvite={handleDeclineInvite}
                showQuickReplies={
                  showGiftQuickReplies &&
                  notie.type === 'gift' &&
                  !!notie.metadata?.sender_id &&
                  !!notie.metadata?.gift_id &&
                  !dismissedGiftIds.has(String(notie.metadata.gift_id))
                }
                onSendGiftReply={handleSendGiftReply}
                onDismissGiftReply={handleDismissGiftReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at body level for proper z-index stacking
  return createPortal(
    isMobile ? mobileContent : desktopContent,
    document.body
  );
}

// Notification item component
function NotieItem({ 
  notie, 
  icon, 
  timeAgo, 
  onClick,
  onAcceptInvite,
  onDeclineInvite,
  showQuickReplies,
  onSendGiftReply,
  onDismissGiftReply,
}: { 
  notie: Notie; 
  icon: React.ReactNode; 
  timeAgo: string; 
  onClick: () => void;
  onAcceptInvite?: (inviteId: number) => void;
  onDeclineInvite?: (inviteId: number) => void;
  showQuickReplies?: boolean;
  onSendGiftReply?: (recipientId: string, message: string, giftId?: string, postId?: string, creatorStudioItemId?: string) => Promise<boolean>;
  onDismissGiftReply?: (giftId: string) => void;
}) {
  const isTeamInvite = notie.type === 'team_invite' && notie.metadata?.invite_id;

  return (
    <div
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition ${
        !notie.isRead ? 'bg-primary/5' : ''
      }`}
    >
      {/* Avatar - clickable */}
      <button onClick={onClick} className="relative flex-shrink-0">
        <img 
          src={getAvatarUrl(notie.avatarUrl)} 
          alt="" 
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 p-1 bg-card rounded-full border border-border">
          {icon}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button onClick={onClick} className="text-left w-full">
          <p className={`text-sm leading-snug ${!notie.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {notie.message}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
        </button>

        {/* Team invite actions */}
        {isTeamInvite && onAcceptInvite && onDeclineInvite && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcceptInvite(notie.metadata!.invite_id);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition"
            >
              Accept
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeclineInvite(notie.metadata!.invite_id);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-foreground rounded-lg transition"
            >
              Decline
            </button>
          </div>
        )}
        
        {/* Gift quick replies */}
        {showQuickReplies && onSendGiftReply && onDismissGiftReply && notie.metadata?.gift_id && notie.metadata?.sender_id && (
          <GiftQuickReplies
            giftId={String(notie.metadata.gift_id)}
            senderId={String(notie.metadata.sender_id)}
            postId={notie.metadata?.post_id ? String(notie.metadata.post_id) : undefined}
            creatorStudioItemId={notie.metadata?.creator_studio_item_id ? String(notie.metadata.creator_studio_item_id) : undefined}
            onSendReply={onSendGiftReply}
            onDismiss={onDismissGiftReply}
          />
        )}
      </div>

      {/* Unread indicator */}
      {!notie.isRead && (
        <div className="flex-shrink-0 w-2.5 h-2.5 bg-primary rounded-full mt-1" />
      )}
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No new noties</p>
      <p className="text-xs text-muted-foreground">When you get notifications, they'll show up here</p>
    </div>
  );
}

