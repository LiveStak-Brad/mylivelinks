'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { AuthChangeEvent, RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js';

export type MessageType = 'text' | 'gift' | 'image';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
  // Gift-specific fields
  giftId?: number;
  giftName?: string;
  giftIcon?: string;
  giftCoins?: number;
  // Image-specific fields
  imageUrl?: string;
  imageMime?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface Conversation {
  id: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatar?: string;
  recipientDisplayName?: string;
  recipientIsLive?: boolean;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageAt: Date;
  unreadCount: number;
  /** Whether the last message was sent by the current user */
  lastMessageSentByMe?: boolean;
  /** Whether the last message (if sent by me) was read by recipient */
  lastMessageRead?: boolean;
}

interface MessagesContextType {
  conversations: Conversation[];
  totalUnreadCount: number;
  isLoading: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  messages: Message[];
  loadMessages: (conversationId: string, forceRefresh?: boolean) => Promise<void>;
  openConversationWith: (recipientId: string) => Promise<boolean>;
  sendMessage: (recipientId: string, content: string) => Promise<boolean>;
  sendGift: (recipientId: string, giftId: number, giftName: string, giftCoins: number, giftIcon?: string) => Promise<boolean>;
  sendImage: (recipientId: string, file: File) => Promise<boolean>;
  markConversationRead: (conversationId: string) => void;
  refreshConversations: () => Promise<void>;
  currentUserId: string | null;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

type InstantMessageRow = {
  id: string | number;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
};

type IMConversationRow = {
  other_user_id: string;
  other_username?: string | null;
  other_avatar_url?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | string | null;
};

type InsertIdRow = {
  id: string | number;
  created_at?: string | null;
};

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

function encodeGiftContent(gift: { giftId: number; giftName: string; giftCoins: number; giftIcon?: string }) {
  return `__gift__:${JSON.stringify(gift)}`;
}

function encodeImageContent(image: { url: string; mime: string; width?: number; height?: number }) {
  return `__img__:${JSON.stringify(image)}`;
}

async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });
      return dims;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return {};
  }
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Cache messages per conversation to prevent reloading
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const sendGiftInFlightRef = useRef(false);

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const loadOnlineMap = useCallback(
    async (profileIds: string[]) => {
      if (!profileIds.length) return new Map<string, boolean>();
      try {
        const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('room_presence')
          .select('profile_id, last_seen_at')
          .in('profile_id', profileIds)
          .gt('last_seen_at', cutoff);
        if (error) return new Map<string, boolean>();
        const online = new Map<string, boolean>();
        for (const row of Array.isArray(data) ? data : []) {
          if (row?.profile_id) online.set(String(row.profile_id), true);
        }
        return online;
      } catch {
        return new Map<string, boolean>();
      }
    },
    [supabase]
  );

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

  const loadConversationsFallback = useCallback(
    async () => {
      if (!currentUserId) return [] as Conversation[];
      const { data, error } = await supabase
        .from('instant_messages')
        .select('id, sender_id, recipient_id, content, created_at, read_at')
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error || !data) return [];

      const rows = (Array.isArray(data) ? (data as unknown as InstantMessageRow[]) : [])
        .filter((r) => r && typeof (r as InstantMessageRow).sender_id === 'string');

      const otherUserIds: string[] = [];
      const convoByOther = new Map<
        string,
        {
          last_message: string;
          last_message_at: string;
          unread_count: number;
          last_message_sent_by_me: boolean;
          last_message_read: boolean;
        }
      >();

      for (const row of rows) {
        const senderId = String(row.sender_id);
        const recipientId = String(row.recipient_id);
        const otherId = senderId === currentUserId ? recipientId : senderId;
        if (!convoByOther.has(otherId)) {
          const decoded = decodeIMContent(String(row.content ?? ''));
          const lastMessageText =
            decoded.type === 'gift'
              ? `Sent ${decoded.giftName || 'a gift'} 🎁 (+${decoded.giftCoins ?? 0} 💰)`
              : decoded.type === 'image'
                ? 'Sent a photo 📷'
              : decoded.text;
          const sentByMe = senderId === currentUserId;
          convoByOther.set(otherId, {
            last_message: String(lastMessageText ?? ''),
            last_message_at: String(row.created_at),
            unread_count: 0,
            last_message_sent_by_me: sentByMe,
            last_message_read: sentByMe && row.read_at != null,
          });
          otherUserIds.push(otherId);
        }
        if (recipientId === currentUserId && senderId === otherId && row.read_at == null) {
          const c = convoByOther.get(otherId);
          if (c) c.unread_count += 1;
        }
      }

      const { data: profiles } = otherUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name, is_live')
            .in('id', otherUserIds)
        : { data: [] as ProfileRow[] };
      const profileById = new Map<string, ProfileRow & { is_live?: boolean }>();
      for (const p of Array.isArray(profiles) ? profiles : []) {
        if (p?.id) profileById.set(String(p.id), p as any);
      }

      const onlineMap = await loadOnlineMap(otherUserIds);

      const convos: Conversation[] = otherUserIds
        .map((otherId) => {
          const meta = convoByOther.get(otherId);
          const p = profileById.get(otherId);
          return {
            id: otherId,
            recipientId: otherId,
            recipientUsername: String(p?.username ?? 'Unknown'),
            recipientDisplayName: p?.display_name ?? undefined,
            recipientAvatar: p?.avatar_url ?? undefined,
            recipientIsLive: Boolean((p as any)?.is_live ?? false),
            isOnline: onlineMap.get(otherId) ?? false,
            lastMessage: meta?.last_message ?? undefined,
            lastMessageAt: meta?.last_message_at ? new Date(meta.last_message_at) : new Date(),
            unreadCount: meta?.unread_count ?? 0,
            lastMessageSentByMe: meta?.last_message_sent_by_me ?? false,
            lastMessageRead: meta?.last_message_read ?? false,
          };
        })
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

      return convos;
    },
    [currentUserId, loadOnlineMap, supabase]
  );

  const loadConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_im_conversations', {
        p_user_id: currentUserId,
      });

      if (error) {
        const fallback = await loadConversationsFallback();
        setConversations((prev) => {
          if (!activeConversationId) return fallback;
          if (fallback.some((c) => c.id === activeConversationId)) return fallback;
          const existing = prev.find((c) => c.id === activeConversationId);
          if (!existing) return fallback;
          return [existing, ...fallback].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
        });
        return;
      }

      const rows = Array.isArray(data) ? (data as unknown as IMConversationRow[]) : [];
      const otherUserIds = rows.map((r) => String(r.other_user_id)).filter(Boolean);
      const onlineMap = await loadOnlineMap(otherUserIds);

      const { data: profiles } = otherUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, display_name, is_live')
            .in('id', otherUserIds)
        : { data: [] as Array<{ id: string; display_name?: string | null; is_live?: boolean }> };
      const displayNameById = new Map<string, string>();
      const isLiveById = new Map<string, boolean>();
      for (const p of Array.isArray(profiles) ? profiles : []) {
        if (p?.id && p?.display_name) displayNameById.set(String(p.id), String(p.display_name));
        if (p?.id) isLiveById.set(String(p.id), Boolean(p.is_live ?? false));
      }

      // Need to fetch last message read status for each conversation
      // For now, we'll query to check if the last message was sent by us and if it was read
      const lastMessageStatusMap = new Map<string, { sentByMe: boolean; read: boolean }>();
      
      // Batch query to get the last message info for all conversations
      for (const r of rows) {
        const otherId = String(r.other_user_id);
        try {
          const { data: lastMsg } = await supabase
            .from('instant_messages')
            .select('sender_id, read_at')
            .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${currentUserId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (lastMsg) {
            const sentByMe = String(lastMsg.sender_id) === currentUserId;
            lastMessageStatusMap.set(otherId, {
              sentByMe,
              read: sentByMe && lastMsg.read_at != null,
            });
          }
        } catch {
          // Ignore errors for individual lookups
        }
      }

      const convos: Conversation[] = rows.map((r) => {
        const otherId = String(r.other_user_id);
        const decoded = decodeIMContent(String(r.last_message ?? ''));
        const lastMessageText =
          decoded.type === 'gift'
            ? `Sent ${decoded.giftName || 'a gift'} 🎁 (+${decoded.giftCoins ?? 0} 💰)`
            : decoded.type === 'image'
              ? 'Sent a photo 📷'
            : decoded.text;
        const statusInfo = lastMessageStatusMap.get(otherId);
        return {
          id: otherId,
          recipientId: otherId,
          recipientUsername: String(r.other_username ?? 'Unknown'),
          recipientAvatar: r.other_avatar_url ?? undefined,
          recipientDisplayName: displayNameById.get(otherId),
          recipientIsLive: isLiveById.get(otherId) ?? false,
          isOnline: onlineMap.get(otherId) ?? false,
          lastMessage: lastMessageText || undefined,
          lastMessageAt: r.last_message_at ? new Date(r.last_message_at) : new Date(),
          unreadCount: Number(r.unread_count ?? 0),
          lastMessageSentByMe: statusInfo?.sentByMe ?? false,
          lastMessageRead: statusInfo?.read ?? false,
        };
      });

      setConversations((prev) => {
        if (!activeConversationId) return convos;
        if (convos.some((c) => c.id === activeConversationId)) return convos;
        const existing = prev.find((c) => c.id === activeConversationId);
        if (!existing) return convos;
        return [existing, ...convos].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      });
    } catch (error) {
      console.error('[Messages] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, currentUserId, loadConversationsFallback, loadOnlineMap, supabase]);

  const openConversationWith = useCallback(
    async (recipientId: string): Promise<boolean> => {
      if (!currentUserId) return false;
      if (!recipientId) return false;
      if (recipientId === currentUserId) return false;

      const existing = conversations.find((c) => c.recipientId === recipientId);
      if (existing) {
        setActiveConversationId(existing.id);
        return true;
      }

      const conv: Conversation = {
        id: recipientId,
        recipientId,
        recipientUsername: 'Unknown',
        recipientDisplayName: undefined,
        recipientAvatar: undefined,
        isOnline: false,
        lastMessage: undefined,
        lastMessageAt: new Date(),
        unreadCount: 0,
      };

      setConversations((prev) => [conv, ...prev].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i));
      setActiveConversationId(recipientId);

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, display_name')
          .eq('id', recipientId)
          .single();
        if (error) throw error;

        const p = profile as unknown as { username?: string | null; display_name?: string | null; avatar_url?: string | null };

        const onlineMap = await loadOnlineMap([recipientId]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === recipientId
              ? {
                  ...c,
                  recipientUsername: String(p?.username ?? 'Unknown'),
                  recipientDisplayName: p?.display_name ?? undefined,
                  recipientAvatar: p?.avatar_url ?? undefined,
                  isOnline: onlineMap.get(recipientId) ?? false,
                }
              : c
          )
        );
      } catch (err) {
        console.error('[Messages] Error opening conversation:', err);
      }

      return true;
    },
    [conversations, currentUserId, loadOnlineMap, supabase]
  );

  const loadMessages = useCallback(
    async (conversationId: string, forceRefresh = false) => {
      if (!currentUserId) return;
      
      // Check cache first unless force refresh
      if (!forceRefresh && messagesCacheRef.current.has(conversationId)) {
        const cached = messagesCacheRef.current.get(conversationId);
        if (cached) {
          // Don't re-set messages if they're already from cache
          // The useEffect will have already set them synchronously
          return;
        }
      }

      const otherUserId = conversationId;
      try {
        const { data, error } = await supabase.rpc('get_conversation', {
          p_user_id: currentUserId,
          p_other_user_id: otherUserId,
          p_limit: 50,
          p_offset: 0,
        });

        let rows: InstantMessageRow[] = [];
        if (!error) {
          rows = Array.isArray(data) ? (data as unknown as InstantMessageRow[]) : [];
        } else {
          const { data: fallback, error: fbErr } = await supabase
            .from('instant_messages')
            .select('id, sender_id, recipient_id, content, created_at, read_at')
            .or(
              `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`
            )
            .order('created_at', { ascending: false })
            .limit(50);
          if (!fbErr && Array.isArray(fallback)) rows = fallback as unknown as InstantMessageRow[];
        }

        const ordered = [...rows].reverse();
        const mapped: Message[] = ordered.map((r) => {
          const senderId = String(r.sender_id);
          const readAt = r.read_at ? new Date(r.read_at) : null;
          const decoded = decodeIMContent(String(r.content ?? ''));
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
              timestamp: r.created_at ? new Date(r.created_at) : new Date(),
              status: senderId === currentUserId ? (readAt ? 'read' : 'sent') : 'delivered',
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
              timestamp: r.created_at ? new Date(r.created_at) : new Date(),
              status: senderId === currentUserId ? (readAt ? 'read' : 'sent') : 'delivered',
            };
          }
          return {
            id: String(r.id),
            senderId,
            content: decoded.text,
            type: 'text',
            timestamp: r.created_at ? new Date(r.created_at) : new Date(),
            status: senderId === currentUserId ? (readAt ? 'read' : 'sent') : 'delivered',
          };
        });
        
        // Cache the messages
        messagesCacheRef.current.set(conversationId, mapped);
        
        // Only update state if this is still the active conversation
        setMessages((prev) => {
          // If we're viewing a different conversation now, don't update
          if (conversationId !== activeConversationId) return prev;
          return mapped;
        });
      } catch (error) {
        console.error('[Messages] Error loading messages:', error);
      }
    },
    [activeConversationId, currentUserId, supabase]
  );

  const sendMessage = useCallback(
    async (recipientId: string, content: string): Promise<boolean> => {
      if (!currentUserId || !content.trim()) return false;

      const tempId = `temp-${Date.now()}`;
      const now = new Date();
      const newMessage: Message = {
        id: tempId,
        senderId: currentUserId,
        content: content.trim(),
        type: 'text',
        timestamp: now,
        status: 'sending',
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        // Update cache immediately for active conversation
        if (recipientId === activeConversationId) {
          messagesCacheRef.current.set(recipientId, updated);
        }
        return updated;
      });

      try {
        const { data, error } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: content.trim(),
          })
          .select('id, sender_id, recipient_id, content, created_at, read_at')
          .single();
        if (error) throw error;

        const row = data as unknown as InstantMessageRow;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: String(row.id),
                  senderId: String(row.sender_id),
                  content: String(row.content ?? ''),
                  type: 'text',
                  timestamp: row.created_at ? new Date(row.created_at) : now,
                  status: 'sent',
                }
              : m
          )
        );

        // Update cache after successful send
        if (recipientId === activeConversationId) {
          setMessages((prev) => {
            messagesCacheRef.current.set(recipientId, prev);
            return prev;
          });
        }

        setConversations((prev) => {
          const existing = prev.find((c) => c.recipientId === recipientId);
          const updatedAt = row?.created_at ? new Date(row.created_at) : now;
          if (!existing) {
            void (async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username, avatar_url, display_name')
                  .eq('id', recipientId)
                  .single();
                if (profile) {
                  const profileRow = profile as unknown as {
                    username?: string | null;
                    avatar_url?: string | null;
                    display_name?: string | null;
                  };
                  setConversations((prevConvos) =>
                    prevConvos.map((c) =>
                      c.recipientId === recipientId
                        ? {
                            ...c,
                            recipientUsername: String(profileRow.username ?? 'Unknown'),
                            recipientAvatar: profileRow.avatar_url ?? undefined,
                            recipientDisplayName: profileRow.display_name ?? undefined,
                          }
                        : c
                    )
                  );
                }
              } catch {
              }
            })();
            const conv: Conversation = {
              id: recipientId,
              recipientId,
              recipientUsername: 'Unknown',
              recipientDisplayName: undefined,
              recipientAvatar: undefined,
              isOnline: false,
              lastMessage: content.trim(),
              lastMessageAt: updatedAt,
              unreadCount: 0,
            };
            return [conv, ...prev];
          }
          return prev
            .map((c) =>
              c.recipientId === recipientId
                ? { ...c, lastMessage: content.trim(), lastMessageAt: updatedAt }
                : c
            )
            .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
        });

        return true;
      } catch (error) {
        console.error('[Messages] Error sending message:', error);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
        return false;
      }
    },
    [activeConversationId, currentUserId, supabase]
  );

  const sendGift = useCallback(
    async (
      recipientId: string,
      giftId: number,
      giftName: string,
      giftCoins: number,
      giftIcon?: string
    ): Promise<boolean> => {
      if (!currentUserId) return false;

      if (sendGiftInFlightRef.current) return false;
      sendGiftInFlightRef.current = true;

      const tempId = `temp-gift-${Date.now()}`;
      const requestId = crypto.randomUUID();

      const newGiftMessage: Message = {
        id: tempId,
        senderId: currentUserId,
        content: '',
        type: 'gift',
        giftId,
        giftName,
        giftIcon,
        giftCoins,
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, newGiftMessage]);

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
        const { data: imRow, error: imErr } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content: giftContent,
          })
          .select('id, created_at')
          .single();
        if (imErr) throw imErr;

        const inserted = imRow as unknown as InsertIdRow;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: String(inserted?.id ?? tempId),
                  timestamp: inserted?.created_at ? new Date(inserted.created_at) : m.timestamp,
                  status: 'sent',
                }
              : m
          )
        );

        setConversations((prev) => {
          const existing = prev.find((c) => c.recipientId === recipientId);
          if (!existing) {
            const conv: Conversation = {
              id: recipientId,
              recipientId,
              recipientUsername: 'Unknown',
              recipientDisplayName: undefined,
              recipientAvatar: undefined,
              isOnline: false,
              lastMessage: `Sent ${giftName} 🎁 (+${data.diamondsAwarded} 💎)`,
              lastMessageAt: new Date(),
              unreadCount: 0,
            };
            return [conv, ...prev];
          }
          return prev
            .map((c) =>
              c.recipientId === recipientId
                ? {
                    ...c,
                    lastMessage: `Sent ${giftName} 🎁 (+${data.diamondsAwarded} 💎)`,
                    lastMessageAt: new Date(),
                  }
                : c
            )
            .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
        });

        return true;
      } catch (error) {
        console.error('[Messages] Error sending gift:', error);
        const errText = error instanceof Error ? error.message : 'Failed to send gift';
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: errText } : m))
        );
        return false;
      } finally {
        sendGiftInFlightRef.current = false;
      }
    },
    [currentUserId, supabase]
  );

  const sendImage = useCallback(
    async (recipientId: string, file: File): Promise<boolean> => {
      if (!currentUserId) return false;
      if (!recipientId) return false;
      if (!file) return false;
      if (!file.type?.startsWith('image/')) return false;

      const tempId = `temp-image-${Date.now()}`;
      const now = new Date();
      const localUrl = URL.createObjectURL(file);

      const placeholder: Message = {
        id: tempId,
        senderId: currentUserId,
        content: '',
        type: 'image',
        imageUrl: localUrl,
        imageMime: file.type,
        timestamp: now,
        status: 'sending',
      };

      setMessages((prev) => [...prev, placeholder]);

      try {
        const dims = await getImageDimensions(file);

        const uploadRes = await fetch('/api/messages/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mimeType: file.type, otherProfileId: recipientId }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData?.error || 'Failed to prepare upload');
        }

        const bucket = String(uploadData?.bucket || '');
        const path = String(uploadData?.path || '');
        const token = String(uploadData?.token || '');
        const publicUrl = String(uploadData?.publicUrl || '');
        if (!bucket || !path || !token || !publicUrl) {
          throw new Error('Upload response missing required fields');
        }

        const { error: uploadErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
          contentType: file.type,
        });
        if (uploadErr) throw uploadErr;

        const content = encodeImageContent({
          url: publicUrl,
          mime: file.type,
          width: dims.width,
          height: dims.height,
        });

        const { data, error } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: currentUserId,
            recipient_id: recipientId,
            content,
          })
          .select('id, created_at')
          .single();
        if (error) throw error;

        const inserted = data as unknown as InsertIdRow;
        const createdAt = inserted?.created_at ? new Date(inserted.created_at) : now;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: String(inserted?.id ?? tempId),
                  imageUrl: publicUrl,
                  imageWidth: dims.width,
                  imageHeight: dims.height,
                  timestamp: createdAt,
                  status: 'sent',
                }
              : m
          )
        );

        setConversations((prev) => {
          const existing = prev.find((c) => c.recipientId === recipientId);
          if (!existing) {
            const conv: Conversation = {
              id: recipientId,
              recipientId,
              recipientUsername: 'Unknown',
              recipientDisplayName: undefined,
              recipientAvatar: undefined,
              isOnline: false,
              lastMessage: 'Sent a photo 📷',
              lastMessageAt: createdAt,
              unreadCount: 0,
            };
            return [conv, ...prev];
          }
          return prev
            .map((c) => (c.recipientId === recipientId ? { ...c, lastMessage: 'Sent a photo 📷', lastMessageAt: createdAt } : c))
            .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
        });

        return true;
      } catch (err) {
        console.error('[Messages] Error sending image:', err);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
        return false;
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    },
    [currentUserId, supabase]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!currentUserId) return;
      const otherUserId = conversationId;
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));

      const readAt = new Date().toISOString();
      void (async () => {
        try {
          const { error: rpcErr } = await supabase.rpc('mark_messages_read', {
            p_user_id: currentUserId,
            p_sender_id: otherUserId,
          });
          if (!rpcErr) return;

          await supabase
            .from('instant_messages')
            .update({ read_at: readAt })
            .eq('recipient_id', currentUserId)
            .eq('sender_id', otherUserId)
            .is('read_at', null);
        } catch {
        }
      })();
    },
    [currentUserId, supabase]
  );

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
      // Check cache FIRST synchronously to prevent flash
      const cached = messagesCacheRef.current.get(activeConversationId);
      if (cached) {
        // HAS CACHE: Set immediately and DON'T call database
        setMessages(cached);
        // Still mark as read though
        markConversationRead(activeConversationId);
      } else {
        // NO CACHE: Set empty and load from database
        setMessages([]);
        loadMessages(activeConversationId);
        markConversationRead(activeConversationId);
      }
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages, markConversationRead]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`im-realtime-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instant_messages',
        },
        (payload: RealtimePostgresChangesPayload<InstantMessageRow>) => {
          const row = (payload.new || payload.old) as InstantMessageRow | null;
          if (!row) return;
          const senderId = String(row.sender_id ?? '');
          const recipientId = String(row.recipient_id ?? '');
          if (senderId !== currentUserId && recipientId !== currentUserId) return;
          void loadConversations();
          if (activeConversationId) {
            const otherId = activeConversationId;
            if (senderId === otherId || recipientId === otherId) {
              // Force refresh when new message arrives from other user
              void loadMessages(activeConversationId, true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId, loadConversations, loadMessages, supabase]);

  return (
    <MessagesContext.Provider value={{
      conversations,
      totalUnreadCount,
      isLoading,
      activeConversationId,
      setActiveConversationId,
      messages,
      loadMessages,
      openConversationWith,
      sendMessage,
      sendGift,
      sendImage,
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

