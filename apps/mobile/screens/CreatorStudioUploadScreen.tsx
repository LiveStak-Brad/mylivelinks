import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import * as DocumentPicker from 'expo-document-picker';

type ContentType = 'music' | 'music_video' | 'podcast' | 'movie' | 'series' | 'vlog' | 'education' | 'comedy' | 'other';
type Visibility = 'public' | 'private';
type Step = 1 | 2 | 3;

const CONTENT_TYPES: { key: ContentType; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; description: string }[] = [
  { key: 'music', label: 'Music (Audio)', icon: 'musical-note-outline', description: 'Audio tracks, songs, albums' },
  { key: 'music_video', label: 'Music Video', icon: 'musical-notes-outline', description: 'Official music videos, lyric videos' },
  { key: 'podcast', label: 'Podcast', icon: 'mic-outline', description: 'Audio episodes, interviews' },
  { key: 'movie', label: 'Movie / Film', icon: 'film-outline', description: 'Documentaries, films, long form' },
  { key: 'series', label: 'Series Episode', icon: 'albums-outline', description: 'Episodic content, shows' },
  { key: 'vlog', label: 'Vlog', icon: 'videocam-outline', description: 'Personal vlogs, daily content' },
  { key: 'education', label: 'Education', icon: 'school-outline', description: 'Tutorials, courses, how-tos' },
  { key: 'comedy', label: 'Comedy', icon: 'happy-outline', description: 'Sketches, stand-up, funny content' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', description: 'Other content types' },
];

const STEP_TITLES: Record<Step, string> = {
  1: 'Rights Confirmation',
  2: 'Content Details',
  3: 'Upload File',
};

export default function CreatorStudioUploadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const defaultType = route.params?.defaultType as ContentType | undefined;

  const [step, setStep] = useState<Step>(1);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ContentType | null>(defaultType || null);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canProceedStep1 = rightsConfirmed;
  const canProceedStep2 = title.trim().length > 0 && selectedType !== null;
  const canUpload = selectedFile !== null;

  const handleNext = () => {
    if (step === 1 && canProceedStep1) setStep(2);
    else if (step === 2 && canProceedStep2) setStep(3);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else navigation.goBack();
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: selectedType === 'music' || selectedType === 'podcast' 
          ? ['audio/*'] 
          : ['video/*', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
        });
        setUploadError(null);
      }
    } catch (e: any) {
      setUploadError('Failed to select file');
    }
  };

  const handleUpload = async () => {
    if (!canUpload || !selectedFile) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      // API endpoint: POST /api/creator-studio/content
      // Will be implemented by web team
      // For now, simulate upload delay then go back
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigation.goBack();
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header with back button and step indicator */}
        <View style={[styles.wizardHeader, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.wizardHeaderCenter}>
            <Text style={[styles.wizardTitle, { color: colors.text }]}>Upload Content</Text>
            <Text style={[styles.wizardStep, { color: colors.mutedText }]}>Step {step} of 3: {STEP_TITLES[step]}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepDotRow}>
              <View style={[
                styles.stepDot,
                s <= step ? styles.stepDotActive : { backgroundColor: colors.border },
              ]} />
              {s < 3 && <View style={[styles.stepLine, s < step ? styles.stepLineActive : { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* STEP 1: Rights Confirmation */}
          {step === 1 && (
            <>
              <View style={[styles.warningCard, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }]}>
                <View style={styles.warningIcon}>
                  <Ionicons name="shield-checkmark-outline" size={28} color="#EF4444" />
                </View>
                <Text style={[styles.warningTitle, { color: colors.text }]}>Rights & Content Policy</Text>
                <Text style={[styles.warningText, { color: colors.mutedText }]}>
                  Before uploading, you must confirm that you own or have legal rights to all content.
                </Text>
              </View>

              <View style={[styles.policyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.policyTitle, { color: colors.text }]}>By uploading, you confirm:</Text>
                <View style={styles.policyList}>
                  <PolicyItem text="You own or have legal rights to all audio, video, and images" colors={colors} />
                  <PolicyItem text="You are not reposting copyrighted content" colors={colors} />
                  <PolicyItem text="You are not reposting other creators' content without permission" colors={colors} />
                  <PolicyItem text="You understand violations may result in content removal and account suspension" colors={colors} />
                </View>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rightsConfirmed }}
                onPress={() => setRightsConfirmed(!rightsConfirmed)}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  { backgroundColor: colors.surface, borderColor: rightsConfirmed ? '#22C55E' : colors.border },
                  rightsConfirmed && styles.checkboxRowActive,
                  pressed && styles.pressedSoft,
                ]}
              >
                <View style={[styles.checkbox, rightsConfirmed && styles.checkboxChecked]}>
                  {rightsConfirmed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  I confirm I own or have legal rights to publish and monetize this content.
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={!canProceedStep1}
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canProceedStep1 && styles.primaryBtnDisabled,
                  pressed && canProceedStep1 && styles.pressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </>
          )}

          {/* STEP 2: Content Details */}
          {step === 2 && (
            <>
              {/* Title */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Title <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter content title"
                    placeholderTextColor={colors.mutedText}
                    style={[styles.input, { color: colors.text }]}
                    maxLength={100}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                <View style={[styles.inputShell, styles.textAreaShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add a description..."
                    placeholderTextColor={colors.mutedText}
                    style={[styles.input, styles.textArea, { color: colors.text }]}
                    multiline
                    numberOfLines={4}
                    maxLength={1000}
                  />
                </View>
              </View>

              {/* Content Type */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Content Type <Text style={styles.required}>*</Text></Text>
                <View style={styles.typeGrid}>
                  {CONTENT_TYPES.map((type) => {
                    const isActive = selectedType === type.key;
                    return (
                      <Pressable
                        key={type.key}
                        accessibilityRole="button"
                        onPress={() => setSelectedType(type.key)}
                        style={({ pressed }) => [
                          styles.typeCard,
                          { backgroundColor: colors.surface, borderColor: isActive ? '#EC4899' : colors.border },
                          isActive && styles.typeCardActive,
                          pressed && styles.pressedSoft,
                        ]}
                      >
                        <View style={[styles.typeIcon, isActive && styles.typeIconActive]}>
                          <Ionicons name={type.icon} size={18} color={isActive ? '#FFFFFF' : colors.mutedText} />
                        </View>
                        <View style={styles.typeInfo}>
                          <Text style={[styles.typeLabel, { color: colors.text }]}>{type.label}</Text>
                          <Text style={[styles.typeDesc, { color: colors.mutedText }]} numberOfLines={1}>
                            {type.description}
                          </Text>
                        </View>
                        {isActive && (
                          <View style={styles.checkIconSmall}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Visibility */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Visibility</Text>
                <View style={styles.visibilityRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setVisibility('public')}
                    style={[
                      styles.visibilityOption,
                      { backgroundColor: colors.surface, borderColor: visibility === 'public' ? '#EC4899' : colors.border },
                      visibility === 'public' && styles.visibilityOptionActive,
                    ]}
                  >
                    <Ionicons name="globe-outline" size={18} color={visibility === 'public' ? '#EC4899' : colors.mutedText} />
                    <Text style={[styles.visibilityLabel, { color: colors.text }]}>Public</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setVisibility('private')}
                    style={[
                      styles.visibilityOption,
                      { backgroundColor: colors.surface, borderColor: visibility === 'private' ? '#EC4899' : colors.border },
                      visibility === 'private' && styles.visibilityOptionActive,
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={visibility === 'private' ? '#EC4899' : colors.mutedText} />
                    <Text style={[styles.visibilityLabel, { color: colors.text }]}>Private</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!canProceedStep2}
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canProceedStep2 && styles.primaryBtnDisabled,
                  pressed && canProceedStep2 && styles.pressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>Continue to Upload</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </>
          )}

          {/* STEP 3: Upload File */}
          {step === 3 && (
            <>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>{title}</Text>
                <View style={styles.summaryMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                    <Text style={styles.typeBadgeText}>{CONTENT_TYPES.find(t => t.key === selectedType)?.label}</Text>
                  </View>
                  <View style={[styles.visibilityBadge, { backgroundColor: visibility === 'public' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)' }]}>
                    <Ionicons name={visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'} size={12} color={visibility === 'public' ? '#22C55E' : '#94A3B8'} />
                    <Text style={[styles.visibilityBadgeText, { color: visibility === 'public' ? '#22C55E' : '#94A3B8' }]}>{visibility === 'public' ? 'Public' : 'Private'}</Text>
                  </View>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={handlePickFile}
                disabled={uploading}
                style={({ pressed }) => [
                  styles.uploadZone,
                  { backgroundColor: colors.surface, borderColor: selectedFile ? '#22C55E' : colors.border },
                  selectedFile && styles.uploadZoneSelected,
                  pressed && !uploading && styles.pressedSoft,
                ]}
              >
                {selectedFile ? (
                  <>
                    <View style={[styles.uploadZoneIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                      <Ionicons name="document-attach-outline" size={28} color="#22C55E" />
                    </View>
                    <Text style={[styles.uploadZoneTitle, { color: colors.text }]}>{selectedFile.name}</Text>
                    <Text style={[styles.uploadZoneSubtitle, { color: colors.mutedText }]}>
                      {formatFileSize(selectedFile.size)} • Tap to change
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.uploadZoneIcon}>
                      <Ionicons name="cloud-upload-outline" size={32} color={colors.mutedText} />
                    </View>
                    <Text style={[styles.uploadZoneTitle, { color: colors.text }]}>Tap to select file</Text>
                    <Text style={[styles.uploadZoneSubtitle, { color: colors.mutedText }]}>
                      {selectedType === 'music' || selectedType === 'podcast' 
                        ? 'MP3, WAV, AAC, FLAC up to 500MB'
                        : 'MP4, MOV, WebM up to 2GB'}
                    </Text>
                  </>
                )}
              </Pressable>

              {uploadError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{uploadError}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={!canUpload || uploading}
                onPress={handleUpload}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!canUpload || uploading) && styles.primaryBtnDisabled,
                  pressed && canUpload && !uploading && styles.pressed,
                ]}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Upload Content</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PolicyItem({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={styles.policyItem}>
      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
      <Text style={[styles.policyItemText, { color: colors.mutedText }]}>{text}</Text>
    </View>
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
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 13, fontWeight: '600' },

  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },

  typeGrid: { gap: 10 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeCardActive: {
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: {
    backgroundColor: '#EC4899',
  },
  typeInfo: { flex: 1, gap: 2 },
  typeLabel: { fontSize: 14, fontWeight: '800' },
  typeDesc: { fontSize: 12, fontWeight: '600' },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  uploadZone: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadZoneIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(148,163,184,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneTitle: { fontSize: 14, fontWeight: '800' },
  uploadZoneSubtitle: { fontSize: 12, fontWeight: '600' },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#EC4899',
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  uploadHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.85 },

  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  wizardTitle: { fontSize: 16, fontWeight: '800' },
  wizardStep: { fontSize: 12, fontWeight: '600' },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotActive: {
    backgroundColor: '#EC4899',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#EC4899',
  },

  warningCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  warningIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  warningText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  policyCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  policyTitle: { fontSize: 14, fontWeight: '800' },
  policyList: { gap: 10 },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  policyItemText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  checkboxRowActive: {
    backgroundColor: 'rgba(34,197,94,0.08)',
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#EC4899',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  required: { color: '#EF4444' },

  checkIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  visibilityLabel: { fontSize: 14, fontWeight: '700' },

  summaryCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800' },
  summaryMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '800', color: '#EC4899' },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  visibilityBadgeText: { fontSize: 11, fontWeight: '800' },

  uploadZoneSelected: {
    borderStyle: 'solid',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#EF4444' },
});
