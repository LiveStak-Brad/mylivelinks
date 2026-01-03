/**
 * Chat Messages Hook - REAL DATA (parity with Web)
 * 
 * Fetches and subscribes to chat messages from Supabase
 * Same data source as components/Chat.tsx on web
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase as createClient } from '../lib/supabase';

export interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  gifter_level?: number;
  message_type?: string;
  content: string;
  created_at: string;
  chat_bubble_color?: string | null;
  chat_font?: string | null;
  client_status?: 'sending' | 'failed';
}

export function useChatMessages(options?: { roomId?: string; liveStreamId?: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient;

  const styleCacheRef = useRef<Record<string, { chat_bubble_color?: string | null; chat_font?: string | null }>>({});

  const scopeKey = `${options?.roomId ?? ''}:${options?.liveStreamId ?? ''}`;

  const optionsRef = useRef<{ roomId?: string; liveStreamId?: number } | undefined>(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const loadMessageWithProfile = useCallback(async (msg: any) => {
    if (!msg) return;

    if (!msg.profile_id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, {
          id: msg.id,
          profile_id: null,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
        }];
        return next.slice(-50);
      });
      return;
    }

    const [profileResult, chatSettingsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, avatar_url, gifter_level')
        .eq('id', msg.profile_id)
        .maybeSingle(),
      supabase
        .from('chat_settings')
        .select('chat_bubble_color, chat_font')
        .eq('profile_id', msg.profile_id)
        .maybeSingle(),
    ]);

    const profile = profileResult.data as any;
    const chatSettings = (chatSettingsResult as any)?.data as any;
    const cachedStyle = styleCacheRef.current[msg.profile_id];
    const chat_bubble_color = cachedStyle?.chat_bubble_color ?? chatSettings?.chat_bubble_color ?? null;
    const chat_font = cachedStyle?.chat_font ?? chatSettings?.chat_font ?? null;

    styleCacheRef.current[msg.profile_id] = {
      chat_bubble_color,
      chat_font,
    };

    const hydrated: ChatMessage = {
      id: msg.id,
      profile_id: msg.profile_id,
      username: profile?.username || 'Unknown',
      avatar_url: profile?.avatar_url,
      gifter_level: profile?.gifter_level || 0,
      message_type: msg.message_type,
      content: msg.content,
      created_at: msg.created_at,
      chat_bubble_color,
      chat_font,
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === hydrated.id)) return prev;

      const optimisticIndex = prev.findIndex((m) =>
        typeof m.id === 'string' &&
        m.id.startsWith('temp-') &&
        m.profile_id === hydrated.profile_id &&
        m.content === hydrated.content &&
        Math.abs(new Date(m.created_at).getTime() - new Date(hydrated.created_at).getTime()) < 8000
      );

      if (optimisticIndex >= 0) {
        const next = [...prev];
        next[optimisticIndex] = hydrated;
        return next.slice(-50);
      }

      return [...prev, hydrated].slice(-50);
    });
  }, [supabase]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { roomId, liveStreamId } = optionsRef.current || {};
      if (roomId && liveStreamId) {
        console.warn('[CHAT] Invalid scope: both roomId and liveStreamId provided. Using roomId only.');
      }

      let scopedQuery: any = supabase
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
        `);

      if (roomId) {
        scopedQuery = scopedQuery.eq('room_id', roomId).is('live_stream_id', null);
      } else if (liveStreamId) {
        scopedQuery = scopedQuery.eq('live_stream_id', liveStreamId).is('room_id', null);
      } else {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await scopedQuery.order('created_at', { ascending: true }).limit(50);

      if (error) throw error;

      const profileIds = Array.from(
        new Set<string>(
          (data || [])
            .map((m: any) => m?.profile_id)
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
        )
      );

      let chatSettingsMap: Record<string, { chat_bubble_color?: string | null; chat_font?: string | null }> = {};
      try {
        if (profileIds.length > 0) {
          const { data: chatSettingsData } = await supabase
            .from('chat_settings')
            .select('profile_id, chat_bubble_color, chat_font')
            .in('profile_id', profileIds);

          chatSettingsMap = (chatSettingsData || []).reduce((acc: any, row: any) => {
            acc[row.profile_id] = {
              chat_bubble_color: row.chat_bubble_color ?? null,
              chat_font: row.chat_font ?? null,
            };
            return acc;
          }, {});
        }
      } catch {
        // ignore
      }

      profileIds.forEach((id) => {
        const next = chatSettingsMap[id] || null;
        styleCacheRef.current[id] = {
          chat_bubble_color: next?.chat_bubble_color ?? null,
          chat_font: next?.chat_font ?? null,
        };
      });

      const messagesWithProfiles = (data || []).map((msg: any) => {
        const cachedStyle = msg?.profile_id ? styleCacheRef.current[msg.profile_id] : null;
        return {
          id: msg.id,
          profile_id: msg.profile_id,
          username: msg.profiles?.username || 'Unknown',
          avatar_url: msg.profiles?.avatar_url,
          gifter_level: msg.profiles?.gifter_level || 0,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
          chat_bubble_color: cachedStyle?.chat_bubble_color ?? null,
          chat_font: cachedStyle?.chat_font ?? null,
        } as ChatMessage;
      });

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('[CHAT] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, scopeKey]);

  // Send message
  const sendMessageInternal = useCallback(async (content: string, existingTempId?: string) => {
    let tempId: string | undefined = existingTempId;
    try {
      const { roomId, liveStreamId } = optionsRef.current || {};
      if (roomId && liveStreamId) {
        console.warn('[CHAT] Invalid scope: both roomId and liveStreamId provided. Using roomId only.');
      }
      const hasScope = Boolean(roomId || liveStreamId);
      if (!hasScope) {
        console.warn('[CHAT] Cannot send message: no roomId or liveStreamId provided');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[CHAT] Cannot send message: not authenticated');
        return false;
      }

      const nextTempId = existingTempId || `temp-${Date.now()}-${content.slice(0, 10)}`;
      tempId = nextTempId;

      const cachedSelfStyle = styleCacheRef.current[user.id] || null;
      const optimisticChatBubbleColor = cachedSelfStyle?.chat_bubble_color ?? null;
      const optimisticChatFont = cachedSelfStyle?.chat_font ?? null;

      if (!existingTempId) {
        setMessages((prev) => {
          const optimistic: ChatMessage = {
            id: nextTempId,
            profile_id: user.id,
            username: 'You',
            message_type: 'text',
            content,
            created_at: new Date().toISOString(),
            chat_bubble_color: optimisticChatBubbleColor,
            chat_font: optimisticChatFont,
            client_status: 'sending',
          };

          return [...prev, optimistic].slice(-50);
        });

        // If we don't have styling cached yet, fetch it (non-blocking) and patch the optimistic message in-place.
        if (!cachedSelfStyle) {
          (async () => {
            try {
              const { data: settings } = await supabase
                .from('chat_settings')
                .select('chat_bubble_color, chat_font')
                .eq('profile_id', user.id)
                .maybeSingle();

              const nextStyle = {
                chat_bubble_color: (settings as any)?.chat_bubble_color ?? null,
                chat_font: (settings as any)?.chat_font ?? null,
              };

              styleCacheRef.current[user.id] = nextStyle;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === nextTempId
                    ? { ...m, chat_bubble_color: nextStyle.chat_bubble_color, chat_font: nextStyle.chat_font }
                    : m
                )
              );
            } catch {
              // ignore
            }
          })();
        }
      } else {
        setMessages((prev) => prev.map((m) => (m.id === existingTempId ? { ...m, client_status: 'sending' } : m)));
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          profile_id: user.id,
          content,
          message_type: 'text',
          room_id: roomId || null,
          live_stream_id: roomId ? null : (liveStreamId || null),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[CHAT] Error sending message:', error);

      if (tempId) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, client_status: 'failed' } : m)));
      }
      return false;
    }
  }, [supabase]);

  const sendMessage = useCallback(async (content: string) => {
    return sendMessageInternal(content);
  }, [sendMessageInternal]);

  const retryMessage = useCallback(async (tempId: string) => {
    const msg = messages.find((m) => m.id === tempId);
    if (!msg) return false;
    return sendMessageInternal(msg.content, tempId);
  }, [messages, sendMessageInternal]);

  useEffect(() => {
    loadMessages();

    // Realtime subscription for new messages
    const { roomId, liveStreamId } = optionsRef.current || {};
    if (!roomId && !liveStreamId) {
      return;
    }

    const channel = supabase
      .channel(`chat-messages-mobile-${roomId ? `room-${roomId}` : `stream-${liveStreamId}`}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: roomId
            ? `room_id=eq.${roomId}`
            : `live_stream_id=eq.${liveStreamId}`,
        },
        (payload: any) => {
          if (!payload?.new) return;

          if (roomId) {
            if (
              payload.new.room_id === roomId &&
              (payload.new.live_stream_id === null || payload.new.live_stream_id === undefined)
            ) {
              loadMessageWithProfile(payload.new);
            }
            return;
          }

          if (
            payload.new.live_stream_id === liveStreamId &&
            (payload.new.room_id === null || payload.new.room_id === undefined)
          ) {
            loadMessageWithProfile(payload.new);
          }
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel(`chat-settings-mobile-${roomId ? `room-${roomId}` : `stream-${liveStreamId}`}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_settings',
        },
        (payload: any) => {
          const profileId = payload?.new?.profile_id || payload?.old?.profile_id;
          if (!profileId) return;

          const nextStyle = {
            chat_bubble_color: payload?.new?.chat_bubble_color ?? null,
            chat_font: payload?.new?.chat_font ?? null,
          };

          styleCacheRef.current[profileId] = nextStyle;
          setMessages((prev) =>
            prev.map((m) =>
              m.profile_id === profileId
                ? { ...m, chat_bubble_color: nextStyle.chat_bubble_color, chat_font: nextStyle.chat_font }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settingsChannel);
    };
  }, [loadMessages, loadMessageWithProfile, supabase, scopeKey]);

  return {
    messages,
    loading,
    sendMessage,
    retryMessage,
    refresh: loadMessages,
  };
}

