'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type MessageType = 'text' | 'gift';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  // Gift-specific fields
  giftId?: number;
  giftName?: string;
  giftIcon?: string;
  giftCoins?: number;
}

export interface Conversation {
  id: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatar?: string;
  recipientDisplayName?: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface MessagesContextType {
  conversations: Conversation[];
  totalUnreadCount: number;
  isLoading: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  messages: Message[];
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<boolean>;
  sendGift: (recipientId: string, giftId: number, giftName: string, giftCoins: number) => Promise<boolean>;
  markConversationRead: (conversationId: string) => void;
  refreshConversations: () => Promise<void>;
  currentUserId: string | null;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

// Mock conversations for development
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    recipientId: 'user-1',
    recipientUsername: 'JohnDoe',
    recipientDisplayName: 'John Doe',
    recipientAvatar: undefined,
    isOnline: true,
    lastMessage: 'Hey! Thanks for the stream today 🔥',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    recipientId: 'user-2',
    recipientUsername: 'SarahLive',
    recipientDisplayName: 'Sarah',
    recipientAvatar: undefined,
    isOnline: true,
    lastMessage: 'Are you going live tonight?',
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
    unreadCount: 1,
  },
  {
    id: 'conv-3',
    recipientId: 'user-3',
    recipientUsername: 'GamerMike',
    recipientDisplayName: 'Mike',
    recipientAvatar: undefined,
    isOnline: false,
    lastMessage: 'Sent you a gift 🎁 Rose (+30 💎)',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
  },
  {
    id: 'conv-4',
    recipientId: 'user-4',
    recipientUsername: 'CoolCreator',
    recipientDisplayName: 'Cool Creator',
    recipientAvatar: undefined,
    isOnline: false,
    lastMessage: 'Thanks for following!',
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 0,
  },
];

// Mock messages for development
const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'm1',
      senderId: 'user-1',
      content: 'Hey! Loved your stream today!',
      type: 'text',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm2',
      senderId: 'current-user',
      content: 'Thanks so much! Glad you enjoyed it 😊',
      type: 'text',
      timestamp: new Date(Date.now() - 55 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm3',
      senderId: 'user-1',
      content: 'When are you streaming next?',
      type: 'text',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm4',
      senderId: 'current-user',
      content: 'Probably tomorrow evening around 8pm!',
      type: 'text',
      timestamp: new Date(Date.now() - 20 * 60 * 1000),
      status: 'delivered',
    },
    {
      id: 'm5',
      senderId: 'user-1',
      content: "Hey! Thanks for the stream today 🔥",
      type: 'text',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'delivered',
    },
  ],
  'conv-2': [
    {
      id: 'm1',
      senderId: 'current-user',
      content: 'Hi Sarah!',
      type: 'text',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm2',
      senderId: 'user-2',
      content: 'Hey! How are you?',
      type: 'text',
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm3',
      senderId: 'user-2',
      content: 'Are you going live tonight?',
      type: 'text',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'delivered',
    },
  ],
  'conv-3': [
    {
      id: 'm1',
      senderId: 'user-3',
      content: 'Your content is amazing!',
      type: 'text',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm2',
      senderId: 'user-3',
      content: '',
      type: 'gift',
      giftId: 1,
      giftName: 'Rose',
      giftIcon: '🌹',
      giftCoins: 50,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'read',
    },
    {
      id: 'm3',
      senderId: 'current-user',
      content: 'Thank you so much for the gift! 💕',
      type: 'text',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      status: 'read',
    },
  ],
};

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual Supabase query when backend is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      setConversations(MOCK_CONVERSATIONS);
    } catch (error) {
      console.error('[Messages] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      // TODO: Replace with actual Supabase query
      await new Promise(resolve => setTimeout(resolve, 200));
      const mockMessages = MOCK_MESSAGES[conversationId] || [];
      // Replace 'current-user' with actual user id in mock
      const mappedMessages = mockMessages.map(m => ({
        ...m,
        senderId: m.senderId === 'current-user' ? currentUserId : m.senderId,
      }));
      setMessages(mappedMessages);
    } catch (error) {
      console.error('[Messages] Error loading messages:', error);
    }
  }, [currentUserId]);

  const sendMessage = useCallback(async (recipientId: string, content: string): Promise<boolean> => {
    if (!currentUserId || !content.trim()) return false;

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      content: content.trim(),
      type: 'text',
      timestamp: new Date(),
      status: 'sending',
    };

    // Optimistic update
    setMessages(prev => [...prev, newMessage]);

    try {
      // TODO: Actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mark as sent
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' as const } : m
      ));

      // Update conversation last message
      setConversations(prev => prev.map(c => 
        c.recipientId === recipientId 
          ? { ...c, lastMessage: content, lastMessageAt: new Date() }
          : c
      ));

      return true;
    } catch (error) {
      console.error('[Messages] Error sending message:', error);
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' as const } : m
      ));
      return false;
    }
  }, [currentUserId]);

  const sendGift = useCallback(async (
    recipientId: string, 
    giftId: number, 
    giftName: string, 
    giftCoins: number
  ): Promise<boolean> => {
    if (!currentUserId) return false;

    const tempId = `temp-gift-${Date.now()}`;
    const requestId = crypto.randomUUID();
    
    const newGiftMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      content: '',
      type: 'gift',
      giftId,
      giftName,
      giftCoins,
      timestamp: new Date(),
      status: 'sending',
    };

    // Optimistic update
    setMessages(prev => [...prev, newGiftMessage]);

    try {
      // Call the existing gift API
      const response = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: recipientId,
          coinsAmount: giftCoins,
          giftTypeId: giftId,
          context: 'dm',
          requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      // Mark as sent
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' as const } : m
      ));

      // Update conversation last message
      setConversations(prev => prev.map(c => 
        c.recipientId === recipientId 
          ? { 
              ...c, 
              lastMessage: `Sent ${giftName} 🎁 (+${data.diamondsAwarded} 💎)`,
              lastMessageAt: new Date() 
            }
          : c
      ));

      return true;
    } catch (error) {
      console.error('[Messages] Error sending gift:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }
  }, [currentUserId]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    // TODO: Persist to database
  }, []);

  const refreshConversations = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  // Load on user change
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, loadConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      markConversationRead(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages, markConversationRead]);

  return (
    <MessagesContext.Provider value={{
      conversations,
      totalUnreadCount,
      isLoading,
      activeConversationId,
      setActiveConversationId,
      messages,
      loadMessages,
      sendMessage,
      sendGift,
      markConversationRead,
      refreshConversations,
      currentUserId,
    }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}

