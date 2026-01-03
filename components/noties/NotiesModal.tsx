'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Gift, UserPlus, AtSign, MessageCircle, Trophy, Package, Settings, X, Users, UserCheck } from 'lucide-react';
import { useNoties, NotieType, Notie } from './NotiesContext';
import { acceptTeamInvite, declineTeamInvite } from '@/lib/teamInvites';
import { getAvatarUrl } from '@/lib/defaultAvatar';

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
      const maxTop = window.innerHeight - modalMaxHeight - viewportPadding;
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
    if (notie.actionUrl) {
      router.push(notie.actionUrl);
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
        left: `${modalPosition.left}px`,
        maxHeight: 'calc(100vh - 120px)' 
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
}: { 
  notie: Notie; 
  icon: React.ReactNode; 
  timeAgo: string; 
  onClick: () => void;
  onAcceptInvite?: (inviteId: number) => void;
  onDeclineInvite?: (inviteId: number) => void;
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

