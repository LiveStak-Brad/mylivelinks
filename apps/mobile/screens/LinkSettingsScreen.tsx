import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LinkSettingsScreen() {
  const [autoLinkOnFollow, setAutoLinkOnFollow] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI-only settings (match web structure intent; no wiring)
  const [enableLinkDiscovery, setEnableLinkDiscovery] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);

  const [showLinkModeOnProfile, setShowLinkModeOnProfile] = useState(true);
  const [showMutualsCount, setShowMutualsCount] = useState(true);

  const [dmMutualsOnly, setDmMutualsOnly] = useState(true);
  const [hideFromBlockedUsers, setHideFromBlockedUsers] = useState(true);

  const [notifyNewMutual, setNotifyNewMutual] = useState(true);
  const [notifyAutoLink, setNotifyAutoLink] = useState(true);
  const [notifyDatingMatch, setNotifyDatingMatch] = useState(true);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const sections = useMemo(
    () => [
      {
        title: 'Auto-Link (F4F)',
        rows: [
          {
            key: 'auto-link-on-follow',
            title: 'Auto-Link Back on Follow',
            description: 'When someone follows you, automatically create a mutual link (F4F).',
            right: (
              <Toggle value={autoLinkOnFollow} onPress={() => setAutoLinkOnFollow(!autoLinkOnFollow)} />
            ),
          },
          {
            key: 'auto-link-require-approval',
            title: 'Require Approval',
            description: 'Review auto-link requests before accepting',
            disabled: true,
            right: <Toggle value={false} disabled />,
            footnote: 'Coming soon',
          },
        ],
      },
      {
        title: 'Preferences',
        rows: [
          {
            key: 'prefs-link-discovery',
            title: 'Enable Link Discovery',
            description: 'Let others find you in Link modes.',
            right: <Toggle value={enableLinkDiscovery} onPress={() => setEnableLinkDiscovery(!enableLinkDiscovery)} />,
          },
          {
            key: 'prefs-smart-suggestions',
            title: 'Smart Suggestions',
            description: 'Improve your candidate suggestions based on your activity.',
            right: <Toggle value={smartSuggestions} onPress={() => setSmartSuggestions(!smartSuggestions)} />,
          },
        ],
      },
      {
        title: 'Visibility',
        rows: [
          {
            key: 'vis-show-link-mode',
            title: 'Show Link Mode on Profile',
            description: 'Display Link entry points on your profile.',
            right: (
              <Toggle value={showLinkModeOnProfile} onPress={() => setShowLinkModeOnProfile(!showLinkModeOnProfile)} />
            ),
          },
          {
            key: 'vis-mutuals-count',
            title: 'Show Mutuals Count',
            description: 'Let others see how many mutuals you have.',
            right: <Toggle value={showMutualsCount} onPress={() => setShowMutualsCount(!showMutualsCount)} />,
          },
        ],
      },
      {
        title: 'Safety',
        rows: [
          {
            key: 'safety-dm-mutuals-only',
            title: 'DM Mutuals Only',
            description: 'Only allow new messages from mutuals.',
            right: <Toggle value={dmMutualsOnly} onPress={() => setDmMutualsOnly(!dmMutualsOnly)} />,
          },
          {
            key: 'safety-hide-from-blocked',
            title: 'Hide From Blocked Users',
            description: 'Prevent blocked users from seeing you in Link modes.',
            right: <Toggle value={hideFromBlockedUsers} onPress={() => setHideFromBlockedUsers(!hideFromBlockedUsers)} />,
          },
        ],
      },
      {
        title: 'Notifications',
        rows: [
          {
            key: 'noties-new-mutual',
            title: 'New Mutuals',
            description: 'Get notified when you become mutuals.',
            right: <Toggle value={notifyNewMutual} onPress={() => setNotifyNewMutual(!notifyNewMutual)} />,
          },
          {
            key: 'noties-auto-link',
            title: 'Auto-Link Events',
            description: 'Get notified when Auto-Link creates a mutual.',
            right: <Toggle value={notifyAutoLink} onPress={() => setNotifyAutoLink(!notifyAutoLink)} />,
          },
          {
            key: 'noties-dating-match',
            title: 'Dating Matches',
            description: 'Get notified when you have a new dating match.',
            right: <Toggle value={notifyDatingMatch} onPress={() => setNotifyDatingMatch(!notifyDatingMatch)} />,
          },
        ],
      },
    ],
    [
      autoLinkOnFollow,
      enableLinkDiscovery,
      smartSuggestions,
      showLinkModeOnProfile,
      showMutualsCount,
      dmMutualsOnly,
      hideFromBlockedUsers,
      notifyNewMutual,
      notifyAutoLink,
      notifyDatingMatch,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Link Settings</Text>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            {section.rows.map((row, idx) => (
              <View key={row.key}>
                <View style={[styles.settingRow, row.disabled && styles.settingRowDisabled]}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, row.disabled && styles.textDisabled]}>{row.title}</Text>
                    <Text style={[styles.settingDescription, row.disabled && styles.textDisabled]}>{row.description}</Text>
                  </View>

                  {row.right}
                </View>

                {!!row.footnote && <Text style={styles.comingSoonText}>{row.footnote}</Text>}

                {idx !== section.rows.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({
  value,
  onPress,
  disabled,
}: {
  value: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.toggle,
        value && styles.toggleActive,
        disabled && styles.toggleDisabled,
        pressed && !disabled && { opacity: 0.9 },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      hitSlop={10}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    position: 'relative',
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.8,
  },
  toggleThumb: {
    position: 'absolute',
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    left: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
