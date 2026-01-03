'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import IMChatWindow, { IMMessage } from './IMChatWindow';

function encodeGiftContent(gift: { giftId: number; giftName: string; giftCoins: number; giftIcon?: string }) {
  return `__gift__:${JSON.stringify(gift)}`;
}

// Decode message content to extract type and data
function decodeIMContent(
  content: string
):
  | { type: 'text'; text: string }
  | { type: 'gift'; giftId?: number; giftName?: string; giftCoins?: number; giftIcon?: string }
  | { type: 'image'; url?: string; mime?: string; width?: number; height?: number } {
  if (typeof content !== 'string') return { type: 'text', text: '' };
  if (content.startsWith('__img__:')) {
    try {
      const raw = content.slice('__img__:'.length);
      const parsed = JSON.parse(raw);
      return {
        type: 'image',
        url: typeof parsed?.url === 'string' ? parsed.url : undefined,
        mime: typeof parsed?.mime === 'string' ? parsed.mime : undefined,
        width: typeof parsed?.width === 'number' ? parsed.width : undefined,
        height: typeof parsed?.height === 'number' ? parsed.height : undefined,
      };
    } catch {
      return { type: 'text', text: '' };
    }
  }
  if (!content.startsWith('__gift__:')) return { type: 'text', text: content };
  try {
    const raw = content.slice('__gift__:'.length);
    const parsed = JSON.parse(raw);
    return {
      type: 'gift',
      giftId: typeof parsed?.giftId === 'number' ? parsed.giftId : undefined,
      giftName: typeof parsed?.giftName === 'string' ? parsed.giftName : undefined,
      giftCoins: typeof parsed?.giftCoins === 'number' ? parsed.giftCoins : undefined,
      giftIcon: typeof parsed?.giftIcon === 'string' ? parsed.giftIcon : undefined,
    };
  } catch {
    return { type: 'text', text: content };
  }
}

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

  const markConversationRead = useCallback(
    async (otherUserId: string) => {
      if (!currentUserId) return;

      try {
        const readAt = new Date().toISOString();
        const { error } = await supabase
          .from('instant_messages')
          .update({ read_at: readAt })
          .eq('recipient_id', currentUserId)
          .eq('sender_id', otherUserId)
          .is('read_at', null);

        if (error) {
          console.error('[IM] Error marking messages read:', error);
          return;
        }

        setChatWindows(prev =>
          prev.map(c =>
            c.recipientId === otherUserId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.senderId === otherUserId && m.status !== 'read' ? { ...m, status: 'read' as const } : m
                  ),
                }
              : c
          )
        );
      } catch (error) {
        console.error('[IM] Error marking messages read:', error);
      }
    },
    [currentUserId, supabase]
  );

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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[IM] Error loading messages:', error);
        return;
      }

      const rows = [...(data || [])].reverse();
      const messages: IMMessage[] = rows.map((m: any) => {
        const decoded = decodeIMContent(m.content);
        const status: 'read' | 'delivered' = m.read_at ? 'read' : 'delivered';
        const base = {
          id: m.id.toString(),
          senderId: m.sender_id,
          content: decoded.type === 'text' ? decoded.text : '',
          timestamp: new Date(m.created_at),
          status,
        };
        
        if (decoded.type === 'gift') {
          return {
            ...base,
            type: 'gift' as const,
            giftName: decoded.giftName,
            giftCoins: decoded.giftCoins,
            giftIcon: decoded.giftIcon,
          };
        }
        if (decoded.type === 'image') {
          return {
            ...base,
            type: 'image' as const,
            imageUrl: decoded.url,
          };
        }
        return { ...base, type: 'text' as const };
      });

      setChatWindows(prev => prev.map(c => 
        c.chatId === chatId ? { ...c, messages } : c
      ));

      await markConversationRead(recipientId);
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

  const sendGift = useCallback(
    async (
      chatId: string,
      recipientId: string,
      giftId: number,
      giftName: string,
      giftCoins: number,
      giftIcon?: string
    ) => {
      if (!currentUserId) return;

      const tempId = `temp-gift-${Date.now()}`;
      const requestId = crypto.randomUUID();

      const newMessage: IMMessage = {
        id: tempId,
        senderId: currentUserId,
        content: '',
        timestamp: new Date(),
        status: 'sending',
        type: 'gift',
        giftName,
        giftCoins,
        giftIcon,
      };

      setChatWindows((prev) =>
        prev.map((c) => (c.chatId === chatId ? { ...c, messages: [...c.messages, newMessage] } : c))
      );

      try {
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

        const raw = await response.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          const errMsg =
            (data && typeof data?.error === 'string' && data.error.length ? data.error : null) ||
            (raw && raw.length ? raw : null) ||
            'Failed to send gift';
          throw new Error(errMsg);
        }

        const giftContent = encodeGiftContent({
          giftId,
          giftName,
          giftCoins,
          giftIcon,
        });

        const { data: row, error } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: giftContent,
          })
          .select()
          .single();

        if (error) throw error;

        setChatWindows((prev) =>
          prev.map((c) =>
            c.chatId === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempId
                      ? {
                          ...m,
                          id: row.id.toString(),
                          timestamp: row.created_at ? new Date(row.created_at) : m.timestamp,
                          status: 'sent',
                        }
                      : m
                  ),
                }
              : c
          )
        );
      } catch (error) {
        console.error('[IM] Error sending gift:', error);
        setChatWindows((prev) =>
          prev.map((c) =>
            c.chatId === chatId
              ? {
                  ...c,
                  messages: c.messages.filter((m) => m.id !== tempId),
                }
              : c
          )
        );
      }
    },
    [currentUserId, supabase]
  );

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
    const chat = chatWindows.find(c => c.chatId === chatId);
    if (chat) {
      void markConversationRead(chat.recipientId);
    }
  }, [chatWindows, markConversationRead]);

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
              const decoded = decodeIMContent(msg.content);
              const newMsg: IMMessage = {
                id: msg.id.toString(),
                senderId: msg.sender_id,
                content: decoded.type === 'text' ? decoded.text : '',
                timestamp: new Date(msg.created_at),
                status: 'delivered' as const,
                type: decoded.type,
                ...(decoded.type === 'gift' && {
                  giftName: decoded.giftName,
                  giftCoins: decoded.giftCoins,
                  giftIcon: decoded.giftIcon,
                }),
                ...(decoded.type === 'image' && {
                  imageUrl: decoded.url,
                }),
              };
              
              return prev.map(c =>
                c.recipientId === senderId
                  ? { ...c, messages: [...c.messages, newMsg] }
                  : c
              );
            }
            
            // New chat from unknown sender - auto-open window
            console.log('[IM] New message from unknown sender, fetching sender info:', senderId);
            
            // Fetch sender profile info
            supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', senderId)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  console.log('[IM] Auto-opening chat for:', profile.username);
                  // Use the openChat function which handles window creation properly
                  openChat(senderId, profile.username, profile.avatar_url);
                }
              }, (err) => console.error('[IM] Error fetching sender profile:', err));
            
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
          onSendGift={(giftId, giftName, giftCoins, giftIcon) =>
            sendGift(chat.chatId, chat.recipientId, giftId, giftName, giftCoins, giftIcon)
          }
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

