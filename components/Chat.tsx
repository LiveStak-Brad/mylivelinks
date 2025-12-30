'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import UserActionCardV2 from './UserActionCardV2';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import SafeRichText from '@/components/SafeRichText';

interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  gifter_level?: number;
  badge_name?: string;
  badge_color?: string;
  message_type: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  roomId?: string;
  liveStreamId?: number;
}

export default function Chat({ roomId, liveStreamId }: ChatProps = {}) {
  // DEBUG: Log props to verify scoping
  console.log('[CHAT] 🔍 Props received:', { roomId, liveStreamId });
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    username: string;
    avatar_url?: string;
    gifter_level?: number;
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
          .select('username, avatar_url, gifter_level')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }: { data: any }) => {
            if (profile) {
              setCurrentUserProfile({
                username: profile.username,
                avatar_url: profile.avatar_url,
                gifter_level: profile.gifter_level || 0,
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
      if (!roomId && !liveStreamId) {
        throw new Error('Chat requires roomId or liveStreamId');
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
            gifter_level
          )
        `);

      // Apply scope filter (XOR: exactly one must be set)
      if (roomId) {
        query = query.eq('room_id', roomId).is('live_stream_id', null);
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
          gifter_level: profile?.gifter_level || 0,
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
      if (!roomId && !liveStreamId) {
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
            gifter_level
          )
        `);

      // Apply scope filter
      if (roomId) {
        fallbackQuery = fallbackQuery.eq('room_id', roomId).is('live_stream_id', null);
      } else if (liveStreamId) {
        fallbackQuery = fallbackQuery.eq('live_stream_id', liveStreamId).is('room_id', null);
      }

      const { data, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: true })
        .limit(50);

      if (!fallbackError && data) {
        const messagesWithProfiles = data.map((msg: any) => {
          const profile = msg.profiles;

          return {
            id: msg.id,
            profile_id: msg.profile_id,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url,
            gifter_level: profile?.gifter_level || 0,
            message_type: msg.message_type,
            content: msg.content,
            created_at: msg.created_at,
          };
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
        .select('username, avatar_url, gifter_level')
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
        gifter_level: (profile as any)?.gifter_level || 0,
        message_type: message.message_type,
        content: message.content,
        created_at: message.created_at,
      };

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
          gifter_level: 0,
          badge_name: undefined,
          badge_color: undefined,
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

  // CRITICAL: Create realtime subscription ONCE on mount, never recreate
  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscriptionRef.current?.subscribed) {
      console.warn('[CHAT] ⚠️ Subscription already exists, skipping duplicate');
      return;
    }

    console.log('[CHAT] 🔌 Creating realtime subscription');
    
    // Subscribe to new messages (realtime) with scope filter
    const channel = supabase
      .channel('chat-messages-realtime')
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
          // Add new message immediately via realtime - use ref to avoid stale closure
          if (payload?.new) {
            loadMessageWithProfileRef.current(payload.new as any);
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
  }, [supabase]); // Only depend on supabase (memoized, stable)

  // CRITICAL: Load messages when currentUserId changes, but don't recreate subscription
  useEffect(() => {
    loadMessages();
  }, [currentUserId, loadMessages]); // Include loadMessages in deps since it's memoized

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const messageToSend = newMessage.trim();
    if (!messageToSend) return;

    // Clear input IMMEDIATELY (before any async operations)
    setNewMessage('');

    // Send message to database (non-blocking)
    if (!currentUserId) {
      alert('Please log in to send messages');
      setNewMessage(messageToSend);
      return;
    }

    // Use current user's profile for optimistic message (or fallback)
    const optimisticUsername = currentUserProfile?.username || 'You';
    const optimisticAvatar = currentUserProfile?.avatar_url;
    const optimisticGifterLevel = currentUserProfile?.gifter_level || 0;
    
    // Create a unique temp ID based on timestamp and content hash
    const tempId = `temp-${Date.now()}-${messageToSend.slice(0, 10)}`;
    const optimisticMsg = {
      id: tempId,
      profile_id: currentUserId,
      username: optimisticUsername,
      avatar_url: optimisticAvatar,
      gifter_level: optimisticGifterLevel,
      badge_name: undefined, // Will be loaded if needed
      badge_color: undefined,
      message_type: 'text',
      content: messageToSend,
      created_at: new Date().toISOString(),
    };
    
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
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .single();

      if (!existingProfile) {
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
            gifter_level: 0,
          });

        if (createError) {
          console.error('Failed to create profile for chat:', createError);
          throw new Error(`Profile not found. Please contact support.`);
        }
      }
    };

    // Send to database in background (realtime will replace optimistic with real message)
    ensureProfileExists()
      .then(() => {
        return (supabase.from('chat_messages') as any).insert({
          profile_id: currentUserId,
          message_type: 'text',
          content: messageToSend,
          room_id: roomId || null,
          live_stream_id: liveStreamId || null,
        });
      })
      .then(({ error, data }: { error: any; data: any }) => {
        if (error) {
          console.error('Error sending message:', error);
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== tempId));
          setNewMessage(messageToSend); // Restore input
          alert(`Failed to send message: ${error.message || 'Unknown error'}`);
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent md:bg-white md:dark:bg-gray-800">
      {/* Chat Header */}
      <div className="px-3 pb-3 pt-2 border-b border-white/20 md:border-gray-200 md:dark:border-gray-700 flex-shrink-0 hidden md:block">
        <h2 className="text-base font-semibold">Global Chat</h2>
      </div>

      {/* Messages - Flexible height with scroll */}
      <div
        ref={messagesContainerRef}
        onScroll={updateAutoScrollFlag}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 custom-scrollbar"
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100/50 md:bg-gray-100 dark:bg-gray-700/50 md:dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-white/70 md:text-gray-500 py-8">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.message_type === 'system' ? 'justify-center' : ''
              }`}
            >
              {msg.message_type !== 'system' && msg.profile_id && (
                <>
                  <img
                    src={getAvatarUrl(msg.avatar_url)}
                    alt={msg.username}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/no-profile-pic.png';
                    }}
                  />
                </>
              )}

              <div className="flex-1 min-w-0">
                {msg.message_type === 'system' ? (
                  <div className="text-center text-sm text-white/70 md:text-gray-500 md:dark:text-gray-400 italic">
                    {msg.content}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => {
                        if (msg.profile_id && msg.username) {
                          setSelectedProfile({
                            profileId: msg.profile_id,
                            username: msg.username,
                            avatarUrl: msg.avatar_url,
                            gifterStatus: gifterStatusMap[msg.profile_id] || null,
                          });
                        }
                      }}
                      className="font-semibold text-sm text-white md:text-gray-900 md:dark:text-white hover:text-blue-300 md:hover:text-blue-500 md:dark:hover:text-blue-400 transition cursor-pointer"
                    >
                      {msg.username}
                    </button>
                      {(() => {
                        if (!msg.profile_id) return null;
                        const status = gifterStatusMap[msg.profile_id];
                        if (!status || Number(status.lifetime_coins ?? 0) <= 0) return null;
                        return (
                          <TierBadge
                            tier_key={status.tier_key}
                            level={status.level_in_tier}
                            size="sm"
                          />
                        );
                      })()}
                      <span className="text-xs text-white/60 md:text-gray-500 md:dark:text-gray-400">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-white/90 md:text-gray-700 md:dark:text-gray-300 break-words">
                      <SafeRichText text={msg.content} />
                    </div>
                  </>
                )}}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Sticky at bottom */}
      <form 
        onSubmit={sendMessage} 
        className="sticky bottom-0 p-3 border-t border-white/20 md:border-gray-200 md:dark:border-gray-700 bg-transparent md:bg-white md:dark:bg-gray-800 shadow-lg z-40 flex-shrink-0"
      >
        <div className="w-full">
          <div className="flex gap-2">
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
              className="flex-1 px-3 py-2 text-sm border border-white/30 md:border-gray-300 md:dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 md:bg-white md:dark:bg-gray-700 text-white md:text-gray-900 md:dark:text-white placeholder-white/60 md:placeholder-gray-500 min-w-0"
              maxLength={500}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition flex-shrink-0 whitespace-nowrap"
            >
              Send
            </button>
          </div>
        </div>
      </form>

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


