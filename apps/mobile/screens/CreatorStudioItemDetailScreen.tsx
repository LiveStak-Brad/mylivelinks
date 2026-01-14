import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';

const RIGHTS_DISCLAIMER = "You must own rights to audio/video. No reposting others' content.";

type ContentType = 'music_video' | 'movie' | 'podcast' | 'series';
type ContentStatus = 'draft' | 'processing' | 'published';

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  music_video: { label: 'Music Video', icon: 'musical-notes-outline', color: '#EC4899' },
  movie: { label: 'Movie', icon: 'film-outline', color: '#8B5CF6' },
  podcast: { label: 'Podcast', icon: 'mic-outline', color: '#F59E0B' },
  series: { label: 'Series', icon: 'albums-outline', color: '#22C55E' },
};

const STATUS_OPTIONS: { key: ContentStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
];

// TEMP UI MOCK (remove when web APIs are ready)
const MOCK_ITEM = {
  id: '1',
  title: 'Summer Vibes - Official Music Video',
  description: 'The official music video for Summer Vibes. Shot on location in Miami.',
  type: 'music_video' as ContentType,
  status: 'published' as ContentStatus,
  views: 12500,
  likes: 850,
  duration: '3:45',
  publishedAt: '2024-01-10',
  thumbnailUrl: null,
};

export default function CreatorStudioItemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const itemType = (route.params?.type as ContentType) || 'music_video';
  const typeConfig = TYPE_CONFIG[itemType];

  const [title, setTitle] = useState(MOCK_ITEM.title);
  const [description, setDescription] = useState(MOCK_ITEM.description);
  const [status, setStatus] = useState<ContentStatus>(MOCK_ITEM.status);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasChanges(true);
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    setHasChanges(true);
  };

  const handleStatusChange = (newStatus: ContentStatus) => {
    setStatus(newStatus);
    setHasChanges(true);
  };

  const handleSave = () => {
    // TEMP: UI-only, no actual save
    setHasChanges(false);
  };

  const handleDelete = () => {
    // TEMP: UI-only, no actual delete
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Rights Disclaimer Banner */}
          <View style={styles.disclaimerBanner}>
            <Ionicons name="warning-outline" size={16} color="#F59E0B" />
            <Text style={styles.disclaimerText}>{RIGHTS_DISCLAIMER}</Text>
          </View>

          {/* Header */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.headerRow}>
              <View style={[styles.headerIcon, { backgroundColor: typeConfig.color }]}>
                <Ionicons name={typeConfig.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.headerTitleCol}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit {typeConfig.label}</Text>
                <Text style={[styles.headerSubtitle, { color: colors.mutedText }]}>
                  Update metadata and settings
                </Text>
              </View>
            </View>
          </View>

          {/* Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.previewThumb, { backgroundColor: `${typeConfig.color}15` }]}>
              <Ionicons name={typeConfig.icon} size={32} color={typeConfig.color} />
              <View style={styles.previewDuration}>
                <Text style={styles.previewDurationText}>{MOCK_ITEM.duration}</Text>
              </View>
            </View>
            <View style={styles.previewStats}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={16} color={colors.mutedText} />
                <Text style={[styles.statValue, { color: colors.text }]}>{MOCK_ITEM.views.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>views</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={16} color={colors.mutedText} />
                <Text style={[styles.statValue, { color: colors.text }]}>{MOCK_ITEM.likes.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>likes</Text>
              </View>
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Title</Text>
            <View style={[styles.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Enter title"
                placeholderTextColor={colors.mutedText}
                style={[styles.input, { color: colors.text }]}
                maxLength={100}
              />
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <View style={[styles.inputShell, styles.textAreaShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={description}
                onChangeText={handleDescriptionChange}
                placeholder="Add a description..."
                placeholderTextColor={colors.mutedText}
                style={[styles.input, styles.textArea, { color: colors.text }]}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
            </View>
          </View>

          {/* Status Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Visibility</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => {
                const isActive = status === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    onPress={() => handleStatusChange(opt.key)}
                    style={[
                      styles.statusOption,
                      { backgroundColor: colors.surface, borderColor: isActive ? typeConfig.color : colors.border },
                      isActive && { backgroundColor: `${typeConfig.color}15` },
                    ]}
                  >
                    <View style={[styles.statusRadio, isActive && { backgroundColor: typeConfig.color, borderColor: typeConfig.color }]}>
                      {isActive && <View style={styles.statusRadioInner} />}
                    </View>
                    <Text style={[styles.statusLabel, { color: colors.text }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Thumbnail Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Thumbnail</Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.thumbnailZone,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressedSoft,
              ]}
            >
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${typeConfig.color}10` }]}>
                <Ionicons name="image-outline" size={28} color={colors.mutedText} />
              </View>
              <View style={styles.thumbnailInfo}>
                <Text style={[styles.thumbnailTitle, { color: colors.text }]}>Change thumbnail</Text>
                <Text style={[styles.thumbnailSubtitle, { color: colors.mutedText }]}>
                  Recommended: 1280x720 (16:9)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Pressable
              accessibilityRole="button"
              disabled={!hasChanges}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: typeConfig.color },
                !hasChanges && styles.saveBtnDisabled,
                pressed && hasChanges && styles.pressed,
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: colors.danger },
                pressed && styles.pressedSoft,
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },

  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
    lineHeight: 17,
  },

  headerCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },

  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewThumb: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewDurationText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  previewStats: {
    flexDirection: 'row',
    padding: 14,
    gap: 24,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },

  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },

  inputShell: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaShell: {
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  statusRow: { flexDirection: 'row', gap: 10 },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusLabel: { fontSize: 14, fontWeight: '700' },

  thumbnailZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailInfo: { flex: 1, gap: 2 },
  thumbnailTitle: { fontSize: 14, fontWeight: '700' },
  thumbnailSubtitle: { fontSize: 12, fontWeight: '600' },

  actionsSection: { gap: 12, marginTop: 8 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },

  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.85 },
});
