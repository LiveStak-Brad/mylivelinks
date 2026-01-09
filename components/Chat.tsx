'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import { GifterBadge as TierBadge } from '@/components/gifter';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import UserActionCardV2 from './UserActionCardV2';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import SafeRichText from '@/components/SafeRichText';
import LiveAvatar from '@/components/LiveAvatar';
import { trackLiveComment } from '@/lib/trending-hooks';

interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  is_live?: boolean;
  message_type: string;
  content: string;
  created_at: string;
  chat_bubble_color?: string;
  chat_font?: string;
}

interface ChatProps {
  roomSlug?: string;
  liveStreamId?: number;
  onGiftClick?: () => void;
  onShareClick?: () => void;
  onSettingsClick?: () => void;
  readOnly?: boolean; // If true, hide input box
}

export default function Chat({ roomSlug, liveStreamId, onGiftClick, onShareClick, onSettingsClick, readOnly = false }: ChatProps) {
  console.log('[CHAT] 🎬 Component rendered with:', { roomSlug, liveStreamId, readOnly });
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    username: string;
    avatar_url?: string;
  } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    profileId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    gifterStatus?: GifterStatus | null;
    isLive?: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  // CRITICAL: Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  // CRITICAL: Track subscription to prevent duplicates
  const subscriptionRef = useRef<{ channel: any; subscribed: boolean } | null>(null);

  useEffect(() => {
    // Get current user ID and profile
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Load user profile immediately for optimistic messages
        supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }: { data: any }) => {
            if (profile) {
              setCurrentUserProfile({
                username: profile.username,
                avatar_url: profile.avatar_url,
              });
            }
          });
      } else {
        setCurrentUserId(null);
        setCurrentUserProfile(null);
      }
    });
  }, [supabase]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const updateAutoScrollFlag = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  }, []);

  // CRITICAL: Use useCallback to prevent stale closures and ensure stable reference
  const loadMessages = useCallback(async () => {
    // Use functional update to get current messages state
    let isInitialLoad = false;
    setMessages((currentMessages) => {
      isInitialLoad = currentMessages.length === 0;
      return currentMessages; // Don't change state, just read it
    });
    
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      // Require scope to be specified
      if (!roomSlug && !liveStreamId) {
        throw new Error('Chat requires roomSlug or liveStreamId');
      }

      // Build query with scope filter
      let query = supabase
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
            is_live,
            chat_bubble_color,
            chat_font
          )
        `);

      // Apply scope filter (XOR: exactly one must be set)
      if (roomSlug) {
        query = query.eq('room_id', roomSlug).is('live_stream_id', null);
      } else if (liveStreamId) {
        query = query.eq('live_stream_id', liveStreamId).is('room_id', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const messagesWithBadges = (data || []).map((msg: any) => {
        const profile = msg.profiles;
        return {
          id: msg.id,
          profile_id: msg.profile_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          is_live: profile?.is_live || false,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
        };
      });

      const ordered = [...messagesWithBadges].reverse();
      setMessages(ordered);

      const profileIds = Array.from(
        new Set<string>(
          messagesWithBadges
            .map((m: any) => m.profile_id)
            .filter((id: any): id is string => typeof id === 'string')
        )
      );
      const statusMap = await fetchGifterStatuses(profileIds);
      setGifterStatusMap(statusMap);

      if (isInitialLoad) {
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      
      // If no scope provided, don't show anything
      if (!roomSlug && !liveStreamId) {
        console.error('[CHAT] ❌ No scope provided - cannot load messages');
        setMessages([]);
        setLoading(false);
        return;
      }
      
      // Fallback to regular query if RPC fails
      let fallbackQuery = supabase
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
            is_live,
            chat_bubble_color,
            chat_font
          )
        `);

      // Apply scope filter
      if (roomSlug) {
        fallbackQuery = fallbackQuery.eq('room_id', roomSlug).is('live_stream_id', null);
      } else if (liveStreamId) {
        fallbackQuery = fallbackQuery.eq('live_stream_id', liveStreamId).is('room_id', null);
      }

      const { data, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: true })
        .limit(50);

      if (!fallbackError && data) {
        const messagesWithProfiles = data.map((msg: any) => {
          const profile = msg.profiles;

          const mappedMsg = {
            id: msg.id,
            profile_id: msg.profile_id,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url,
            is_live: profile?.is_live || false,
            gifter_level: profile?.gifter_level || 0,
            message_type: msg.message_type,
            content: msg.content,
            created_at: msg.created_at,
            chat_bubble_color: profile?.chat_bubble_color,
            chat_font: profile?.chat_font,
          };
          
          if (profile?.chat_bubble_color || profile?.chat_font) {
            console.log('[CHAT] 🎨 Loaded message with custom styling:', {
              username: mappedMsg.username,
              chat_bubble_color: mappedMsg.chat_bubble_color,
              chat_font: mappedMsg.chat_font,
            });
          }
          
          return mappedMsg;
        });
        
        setMessages(messagesWithProfiles);

        const profileIds = Array.from(
          new Set<string>(
            messagesWithProfiles
              .map((m: any) => m.profile_id)
              .filter((id: any): id is string => typeof id === 'string')
          )
        );
        const statusMap = await fetchGifterStatuses(profileIds);
        setGifterStatusMap(statusMap);

        if (isInitialLoad) {
          requestAnimationFrame(() => scrollToBottom('auto'));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, scrollToBottom]); // Only depend on stable references

  // CRITICAL: Use useCallback to prevent stale closures
  const loadMessageWithProfile = useCallback(async (message: any) => {
    if (!message.profile_id) {
      // System message
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, {
          id: message.id,
          profile_id: null,
          message_type: message.message_type,
          content: message.content,
          created_at: message.created_at,
        }];
      });
      if (shouldAutoScrollRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      return;
    }

    // Load profile (non-blocking)
    Promise.all([
      supabase
        .from('profiles')
        .select('username, avatar_url, is_live, chat_bubble_color, chat_font')
        .eq('id', message.profile_id)
        .single(),
      fetchGifterStatuses([message.profile_id]).then((m) => m[message.profile_id] || null),
    ]).then(([profileResult, status]) => {
      const profile = profileResult.data;

      const newMsg = {
        id: message.id,
        profile_id: message.profile_id,
        username: (profile as any)?.username || 'Unknown',
        avatar_url: (profile as any)?.avatar_url,
        is_live: (profile as any)?.is_live || false,
        message_type: message.message_type,
        content: message.content,
        created_at: message.created_at,
        chat_bubble_color: (profile as any)?.chat_bubble_color,
        chat_font: (profile as any)?.chat_font,
      };
      
      console.log('[CHAT] 📨 New realtime message loaded:', {
        username: newMsg.username,
        chat_bubble_color: newMsg.chat_bubble_color,
        chat_font: newMsg.chat_font,
        profile_id: newMsg.profile_id,
      });

      if (status) {
        setGifterStatusMap((prev) => ({ ...prev, [message.profile_id]: status }));
      }
      
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;

        const optimisticIndex = prev.findIndex((m: any) =>
          typeof m.id === 'string' &&
          m.id.startsWith('temp-') &&
          m.profile_id === newMsg.profile_id &&
          m.content === newMsg.content &&
          Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 8000
        );

        if (optimisticIndex >= 0) {
          const next = [...prev];
          next[optimisticIndex] = newMsg;
          return next;
        }

        return [...prev, newMsg];
      });

      if (shouldAutoScrollRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      
      console.log('[CHAT] 📊 Current messages count:', messages.length + 1);
    }).catch((error) => {
      console.error('Error loading message profile:', error);
      // Add message without profile data if query fails
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, {
            id: message.id,
            profile_id: message.profile_id,
            username: 'Unknown',
            avatar_url: undefined,
            message_type: message.message_type,
            content: message.content,
            created_at: message.created_at,
          }];
        });
    });
  }, [supabase, scrollToBottom]); // Only depend on stable references

  // CRITICAL: Store loadMessageWithProfile in ref to avoid stale closures in subscription
  const loadMessageWithProfileRef = useRef(loadMessageWithProfile);
  useEffect(() => {
    loadMessageWithProfileRef.current = loadMessageWithProfile;
  }, [loadMessageWithProfile]);

  // Listen for profile updates (chat styling changes) and refresh messages
  useEffect(() => {
    const profileChannel = supabase
      .channel('profile-updates-all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          const updatedProfileId = payload.new.id;
          
          // Update all messages from this user with new styling
          setMessages((prev) => 
            prev.map((msg) => 
              msg.profile_id === updatedProfileId
                ? {
                    ...msg,
                    chat_bubble_color: payload.new.chat_bubble_color,
                    chat_font: payload.new.chat_font,
                  }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      profileChannel.unsubscribe();
    };
  }, [supabase]);

  // CRITICAL: Create realtime subscription, recreate if room/stream changes
  useEffect(() => {
    // Don't subscribe if we don't have a room or stream ID
    if (!roomSlug && !liveStreamId) {
      console.warn('[CHAT] ⚠️ No roomSlug or liveStreamId, skipping subscription');
      return;
    }

    // Prevent duplicate subscriptions
    if (subscriptionRef.current?.subscribed) {
      console.log('[CHAT] 🧹 Removing old subscription before creating new one');
      supabase.removeChannel(subscriptionRef.current.channel);
      subscriptionRef.current = null;
    }

    const filterString = roomSlug 
      ? `room_id=eq.${roomSlug}`
      : `live_stream_id=eq.${liveStreamId}`;
    
    console.log('[CHAT] 🔌 Creating realtime subscription', { 
      roomSlug, 
      liveStreamId, 
      channelName: `chat-messages-${roomSlug || liveStreamId}`,
      filter: filterString 
    });
    
    // Subscribe to new messages (realtime) with scope filter
    const channel = supabase
      .channel(`chat-messages-${roomSlug || liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: filterString,
        },
        (payload: any) => {
          console.log('[CHAT] 📨 Realtime event triggered!', { 
            hasPayload: !!payload, 
            hasNew: !!payload?.new,
            payload: payload?.new 
          });
          
          // Add new message immediately via realtime - use ref to avoid stale closure
          if (payload?.new) {
            console.log('[CHAT] ✅ Loading message with profile...');
            loadMessageWithProfileRef.current(payload.new as any);
          } else {
            console.warn('[CHAT] ⚠️ Received event but no payload.new');
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[CHAT] ✅ Realtime subscription active - ONE subscription exists');
          subscriptionRef.current = { channel, subscribed: true };
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[CHAT] ❌ Realtime subscription error:', status);
          subscriptionRef.current = null;
        } else {
          console.log('[CHAT] 📡 Subscription status:', status);
        }
      });

    return () => {
      console.log('[CHAT] 🧹 Cleaning up realtime subscription');
      if (subscriptionRef.current?.channel) {
        supabase.removeChannel(subscriptionRef.current.channel);
        subscriptionRef.current = null;
      }
    };
  }, [supabase, roomSlug, liveStreamId]); // Depend on roomSlug and liveStreamId to recreate subscription

  // CRITICAL: Load messages when currentUserId changes, but don't recreate subscription
  useEffect(() => {
    loadMessages();
  }, [currentUserId, loadMessages]); // Include loadMessages in deps since it's memoized

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScrollRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [messages.length, scrollToBottom]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[CHAT] 🚀 sendMessage triggered');
    
    const messageToSend = newMessage.trim();
    if (!messageToSend) {
      console.log('[CHAT] ⚠️ Empty message, ignoring');
      return;
    }

    console.log('[CHAT] 📝 Message to send:', messageToSend);

    // Clear input IMMEDIATELY (before any async operations)
    setNewMessage('');

    // Send message to database (non-blocking)
    if (!currentUserId) {
      console.error('[CHAT] ❌ No currentUserId - user not logged in');
      alert('Please log in to send messages');
      setNewMessage(messageToSend);
      return;
    }

    console.log('[CHAT] 👤 Current user ID:', currentUserId);
    console.log('[CHAT] 🏠 Chat scope:', { roomSlug, liveStreamId });

    // Use current user's profile for optimistic message (or fallback)
    const optimisticUsername = currentUserProfile?.username || 'You';
    const optimisticAvatar = currentUserProfile?.avatar_url;
    
    // Create a unique temp ID based on timestamp and content hash
    const tempId = `temp-${Date.now()}-${messageToSend.slice(0, 10)}`;
    const optimisticMsg = {
      id: tempId,
      profile_id: currentUserId,
      username: optimisticUsername,
      avatar_url: optimisticAvatar,
      message_type: 'text',
      content: messageToSend,
      created_at: new Date().toISOString(),
    };
    
    console.log('[CHAT] ⚡ Adding optimistic message:', optimisticMsg);
    
    // Add optimistic message immediately (synchronous)
    setMessages((prev) => {
      return [...prev, optimisticMsg];
    });

    // Always auto-scroll when YOU send a message
    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    // Ensure profile exists before sending message
    // This prevents foreign key constraint violations
    const ensureProfileExists = async () => {
      console.log('[CHAT] 🔍 Checking if profile exists...');
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .single();

      if (!existingProfile) {
        console.warn('[CHAT] ⚠️ Profile does not exist, creating...');
        
        // Profile doesn't exist - try to create it
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const email = user.email || `user_${user.id.slice(0, 8)}`;
        const defaultUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: defaultUsername,
            display_name: defaultUsername,
            coin_balance: 0,
            earnings_balance: 0,
          });

        if (createError) {
          console.error('[CHAT] ❌ Failed to create profile:', createError);
          throw new Error(`Profile not found. Please contact support.`);
        }
        
        console.log('[CHAT] ✅ Profile created successfully');
      } else {
        console.log('[CHAT] ✅ Profile exists');
      }
    };

    // Send to database in background (realtime will replace optimistic with real message)
    ensureProfileExists()
      .then(() => {
        console.log('[CHAT] 💾 Preparing to insert message into database...');
        
        // CRITICAL: For solo streams, use ONLY live_stream_id. For group streams, use ONLY room_id.
        const insertData: any = {
          profile_id: currentUserId,
          message_type: 'text',
          content: messageToSend,
        };
        
        // Set ONLY the appropriate scope field (don't set both!)
        if (liveStreamId) {
          insertData.live_stream_id = liveStreamId;
          insertData.room_id = null;
          console.log('[CHAT] 🎥 Solo stream message - live_stream_id:', liveStreamId);
        } else if (roomSlug) {
          insertData.room_id = roomSlug;
          insertData.live_stream_id = null;
          console.log('[CHAT] 👥 Room message - room_id:', roomSlug);
        } else {
          console.error('[CHAT] ❌ CRITICAL: Neither roomSlug nor liveStreamId is set!');
        }
        
        console.log('[CHAT] 💬 Final insert data:', insertData);
        return (supabase.from('chat_messages') as any).insert(insertData);
      })
      .then(({ error, data }: { error: any; data: any }) => {
        if (error) {
          console.error('[CHAT] ❌ Database insert error:', error);
          console.error('[CHAT] ❌ Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== tempId));
          setNewMessage(messageToSend); // Restore input
          alert(`Failed to send message: ${error.message || 'Unknown error'}`);
        } else {
          console.log('[CHAT] ✅ Message inserted successfully!');
          console.log('[CHAT] 📊 Insert response data:', data);
          
          // Track comment for trending (fire-and-forget, don't block chat)
          if (liveStreamId && currentUserId) {
            trackLiveComment({
              streamId: liveStreamId,
              profileId: currentUserId,
              body: messageToSend
            }).catch(err => {
              console.warn('[Trending] Comment tracking failed:', err);
            });
          }
        }
        // If success, realtime subscription will receive the new message
        // and replace the optimistic one (matched by profile_id + content + recent timestamp)
      })
      .catch((error: any) => {
        console.error('Error sending message:', error);
        // Remove optimistic message and restore input
        setMessages((prev) => prev.filter((m: ChatMessage) => m.id !== tempId));
        setNewMessage(messageToSend);
        alert(`Failed to send message: ${error.message || 'Unknown error'}`);
      });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Generate consistent color for each user based on their profile_id
  const getUserBubbleColor = (profileId: string) => {
    // Brand color palette - purple/pink/blue gradient theme
    const colors = [
      'bg-purple-500/30', // Purple
      'bg-pink-500/30',   // Pink
      'bg-blue-500/30',   // Blue
      'bg-indigo-500/30', // Indigo
      'bg-violet-500/30', // Violet
      'bg-fuchsia-500/30',// Fuchsia
      'bg-rose-500/30',   // Rose
      'bg-cyan-500/30',   // Cyan
      'bg-purple-600/30', // Dark Purple
      'bg-pink-600/30',   // Dark Pink
    ];
    
    // Generate consistent index from profile_id
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900">
      {/* Messages - Flexible height with scroll, no header */}
      <div
        ref={messagesContainerRef}
        onScroll={updateAutoScrollFlag}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 custom-scrollbar flex flex-col justify-end bg-gray-50 dark:bg-gray-800"
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100/50 dark:bg-gray-700/50 rounded animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-white/70 lg:text-gray-500 py-8">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 items-start ${
                msg.message_type === 'system' ? 'justify-center' : ''
              } w-full`}
            >
              <div className="flex gap-2 items-start w-full">
                {msg.message_type === 'system' ? (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="flex w-full items-start gap-2 px-2 py-1.5"
                  >
                    <LiveAvatar
                      avatarUrl={msg.avatar_url}
                      username={msg.username || 'Unknown'}
                      isLive={msg.is_live}
                      size="sm"
                      showLiveBadge={false}
                    />

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <UserNameWithBadges
                          profileId={msg.profile_id}
                          name={msg.username || 'Unknown'}
                          gifterStatus={msg.profile_id ? gifterStatusMap[msg.profile_id] : undefined}
                          textSize="text-xs"
                          nameClassName="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                          clickable
                          onClick={() => {
                            if (msg.profile_id && msg.username) {
                              setSelectedProfile({
                                profileId: msg.profile_id,
                                username: msg.username,
                                avatarUrl: msg.avatar_url,
                                gifterStatus: gifterStatusMap[msg.profile_id] || null,
                                isLive: msg.is_live,
                              });
                            }
                          }}
                        />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      <div
                        className="text-sm text-gray-900 dark:text-white break-words leading-snug"
                        style={msg.chat_font ? { fontFamily: msg.chat_font } : undefined}
                      >
                        <SafeRichText text={msg.content} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Sticky at bottom */}
      {/* Chat Input - only show if not readOnly */}
      {!readOnly && (
        <form 
          onSubmit={sendMessage} 
          className="sticky bottom-0 px-3 py-2.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 flex-shrink-0"
        >
          <div className="flex gap-2 items-center">
            {/* Settings Button */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="Chat Settings"
                aria-label="Chat Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            )}
            
            {/* GIF Button */}
            <button
              type="button"
              onClick={() => {
                // TODO: Implement GIF picker
                alert('GIF picker coming soon!');
              }}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              title="Send GIF"
              aria-label="Send GIF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
              </svg>
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as any);
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-w-0"
              maxLength={500}
            />
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              title="Send Message"
            >
              Send
            </button>
            
            {/* Gift Button */}
            {onGiftClick && (
              <button
                type="button"
                onClick={onGiftClick}
                className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition flex-shrink-0 mobile-touch-target"
                title="Send Gift"
                aria-label="Send Gift"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
              </button>
            )}
            {/* Share Button */}
            {onShareClick && (
              <button
                type="button"
                onClick={onShareClick}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="Share"
                aria-label="Share"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            )}
          </div>
      </form>
      )}

      {/* User Action Card V2 */}
      {selectedProfile && (
        <UserActionCardV2
          profileId={selectedProfile.profileId}
          username={selectedProfile.username}
          displayName={selectedProfile.displayName}
          avatarUrl={selectedProfile.avatarUrl}
          gifterStatus={selectedProfile.gifterStatus}
          isLive={selectedProfile.isLive}
          onClose={() => setSelectedProfile(null)}
          inLiveRoom={true}
          currentUserRole="viewer"
        />
      )}
    </div>
  );
}


