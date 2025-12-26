import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { emitTopBarRefresh } from './topbar/useTopBarState';

/**
 * useMessages Hook - Mobile parity with web
 * 
 * Simplified version of web components/messages/MessagesContext.tsx
 * for mobile consumption. Provides same data structure and methods.
 */

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

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'gift' | 'image';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  giftName?: string;
  giftCoins?: number;
  imageUrl?: string;
}

export function useMessages() {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const currentUserId = user?.id ?? null;

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const loadConversations = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    if (!currentUserId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      // Call the same RPC as web
      const { data, error } = await client.rpc('get_im_conversations', {
        p_user_id: currentUserId,
      });

      if (error) {
        console.error('[Messages] Error loading conversations:', error);
        setConversations([]);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      
      const convos: Conversation[] = rows.map((r: any) => ({
        id: String(r.other_user_id),
        recipientId: String(r.other_user_id),
        recipientUsername: String(r.other_username ?? 'Unknown'),
        recipientAvatar: r.other_avatar_url ?? undefined,
        recipientDisplayName: r.other_display_name ?? undefined,
        isOnline: false, // Simplified for mobile
        lastMessage: String(r.last_message ?? ''),
        lastMessageAt: r.last_message_at ? new Date(r.last_message_at) : new Date(),
        unreadCount: Number(r.unread_count ?? 0),
      }));

      setConversations(convos);
    } catch (error) {
      console.error('[Messages] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const client = supabase;
      if (!client) return;
      if (!currentUserId) return;
      
      try {
        const { data, error } = await client.rpc('get_conversation', {
          p_user_id: currentUserId,
          p_other_user_id: conversationId,
          p_limit: 50,
          p_offset: 0,
        });

        if (error) {
          console.error('[Messages] Error loading messages:', error);
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        const ordered = [...rows].reverse();
        
        const mapped: Message[] = ordered.map((r: any) => ({
          id: String(r.id),
          senderId: String(r.sender_id),
          content: String(r.content ?? ''),
          type: 'text', // Simplified for mobile
          timestamp: r.created_at ? new Date(r.created_at) : new Date(),
          status: 'sent',
        }));
        
        setMessages(mapped);
      } catch (error) {
        console.error('[Messages] Error loading messages:', error);
      }
    },
    [currentUserId]
  );

  const sendMessage = useCallback(
    async (recipientId: string, content: string): Promise<boolean> => {
      const client = supabase;
      if (!client) return false;
      if (!currentUserId || !content.trim()) return false;

      try {
        const { error } = await client
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: content.trim(),
          });
          
        if (error) throw error;

        // Refresh conversations and messages
        await loadConversations();
        if (activeConversationId === recipientId) {
          await loadMessages(recipientId);
        }

        emitTopBarRefresh();

        return true;
      } catch (error) {
        console.error('[Messages] Error sending message:', error);
        return false;
      }
    },
    [currentUserId, activeConversationId, loadConversations, loadMessages]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      const client = supabase;
      if (!client) return;
      if (!currentUserId) return;
      
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );

      void (async () => {
        try {
          await client.rpc('mark_messages_read', {
            p_user_id: currentUserId,
            p_sender_id: conversationId,
          });
          emitTopBarRefresh();
        } catch (error) {
          console.error('[Messages] Error marking read:', error);
        }
      })();
    },
    [currentUserId]
  );

  // Load conversations on user change
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      return;
    }
    setConversations([]);
    setMessages([]);
    setIsLoading(false);
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

  return {
    conversations,
    totalUnreadCount,
    isLoading,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    markConversationRead,
    refreshConversations: loadConversations,
    currentUserId,
  };
}

