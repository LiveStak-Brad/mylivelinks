'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

// Notification types
export type NotieType = 'gift' | 'follow' | 'mention' | 'comment' | 'level_up' | 'system' | 'purchase';

export interface Notie {
  id: string;
  type: NotieType;
  title: string;
  message: string;
  avatarUrl?: string;
  avatarFallback?: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotiesContextType {
  noties: Notie[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNoties: () => Promise<void>;
}

const NotiesContext = createContext<NotiesContextType | undefined>(undefined);

// Mock notifications for development
const MOCK_NOTIES: Notie[] = [
  {
    id: '1',
    type: 'gift',
    title: 'New Gift!',
    message: 'JohnDoe sent you a Rose 🌹',
    avatarUrl: undefined,
    avatarFallback: 'JD',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    actionUrl: '/JohnDoe',
    metadata: { giftName: 'Rose', giftAmount: 50 },
  },
  {
    id: '2',
    type: 'follow',
    title: 'New Follower',
    message: 'Sarah started following you',
    avatarFallback: 'S',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    actionUrl: '/Sarah',
  },
  {
    id: '3',
    type: 'level_up',
    title: 'Level Up! 🔥',
    message: 'You reached VIP Level 12',
    avatarFallback: '🎯',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    actionUrl: '/gifter-levels',
  },
  {
    id: '4',
    type: 'mention',
    title: 'Mentioned',
    message: 'Mike mentioned you in a comment',
    avatarFallback: 'M',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    actionUrl: '/Mike',
  },
  {
    id: '5',
    type: 'purchase',
    title: 'Purchase Complete',
    message: 'Your coin purchase was successful 💰',
    avatarFallback: '✓',
    isRead: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    actionUrl: '/wallet',
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to MyLiveLinks!',
    message: 'Complete your profile to get started',
    avatarFallback: '👋',
    isRead: true,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    actionUrl: '/settings/profile',
  },
];

export function NotiesProvider({ children }: { children: ReactNode }) {
  const [noties, setNoties] = useState<Notie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const unreadCount = noties.filter(n => !n.isRead).length;

  const loadNoties = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNoties([]);
        return;
      }

      // TODO: Replace with actual Supabase query when backend is ready
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      setNoties(MOCK_NOTIES);
      
    } catch (error) {
      console.error('[Noties] Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const markAsRead = useCallback((id: string) => {
    setNoties(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    // TODO: Persist to database
  }, []);

  const markAllAsRead = useCallback(() => {
    setNoties(prev => prev.map(n => ({ ...n, isRead: true })));
    // TODO: Persist to database
  }, []);

  const refreshNoties = useCallback(async () => {
    await loadNoties();
  }, [loadNoties]);

  // Load on mount
  useEffect(() => {
    loadNoties();
  }, [loadNoties]);

  // Subscribe to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadNoties();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadNoties]);

  return (
    <NotiesContext.Provider value={{
      noties,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      refreshNoties,
    }}>
      {children}
    </NotiesContext.Provider>
  );
}

export function useNoties() {
  const context = useContext(NotiesContext);
  if (!context) {
    throw new Error('useNoties must be used within a NotiesProvider');
  }
  return context;
}

