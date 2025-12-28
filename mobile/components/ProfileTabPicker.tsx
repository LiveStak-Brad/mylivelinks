import React, { useState, useEffect } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileTab, ProfileType } from '../config/profileTypeConfig';
import { PROFILE_TYPE_CONFIG } from '../config/profileTypeConfig';

// ============================================================================
// TAB METADATA
// ============================================================================

interface TabMetadata {
  id: ProfileTab;
  label: string;
  description?: string;
}

// Core tabs that always appear (cannot be removed)
const CORE_TABS: ProfileTab[] = ['info'];

// Optional tabs that users can add/remove
const OPTIONAL_TABS: Record<string, TabMetadata> = {
  // Content Tabs
  feed: {
    id: 'feed',
    label: 'Feed',
    description: 'Photo/video feed grid',
  },
  reels: {
    id: 'reels',
    label: 'Reels',
    description: 'Short-form video content',
  },
  photos: {
    id: 'photos',
    label: 'Photos',
    description: 'Photo gallery',
  },
  videos: {
    id: 'videos',
    label: 'Videos',
    description: 'Video gallery',
  },
  
  // Feature Tabs
  music: {
    id: 'music',
    label: 'Music',
    description: 'Music tracks & playlists',
  },
  events: {
    id: 'events',
    label: 'Events',
    description: 'Shows & performances',
  },
  products: {
    id: 'products',
    label: 'Products',
    description: 'Merchandise & portfolio',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileTabPickerProps {
  profileType: ProfileType;
  currentEnabledTabs?: ProfileTab[] | null;
  onChange: (enabledTabs: ProfileTab[]) => void;
}

export default function ProfileTabPicker({
  profileType,
  currentEnabledTabs,
  onChange,
}: ProfileTabPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [enabledTabs, setEnabledTabs] = useState<Set<ProfileTab>>(
    new Set(currentEnabledTabs || [])
  );

  // Get ALL optional tabs (not filtered by profile type)
  // Users can mix and match any tabs from any profile type
  const availableTabs = Object.keys(OPTIONAL_TABS) as ProfileTab[];

  // Initialize defaults when component mounts OR when profile type changes (if no custom selection)
  useEffect(() => {
    if (currentEnabledTabs && currentEnabledTabs.length > 0) {
      // User has custom selection - keep it
      setEnabledTabs(new Set(currentEnabledTabs));
    } else {
      // No custom selection - use profile_type defaults
      const defaults = PROFILE_TYPE_CONFIG[profileType].tabs
        .filter((t) => t.enabled && OPTIONAL_TABS[t.id])
        .map((t) => t.id);
      setEnabledTabs(new Set(defaults));
      onChange(Array.from(defaults));
    }
  }, [profileType]); // Re-run when profileType changes

  const handleToggle = (tabId: ProfileTab) => {
    setEnabledTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  const handleSave = () => {
    onChange(Array.from(enabledTabs));
    setShowModal(false);
  };

  const handleRemoveChip = (tabId: ProfileTab) => {
    const next = new Set(enabledTabs);
    next.delete(tabId);
    setEnabledTabs(next);
    onChange(Array.from(next));
  };

  // Sort tabs alphabetically for display
  const sortedTabs = [...availableTabs].sort((a, b) => {
    const labelA = OPTIONAL_TABS[a]?.label || '';
    const labelB = OPTIONAL_TABS[b]?.label || '';
    return labelA.localeCompare(labelB);
  });

  const sortedEnabledTabs = Array.from(enabledTabs).sort((a, b) => {
    const labelA = OPTIONAL_TABS[a]?.label || '';
    const labelB = OPTIONAL_TABS[b]?.label || '';
    return labelA.localeCompare(labelB);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.helpText}>
        Choose which tabs appear on your profile. Visitors can navigate between enabled tabs.
      </Text>

      {/* Enabled Tabs (Chips) */}
      <View style={styles.chipsContainer}>
        {sortedEnabledTabs.map((tabId) => {
          const tab = OPTIONAL_TABS[tabId];
          if (!tab) return null;
          return (
            <View key={tabId} style={styles.chip}>
              <Text style={styles.chipText}>{tab.label}</Text>
              <Pressable
                onPress={() => handleRemoveChip(tabId)}
                style={({ pressed }) => [
                  styles.removeChipButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="close-circle" size={16} color="#1E40AF" />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Add Tabs Button */}
      <Pressable
        onPress={() => setShowModal(true)}
        style={({ pressed }) => [
          styles.addButton,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name="add-circle-outline" size={20} color="#1E40AF" />
        <Text style={styles.addButtonText}>Add / Manage Tabs</Text>
      </Pressable>

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Profile Tabs</Text>
              <Text style={styles.modalDescription}>
                Select which tabs appear on your profile
              </Text>
            </View>

            {/* Tab List */}
            <ScrollView style={styles.modalBody}>
              <View style={styles.tabList}>
                {sortedTabs.map((tabId) => {
                  const tab = OPTIONAL_TABS[tabId];
                  if (!tab) return null;
                  const isEnabled = enabledTabs.has(tabId);
                  return (
                    <Pressable
                      key={tabId}
                      onPress={() => handleToggle(tabId)}
                      style={({ pressed }) => [
                        styles.tabRow,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={styles.checkbox}>
                        {isEnabled && (
                          <Ionicons name="checkmark" size={16} color="#1E40AF" />
                        )}
                      </View>
                      <View style={styles.tabInfo}>
                        <Text style={styles.tabLabel}>{tab.label}</Text>
                        {tab.description && (
                          <Text style={styles.tabDescription}>{tab.description}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setEnabledTabs(new Set(currentEnabledTabs || []));
                  setShowModal(false);
                }}
                style={({ pressed }) => [
                  styles.cancelButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.doneButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
  },
  removeChipButton: {
    marginLeft: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  modalBody: {
    maxHeight: 400,
  },
  tabList: {
    padding: 16,
    gap: 12,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 8,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tabInfo: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tabDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  doneButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1E40AF',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

