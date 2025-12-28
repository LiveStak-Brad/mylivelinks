import React, { useState, useEffect } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileSection, ProfileType } from '../config/profileTypeConfig';
import { PROFILE_TYPE_CONFIG } from '../config/profileTypeConfig';

// ============================================================================
// OPTIONAL MODULES (Customizable)
// ============================================================================
// Core shell (hero, footer, connections, social_media, links) is NOT included

interface ModuleMetadata {
  id: ProfileSection;
  label: string;
  description: string;
}

const OPTIONAL_MODULES: Record<string, ModuleMetadata> = {
  // Music & Entertainment
  music_showcase: {
    id: 'music_showcase',
    label: 'Music Tracks',
    description: 'Your music library',
  },
  upcoming_events: {
    id: 'upcoming_events',
    label: 'Events / Shows',
    description: 'Your event schedule',
  },
  
  // Streaming & Stats
  streaming_stats: {
    id: 'streaming_stats',
    label: 'Streaming Stats',
    description: 'Live hours, viewer counts',
  },
  profile_stats: {
    id: 'profile_stats',
    label: 'Profile Stats',
    description: 'Account age, join date',
  },
  social_counts: {
    id: 'social_counts',
    label: 'Social Counts',
    description: 'Follower/following counts',
  },
  top_supporters: {
    id: 'top_supporters',
    label: 'Top Supporters',
    description: 'Users who gifted you',
  },
  top_streamers: {
    id: 'top_streamers',
    label: 'Top Streamers',
    description: 'Streamers you support',
  },
  
  // Products & Business
  merchandise: {
    id: 'merchandise',
    label: 'Merchandise',
    description: 'Your merch store',
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio / Products',
    description: 'Your work showcase',
  },
  business_info: {
    id: 'business_info',
    label: 'Business Info',
    description: 'Hours, location, contact',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileModulePickerProps {
  profileType: ProfileType;
  currentEnabledModules?: ProfileSection[] | null;
  onChange: (enabledModules: ProfileSection[]) => void;
}

export default function ProfileModulePicker({
  profileType,
  currentEnabledModules,
  onChange,
}: ProfileModulePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [enabledModules, setEnabledModules] = useState<Set<ProfileSection>>(
    new Set(currentEnabledModules || [])
  );

  // Get ALL optional modules (not filtered by profile type)
  // Users can mix and match any modules from any profile type
  const availableModules = Object.keys(OPTIONAL_MODULES) as ProfileSection[];

  // Initialize defaults when component mounts OR when profile type changes (if no custom selection)
  useEffect(() => {
    if (currentEnabledModules && currentEnabledModules.length > 0) {
      // User has custom selection - keep it
      setEnabledModules(new Set(currentEnabledModules));
    } else {
      // No custom selection - use profile_type defaults
      const defaults = PROFILE_TYPE_CONFIG[profileType].sections
        .filter((s) => s.enabled && OPTIONAL_MODULES[s.id])
        .map((s) => s.id);
      setEnabledModules(new Set(defaults));
      onChange(Array.from(defaults));
    }
  }, [profileType]); // Re-run when profileType changes

  const toggleModule = (moduleId: ProfileSection) => {
    const newSet = new Set(enabledModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setEnabledModules(newSet);
    onChange(Array.from(newSet));
  };

  const removeModule = (moduleId: ProfileSection) => {
    const newSet = new Set(enabledModules);
    newSet.delete(moduleId);
    setEnabledModules(newSet);
    onChange(Array.from(newSet));
  };

  const enabledList = Array.from(enabledModules).filter((id) =>
    availableModules.includes(id)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Optional Profile Modules</Text>
          <Text style={styles.subtitle}>Choose which modules appear on your profile</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {/* Enabled Modules (Chips) */}
      {enabledList.length > 0 ? (
        <View style={styles.chipsContainer}>
          {enabledList.map((moduleId) => {
            const module = OPTIONAL_MODULES[moduleId];
            if (!module) return null;
            return (
              <View key={moduleId} style={styles.chip}>
                <Text style={styles.chipText}>{module.label}</Text>
                <Pressable onPress={() => removeModule(moduleId)} style={styles.chipRemove}>
                  <Ionicons name="close" size={16} color="#3B82F6" />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          No optional modules enabled. Tap "Add" to get started.
        </Text>
      )}

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add / Remove Modules</Text>
              <Pressable onPress={() => setShowModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color="#9aa0a6" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {availableModules.map((moduleId) => {
                const module = OPTIONAL_MODULES[moduleId];
                if (!module) return null;
                const isEnabled = enabledModules.has(moduleId);

                return (
                  <Pressable
                    key={moduleId}
                    style={({ pressed }) => [
                      styles.moduleItem,
                      pressed && styles.moduleItemPressed,
                    ]}
                    onPress={() => toggleModule(moduleId)}
                  >
                    <View
                      style={[styles.checkbox, isEnabled && styles.checkboxChecked]}
                    >
                      {isEnabled && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={styles.moduleInfo}>
                      <Text style={styles.moduleLabel}>{module.label}</Text>
                      <Text style={styles.moduleDescription}>{module.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.doneButtonPressed,
                ]}
                onPress={() => setShowModal(false)}
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.30)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
  chipRemove: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 8,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  moduleItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  moduleDescription: {
    fontSize: 12,
    color: '#9aa0a6',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonPressed: {
    opacity: 0.7,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

