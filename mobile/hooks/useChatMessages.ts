/**
 * Chat Messages Hook - REAL DATA (parity with Web)
 * 
 * Fetches and subscribes to chat messages from Supabase
 * Same data source as components/Chat.tsx on web
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase as createClient } from '../lib/supabase';

export interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  gifter_level?: number;
  content: string;
  created_at: string;
}

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient;

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          profile_id,
          message_type,
          content,
          created_at,
          profiles (
            username,
            avatar_url,
            gifter_level
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const messagesWithProfiles = (data || []).map((msg: any) => ({
        id: msg.id,
        profile_id: msg.profile_id,
        username: msg.profiles?.username || 'Unknown',
        avatar_url: msg.profiles?.avatar_url,
        gifter_level: msg.profiles?.gifter_level || 0,
        content: msg.content,
        created_at: msg.created_at,
      }));

      // Reverse to show oldest first (natural chat order)
      setMessages(messagesWithProfiles.reverse());
    } catch (error) {
      console.error('[CHAT] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[CHAT] Cannot send message: not authenticated');
        return false;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          profile_id: user.id,
          content,
          message_type: 'user',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[CHAT] Error sending message:', error);
      return false;
    }
  }, [supabase]);

  useEffect(() => {
    loadMessages();

    // Realtime subscription for new messages
    const channel = supabase
      .channel('chat-messages-mobile')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages, supabase]);

  return {
    messages,
    loading,
    sendMessage,
    refresh: loadMessages,
  };
}

