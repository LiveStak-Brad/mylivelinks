import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import SoloHostOverlay from '../components/live/SoloHostOverlay';
import type { ChatMessage, ChatFontColor } from '../components/live/ChatOverlay';
import type { TopGifter } from '../components/live/TopGifterBubbles';

// ============================================================================
// MOCK DATA - Host info, gifters, and chat messages
// ============================================================================

const MOCK_HOST = {
  name: 'DemoHost',
  avatarUrl: 'https://i.pravatar.cc/100?u=demohost',
};

const MOCK_TOP_GIFTERS: TopGifter[] = [
  { id: '1', username: 'BigSpender', avatarUrl: 'https://i.pravatar.cc/100?u=bigspender', totalCoins: 5000 },
  { id: '2', username: 'GenGifter', avatarUrl: 'https://i.pravatar.cc/100?u=gengifter', totalCoins: 2500 },
  { id: '3', username: 'CoinKing', avatarUrl: 'https://i.pravatar.cc/100?u=coinking', totalCoins: 1200 },
];

// Mock chat font color (from approved palette)
const MOCK_CHAT_FONT_COLOR: ChatFontColor = '#FFFFFF';

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', type: 'system', username: 'System', text: 'Stream started' },
  { id: '2', type: 'follow', username: 'NewFollower123', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=newfollower123' },
  { id: '3', type: 'chat', username: 'CoolViewer', text: 'Hey! Great stream!', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '4', type: 'chat', username: 'MusicFan', text: 'Love this vibe 🔥', avatarUrl: 'https://i.pravatar.cc/100?u=musicfan' },
  { id: '5', type: 'gift', username: 'BigSpender', text: 'sent a Rose', giftAmount: 100, avatarUrl: 'https://i.pravatar.cc/100?u=bigspender' },
  { id: '6', type: 'chat', username: 'RandomUser', text: 'First time here, this is awesome!', avatarUrl: 'https://i.pravatar.cc/100?u=randomuser' },
  { id: '7', type: 'chat', username: 'NightOwl', text: 'What city are you in?', avatarUrl: 'https://i.pravatar.cc/100?u=nightowl' },
  { id: '8', type: 'follow', username: 'StreamWatcher', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=streamwatcher' },
  { id: '9', type: 'chat', username: 'CoolViewer', text: 'The quality is so good!', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '10', type: 'gift', username: 'GenGifter', text: 'sent a Diamond', giftAmount: 500, avatarUrl: 'https://i.pravatar.cc/100?u=gengifter' },
  { id: '11', type: 'chat', username: 'MusicFan', text: 'Can you play some jazz?', avatarUrl: 'https://i.pravatar.cc/100?u=musicfan' },
  { id: '12', type: 'chat', username: 'ChillMode', text: '👋👋👋', avatarUrl: 'https://i.pravatar.cc/100?u=chillmode' },
  { id: '13', type: 'chat', username: 'ViewerX', text: 'How long have you been streaming?', avatarUrl: 'https://i.pravatar.cc/100?u=viewerx' },
  { id: '14', type: 'gift', username: 'CoinKing', text: 'sent a Crown', giftAmount: 1000, avatarUrl: 'https://i.pravatar.cc/100?u=coinking' },
  { id: '15', type: 'chat', username: 'NightOwl', text: 'This chat is so chill', avatarUrl: 'https://i.pravatar.cc/100?u=nightowl' },
  { id: '16', type: 'follow', username: 'LateNightFan', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=latenightfan' },
  { id: '17', type: 'chat', username: 'RandomUser', text: 'Followed! Keep it up!', avatarUrl: 'https://i.pravatar.cc/100?u=randomuser' },
  { id: '18', type: 'chat', username: 'CoolViewer', text: 'The lighting is perfect', avatarUrl: 'https://i.pravatar.cc/100?u=coolviewer' },
  { id: '19', type: 'system', username: 'System', text: '100 viewers reached!' },
  { id: '20', type: 'chat', username: 'ChillMode', text: 'Love this community', avatarUrl: 'https://i.pravatar.cc/100?u=chillmode' },
  { id: '21', type: 'gift', username: 'BigSpender', text: 'sent a Universe', giftAmount: 2500, avatarUrl: 'https://i.pravatar.cc/100?u=bigspender' },
  { id: '22', type: 'chat', username: 'MusicFan', text: 'That gift animation was crazy!', avatarUrl: 'https://i.pravatar.cc/100?u=musicfan' },
  { id: '23', type: 'chat', username: 'ViewerX', text: 'Stream goals 🎯', avatarUrl: 'https://i.pravatar.cc/100?u=viewerx' },
  { id: '24', type: 'follow', username: 'NewbieFan', text: '', avatarUrl: 'https://i.pravatar.cc/100?u=newbiefan' },
  { id: '25', type: 'chat', username: 'NightOwl', text: 'Best stream of the night!', avatarUrl: 'https://i.pravatar.cc/100?u=nightowl' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LiveHostScreen() {
  const navigation = useNavigation<any>();

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
  const [viewerCount, setViewerCount] = useState(127);

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

  // Handler: Go Live (mock - transitions to live overlay)
  const handleGoLive = () => {
    if (!streamTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a stream title.');
      return;
    }
    setIsLive(true);
    // Simulate viewer count updates
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 5) - 1);
    }, 3000);
    return () => clearInterval(interval);
  };

  // Handler: End Stream (mock - returns to setup)
  const handleEndStream = () => {
    Alert.alert('End Stream', 'Are you sure you want to end your stream?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: () => {
          setIsLive(false);
          setViewerCount(0);
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
          hostName={MOCK_HOST.name}
          hostAvatarUrl={MOCK_HOST.avatarUrl}
          viewerCount={viewerCount}
          trendingRank={5}
          leaderboardRank={{ currentRank: 12, pointsToNextRank: 250 }}
          topGifters={MOCK_TOP_GIFTERS}
          messages={MOCK_MESSAGES}
          isMuted={isMuted}
          isCameraFlipped={isCameraFlipped}
          chatFontColor={MOCK_CHAT_FONT_COLOR}
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
              onPress={() => {}}
            />
            <InfoRow
              icon="mic-outline"
              title="Microphone"
              value="Required"
              meta="Not requested"
              onPress={() => {}}
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
