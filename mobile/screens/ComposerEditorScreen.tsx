/**
 * ComposerEditorScreen - Mobile Base Editor
 * Basic video editing with caption, text overlays, producer, and actors
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import type { ComposerEditorState, TextOverlay } from '../types/composer';
import { getAvatarSource } from '../lib/defaultAvatar';
import { useTopBarState } from '../hooks/topbar/useTopBarState';

export function ComposerEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useThemeMode();
  const topBar = useTopBarState();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const draftId = route.params?.draftId;

  // Editor state
  const [state, setState] = useState<ComposerEditorState>({
    caption: '',
    textOverlays: [],
    actors: [],
    isSaving: false,
    isPosting: false,
  });

  // Modals
  const [showWebComposerInfo, setShowWebComposerInfo] = useState(false);
  const [showAddOverlay, setShowAddOverlay] = useState(false);

  // Producer (current user)
  const producer = useMemo(() => ({
    id: topBar.userId || '',
    username: topBar.username || '',
    displayName: topBar.displayName || topBar.username || '',
    avatarUrl: topBar.avatarUrl,
  }), [topBar]);

  const handleSave = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      // TODO: Implement actual save logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Draft saved successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [navigation]);

  const handlePost = useCallback(async () => {
    setState(prev => ({ ...prev, isPosting: true }));
    try {
      // TODO: Implement actual post logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Posted to feed!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to post');
    } finally {
      setState(prev => ({ ...prev, isPosting: false }));
    }
  }, [navigation]);

  const handlePostAndSave = useCallback(async () => {
    setState(prev => ({ ...prev, isPosting: true, isSaving: true }));
    try {
      // TODO: Implement actual post + save logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Posted to feed and saved as draft!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to post and save');
    } finally {
      setState(prev => ({ ...prev, isPosting: false, isSaving: false }));
    }
  }, [navigation]);

  const handleSendToComposer = useCallback(() => {
    // TODO: Generate shareable link
    Alert.alert(
      'Send to Composer',
      'This will generate a link to continue editing in the Web Composer.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => setShowWebComposerInfo(true) },
      ]
    );
  }, []);

  const handleAddTextOverlay = useCallback(() => {
    setShowAddOverlay(true);
  }, []);

  const handleCreateOverlay = useCallback((text: string) => {
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text,
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      color: '#FFFFFF',
    };
    setState(prev => ({
      ...prev,
      textOverlays: [...prev.textOverlays, newOverlay],
    }));
    setShowAddOverlay(false);
  }, []);

  const handleRemoveOverlay = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      textOverlays: prev.textOverlays.filter(o => o.id !== id),
    }));
  }, []);

  const handleAddActor = useCallback(() => {
    // Placeholder: Show actor selection UI
    Alert.alert('Add Actor', 'Actor selection UI coming soon');
  }, []);

  const handleRemoveActor = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      actors: prev.actors.filter(a => a.id !== id),
    }));
  }, []);

  const isLoading = state.isSaving || state.isPosting;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {draftId ? 'Edit Project' : 'New Project'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Preview Placeholder */}
        <View style={styles.videoPreview}>
          <Ionicons name="videocam-outline" size={48} color={theme.colors.mutedText} />
          <Text style={styles.videoPreviewText}>Video preview</Text>
        </View>

        {/* Caption Field */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            value={state.caption}
            onChangeText={(caption) => setState(prev => ({ ...prev, caption }))}
            placeholder="Write a caption for your video..."
            placeholderTextColor={theme.colors.mutedText}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {state.caption.length} / 500
          </Text>
        </View>

        {/* Text Overlays */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Text Overlays</Text>
            <Text style={styles.sectionSubtext}>Max 2</Text>
          </View>

          {state.textOverlays.length === 0 ? (
            <Text style={styles.emptyText}>No text overlays added</Text>
          ) : (
            <View style={styles.overlaysList}>
              {state.textOverlays.map((overlay, index) => (
                <View key={overlay.id} style={styles.overlayItem}>
                  <View style={styles.overlayInfo}>
                    <Text style={styles.overlayIndex}>#{index + 1}</Text>
                    <Text style={styles.overlayText} numberOfLines={1}>
                      {overlay.text}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveOverlay(overlay.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={20} color="#ec4899" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {state.textOverlays.length < 2 && (
            <Pressable
              style={styles.addButton}
              onPress={handleAddTextOverlay}
            >
              <Ionicons name="add" size={18} color="#8b5cf6" />
              <Text style={styles.addButtonText}>Add Text Overlay</Text>
            </Pressable>
          )}
        </View>

        {/* Producer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Producer</Text>
          <View style={styles.personCard}>
            <Image
              source={getAvatarSource(producer.avatarUrl)}
              style={styles.personAvatar}
            />
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{producer.displayName}</Text>
              <Text style={styles.personUsername}>@{producer.username}</Text>
            </View>
          </View>
        </View>

        {/* Actors */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Actors</Text>
          
          {state.actors.length === 0 ? (
            <Text style={styles.emptyText}>No actors added</Text>
          ) : (
            <View style={styles.actorsList}>
              {state.actors.map((actor) => (
                <View key={actor.id} style={styles.personCard}>
                  <Image
                    source={getAvatarSource(actor.avatarUrl)}
                    style={styles.personAvatar}
                  />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{actor.displayName || actor.username}</Text>
                    <Text style={styles.personUsername}>@{actor.username}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveActor(actor.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={20} color="#ec4899" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={styles.addButton}
            onPress={handleAddActor}
          >
            <Ionicons name="add" size={18} color="#8b5cf6" />
            <Text style={styles.addButtonText}>Add Actor</Text>
          </Pressable>
        </View>

        {/* Web Composer CTA */}
        <View style={styles.webComposerCTA}>
          <View style={styles.webComposerIcon}>
            <Ionicons name="desktop-outline" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.webComposerText}>
            <Text style={styles.webComposerTitle}>Advanced Editing</Text>
            <Text style={styles.webComposerSubtext}>
              Mobile edits are basic. Use Web Composer for advanced features.
            </Text>
          </View>
          <Pressable
            style={styles.webComposerButton}
            onPress={() => setShowWebComposerInfo(true)}
          >
            <Text style={styles.webComposerButtonText}>Open</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {state.isSaving ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#8b5cf6" />
              <Text style={styles.actionButtonTextSecondary}>Save</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handlePost}
          disabled={isLoading}
        >
          {state.isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonTextPrimary}>Post</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handlePostAndSave}
          disabled={isLoading}
        >
          {state.isPosting && state.isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonTextPrimary}>Post + Save</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleSendToComposer}
          disabled={isLoading}
        >
          <Ionicons name="share-outline" size={20} color="#8b5cf6" />
          <Text style={styles.actionButtonTextSecondary}>Send to Composer</Text>
        </Pressable>
      </View>

      {/* Add Text Overlay Modal */}
      <AddOverlayModal
        visible={showAddOverlay}
        onClose={() => setShowAddOverlay(false)}
        onCreate={handleCreateOverlay}
        theme={theme}
      />

      {/* Web Composer Info Modal */}
      <WebComposerInfoModal
        visible={showWebComposerInfo}
        onClose={() => setShowWebComposerInfo(false)}
        theme={theme}
      />
    </View>
  );
}

// Add Text Overlay Modal
interface AddOverlayModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (text: string) => void;
  theme: ThemeDefinition;
}

function AddOverlayModal({ visible, onClose, onCreate, theme }: AddOverlayModalProps) {
  const [text, setText] = useState('');
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const handleCreate = () => {
    if (text.trim()) {
      onCreate(text.trim());
      setText('');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Add Text Overlay</Text>
          <TextInput
            style={styles.modalInput}
            value={text}
            onChangeText={setText}
            placeholder="Enter text..."
            placeholderTextColor={theme.colors.mutedText}
            autoFocus
            maxLength={50}
          />
          <Text style={styles.modalCharCount}>{text.length} / 50</Text>
          
          <View style={styles.modalActions}>
            <Pressable style={styles.modalButtonSecondary} onPress={onClose}>
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButtonPrimary,
                !text.trim() && styles.modalButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!text.trim()}
            >
              <Text style={styles.modalButtonTextPrimary}>Add</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Web Composer Info Modal
interface WebComposerInfoModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeDefinition;
}

function WebComposerInfoModal({ visible, onClose, theme }: WebComposerInfoModalProps) {
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const handleCopyLink = () => {
    // TODO: Implement actual link generation and copy
    Alert.alert('Link Copied', 'Project link copied to clipboard');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalIcon}>
            <Ionicons name="desktop-outline" size={32} color="#8b5cf6" />
          </View>
          
          <Text style={styles.modalTitle}>Continue on Web</Text>
          <Text style={styles.modalText}>
            Open this project on your desktop for advanced editing features:
          </Text>
          
          <View style={styles.featuresList}>
            <FeatureItem icon="film-outline" text="Advanced video editing" theme={theme} />
            <FeatureItem icon="color-palette-outline" text="More effects & filters" theme={theme} />
            <FeatureItem icon="text-outline" text="Unlimited text overlays" theme={theme} />
            <FeatureItem icon="layers-outline" text="Multi-track editing" theme={theme} />
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButtonPrimary, { flex: 1 }]}
              onPress={handleCopyLink}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.modalButtonTextPrimary}>Copy Link</Text>
            </Pressable>
          </View>

          <Pressable style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={48} color={theme.colors.mutedText} />
            <Text style={styles.qrText}>QR Code Placeholder</Text>
          </Pressable>

          <Pressable onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FeatureItem({ icon, text, theme }: { icon: keyof typeof Ionicons.glyphMap; text: string; theme: ThemeDefinition }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={16} color="#8b5cf6" />
      <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>{text}</Text>
    </View>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.cardSurface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 24,
    },
    videoPreview: {
      height: 200,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    videoPreviewText: {
      fontSize: 14,
      color: theme.colors.mutedText,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    sectionSubtext: {
      fontSize: 12,
      color: theme.colors.mutedText,
    },
    captionInput: {
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: theme.colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: 12,
      color: theme.colors.mutedText,
      textAlign: 'right',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.mutedText,
      textAlign: 'center',
      paddingVertical: 16,
    },
    overlaysList: {
      gap: 8,
    },
    overlayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
    },
    overlayInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    overlayIndex: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.mutedText,
    },
    overlayText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: '#8b5cf6',
      borderRadius: 8,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8b5cf6',
    },
    personCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
    },
    personAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#8b5cf6',
    },
    personInfo: {
      flex: 1,
    },
    personName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    personUsername: {
      fontSize: 12,
      color: theme.colors.mutedText,
    },
    actorsList: {
      gap: 8,
    },
    webComposerCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: '#8b5cf6',
      borderRadius: 12,
    },
    webComposerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    webComposerText: {
      flex: 1,
      gap: 2,
    },
    webComposerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    webComposerSubtext: {
      fontSize: 12,
      color: theme.colors.mutedText,
      lineHeight: 16,
    },
    webComposerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#8b5cf6',
      borderRadius: 8,
    },
    webComposerButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
      backgroundColor: theme.colors.cardSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flex: 1,
      minWidth: '45%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    actionButtonPrimary: {
      backgroundColor: '#8b5cf6',
    },
    actionButtonSecondary: {
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: '#8b5cf6',
    },
    actionButtonTextPrimary: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    actionButtonTextSecondary: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8b5cf6',
    },
  });
}

function createModalStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.menuBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    modalText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    modalInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: theme.colors.text,
    },
    modalCharCount: {
      fontSize: 12,
      color: theme.colors.mutedText,
      textAlign: 'right',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButtonPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: '#8b5cf6',
      borderRadius: 8,
    },
    modalButtonSecondary: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    modalButtonTextPrimary: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    modalButtonTextSecondary: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    featuresList: {
      gap: 12,
      paddingVertical: 8,
    },
    qrPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderStyle: 'dashed',
      gap: 8,
    },
    qrText: {
      fontSize: 12,
      color: theme.colors.mutedText,
    },
    closeText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8b5cf6',
      textAlign: 'center',
    },
  });
}

