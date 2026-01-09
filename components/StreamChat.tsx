'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import { GifterBadge as TierBadge } from '@/components/gifter';
import MllProBadge, { shouldShowMllProBadge } from '@/components/mll/MllProBadge';
import UserActionCardV2 from './UserActionCardV2';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import SafeRichText from '@/components/SafeRichText';
import { isBlockedBidirectional } from '@/lib/blocks';
import ReportModal from '@/components/ReportModal';
import { Gift as GiftIcon } from 'lucide-react';

interface ChatMessage {
  id: number | string;
  profile_id: string | null;
  username?: string;
  avatar_url?: string;
  message_type: string;
  content: string;
  created_at: string;
  chat_bubble_color?: string;
  chat_font?: string;
}

interface ChatProps {
  liveStreamId: number; // REQUIRED - ONLY for solo streams
  onGiftClick?: () => void;
  onShareClick?: () => void;
  onSettingsClick?: () => void;
  readOnly?: boolean; // If true, hide input box
  alwaysAutoScroll?: boolean; // For host: always scroll to bottom on new messages
  // Request Guest button props (optional - for solo viewer mode)
  onRequestGuestClick?: () => void;
  showRequestGuestButton?: boolean;
  // Like button props (optional - for viewer mode)
  onLikeClick?: () => void;
  isLiked?: boolean;
  likesCount?: number;
  showLikePop?: boolean;
}

export default function StreamChat({ liveStreamId, onGiftClick, onShareClick, onSettingsClick, readOnly = false, alwaysAutoScroll = false, onRequestGuestClick, showRequestGuestButton = false, onLikeClick, isLiked = false, likesCount = 0, showLikePop = false }: ChatProps) {
  console.log('[STREAMCHAT] 🎬 StreamChat rendered with liveStreamId:', liveStreamId, 'readOnly:', readOnly, 'alwaysAutoScroll:', alwaysAutoScroll);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  console.log('[STREAMCHAT] 📊 Current messages in state:', messages.length);
  const [giftPopup, setGiftPopup] = useState<{
    message: string;
    emoji: string;
    createdAt: string;
  } | null>(null);
  const giftPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGiftPopupMsgIdRef = useRef<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [blockedPeerIds, setBlockedPeerIds] = useState<Set<string>>(new Set());
  const blockedPeerIdsRef = useRef<Set<string>>(new Set());
  const [blockedWithStreamOwner, setBlockedWithStreamOwner] = useState(false);
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
  const [reportMessageTarget, setReportMessageTarget] = useState<{
    reportedUserId?: string;
    reportedUsername?: string;
    contextDetails: string;
  } | null>(null);
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const loadMessagesInFlightRef = useRef(false);
  const MAX_MESSAGES = 80;
  // CRITICAL: Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  // CRITICAL: Track subscription to prevent duplicates
  const subscriptionRef = useRef<{ channel: any; subscribed: boolean } | null>(null);
  
  // CACHE: Store profile styling to avoid stale data from database cache
  const profileCacheRef = useRef<Record<string, { chat_bubble_color?: string; chat_font?: string }>>({});

  // Typography parity: Host uses readOnly StreamChat; viewer uses interactive StreamChat.
  // Use same font sizes for both host and viewer
  const usernameTextClass = 'text-xs';
  const timeTextClass = 'text-[10px]';
  const messageTextClass = 'text-sm';

  const showGiftPopup = useCallback((msg: ChatMessage) => {
    if (!msg || msg.message_type !== 'gift') return;
    const raw = String(msg.content || '').slice(0, 220);
    if (!raw) return;

    const parseGift = (content: string) => {
      // Expected format: `${sender} sent "${giftName}" to ${recipient} 💎+N`
      const sentIdx = content.indexOf(' sent "');
      if (sentIdx < 0) return null;
      const sender = content.slice(0, sentIdx).trim();
      const rest = content.slice(sentIdx + ' sent "'.length);
      const endGiftIdx = rest.indexOf('" to ');
      if (endGiftIdx < 0) return null;
      const giftName = rest.slice(0, endGiftIdx).trim();
      let recipientPart = rest.slice(endGiftIdx + '" to '.length);
      // strip diamonds suffix if present
      const diamondsIdx = recipientPart.indexOf(' 💎+');
      if (diamondsIdx >= 0) recipientPart = recipientPart.slice(0, diamondsIdx);
      const recipient = recipientPart.trim();
      return { sender, giftName, recipient };
    };

    const getGiftEmoji = (name: string) => {
      const emojiMap: Record<string, string> = {
        Poo: '💩',
        Rose: '🌹',
        Heart: '❤️',
        Star: '⭐',
        Diamond: '💎',
        'Super Star': '🌟',
        Crown: '👑',
        Platinum: '💠',
        Legendary: '🏆',
        Fire: '🔥',
        Rocket: '🚀',
        Rainbow: '🌈',
        Unicorn: '🦄',
        Party: '🎉',
        Confetti: '🎊',
        Champagne: '🍾',
        Money: '💰',
        Cash: '💵',
        Gold: '🥇',
        Silver: '🥈',
        Bronze: '🥉',
        Kiss: '💋',
        Hug: '🤗',
        Love: '💕',
        Sparkle: '✨',
        Gem: '💎',
        Crystal: '🔮',
        Music: '🎵',
        Microphone: '🎤',
        Camera: '📸',
        Clap: '👏',
        'Thumbs Up': '👍',
        Wave: '👋',
        Flex: '💪',
        Cool: '😎',
        Hot: '🥵',
        VIP: '🎯',
        King: '🤴',
        Queen: '👸',
        Angel: '😇',
        Devil: '😈',
      };
      return emojiMap[name] || '🎁';
    };

    const parsed = parseGift(raw);
    const message = parsed ? `${parsed.sender} sent ${parsed.giftName} to ${parsed.recipient}` : raw;
    const giftEmoji = parsed ? getGiftEmoji(parsed.giftName) : '🎁';

    // prevent duplicate popups for the same message (realtime + reload)
    const msgId = String((msg as any)?.id ?? '');
    if (msgId && lastGiftPopupMsgIdRef.current === msgId) return;
    if (msgId) lastGiftPopupMsgIdRef.current = msgId;

    // Clear existing timer
    if (giftPopupTimerRef.current) clearTimeout(giftPopupTimerRef.current);

    setGiftPopup({
      message,
      emoji: giftEmoji,
      createdAt: msg.created_at,
    });

    giftPopupTimerRef.current = setTimeout(() => {
      setGiftPopup(null);
      giftPopupTimerRef.current = null;
    }, 3500);
  }, []);

  // Cleanup popup timer on unmount
  useEffect(() => {
    return () => {
      if (giftPopupTimerRef.current) {
        clearTimeout(giftPopupTimerRef.current);
        giftPopupTimerRef.current = null;
      }
    };
  }, []);

  // CRITICAL: Listen for chat settings updates via BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const settingsChannel = new BroadcastChannel('chat-settings-updates');
    
    settingsChannel.onmessage = (event) => {
      if (event.data.type === 'settings-updated') {
        console.log('[STREAMCHAT] 📻 Received settings update broadcast:', event.data);
        const { profile_id, chat_bubble_color, chat_font } = event.data;
        
        // Update cache
        profileCacheRef.current[profile_id] = {
          chat_bubble_color,
          chat_font,
        };
        
        // Update all messages from this profile
        setMessages((prevMessages) => 
          prevMessages.map((msg) => 
            msg.profile_id === profile_id
              ? { ...msg, chat_bubble_color, chat_font }
              : msg
          )
        );
        
        console.log('[STREAMCHAT] ✅ Applied settings update to messages');
      }
    };

    return () => {
      settingsChannel.close();
    };
  }, []);

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
        
        // CRITICAL: Load current user's chat settings into cache
        supabase
          .from('chat_settings')
          .select('chat_bubble_color, chat_font')
          .eq('profile_id', user.id)
          .maybeSingle()
          .then(({ data: settings }) => {
            if (settings) {
              profileCacheRef.current[user.id] = {
                chat_bubble_color: settings.chat_bubble_color,
                chat_font: settings.chat_font,
              };
              console.log('[STREAMCHAT] 💾 Pre-loaded current user chat settings into cache:', settings);
            }
          });
      } else {
        setCurrentUserId(null);
        setCurrentUserProfile(null);
      }
    });
  }, [supabase]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      const empty = new Set<string>();
      blockedPeerIdsRef.current = empty;
      setBlockedPeerIds(empty);
      setBlockedWithStreamOwner(false);
      return;
    }

    const loadBlocks = async () => {
      try {
        const { data: rows } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', currentUserId);

        const next = new Set<string>();
        (rows ?? []).forEach((r: any) => {
          const other = r?.blocked_id;
          if (typeof other === 'string') next.add(other);
        });
        blockedPeerIdsRef.current = next;
        setBlockedPeerIds(next);
      } catch {
        // ignore
      }

      try {
        const { data: stream } = await supabase
          .from('live_streams')
          .select('profile_id')
          .eq('id', liveStreamId)
          .maybeSingle();

        const ownerId = (stream as any)?.profile_id ?? null;
        if (ownerId && typeof ownerId === 'string') {
          const blocked = await isBlockedBidirectional(supabase as any, currentUserId, ownerId);
          setBlockedWithStreamOwner(blocked);
        } else {
          setBlockedWithStreamOwner(false);
        }
      } catch {
        setBlockedWithStreamOwner(false);
      }
    };

    void loadBlocks();
  }, [currentUserId, liveStreamId, supabase]);

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
    // Prevent overlapping loads (polling + realtime can race and overwrite state).
    if (loadMessagesInFlightRef.current) return;
    loadMessagesInFlightRef.current = true;

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
      console.log('[STREAMCHAT] 📥 Loading messages for live_stream_id:', liveStreamId);
      console.log('[STREAMCHAT] 🔍 USING MAIN QUERY PATH (with chat_settings fetch)');

      // Build query - ONLY for live streams
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
            avatar_url
          )
        `)
        .eq('live_stream_id', liveStreamId)
        .is('room_id', null)
        // IMPORTANT: fetch most recent messages; we'll reverse for chronological display
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Reverse to chronological order for UI rendering
      const chronological = Array.isArray(data) ? [...data].reverse() : [];

      const me = currentUserIdRef.current;
      const uniqueProfileIds = Array.from(
        new Set<string>(chronological.map((m: any) => m?.profile_id).filter((id: any): id is string => typeof id === 'string'))
      ).filter((id) => (me ? id !== me : true));

      const blockedChecks = await Promise.all(
        uniqueProfileIds.map(async (pid) => {
          const meNow = currentUserIdRef.current;
          if (!meNow) return false;
          if (blockedPeerIdsRef.current.has(pid)) return true;
          const blocked = await isBlockedBidirectional(supabase as any, meNow, pid);
          if (blocked) blockedPeerIdsRef.current.add(pid);
          return blocked;
        })
      );

      uniqueProfileIds.forEach((pid, idx) => {
        if (blockedChecks[idx]) blockedPeerIdsRef.current.add(pid);
      });

      console.log('[STREAMCHAT] 📊 Raw data from database:', chronological);
      console.log('[STREAMCHAT] 📊 Number of messages loaded:', chronological?.length || 0);

      // Get unique profile IDs and fetch chat settings
      const profileIds = Array.from(new Set((chronological || []).map((msg: any) => msg.profile_id).filter(Boolean)));
      
      // Fetch chat settings for all profiles in one query
      // Add timestamp to bypass Supabase cache
      const { data: chatSettingsData } = await supabase
        .from('chat_settings')
        .select('profile_id, chat_bubble_color, chat_font')
        .in('profile_id', profileIds)
        .order('updated_at', { ascending: false }); // Force fresh data
      
      // Create a map for quick lookup
      const chatSettingsMap = (chatSettingsData || []).reduce((acc: any, setting: any) => {
        acc[setting.profile_id] = setting;
        return acc;
      }, {});
      
      console.log('[STREAMCHAT] 🎨 Chat settings loaded:', {
        profileIds,
        chatSettingsMap,
      });

      const messagesWithBadges: Array<ChatMessage | null> = (chronological || []).map((msg: any) => {
        if (msg?.profile_id && blockedPeerIdsRef.current.has(msg.profile_id)) {
          return null;
        }
        const profile = msg.profiles;
        const chatSettings = chatSettingsMap[msg.profile_id];
        
        console.log('[STREAMCHAT] 🎨 Mapping message for profile:', {
          profile_id: msg.profile_id,
          found_settings: !!chatSettings,
          settings_bubble_color: chatSettings?.chat_bubble_color,
          settings_font: chatSettings?.chat_font,
          FINAL_bubble_color: chatSettings?.chat_bubble_color,
          FINAL_font: chatSettings?.chat_font,
        });
        
        const mapped: ChatMessage = {
          id: String(msg.id),
          profile_id: msg.profile_id,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          message_type: msg.message_type,
          content: msg.content,
          created_at: msg.created_at,
          chat_bubble_color: chatSettings?.chat_bubble_color,
          chat_font: chatSettings?.chat_font,
        };

        return mapped;
      });

      const visibleMessages = messagesWithBadges.filter((m: ChatMessage | null): m is ChatMessage => m !== null);

      const gifterProfileIds = Array.from(new Set<string>(visibleMessages.map((m: any) => m.profile_id).filter((id: any): id is string => typeof id === 'string')));
      const statusMap = await fetchGifterStatuses(gifterProfileIds);
      // P0 FIX: MERGE with existing map instead of replacing (prevents losing new message statuses)
      setGifterStatusMap(prev => ({ ...prev, ...statusMap }));

      console.log('[STREAMCHAT] ✅ Setting messages state with', visibleMessages.length, 'messages');
      setMessages((prev) => {
        // Merge-by-id to avoid overwriting newer realtime messages (fixes flash/revert).
        const merged = new Map<string, ChatMessage>();
        for (const m of prev) merged.set(String(m.id), m);
        for (const m of visibleMessages) merged.set(String(m.id), m);
        let arr = Array.from(merged.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // IMPORTANT: Prune optimistic (temp-*) messages once the real DB message exists.
        // Without this, users can see "double send" (temp + real) if replacement matching misses.
        const hasReal = new Set<string>();
        for (const m of arr) {
          const idStr = String(m.id);
          if (!idStr.startsWith('temp-') && m.profile_id && m.content) {
            hasReal.add(`${m.profile_id}:${m.content}`);
          }
        }
        const nowMs = Date.now();
        arr = arr.filter((m) => {
          const idStr = String(m.id);
          if (!idStr.startsWith('temp-')) return true;
          const sig = m.profile_id && m.content ? `${m.profile_id}:${m.content}` : '';
          if (sig && hasReal.has(sig)) return false;
          // Safety: drop very old temp messages
          const ageMs = nowMs - new Date(m.created_at).getTime();
          if (Number.isFinite(ageMs) && ageMs > 60_000) return false;
          return true;
        });

        return arr.slice(-MAX_MESSAGES);
      });

      if (isInitialLoad) {
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    } catch (error) {
      console.error('[STREAMCHAT] ❌ Error loading messages:', error);
      console.error('[STREAMCHAT] 🔄 FALLING BACK to fallback query (WITHOUT chat_settings fetch)');
      
      // Fallback to regular query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          profile_id,
          message_type,
          content,
          created_at,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('live_stream_id', liveStreamId)
        .is('room_id', null)
        // IMPORTANT: fetch most recent messages; we'll reverse for chronological display
        .order('created_at', { ascending: false })
        .limit(50);

      if (!fallbackError && fallbackData) {
        const chronologicalFallback = Array.isArray(fallbackData) ? [...fallbackData].reverse() : [];
        // Get unique profile IDs
        const profileIds = Array.from(new Set(chronologicalFallback.map((msg: any) => msg.profile_id).filter(Boolean)));
        
        // Fetch chat settings for all profiles in one query
        // Add order to bypass Supabase cache
        const { data: chatSettingsData } = await supabase
          .from('chat_settings')
          .select('profile_id, chat_bubble_color, chat_font')
          .in('profile_id', profileIds)
          .order('updated_at', { ascending: false }); // Force fresh data
        
        // Create a map for quick lookup
        const chatSettingsMap = (chatSettingsData || []).reduce((acc: any, setting: any) => {
          acc[setting.profile_id] = setting;
          return acc;
        }, {});
        
        console.log('[STREAMCHAT] 🎨 Chat settings loaded:', {
          profileIds,
          chatSettingsMap,
        });

        const messagesWithProfiles = chronologicalFallback.map((msg: any) => {
          const profile = msg.profiles;
          const chatSettings = chatSettingsMap[msg.profile_id];

          console.log('[STREAMCHAT] 🎨 Mapping message for profile:', {
            profile_id: msg.profile_id,
            chatSettingsMap_keys: Object.keys(chatSettingsMap),
            found_settings: !!chatSettings,
            settings_data: chatSettings,
          });

          const mappedMsg = {
            id: String(msg.id),
            profile_id: msg.profile_id,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url,
            gifter_level: profile?.gifter_level || 0,
            message_type: msg.message_type,
            content: msg.content,
            created_at: msg.created_at,
            chat_bubble_color: chatSettings?.chat_bubble_color,
            chat_font: chatSettings?.chat_font,
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
        
        setMessages((prev) => {
          const merged = new Map<string, any>();
          for (const m of prev) merged.set(String(m.id), m);
          for (const m of messagesWithProfiles) merged.set(String(m.id), m);
          let arr = Array.from(merged.values()).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const hasReal = new Set<string>();
          for (const m of arr) {
            const idStr = String(m.id);
            if (!idStr.startsWith('temp-') && m.profile_id && m.content) {
              hasReal.add(`${m.profile_id}:${m.content}`);
            }
          }
          const nowMs = Date.now();
          arr = arr.filter((m: any) => {
            const idStr = String(m.id);
            if (!idStr.startsWith('temp-')) return true;
            const sig = m.profile_id && m.content ? `${m.profile_id}:${m.content}` : '';
            if (sig && hasReal.has(sig)) return false;
            const ageMs = nowMs - new Date(m.created_at).getTime();
            if (Number.isFinite(ageMs) && ageMs > 60_000) return false;
            return true;
          });
          return arr.slice(-MAX_MESSAGES);
        });

        const gifterProfileIds = Array.from(
          new Set<string>(
            messagesWithProfiles
              .map((m: any) => m.profile_id)
              .filter((id: any): id is string => typeof id === 'string')
          )
        );
        const statusMap = await fetchGifterStatuses(gifterProfileIds);
        // P0 FIX: MERGE with existing map instead of replacing (prevents losing new message statuses)
        setGifterStatusMap(prev => ({ ...prev, ...statusMap }));

        console.log('[STREAMCHAT] ✅ Setting messages state (fallback) with', messagesWithProfiles.length, 'messages');
        setMessages((prev) => {
          const merged = new Map<string, any>();
          for (const m of prev) merged.set(String(m.id), m);
          for (const m of messagesWithProfiles) merged.set(String(m.id), m);
          let arr = Array.from(merged.values()).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const hasReal = new Set<string>();
          for (const m of arr) {
            const idStr = String(m.id);
            if (!idStr.startsWith('temp-') && m.profile_id && m.content) {
              hasReal.add(`${m.profile_id}:${m.content}`);
            }
          }
          const nowMs = Date.now();
          arr = arr.filter((m: any) => {
            const idStr = String(m.id);
            if (!idStr.startsWith('temp-')) return true;
            const sig = m.profile_id && m.content ? `${m.profile_id}:${m.content}` : '';
            if (sig && hasReal.has(sig)) return false;
            const ageMs = nowMs - new Date(m.created_at).getTime();
            if (Number.isFinite(ageMs) && ageMs > 60_000) return false;
            return true;
          });
          return arr.slice(-MAX_MESSAGES);
        });

        if (isInitialLoad) {
          requestAnimationFrame(() => scrollToBottom('auto'));
        }
      }
    } finally {
      setLoading(false);
      loadMessagesInFlightRef.current = false;
    }
  }, [supabase, scrollToBottom]); // Only depend on stable references

  // Fallback polling (P0 reliability): if realtime misses events, this keeps Host+Viewer consistent.
  // Primary updates come from realtime subscription; this is safety net only.
  useEffect(() => {
    if (!liveStreamId) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      // Best-effort refresh without showing a spinner (isInitialLoad will be false if we already have messages)
      void loadMessages();
    }, 30000); // Increased from 4s to 30s - realtime is primary
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveStreamId, loadMessages]);

  // CRITICAL: Use useCallback to prevent stale closures
  const loadMessageWithProfile = useCallback(async (message: any) => {
    const msgIdStr = String(message?.id ?? '');
    if (!message.profile_id) {
      // System message
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        if (prev.some((m) => String(m.id) === msgIdStr)) return prev;
        const nextMsg: ChatMessage = {
          id: msgIdStr,
          profile_id: null,
          message_type: message.message_type,
          content: message.content,
          created_at: message.created_at,
        };
        // Gift popup (if gift announcements are system messages)
        showGiftPopup(nextMsg);
        return [...prev, nextMsg];
      });
      if (shouldAutoScrollRef.current || alwaysAutoScroll) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      return;
    }

    // Load profile and chat settings (non-blocking)
    Promise.all([
      supabase
        .from('profiles')
        .select('username, avatar_url, gifter_level')
        .eq('id', message.profile_id)
        .single(),
      supabase
        .from('chat_settings')
        .select('chat_bubble_color, chat_font')
        .eq('profile_id', message.profile_id)
        .maybeSingle(),
      fetchGifterStatuses([message.profile_id]).then((m) => m[message.profile_id] || null),
    ]).then(([profileResult, chatSettingsResult, status]) => {
      const profile = profileResult.data;
      const chatSettings = chatSettingsResult.data;

      // Check cache for latest styling (overrides database to avoid stale data)
      const cachedStyling = profileCacheRef.current[message.profile_id];
      console.log('[STREAMCHAT] 🔍 Loading NEW message, cache check:', {
        profile_id: message.profile_id,
        hasCachedStyling: !!cachedStyling,
        cachedColor: cachedStyling?.chat_bubble_color,
        dbColor: chatSettings?.chat_bubble_color,
        WILL_USE: cachedStyling?.chat_bubble_color ?? chatSettings?.chat_bubble_color,
        entire_cache: profileCacheRef.current,
      });

      const newMsg = {
        id: msgIdStr,
        profile_id: message.profile_id,
        username: (profile as any)?.username || 'Unknown',
        avatar_url: (profile as any)?.avatar_url,
        message_type: message.message_type,
        content: message.content,
        created_at: message.created_at,
        // Use cached styling if available, otherwise use database value
        chat_bubble_color: cachedStyling?.chat_bubble_color ?? chatSettings?.chat_bubble_color,
        chat_font: cachedStyling?.chat_font ?? chatSettings?.chat_font,
      };
      
      console.log('[CHAT] 📨 New realtime message loaded:', {
        username: newMsg.username,
        chat_bubble_color: newMsg.chat_bubble_color,
        chat_font: newMsg.chat_font,
        profile_id: newMsg.profile_id,
      });
 
      // Gift popup (Host + Viewer)
      showGiftPopup(newMsg as any);

      if (status) {
        setGifterStatusMap((prev) => ({ ...prev, [message.profile_id]: status }));
      }
      
      setMessages((prev) => {
        // If the real message arrives, drop any matching optimistic temp message (same sender + content).
        const cleaned = prev.filter((m: any) => {
          const idStr = String(m?.id ?? '');
          if (!idStr.startsWith('temp-')) return true;
          return !(m?.profile_id === newMsg.profile_id && m?.content === newMsg.content);
        });

        if (cleaned.some((m) => String(m.id) === String(newMsg.id))) return cleaned;

        return [...cleaned, newMsg];
      });

      if (shouldAutoScrollRef.current || alwaysAutoScroll) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      
      console.log('[CHAT] 📊 Current messages count:', messages.length + 1);
    }).catch((error) => {
      console.error('Error loading message profile:', error);
      // Add message without profile data if query fails
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === msgIdStr)) return prev;
        return [...prev, {
          id: msgIdStr,
          profile_id: message.profile_id,
          username: 'Unknown',
          avatar_url: undefined,
          message_type: message.message_type,
          content: message.content,
          created_at: message.created_at,
        }];
      });
    });
  }, [supabase, scrollToBottom, showGiftPopup, alwaysAutoScroll]); // include popup + autoscroll controls

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
 
          // IMPORTANT: profiles rows update frequently (e.g., coin_balance / earnings_balance).
          // Only treat this as a "chat style changed" signal if the style fields actually changed.
          const oldColor = payload?.old?.chat_bubble_color ?? null;
          const newColor = payload?.new?.chat_bubble_color ?? null;
          const oldFont = payload?.old?.chat_font ?? null;
          const newFont = payload?.new?.chat_font ?? null;
 
          const styleChanged = oldColor !== newColor || oldFont !== newFont;
          if (!styleChanged) return;
 
          setMessages((prev) =>
            prev.map((msg) =>
              msg.profile_id === updatedProfileId
                ? {
                    ...msg,
                    chat_bubble_color: payload?.new?.chat_bubble_color,
                    chat_font: payload?.new?.chat_font,
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

  // CRITICAL: Create realtime subscription, recreate if stream changes
  useEffect(() => {
    console.log('[STREAMCHAT] 🔌 Creating realtime subscription for live_stream_id:', liveStreamId);

    // Prevent duplicate subscriptions
    if (subscriptionRef.current?.subscribed) {
      console.log('[STREAMCHAT] 🧹 Removing old subscription before creating new one');
      supabase.removeChannel(subscriptionRef.current.channel);
      subscriptionRef.current = null;
    }

    const filterString = `live_stream_id=eq.${liveStreamId}`;

    console.log('[STREAMCHAT] 🎯 Subscription filter:', filterString);

    const realtimeChannel = supabase
      .channel(`stream-chat-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: filterString,
        },
        (payload: any) => {
          console.log('[STREAMCHAT] 📨 RAW REALTIME EVENT:', payload);
          if (
            payload.new.live_stream_id === liveStreamId &&
            (payload.new.room_id === null || payload.new.room_id === undefined)
          ) {
            const pid = payload?.new?.profile_id as string | null | undefined;
            if (pid && blockedPeerIdsRef.current.has(pid)) {
              return;
            }

            if (pid) {
              const meNow = currentUserIdRef.current;
              // If we don't yet know the current user, do NOT drop realtime messages.
              // We'll skip block checks until auth loads; polling/loadMessages will reconcile.
              if (!meNow) {
                console.log('[STREAMCHAT] ⚠️ currentUserId not loaded yet; accepting realtime message without block check');
                loadMessageWithProfileRef.current(payload.new as any);
                return;
              }
              void isBlockedBidirectional(supabase as any, meNow, pid).then((blocked) => {
                if (blocked) {
                  blockedPeerIdsRef.current.add(pid);
                  return;
                }
                console.log('[STREAMCHAT] ✅ Calling loadMessageWithProfile for realtime message...');
                loadMessageWithProfileRef.current(payload.new as any);
              });
              return;
            }

            console.log('[STREAMCHAT] ✅ Calling loadMessageWithProfile for realtime message...');
            loadMessageWithProfileRef.current(payload.new as any);
          } else if (payload?.new) {
            console.log('[STREAMCHAT] 🧹 Ignoring realtime message not in current stream scope:', {
              expected_live_stream_id: liveStreamId,
              got_live_stream_id: payload.new.live_stream_id,
              got_room_id: payload.new.room_id,
            });
          } else {
            console.warn('[STREAMCHAT] ⚠️ Received event but no payload.new');
          }
        }
      )
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
            chat_bubble_color: payload?.new?.chat_bubble_color,
            chat_font: payload?.new?.chat_font,
          };

          profileCacheRef.current[profileId] = nextStyle;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.profile_id === profileId
                ? {
                    ...msg,
                    chat_bubble_color: payload?.new?.chat_bubble_color,
                    chat_font: payload?.new?.chat_font,
                  }
                : msg
            )
          );
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[STREAMCHAT] ✅ Realtime subscription active for live_stream_id:', liveStreamId);
          subscriptionRef.current = { channel: realtimeChannel, subscribed: true };
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[STREAMCHAT] ❌ Realtime subscription error:', status);
          subscriptionRef.current = null;
        } else {
          console.log('[STREAMCHAT] 📡 Subscription status:', status);
        }
      });

    return () => {
      console.log('[STREAMCHAT] 🧹 Cleaning up realtime subscription');
      if (subscriptionRef.current?.channel) {
        supabase.removeChannel(subscriptionRef.current.channel);
        subscriptionRef.current = null;
      }
    };
  }, [supabase, liveStreamId]); // ONLY depend on liveStreamId

  // BROADCAST: Listen for new messages from other users/tabs
  useEffect(() => {
    console.log('[STREAMCHAT] 📻 Setting up broadcast channel for live_stream_id:', liveStreamId);

    const channel = supabase
      .channel(`chat-broadcast-${liveStreamId}`)
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        console.log('[STREAMCHAT] 📻 Received broadcast - new message event');
        console.log('[STREAMCHAT] 📻 Broadcast payload:', payload);
        // CRITICAL: Don't call loadMessages() - it bypasses the cache!
        // Instead, if we have the message data, use loadMessageWithProfile
        if (payload?.payload?.message) {
          console.log('[STREAMCHAT] 📻 Using loadMessageWithProfile from cache...');
          loadMessageWithProfileRef.current(payload.payload.message);
        } else {
          console.log('[STREAMCHAT] 📻 No message in payload, doing full reload...');
          loadMessages();
        }
      })
      .subscribe((status: string) => {
        console.log('[STREAMCHAT] 📻 Broadcast channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[STREAMCHAT] 📻 Broadcast channel ready!');
          setBroadcastChannel(channel);
        }
      });

    return () => {
      console.log('[STREAMCHAT] 📻 Cleaning up broadcast channel');
      setBroadcastChannel(null);
      supabase.removeChannel(channel);
    };
  }, [supabase, liveStreamId, loadMessages]);

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

  // Ensure gift popup shows on both Host + Viewer even if the gift arrives via full reload (not realtime).
  // Also force-scroll for gifts to match host "instant" behavior.
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.message_type !== 'gift') return;
    showGiftPopup(last);
    requestAnimationFrame(() => scrollToBottom('smooth'));
  }, [messages, showGiftPopup, scrollToBottom]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[STREAMCHAT] 🚀 sendMessage triggered');
    
    const messageToSend = newMessage.trim();
    if (!messageToSend) {
      console.log('[STREAMCHAT] ⚠️ Empty message, ignoring');
      return;
    }

    console.log('[STREAMCHAT] 📝 Message to send:', messageToSend);
    console.log('[STREAMCHAT] 🎥 Live stream ID:', liveStreamId);

    // Clear input IMMEDIATELY (before any async operations)
    setNewMessage('');

    // Send message to database (non-blocking)
    if (!currentUserId) {
      console.error('[STREAMCHAT] ❌ No currentUserId - user not logged in');
      alert('Please log in to send messages');
      setNewMessage(messageToSend);
      return;
    }

    console.log('[STREAMCHAT] 👤 Current user ID:', currentUserId);

    if (blockedWithStreamOwner) {
      alert('Messaging unavailable.');
      setNewMessage(messageToSend);
      return;
    }

    // Use current user's profile for optimistic message (or fallback)
    const optimisticUsername = currentUserProfile?.username || 'You';
    const optimisticAvatar = currentUserProfile?.avatar_url;
    
    // Create a unique temp ID based on timestamp and content hash
    const tempId = `temp-${Date.now()}-${messageToSend.slice(0, 10)}`;
    
    // Get chat settings from cache for optimistic message
    const cachedSettings = profileCacheRef.current[currentUserId];
    console.log('[STREAMCHAT] 🎨 Cached settings for optimistic message:', cachedSettings);
    
    const optimisticMsg = {
      id: tempId,
      profile_id: currentUserId,
      username: optimisticUsername,
      avatar_url: optimisticAvatar,
      message_type: 'text',
      content: messageToSend,
      created_at: new Date().toISOString(),
      // CRITICAL: Include chat settings from cache
      chat_bubble_color: cachedSettings?.chat_bubble_color,
      chat_font: cachedSettings?.chat_font,
    };
    
    console.log('[STREAMCHAT] ⚡ Adding optimistic message:', optimisticMsg);
    
    // Add optimistic message immediately (synchronous)
    setMessages((prev) => {
      console.log('[STREAMCHAT] 📝 Current messages count:', prev.length);
      return [...prev, optimisticMsg];
    });

    console.log('[STREAMCHAT] 🔄 Messages state updated');

    // Always auto-scroll when YOU send a message
    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    console.log('[STREAMCHAT] 🚀 Starting database insert process...');

    // Ensure profile exists before sending message
    // This prevents foreign key constraint violations
    const ensureProfileExists = async () => {
      console.log('[STREAMCHAT] 🔍 Checking if profile exists for user:', currentUserId);
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .single();

      if (checkError) {
        console.error('[STREAMCHAT] ❌ Error checking profile:', checkError);
      }

      if (!existingProfile) {
        console.warn('[STREAMCHAT] ⚠️ Profile does not exist, creating...');
        
        // Profile doesn't exist - try to create it
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[STREAMCHAT] ❌ Not authenticated');
          throw new Error('Not authenticated');
        }

        console.log('[STREAMCHAT] 👤 Creating profile for user:', user.id);

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
          console.error('[STREAMCHAT] ❌ Failed to create profile:', createError);
          throw new Error(`Profile not found. Please contact support.`);
        }
        
        console.log('[STREAMCHAT] ✅ Profile created successfully');
      } else {
        console.log('[STREAMCHAT] ✅ Profile exists');
      }
    };

    // Send to database in background (realtime will replace optimistic with real message)
    ensureProfileExists()
      .then(() => {
        console.log('[STREAMCHAT] 💾 Inserting message into database...');
        
        // ONLY for solo streams - ALWAYS use live_stream_id
        const insertData = {
          profile_id: currentUserId,
          message_type: 'text',
          content: messageToSend,
          live_stream_id: liveStreamId,
          room_id: null, // NEVER set for solo streams
        };
        
        console.log('[STREAMCHAT] 💬 Final insert data:', insertData);
        return supabase.from('chat_messages').insert(insertData).select();
      })
      .then(({ error, data }: { error: any; data: any }) => {
        console.log('[STREAMCHAT] 🔍 Then block - error:', error);
        console.log('[STREAMCHAT] 🔍 Then block - data:', data);
        
        if (error) {
          console.error('[STREAMCHAT] ❌ Database insert error:', error);
          console.error('[STREAMCHAT] ❌ Error message:', error.message);
          console.error('[STREAMCHAT] ❌ Error code:', error.code);
          console.error('[STREAMCHAT] ❌ Error details:', error.details);
          console.error('[STREAMCHAT] ❌ Error hint:', error.hint);
          // Remove optimistic message on error
          setMessages((prev) => prev.filter(m => m.id !== tempId));
          setNewMessage(messageToSend); // Restore input
          alert(`Failed to send message: ${error.message || 'Unknown error'}`);
        } else {
          console.log('[STREAMCHAT] ✅ Message inserted successfully!');
          console.log('[STREAMCHAT] 📊 Insert response data:', data);
          
          // Broadcast to all other tabs/users that a message was sent
          // CRITICAL: Include the message data so other tabs can use profileCacheRef
          if (broadcastChannel && data && data[0]) {
            const insertedMessage = data[0];
            console.log('[STREAMCHAT] 📻 Broadcasting new message event with data...');
            console.log('[STREAMCHAT] 📻 Message to broadcast:', insertedMessage);
            broadcastChannel.send({
              type: 'broadcast',
              event: 'new_message',
              payload: { 
                timestamp: Date.now(),
                message: insertedMessage  // Include the full message
              }
            });
          } else {
            console.warn('[STREAMCHAT] ⚠️ Broadcast channel not ready, manually reloading...');
            // Fallback: reload messages after a short delay
            setTimeout(() => loadMessages(), 500);
          }
        }
        // If success, realtime subscription will receive the new message
        // and replace the optimistic one (matched by profile_id + content + recent timestamp)
      })
      .catch((error: any) => {
        console.error('[STREAMCHAT] ❌ CATCH: Error in send message chain:', error);
        console.error('[STREAMCHAT] ❌ Error stack:', error.stack);
        // Remove optimistic message and restore input
        setMessages((prev) => prev.filter((m: ChatMessage) => m.id !== tempId));
        setNewMessage(messageToSend);
        alert(`Failed to send message: ${error.message || 'Unknown error'}`);
      });
    
    console.log('[STREAMCHAT] ✅ Send message chain initiated');
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

  const openReportMessage = useCallback(
    (msg: ChatMessage) => {
      setReportMessageTarget({
        reportedUserId: msg.profile_id || undefined,
        reportedUsername: msg.username,
        contextDetails: JSON.stringify({
          content_kind: 'stream_chat_message',
          message_id: String(msg.id),
          live_stream_id: liveStreamId,
          sender_id: msg.profile_id || null,
          sender_username: msg.username || null,
          snippet: String(msg.content || '').slice(0, 160) || null,
          created_at: msg.created_at,
        }),
      });
    },
    [liveStreamId]
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent relative">
      {/* Gift Popup (Host + Viewer) */}
      {giftPopup && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          {/* Larger "real gift" popup */}
          <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 max-w-[92vw]">
            <div className={`${readOnly ? 'w-16 h-16 text-5xl' : 'w-14 h-14 text-4xl'} rounded-2xl bg-white/10 flex items-center justify-center`}>
              <span className="leading-none">{giftPopup.emoji}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-pink-200">
                <GiftIcon className={readOnly ? 'w-5 h-5' : 'w-4 h-4'} />
                <span className={`${readOnly ? 'text-base' : 'text-sm'} font-bold uppercase tracking-wide`}>Gift</span>
              </div>
              <div className={`${readOnly ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} font-extrabold truncate`}>
                {giftPopup.message}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Messages - Flexible height with scroll, no header */}
      <div
        ref={messagesContainerRef}
        onScroll={updateAutoScrollFlag}
        className="flex-1 overflow-y-auto p-3 pb-0 -mb-2 space-y-2 min-h-0 custom-scrollbar flex flex-col justify-end touch-pan-y"
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
          messages.map((msg) => {
            const showMllPro = shouldShowMllProBadge(msg.profile_id);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-start ${
                  msg.message_type === 'system' ? 'justify-center' : ''
                } w-full`}
              >
                <div className="flex gap-2 items-start w-full lg:max-w-3xl lg:mx-auto">
                  {msg.message_type === 'system' ? (
                    <div className="text-center text-sm text-white/70 lg:text-gray-500 lg:dark:text-gray-400 italic">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`flex w-full items-start gap-2 ${msg.chat_bubble_color ? '' : (msg.profile_id ? getUserBubbleColor(msg.profile_id) : 'bg-black/20')} backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/10`}
                      style={msg.chat_bubble_color ? { backgroundColor: `${msg.chat_bubble_color}66` } : undefined}
                    >
                      <img
                        src={getAvatarUrl(msg.avatar_url)}
                        alt={msg.username}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = '/no-profile-pic.png';
                        }}
                      />

                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
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
                            className={`font-semibold ${usernameTextClass} text-white hover:text-blue-300 transition cursor-pointer leading-tight`}
                            style={msg.chat_font ? { fontFamily: msg.chat_font } : undefined}
                          >
                            {msg.username}
                          </button>
                          {showMllPro && (
                            <MllProBadge size="compact" className="ml-0.5" />
                          )}
                          <span className={`${timeTextClass} text-white/50 leading-tight`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {msg.message_type !== 'system' && msg.profile_id && (
                            <button
                              type="button"
                              onClick={() => openReportMessage(msg)}
                              className="text-[10px] text-white/60 hover:text-white transition"
                              title="Report message"
                              aria-label="Report message"
                            >
                              Report
                            </button>
                          )}
                        </div>

                        {(() => {
                          const status = msg.profile_id ? gifterStatusMap[msg.profile_id] : null;
                          if (!status || Number(status.lifetime_coins ?? 0) <= 0) {
                            // No badge - just show message
                            return (
                              <div
                                className={`${messageTextClass} text-white/90 break-words leading-snug`}
                                style={msg.chat_font ? { fontFamily: msg.chat_font } : undefined}
                              >
                                <SafeRichText text={msg.content} />
                              </div>
                            );
                          }
                          // Show tier badge + message
                          return (
                            <div className="flex items-start gap-2">
                              <TierBadge
                                tier_key={status.tier_key}
                                level={status.level_in_tier}
                                size="sm"
                              />
                              <div
                                className={`${messageTextClass} text-white/90 break-words leading-snug flex-1 min-w-0`}
                                style={msg.chat_font ? { fontFamily: msg.chat_font } : undefined}
                              >
                                <SafeRichText text={msg.content} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Sticky at bottom */}
      {/* Chat Input - only show if not readOnly */}
      {!readOnly && (
        <form 
          onSubmit={sendMessage} 
          className="sticky bottom-0 px-2 py-2 md:px-3 md:py-2.5 bg-transparent shadow-lg z-40 flex-shrink-0"
        >
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex gap-1.5 md:gap-2 items-center">
            {/* Settings Button */}
            {onSettingsClick && (
              <button
                type="button"
                onClick={onSettingsClick}
                className="p-2 md:p-2.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition flex-shrink-0 mobile-touch-target"
                title="Chat Settings"
                aria-label="Chat Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            )}
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
              className="flex-1 px-3 py-2 md:px-4 md:py-3 text-base border border-white/30 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-white/60 min-w-0"
              maxLength={500}
            />
            {/* Request Guest Button - Left of Gift Button */}
            {showRequestGuestButton && onRequestGuestClick && (
              <button
                type="button"
                onClick={onRequestGuestClick}
                className="p-2 md:p-2.5 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition flex-shrink-0 mobile-touch-target"
                title="Request to Join as Guest"
                aria-label="Request to Join as Guest"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </button>
            )}
            {/* Gift Button */}
            {onGiftClick && (
              <button
                type="button"
                onClick={onGiftClick}
                className="p-2 md:p-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition flex-shrink-0 mobile-touch-target"
                title="Send Gift"
                aria-label="Send Gift"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
              </button>
            )}
            {/* Like Button */}
            {onLikeClick && (
              <button
                type="button"
                onClick={onLikeClick}
                className={`p-2 md:p-2.5 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition flex-shrink-0 mobile-touch-target ${
                  showLikePop ? 'scale-110' : 'scale-100'
                }`}
                title="Like Stream"
                aria-label="Like Stream"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-red-500 stroke-red-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            )}
          </div>
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

      {reportMessageTarget && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportMessageTarget(null)}
          reportType="chat"
          reportedUserId={reportMessageTarget.reportedUserId}
          reportedUsername={reportMessageTarget.reportedUsername}
          contextDetails={reportMessageTarget.contextDetails}
        />
      )}
    </div>
  );
}


