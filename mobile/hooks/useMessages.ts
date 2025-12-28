import { useState, useEffect, useCallback } from 'react';
import { Image } from 'react-native';

import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { emitTopBarRefresh } from './topbar/useTopBarState';
import { fetchAuthed } from '../lib/api';
import { generateSessionId } from '../lib/deviceId';

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

function encodeGiftContent(gift: { giftId: number; giftName: string; giftCoins: number; giftIcon?: string }) {
  return `__gift__:${JSON.stringify(gift)}`;
}

function encodeImageContent(image: { url: string; mime: string; width?: number; height?: number }) {
  return `__img__:${JSON.stringify(image)}`;
}

function getImageDimensions(uri: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    if (!uri) return resolve({});
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({})
    );
  });
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'gift' | 'image';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  giftId?: number;
  giftName?: string;
  giftCoins?: number;
  giftIcon?: string;
  imageUrl?: string;
  imageMime?: string;
  imageWidth?: number;
  imageHeight?: number;
  error?: string;
}

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

export function useMessages() {
  const { user, getAccessToken } = useAuthContext();
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
      
      const convos: Conversation[] = rows.map((r: any) => {
        const decoded = decodeIMContent(String(r.last_message ?? ''));
        const lastMessageText =
          decoded.type === 'gift'
            ? `Sent ${decoded.giftName || 'a gift'} 🎁 (+${decoded.giftCoins ?? 0} 💰)`
            : decoded.type === 'image'
              ? '📷 Photo'
              : decoded.text;

        return {
          id: String(r.other_user_id),
          recipientId: String(r.other_user_id),
          recipientUsername: String(r.other_username ?? 'Unknown'),
          recipientAvatar: r.other_avatar_url ?? undefined,
          recipientDisplayName: r.other_display_name ?? undefined,
          isOnline: false,
          lastMessage: lastMessageText,
          lastMessageAt: r.last_message_at ? new Date(r.last_message_at) : new Date(),
          unreadCount: Number(r.unread_count ?? 0),
        };
      });

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
        
        const mapped: Message[] = ordered.map((r: any) => {
          const senderId = String(r.sender_id);
          const readAt = r.read_at ? new Date(r.read_at) : null;
          const decoded = decodeIMContent(String(r.content ?? ''));
          const timestamp = r.created_at ? new Date(r.created_at) : new Date();
          const status = senderId === currentUserId ? (readAt ? 'read' : 'sent') : 'delivered';

          if (decoded.type === 'gift') {
            return {
              id: String(r.id),
              senderId,
              content: '',
              type: 'gift',
              giftId: decoded.giftId,
              giftName: decoded.giftName,
              giftIcon: decoded.giftIcon,
              giftCoins: decoded.giftCoins,
              timestamp,
              status,
            };
          }

          if (decoded.type === 'image') {
            return {
              id: String(r.id),
              senderId,
              content: '',
              type: 'image',
              imageUrl: decoded.url,
              imageMime: decoded.mime,
              imageWidth: decoded.width,
              imageHeight: decoded.height,
              timestamp,
              status,
            };
          }

          return {
            id: String(r.id),
            senderId,
            content: decoded.text,
            type: 'text',
            timestamp,
            status,
          };
        });
        
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

  const sendGift = useCallback(
    async (
      recipientId: string,
      giftId: number,
      giftName: string,
      giftCoins: number,
      giftIcon?: string
    ): Promise<boolean> => {
      const client = supabase;
      if (!client) return false;
      if (!currentUserId) return false;
      if (!recipientId) return false;

      const accessToken = await getAccessToken();
      const requestId = generateSessionId();
      const tempId = `temp-gift-${Date.now()}`;

      const placeholder: Message = {
        id: tempId,
        senderId: currentUserId,
        content: '',
        type: 'gift',
        giftId,
        giftName,
        giftCoins,
        giftIcon,
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, placeholder]);

      try {
        const res = await fetchAuthed(
          '/api/gifts/send',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toUserId: recipientId,
              coinsAmount: giftCoins,
              giftTypeId: giftId,
              context: 'dm',
              requestId,
            }),
          },
          accessToken
        );

        if (!res.ok) {
          throw new Error(res.message || 'Failed to send gift');
        }

        const giftContent = encodeGiftContent({
          giftId,
          giftName,
          giftCoins,
          giftIcon,
        });

        const { data: imRow, error: imErr } = await client
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: giftContent,
          })
          .select('id, created_at')
          .single();

        if (imErr) throw imErr;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: String((imRow as any)?.id ?? tempId),
                  timestamp: (imRow as any)?.created_at ? new Date((imRow as any).created_at) : m.timestamp,
                  status: 'sent',
                }
              : m
          )
        );

        await loadConversations();
        emitTopBarRefresh();
        return true;
      } catch (error) {
        const errText = error instanceof Error ? error.message : 'Failed to send gift';
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: errText } : m)));
        return false;
      }
    },
    [currentUserId, getAccessToken, loadConversations]
  );

  const sendImage = useCallback(
    async (recipientId: string, uri: string, mimeType: string): Promise<boolean> => {
      const client = supabase;
      if (!client) return false;
      if (!currentUserId) return false;
      if (!recipientId) return false;
      if (!uri) return false;
      if (!mimeType || !mimeType.startsWith('image/')) return false;

      const accessToken = await getAccessToken();
      const tempId = `temp-image-${Date.now()}`;
      const now = new Date();

      const placeholder: Message = {
        id: tempId,
        senderId: currentUserId,
        content: '',
        type: 'image',
        imageUrl: uri,
        imageMime: mimeType,
        timestamp: now,
        status: 'sending',
      };

      setMessages((prev) => [...prev, placeholder]);

      try {
        const dims = await getImageDimensions(uri);

        const uploadPrep = await fetchAuthed(
          '/api/messages/upload-url',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mimeType, otherProfileId: recipientId }),
          },
          accessToken
        );

        if (!uploadPrep.ok) {
          throw new Error(uploadPrep.message || 'Failed to prepare upload');
        }

        const bucket = String((uploadPrep.data as any)?.bucket || '');
        const path = String((uploadPrep.data as any)?.path || '');
        const token = String((uploadPrep.data as any)?.token || '');
        const publicUrl = String((uploadPrep.data as any)?.publicUrl || '');
        if (!bucket || !path || !token || !publicUrl) {
          throw new Error('Upload response missing required fields');
        }

        const blob = await fetch(uri).then((r) => r.blob());
        const { error: uploadErr } = await client.storage.from(bucket).uploadToSignedUrl(path, token, blob, {
          contentType: mimeType,
        });
        if (uploadErr) throw uploadErr;

        const content = encodeImageContent({
          url: publicUrl,
          mime: mimeType,
          width: dims.width,
          height: dims.height,
        });

        const { data: imRow, error: imErr } = await client
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content,
          })
          .select('id, created_at')
          .single();
        if (imErr) throw imErr;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: String((imRow as any)?.id ?? tempId),
                  imageUrl: publicUrl,
                  imageWidth: dims.width,
                  imageHeight: dims.height,
                  timestamp: (imRow as any)?.created_at ? new Date((imRow as any).created_at) : m.timestamp,
                  status: 'sent',
                }
              : m
          )
        );

        await loadConversations();
        emitTopBarRefresh();
        return true;
      } catch (error) {
        const errText = error instanceof Error ? error.message : 'Failed to send image';
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: errText } : m)));
        return false;
      }
    },
    [currentUserId, getAccessToken, loadConversations]
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
    sendGift,
    sendImage,
    markConversationRead,
    refreshConversations: loadConversations,
    currentUserId,
  };
}



