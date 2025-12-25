'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import GifterBadge from './GifterBadge';
import MiniProfile from './MiniProfile';

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

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
    gifterLevel?: number;
    badgeName?: string;
    badgeColor?: string;
    isLive?: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      // SIMPLIFIED: Just use direct query - much faster than RPC
      // Blocking can be handled client-side if needed, but for now prioritize speed
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

      // Batch load badges in parallel
      const uniqueLevels = [...new Set(
        (data || []).map((msg: any) => msg.profiles?.gifter_level).filter((l: any) => l !== null && l > 0)
      )];
      
      let badgeMap: Record<number, any> = {};
      if (uniqueLevels.length > 0) {
        const { data: badges } = await supabase
          .from('gifter_levels')
          .select('*')
          .in('level', uniqueLevels);
        
        if (badges) {
          badges.forEach((badge: any) => {
            badgeMap[badge.level] = badge;
          });
        }
      }

      const messagesWithBadges = (data || []).map((msg: any) => {
        const profile = msg.profiles;
        const badgeInfo = profile?.gifter_level ? badgeMap[profile.gifter_level] : null;
        return {
          id: msg.id,
          profile_id: msg.profile_id,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
          gifter_level: profile?.gifter_level || 0,
          badge_name: badgeInfo?.badge_name,
          badge_color: badgeInfo?.badge_color,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
        };
      });

      setMessages(messagesWithBadges.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to regular query if RPC fails
      const { data, error: fallbackError } = await supabase
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
        .order('created_at', { ascending: true })
        .limit(50);

      if (!fallbackError && data) {
        // Batch load badges for fallback too
        const uniqueLevels = [...new Set(data.map((msg: any) => msg.profiles?.gifter_level).filter((l: any) => l !== null && l > 0))];
        const badgeMap: Record<number, any> = {};
        
        if (uniqueLevels.length > 0) {
          const { data: badges } = await supabase
            .from('gifter_levels')
            .select('*')
            .in('level', uniqueLevels);
          
          if (badges) {
            badges.forEach((badge: any) => {
              badgeMap[badge.level] = badge;
            });
          }
        }

        const messagesWithProfiles = data.map((msg: any) => {
          const profile = msg.profiles;
          const badgeInfo = profile?.gifter_level ? badgeMap[profile.gifter_level] : null;

          return {
            id: msg.id,
            profile_id: msg.profile_id,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            gifter_level: profile?.gifter_level || 0,
            badge_name: badgeInfo?.badge_name,
            badge_color: badgeInfo?.badge_color,
            message_type: msg.message_type,
            content: msg.content,
            created_at: msg.created_at,
          };
        });
        
        setMessages(messagesWithProfiles);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]); // Only depend on supabase - use functional updates for messages

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
        }].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      setTimeout(() => scrollToBottom(), 50);
      return;
    }

    setMessages((prev) => {
      // Check if message already exists (prevent duplicates)
      if (prev.some(m => m.id === message.id)) return prev;
      
      // Check if this is replacing an optimistic message (same profile_id + content + recent)
      const optimisticMatch = prev.find((m: any) =>
        typeof m.id === 'string' &&
        m.id.startsWith('temp-') &&
        m.profile_id === message.profile_id &&
        m.content === message.content &&
        Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000 // Within 5 seconds
      );
      
      // Remove optimistic message if found
      const filtered = optimisticMatch ? prev.filter(m => m.id !== optimisticMatch.id) : prev;
      
      // Will add real message after profile loads
      return filtered;
    });

    // Load profile and badge in parallel (non-blocking)
    Promise.all([
      supabase
        .from('profiles')
        .select('username, avatar_url, gifter_level')
        .eq('id', message.profile_id)
        .single(),
      message.gifter_level && message.gifter_level > 0
        ? supabase
            .from('gifter_levels')
            .select('*')
            .eq('level', message.gifter_level)
            .single()
        : Promise.resolve({ data: null })
    ]).then(([profileResult, badgeResult]) => {
      const profile = profileResult.data;
      const badgeInfo = badgeResult.data;

      const newMsg = {
        id: message.id,
        profile_id: message.profile_id,
        username: (profile as any)?.username || 'Unknown',
        avatar_url: (profile as any)?.avatar_url,
        gifter_level: (profile as any)?.gifter_level || 0,
        badge_name: (badgeInfo as any)?.badge_name,
        badge_color: (badgeInfo as any)?.badge_color,
        message_type: message.message_type,
        content: message.content,
        created_at: message.created_at,
      };
      
      setMessages((prev) => {
        // Check if already exists
        if (prev.some(m => m.id === newMsg.id)) return prev;
        // Add and sort
        const updated = [...prev, newMsg];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      setTimeout(() => scrollToBottom(), 50);
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
        }].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    });
  }, [supabase]); // Only depend on supabase

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
      const updated = [...prev, optimisticMsg];
      return updated.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    
    // Scroll immediately
    setTimeout(() => scrollToBottom(), 50);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="px-3 pb-3 pt-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-base font-semibold">Global Chat</h2>
      </div>

      {/* Messages - Flexible height with scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 custom-scrollbar">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
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
                  {msg.avatar_url ? (
                    <img
                      src={msg.avatar_url}
                      alt={msg.username}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {msg.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </>
              )}

              <div className="flex-1 min-w-0">
                {msg.message_type === 'system' ? (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
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
                              gifterLevel: msg.gifter_level,
                              badgeName: msg.badge_name,
                              badgeColor: msg.badge_color,
                            });
                          }
                        }}
                        className="font-semibold text-sm hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
                      >
                        {msg.username}
                      </button>
                      {msg.gifter_level !== undefined && msg.gifter_level > 0 && (
                        <GifterBadge
                          level={msg.gifter_level}
                          badgeName={msg.badge_name}
                          badgeColor={msg.badge_color}
                          size="sm"
                        />
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {msg.content}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Sticky at bottom */}
      <form 
        onSubmit={sendMessage} 
        className="sticky bottom-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-40 flex-shrink-0"
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
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white min-w-0"
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

      {/* Mini Profile Modal */}
      {selectedProfile && (
        <MiniProfile
          profileId={selectedProfile.profileId}
          username={selectedProfile.username}
          displayName={selectedProfile.displayName}
          avatarUrl={selectedProfile.avatarUrl}
          gifterLevel={selectedProfile.gifterLevel}
          badgeName={selectedProfile.badgeName}
          badgeColor={selectedProfile.badgeColor}
          isLive={selectedProfile.isLive}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}


