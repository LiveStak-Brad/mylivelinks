/**
 * CLIP COMPLETION ACTIONS - INTEGRATION EXAMPLE
 * 
 * This file shows how to integrate ClipCompletionActions
 * into any screen where video/clip recording completes.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClipCompletionActions } from '../components/ClipCompletionActions';

/**
 * EXAMPLE 1: Basic Integration (Default Behavior)
 * 
 * Just render the component and it will handle everything with placeholders.
 * "Send to Composer" will auto-navigate to ComposerEditor.
 */
export function ClipResultScreenBasic() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your clip is ready!</Text>
      
      {/* Clip preview here */}
      
      <ClipCompletionActions />
    </View>
  );
}

/**
 * EXAMPLE 2: Custom Handlers
 * 
 * Provide your own handlers for each action.
 */
export function ClipResultScreenCustom() {
  const [clipData] = useState({
    clipId: 'clip_123',
    videoUrl: 'https://...',
    thumbnailUrl: 'https://...',
    duration: 45,
  });

  const handlePostToFeed = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/feed/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: clipData.videoUrl,
          thumbnailUrl: clipData.thumbnailUrl,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Posted to feed!');
      } else {
        throw new Error('Failed to post');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post to feed');
    }
  };

  const handleSave = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/clips/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: clipData.clipId }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Clip saved!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save clip');
    }
  };

  const handlePostAndSave = async () => {
    try {
      // Execute both actions
      await handlePostToFeed();
      await handleSave();
      Alert.alert('Success', 'Posted and saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to post and save');
    }
  };

  const handleSendToComposer = async () => {
    // Optional: You can provide custom logic here
    // If not provided, it will auto-navigate to ComposerEditor
    Alert.alert('Info', 'Opening composer with your clip...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your clip is ready!</Text>
      
      {/* Clip preview here */}
      
      <ClipCompletionActions
        clipId={clipData.clipId}
        clipData={clipData}
        onPostToFeed={handlePostToFeed}
        onSave={handleSave}
        onPostAndSave={handlePostAndSave}
        onSendToComposer={handleSendToComposer}
      />
    </View>
  );
}

/**
 * EXAMPLE 3: In a Modal
 * 
 * Show ClipCompletionActions in a modal after recording.
 */
export function ClipResultModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        
        <Text style={styles.modalTitle}>Clip Ready!</Text>
        
        {/* Video preview */}
        
        <ClipCompletionActions
          onPostToFeed={async () => {
            // Handle post
            onClose(); // Close modal after action
          }}
          onSave={async () => {
            // Handle save
            onClose();
          }}
          onPostAndSave={async () => {
            // Handle both
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

/**
 * WHERE TO USE:
 * 
 * 1. After video recording completes
 * 2. After clip trimming/editing
 * 3. In video result modals
 * 4. After live stream clip capture
 * 5. After video upload completes
 * 6. Any screen showing a completed video/clip
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
});

