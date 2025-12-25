'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import IMChatWindow, { IMMessage } from './IMChatWindow';

interface ChatWindow {
  chatId: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatar?: string;
  isOnline: boolean;
  isMinimized: boolean;
  messages: IMMessage[];
  position: { x: number; y: number };
}

interface IMManagerProps {
  currentUserId: string | null;
}

/**
 * IMManager - Manages multiple instant message chat windows
 * 
 * Features:
 * - Open multiple chats simultaneously
 * - Auto-stack windows at bottom right
 * - Z-index management for focus
 * - Real-time message sync
 */
export default function IMManager({ currentUserId }: IMManagerProps) {
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [focusedChatId, setFocusedChatId] = useState<string | null>(null);
  const supabase = createClient();

  // Calculate initial position for new windows (stack from bottom right)
  const getNewWindowPosition = useCallback((index: number) => {
    const baseX = typeof window !== 'undefined' ? window.innerWidth - 340 : 100;
    const baseY = typeof window !== 'undefined' ? window.innerHeight - 440 : 100;
    const offset = index * 30;
    return { x: baseX - offset, y: baseY - offset };
  }, []);

  // Open a chat with a user
  const openChat = useCallback((
    recipientId: string,
    recipientUsername: string,
    recipientAvatar?: string
  ) => {
    if (!currentUserId) return;
    
    // Check if chat already exists
    const existingIndex = chatWindows.findIndex(c => c.recipientId === recipientId);
    if (existingIndex !== -1) {
      // Bring to focus and unminimize
      setChatWindows(prev => prev.map((c, i) => 
        i === existingIndex ? { ...c, isMinimized: false } : c
      ));
      setFocusedChatId(chatWindows[existingIndex].chatId);
      return;
    }

    // Create new chat window
    const chatId = `chat-${currentUserId}-${recipientId}`;
    const newWindow: ChatWindow = {
      chatId,
      recipientId,
      recipientUsername,
      recipientAvatar,
      isOnline: false, // TODO: Check actual online status
      isMinimized: false,
      messages: [],
      position: getNewWindowPosition(chatWindows.length),
    };

    setChatWindows(prev => [...prev, newWindow]);
    setFocusedChatId(chatId);

    // Load existing messages
    loadMessages(chatId, recipientId);
  }, [currentUserId, chatWindows, getNewWindowPosition]);

  // Load messages from database
  const loadMessages = async (chatId: string, recipientId: string) => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('instant_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[IM] Error loading messages:', error);
        return;
      }

      const messages: IMMessage[] = (data || []).map((m: any) => ({
        id: m.id.toString(),
        senderId: m.sender_id,
        content: m.content,
        timestamp: new Date(m.created_at),
        status: m.read_at ? 'read' : 'delivered',
      }));

      setChatWindows(prev => prev.map(c => 
        c.chatId === chatId ? { ...c, messages } : c
      ));
    } catch (error) {
      console.error('[IM] Error loading messages:', error);
    }
  };

  // Send a message
  const sendMessage = useCallback(async (chatId: string, recipientId: string, content: string) => {
    if (!currentUserId) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage: IMMessage = {
      id: tempId,
      senderId: currentUserId,
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    // Optimistic update
    setChatWindows(prev => prev.map(c => 
      c.chatId === chatId 
        ? { ...c, messages: [...c.messages, newMessage] }
        : c
    ));

    try {
      const { data, error } = await supabase
        .from('instant_messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update with real message
      setChatWindows(prev => prev.map(c => 
        c.chatId === chatId
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === tempId
                  ? { ...m, id: data.id.toString(), status: 'sent' as const }
                  : m
              ),
            }
          : c
      ));
    } catch (error) {
      console.error('[IM] Error sending message:', error);
      // Mark as failed
      setChatWindows(prev => prev.map(c => 
        c.chatId === chatId
          ? {
              ...c,
              messages: c.messages.filter(m => m.id !== tempId),
            }
          : c
      ));
    }
  }, [currentUserId, supabase]);

  // Close a chat
  const closeChat = useCallback((chatId: string) => {
    setChatWindows(prev => prev.filter(c => c.chatId !== chatId));
    if (focusedChatId === chatId) {
      setFocusedChatId(null);
    }
  }, [focusedChatId]);

  // Minimize/restore a chat
  const toggleMinimize = useCallback((chatId: string) => {
    setChatWindows(prev => prev.map(c => 
      c.chatId === chatId ? { ...c, isMinimized: !c.isMinimized } : c
    ));
  }, []);

  // Focus a chat
  const focusChat = useCallback((chatId: string) => {
    setFocusedChatId(chatId);
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('im-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instant_messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          const msg = payload.new;
          const senderId = msg.sender_id;
          
          // Find or create chat window for this sender
          setChatWindows(prev => {
            const existingChat = prev.find(c => c.recipientId === senderId);
            if (existingChat) {
              // Add message to existing chat
              return prev.map(c =>
                c.recipientId === senderId
                  ? {
                      ...c,
                      messages: [
                        ...c.messages,
                        {
                          id: msg.id.toString(),
                          senderId: msg.sender_id,
                          content: msg.content,
                          timestamp: new Date(msg.created_at),
                          status: 'delivered' as const,
                        },
                      ],
                    }
                  : c
              );
            }
            // New chat from unknown sender - could open window automatically
            // For now, just ignore until user opens chat
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  // Expose openChat function globally for other components to use
  useEffect(() => {
    (window as any).openIMChat = openChat;
    return () => {
      delete (window as any).openIMChat;
    };
  }, [openChat]);

  if (!currentUserId) return null;

  return (
    <>
      {chatWindows.map((chat, index) => (
        <IMChatWindow
          key={chat.chatId}
          chatId={chat.chatId}
          recipientId={chat.recipientId}
          recipientUsername={chat.recipientUsername}
          recipientAvatar={chat.recipientAvatar}
          isOnline={chat.isOnline}
          messages={chat.messages}
          currentUserId={currentUserId}
          initialPosition={chat.position}
          isMinimized={chat.isMinimized}
          onClose={() => closeChat(chat.chatId)}
          onMinimize={() => toggleMinimize(chat.chatId)}
          onSendMessage={(content) => sendMessage(chat.chatId, chat.recipientId, content)}
          onFocus={() => focusChat(chat.chatId)}
          zIndex={focusedChatId === chat.chatId ? 9999 : 9990 + index}
        />
      ))}
    </>
  );
}

// Helper hook to open IM from anywhere
export function useIM() {
  const openChat = useCallback((
    recipientId: string,
    recipientUsername: string,
    recipientAvatar?: string
  ) => {
    if (typeof window !== 'undefined' && (window as any).openIMChat) {
      (window as any).openIMChat(recipientId, recipientUsername, recipientAvatar);
    }
  }, []);

  return { openChat };
}

