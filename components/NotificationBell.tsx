'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

type Notification = {
  id: number;
  actor_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor?: {
    username: string;
    avatar_url: string | null;
  };
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load notifications
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_get_unread_count');
      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  // Subscribe to new notifications
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    const { data: { user } } = supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${data.user.id}`,
          },
          () => {
            loadNotifications();
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [supabase]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: number) => {
    try {
      await supabase.rpc('rpc_mark_notification_read', { p_notification_id: id });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      loadUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.rpc('rpc_mark_all_notifications_read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-pink-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                  }}
                  className={`
                    flex items-start gap-3 p-4 border-b border-border last:border-0
                    hover:bg-muted/50 transition-colors cursor-pointer
                    ${!notif.read ? 'bg-primary/5' : ''}
                  `}
                >
                  {/* Actor Avatar */}
                  <img
                    src={notif.actor?.avatar_url || '/no-profile-pic.png'}
                    alt=""
                    className="w-10 h-10 rounded-full flex-shrink-0 ring-1 ring-border"
                    onError={(e) => {
                      e.currentTarget.src = '/no-profile-pic.png';
                    }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notif.created_at)}
                    </p>
                  </div>

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
