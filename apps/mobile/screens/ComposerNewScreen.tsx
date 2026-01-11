import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type ProjectType = 'sound' | 'track' | 'project';

export default function ComposerNewScreen() {
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('project');

  const typeOptions = useMemo(
    () =>
      [
        { key: 'sound' as const, label: 'Sound', icon: 'musical-note-outline' as const, blurb: 'Single audio idea' },
        { key: 'track' as const, label: 'Track', icon: 'albums-outline' as const, blurb: 'One song / version' },
        { key: 'project' as const, label: 'Project', icon: 'folder-outline' as const, blurb: 'Multi-asset workspace' },
      ] satisfies Array<{
        key: ProjectType;
        label: string;
        icon: React.ComponentProps<typeof Ionicons>['name'];
        blurb: string;
      }>,
    []
  );

  const canCreate = title.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header (web intent: New Composer Project) */}
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.headerTitleCol}>
                  <Text style={styles.headerTitle}>New Project</Text>
                  <Text style={styles.headerSubtitle}>Start a Composer workspace (UI only)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Section: Project title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project title</Text>
            <View style={styles.inputShell}>
              <Ionicons name="text-outline" size={16} color="rgba(255,255,255,0.75)" />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your project a name"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.input}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={64}
                accessibilityLabel="Project title"
              />
            </View>
            <Text style={styles.sectionHint}>You can change this anytime.</Text>
          </View>

          {/* Section: Type selection (web intent: Sound / Track / Project) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type</Text>
            <Text style={styles.sectionHint}>Pick the workspace that matches what you’re making.</Text>

            <View style={styles.typeGrid}>
              {typeOptions.map((opt) => {
                const isActive = opt.key === projectType;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Select type: ${opt.label}`}
                    onPress={() => setProjectType(opt.key)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      isActive && styles.typeCardActive,
                      pressed && styles.pressedSoft,
                    ]}
                  >
                    <View style={[styles.typeIcon, isActive && styles.typeIconActive]}>
                      <Ionicons name={opt.icon} size={18} color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)'} />
                    </View>
                    <View style={styles.typeBody}>
                      <Text style={[styles.typeLabel, isActive && styles.typeLabelActive]}>{opt.label}</Text>
                      <Text style={styles.typeBlurb}>{opt.blurb}</Text>
                    </View>
                    {isActive ? (
                      <View style={styles.typeCheck}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Primary CTA (UI-only) */}
          <View style={styles.ctaShell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create Project"
              disabled={!canCreate}
              onPress={() => {
                // UI-only: no nav, no uploads/playback
              }}
              style={({ pressed }) => [
                styles.ctaButton,
                !canCreate && styles.ctaButtonDisabled,
                pressed && canCreate && styles.pressed,
              ]}
            >
              <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              <Text style={styles.ctaText}>Create Project</Text>
            </Pressable>
            <Text style={styles.ctaHint}>
              Creates a new {projectType === 'project' ? 'project' : projectType} shell (no data wired yet).
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#0c0c16' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 28 },

  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.7)' },

  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 },
  sectionHint: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },

  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    paddingVertical: 0,
  },

  typeGrid: { gap: 10 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  typeCardActive: {
    backgroundColor: 'rgba(236,72,153,0.12)',
    borderColor: 'rgba(236,72,153,0.35)',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: {
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderColor: 'rgba(236,72,153,0.35)',
  },
  typeBody: { flex: 1, minWidth: 0, gap: 2 },
  typeLabel: { fontSize: 13.5, fontWeight: '900', color: 'rgba(255,255,255,0.92)' },
  typeLabelActive: { color: '#FFFFFF' },
  typeBlurb: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  typeCheck: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(236,72,153,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaShell: { gap: 10, marginTop: 2 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.35)',
    backgroundColor: 'rgba(236,72,153,0.22)',
  },
  ctaButtonDisabled: {
    opacity: 0.55,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaText: { fontSize: 13.5, fontWeight: '900', color: '#FFFFFF' },
  ctaHint: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  pressedSoft: { opacity: 0.88 },
});

