import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import SoloHostOverlay from '../components/live/SoloHostOverlay';
import type { ChatMessage } from '../components/live/ChatOverlay';
import { getGifterTierFromCoins } from '../components/live/ChatOverlay';
import type { TopGifter } from '../components/live/TopGifterBubbles';
import { useAuth } from '../state/AuthContext';
import { supabase } from '../lib/supabase';
import { startLiveStreamRecord } from '../lib/livekit';
import { showComingSoon } from '../lib/showComingSoon';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Map message_type from DB to ChatMessage type
const mapMessageType = (type: string): 'chat' | 'gift' | 'follow' | 'system' => {
  switch (type) {
    case 'gift':
      return 'gift';
    case 'follow':
      return 'follow';
    case 'system':
      return 'system';
    default:
      return 'chat';
  }
};

// Extract gift amount from content (e.g., "💎+100")
const extractGiftAmount = (content: string): number | undefined => {
  const match = content?.match(/💎\+(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LiveHostScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Setup state
  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('just-chatting');

  // Optional toggles (UI-only)
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [saveReplay, setSaveReplay] = useState(false);

  // Secondary setup fields (UI-only; mirror common web setup rows)
  const [audience, setAudience] = useState<'Public' | 'Private'>('Public');
  const [schedule, setSchedule] = useState<'Now' | 'Schedule'>('Now');
  const [thumbnail, setThumbnail] = useState<'None' | 'Selected'>('None');

  // LIVE STATE - toggles between setup and live overlay
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const profileId = user?.id ?? 'anonymous';

  // Live stream ID from startLiveStreamRecord (created when going live)
  const [liveStreamId, setLiveStreamId] = useState<number | null>(null);

  // Host profile (fetched from Supabase)
  const [hostProfile, setHostProfile] = useState<{
    displayName: string;
    avatarUrl?: string;
    isPro?: boolean;
  } | null>(null);

  // Top gifters (fetched from gifts table)
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);

  // Chat messages (fetched from chat_messages table)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Host controls state (UI-only)
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraFlipped, setIsCameraFlipped] = useState(false);

  const categories = useMemo(
    () => [
      { id: 'just-chatting', label: 'Just Chatting', icon: 'chatbubbles-outline' as const },
      { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
      { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' as const },
      { id: 'fitness', label: 'Fitness', icon: 'barbell-outline' as const },
      { id: 'irl', label: 'IRL', icon: 'walk-outline' as const },
      { id: 'sports', label: 'Sports', icon: 'football-outline' as const },
    ],
    []
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? categories[0],
    [categories, selectedCategoryId]
  );

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  // Load host profile from Supabase
  useEffect(() => {
    if (!user?.id) return;

    const loadHostProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, is_mll_pro')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[LiveHost] Error loading host profile:', error);
          return;
        }

        if (profile) {
          setHostProfile({
            displayName: profile.display_name || profile.username || 'Host',
            avatarUrl: profile.avatar_url || undefined,
            isPro: profile.is_mll_pro ?? false,
          });
        }
      } catch (err) {
        console.error('[LiveHost] Error loading host profile:', err);
      }
    };

    loadHostProfile();
  }, [user?.id]);

  // Load top gifters from gifts table
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      setTopGifters([]);
      return;
    }

    let cancelled = false;

    const loadTopGifters = async () => {
      try {
        const { data, error } = await supabase
          .from('gifts')
          .select(`
            sender_id,
            coin_amount,
            sender:profiles!gifts_sender_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .not('sender_id', 'is', null);

        if (error) {
          console.error('[LiveHost] Error loading top gifters:', error);
          return;
        }

        if (cancelled) return;

        // Aggregate by sender
        const gifterMap = new Map<string, { total: number; profile: any }>();
        (data ?? []).forEach((gift: any) => {
          const senderId = gift?.sender_id;
          const profile = gift?.sender;
          if (!senderId || !profile) return;

          const amount = Number(gift?.coin_amount ?? 0);
          const existing = gifterMap.get(senderId);
          if (existing) {
            existing.total += amount;
          } else {
            gifterMap.set(senderId, { total: amount, profile });
          }
        });

        // Sort and take top 3
        const sorted = Array.from(gifterMap.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3)
          .map(([senderId, v]) => ({
            id: senderId,
            username: v.profile?.username || 'Unknown',
            avatarUrl: v.profile?.avatar_url || undefined,
            totalCoins: v.total,
          }));

        setTopGifters(sorted);
      } catch (err) {
        console.error('[LiveHost] Error loading top gifters:', err);
      }
    };

    // Initial load
    loadTopGifters();

    // Subscribe to new gifts
    const giftChannel = supabase
      .channel(`gifts-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) loadTopGifters();
        }
      )
      .subscribe();

    // Fallback polling every 30s
    const interval = setInterval(() => {
      if (!cancelled) loadTopGifters();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      giftChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Load and subscribe to chat messages
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      setChatMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            profile_id,
            content,
            message_type,
            created_at,
            profile:profiles!chat_messages_profile_id_fkey(
              username,
              display_name,
              avatar_url,
              total_spent
            )
          `)
          .eq('live_stream_id', liveStreamId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[LiveHost] Error loading chat messages:', error);
          return;
        }

        if (cancelled) return;

        // Get unique profile IDs and fetch their chat settings
        const profileIds = [...new Set((data ?? []).map((msg: any) => msg.profile_id).filter(Boolean))];
        const { data: chatSettingsData } = await supabase
          .from('chat_settings')
          .select('profile_id, chat_bubble_color')
          .in('profile_id', profileIds);

        const chatSettingsMap = new Map(
          (chatSettingsData ?? []).map((s: any) => [s.profile_id, s.chat_bubble_color])
        );

        // Data is newest-first from DB, pass directly to inverted FlatList
        const messages: ChatMessage[] = (data ?? []).map((msg: any) => {
          const lifetimeCoins = msg.profile?.total_spent || 0;
          const gifterInfo = getGifterTierFromCoins(lifetimeCoins);

          return {
            id: String(msg.id),
            type: mapMessageType(msg.message_type),
            username: msg.profile?.display_name || msg.profile?.username || 'User',
            text: msg.content || '',
            avatarUrl: msg.profile?.avatar_url || undefined,
            giftAmount: msg.message_type === 'gift' ? extractGiftAmount(msg.content) : undefined,
            chatColor: chatSettingsMap.get(msg.profile_id) || undefined,
            gifterTierKey: gifterInfo.tierKey,
            gifterLevelInTier: gifterInfo.levelInTier,
            lifetimeCoins: lifetimeCoins,
          };
        });

        setChatMessages(messages);
      } catch (err) {
        console.error('[LiveHost] Error loading chat messages:', err);
      }
    };

    // Initial load
    loadMessages();

    // Subscribe to new messages
    const chatChannel = supabase
      .channel(`chat-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        async (payload) => {
          if (cancelled) return;

          const msg = payload.new as any;
          // Fetch profile info and chat settings for new message
          const [profileResult, chatSettingsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('username, display_name, avatar_url, total_spent')
              .eq('id', msg.profile_id)
              .single(),
            supabase
              .from('chat_settings')
              .select('chat_bubble_color')
              .eq('profile_id', msg.profile_id)
              .maybeSingle(),
          ]);

          if (cancelled) return;

          const profile = profileResult.data;
          const chatSettings = chatSettingsResult.data;
          const lifetimeCoins = (profile as any)?.total_spent || 0;
          const gifterInfo = getGifterTierFromCoins(lifetimeCoins);

          const newMessage: ChatMessage = {
            id: String(msg.id),
            type: mapMessageType(msg.message_type),
            username: profile?.display_name || profile?.username || 'User',
            text: msg.content || '',
            avatarUrl: profile?.avatar_url || undefined,
            giftAmount: msg.message_type === 'gift' ? extractGiftAmount(msg.content) : undefined,
            chatColor: chatSettings?.chat_bubble_color || undefined,
            gifterTierKey: gifterInfo.tierKey,
            gifterLevelInTier: gifterInfo.levelInTier,
            lifetimeCoins: lifetimeCoins,
          };

          // Prepend new message (array is newest-first for inverted FlatList)
          setChatMessages((prev) => [newMessage, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      chatChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Load viewer count from active_viewers table
  useEffect(() => {
    if (!liveStreamId || !isLive) {
      return;
    }

    let cancelled = false;

    const loadViewerCount = async () => {
      try {
        const { count, error } = await supabase
          .from('active_viewers')
          .select('*', { count: 'exact', head: true })
          .eq('live_stream_id', liveStreamId);

        if (error) {
          console.error('[LiveHost] Error loading viewer count:', error);
          return;
        }

        if (!cancelled && typeof count === 'number') {
          setViewerCount(count);
        }
      } catch (err) {
        console.error('[LiveHost] Error loading viewer count:', err);
      }
    };

    // Initial load
    loadViewerCount();

    // Subscribe to viewer changes
    const viewerChannel = supabase
      .channel(`active-viewers-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) {
            setViewerCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          if (!cancelled) {
            setViewerCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Fallback polling every 60s
    const interval = setInterval(() => {
      if (!cancelled) loadViewerCount();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      viewerChannel.unsubscribe();
    };
  }, [liveStreamId, isLive]);

  // Handler: Go Live (creates real live_stream record)
  const handleGoLive = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a stream title.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to go live.');
      return;
    }

    // Create live_streams record in database (makes stream visible on LiveTV)
    const { liveStreamId: newLiveStreamId, error: dbError } = await startLiveStreamRecord(user.id);
    if (dbError) {
      console.warn('[LiveHost] DB record warning:', dbError);
      // Continue anyway - stream will work, just may not show on LiveTV immediately
    } else {
      console.log('[LiveHost] Created live_stream ID:', newLiveStreamId);
      setLiveStreamId(newLiveStreamId);
    }

    setIsLive(true);
  };

  // Handler: End Stream (resets state)
  const handleEndStream = () => {
    Alert.alert('End Stream', 'Are you sure you want to end your stream?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: () => {
          setIsLive(false);
          setViewerCount(0);
          setLiveStreamId(null);
          setTopGifters([]);
          setChatMessages([]);
        },
      },
    ]);
  };

  // ============================================================================
  // LIVE VIEW - Show overlay on top of video placeholder
  // ============================================================================

  if (isLive) {
    return (
      <View style={styles.liveContainer}>
        {/* Video placeholder (black background simulating video) */}
        <View style={styles.videoPlaceholder}>
          <View style={styles.videoCenter}>
            <Ionicons name="videocam" size={64} color="rgba(255,255,255,0.15)" />
            <Text style={styles.videoPlaceholderText}>Camera Preview</Text>
            <Text style={styles.videoPlaceholderHint}>
              (Video rendering not connected - UI only)
            </Text>
          </View>
        </View>

        {/* Solo Host Overlay */}
        <SoloHostOverlay
          profileId={profileId}
          hostName={hostProfile?.displayName ?? 'Host'}
          hostAvatarUrl={hostProfile?.avatarUrl}
          isPro={hostProfile?.isPro}
          viewerCount={viewerCount}
          topGifters={topGifters}
          messages={chatMessages}
          isMuted={isMuted}
          isCameraFlipped={isCameraFlipped}
          liveStreamId={liveStreamId ?? undefined}
          onEndStream={handleEndStream}
          onFlipCamera={() => setIsCameraFlipped((prev) => !prev)}
          onToggleMute={() => setIsMuted((prev) => !prev)}
        />
      </View>
    );
  }

  // ============================================================================
  // SETUP VIEW - Stream configuration before going live
  // ============================================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Go Live</Text>
          <Text style={styles.subtitle}>Set up your stream—then go live when you're ready.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.helpText}>
            Camera and microphone access are required to go live. This screen is UI-only (no permissions requested).
          </Text>

          <View style={{ marginTop: 12 }}>
            <InfoRow
              icon="camera-outline"
              title="Camera"
              value="Required"
              meta="Not requested"
              onPress={() => showComingSoon('Camera permissions')}
            />
            <InfoRow
              icon="mic-outline"
              title="Microphone"
              value="Required"
              meta="Not requested"
              onPress={() => showComingSoon('Microphone permissions')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="text-outline" size={18} color={COLORS.mutedText} style={styles.inputIcon} />
              <TextInput
                value={streamTitle}
                onChangeText={setStreamTitle}
                placeholder="What are you going live about?"
                placeholderTextColor={COLORS.mutedText}
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>
            <Text style={styles.helpText}>Tip: keep it short and clear so people know what to expect.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>

          <View style={styles.selectedRow}>
            <View style={styles.selectedLeft}>
              <View style={styles.selectedIcon}>
                <Ionicons name={selectedCategory.icon} size={18} color={COLORS.text} />
              </View>
              <View>
                <Text style={styles.label}>Selected</Text>
                <Text style={styles.selectedValue}>{selectedCategory.label}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
          </View>

          <View style={styles.chipsWrap}>
            {categories.map((c) => {
              const isSelected = c.id === selectedCategoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCategoryId(c.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${c.label}`}
                >
                  <Ionicons
                    name={c.icon}
                    size={16}
                    color={isSelected ? COLORS.white : COLORS.mutedText}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More settings</Text>

          <InfoRow
            icon="people-outline"
            title="Audience"
            value={audience}
            meta="Who can see this stream"
            onPress={() => setAudience((prev) => (prev === 'Public' ? 'Private' : 'Public'))}
          />
          <InfoRow
            icon="time-outline"
            title="Schedule"
            value={schedule}
            meta="Go live now or schedule"
            onPress={() => setSchedule((prev) => (prev === 'Now' ? 'Schedule' : 'Now'))}
          />
          <InfoRow
            icon="image-outline"
            title="Thumbnail"
            value={thumbnail}
            meta="Optional cover image"
            onPress={() => setThumbnail((prev) => (prev === 'None' ? 'Selected' : 'None'))}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Options</Text>
            <Text style={styles.optionalPill}>Optional</Text>
          </View>

          <ToggleRow
            icon="notifications-outline"
            title="Notify followers"
            description="Send a push notification when you go live."
            value={notifyFollowers}
            onValueChange={setNotifyFollowers}
          />
          <ToggleRow
            icon="chatbox-ellipses-outline"
            title="Enable chat"
            description="Let viewers chat during your stream."
            value={enableChat}
            onValueChange={setEnableChat}
          />
          <ToggleRow
            icon="gift-outline"
            title="Allow gifts"
            description="Let viewers send gifts during your stream."
            value={allowGifts}
            onValueChange={setAllowGifts}
          />
          <ToggleRow
            icon="save-outline"
            title="Save replay"
            description="Keep a replay after you end your stream."
            value={saveReplay}
            onValueChange={setSaveReplay}
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleGoLive}
            style={({ pressed }) => [styles.goLiveButton, pressed && styles.goLiveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
          >
            <Ionicons name="radio-outline" size={20} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={styles.goLiveText}>Go Live</Text>
          </Pressable>
          <Text style={styles.disclaimer}>
            This is a mock setup screen. Tapping "Go Live" shows the overlay UI (no streaming starts).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ToggleRow({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIcon}>
          <Ionicons name={icon} size={18} color={COLORS.mutedText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{title}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
  meta,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  value: string;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
    >
      <View style={styles.infoLeft}>
        <View style={styles.infoIcon}>
          <Ionicons name={icon} size={18} color={COLORS.mutedText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{title}</Text>
          {meta ? <Text style={styles.infoMeta}>{meta}</Text> : null}
        </View>
      </View>
      <View style={styles.infoRight}>
        <Text style={styles.infoValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.mutedText} />
      </View>
    </Pressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const COLORS = {
  bg: '#0B0C10',
  card: '#12131A',
  border: 'rgba(255,255,255,0.10)',
  text: 'rgba(255,255,255,0.92)',
  mutedText: 'rgba(255,255,255,0.60)',
  white: '#FFFFFF',
  primary: '#6366F1',
  primaryPressed: '#4F46E5',
};

const styles = StyleSheet.create({
  // Live view styles
  liveContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCenter: {
    alignItems: 'center',
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  videoPlaceholderHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },

  // Setup view styles
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.mutedText,
  },
  section: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  optionalPill: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mutedText,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mutedText,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 12,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  toggleIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  toggleDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mutedText,
  },
  footer: {
    marginTop: 14,
    gap: 10,
  },
  goLiveButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  goLiveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  goLiveText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mutedText,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  infoMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mutedText,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
});
