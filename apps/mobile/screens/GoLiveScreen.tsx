import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GoLiveScreen() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Go Live</Text>
          <Text style={styles.subtitle}>Set up your stream—then go live when you’re ready.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.helpText}>
            Camera and microphone access are required to go live. This screen is UI-only (no permissions requested).
          </Text>

          <View style={{ marginTop: 12 }}>
            <InfoRow icon="camera-outline" title="Camera" value="Required" meta="Not requested" onPress={() => {}} />
            <InfoRow icon="mic-outline" title="Microphone" value="Required" meta="Not requested" onPress={() => {}} />
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
                  style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.chipPressed]}
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
            onPress={() => {}}
            style={({ pressed }) => [styles.goLiveButton, pressed && styles.goLiveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go Live"
          >
            <Ionicons name="radio-outline" size={20} color={COLORS.white} style={{ marginRight: 10 }} />
            <Text style={styles.goLiveText}>Go Live</Text>
          </Pressable>
          <Text style={styles.disclaimer}>This is a mock setup screen. Going live is UI-only here (no streaming starts).</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
