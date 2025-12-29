/**
 * ApplyForRoomScreen - In-App Room Application
 * 
 * DESIGN:
 * - Full-screen form UI (no web redirect)
 * - Form fields for room application
 * - Submit button disabled with "Coming Soon" notice
 * - Opaque background (theme-aware)
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PageShell } from '../components/ui/PageShell';
import { PageHeader } from '../components/ui/PageHeader';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

export function ApplyForRoomScreen() {
  const navigation = useNavigation();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [formData, setFormData] = useState({
    roomName: '',
    description: '',
    category: '',
    experience: '',
    hasEquipment: false,
    agreeToTerms: false,
  });

  const handleSubmit = () => {
    // Placeholder: Backend integration coming soon
    // This button is disabled, but we keep the handler for future use
  };

  const isFormValid =
    formData.roomName.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.category.trim().length > 0 &&
    formData.agreeToTerms;

  return (
    <PageShell>
      <PageHeader icon="document-text" iconColor="#3b82f6" title="Apply for a Room" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Coming Soon Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Application Form Coming Soon</Text>
            <Text style={styles.noticeText}>
              We're building the in-app room application system. For now, please visit our website
              to apply for a room.
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Room Application Requirements</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.infoText}>Active account in good standing</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.infoText}>Unique room concept or content idea</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.infoText}>Streaming equipment (camera, microphone)</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.infoText}>Commitment to community guidelines</Text>
          </View>
        </View>

        {/* Form Preview (Disabled) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Application Form Preview</Text>

          {/* Room Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Room Name *</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder="e.g., Music Lounge, Gaming Hub"
              placeholderTextColor={theme.colors.mutedText}
              value={formData.roomName}
              onChangeText={(text) => setFormData({ ...formData, roomName: text })}
              editable={false}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Room Description *</Text>
            <TextInput
              style={[styles.textArea, styles.inputDisabled]}
              placeholder="Describe what makes your room unique..."
              placeholderTextColor={theme.colors.mutedText}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              editable={false}
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Content Category *</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder="e.g., Music, Gaming, Talk Show"
              placeholderTextColor={theme.colors.mutedText}
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
              editable={false}
            />
          </View>

          {/* Experience */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Streaming Experience</Text>
            <TextInput
              style={[styles.textArea, styles.inputDisabled]}
              placeholder="Tell us about your streaming or content creation experience..."
              placeholderTextColor={theme.colors.mutedText}
              value={formData.experience}
              onChangeText={(text) => setFormData({ ...formData, experience: text })}
              multiline
              numberOfLines={3}
              editable={false}
            />
          </View>

          {/* Equipment Toggle */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>I have streaming equipment</Text>
              <Switch
                value={formData.hasEquipment}
                onValueChange={(value) => setFormData({ ...formData, hasEquipment: value })}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor="#fff"
                disabled={true}
              />
            </View>
          </View>

          {/* Terms Toggle */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>I agree to the Terms of Service *</Text>
              <Switch
                value={formData.agreeToTerms}
                onValueChange={(value) => setFormData({ ...formData, agreeToTerms: value })}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor="#fff"
                disabled={true}
              />
            </View>
          </View>

          {/* Submit Button (Disabled) */}
          <Pressable style={[styles.submitButton, styles.submitButtonDisabled]} disabled={true}>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Application (Coming Soon)</Text>
          </Pressable>

          {/* Help Text */}
          <Text style={styles.helpText}>
            This form is a preview. Once enabled, your application will be reviewed by our team
            within 2-3 business days.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>
            Contact us at support@mylivelinks.com for more information about room applications.
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      margin: 16,
      padding: 16,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#3b82f6',
    },
    noticeContent: {
      flex: 1,
    },
    noticeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    noticeText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    infoSection: {
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 16,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    formSection: {
      marginHorizontal: 16,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    textArea: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: 16,
      color: theme.colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputDisabled: {
      opacity: 0.5,
      backgroundColor: theme.colors.cardAlt,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.5,
      backgroundColor: theme.colors.border,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 18,
    },
    contactSection: {
      marginHorizontal: 16,
      marginBottom: 32,
      padding: 16,
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    contactText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });
}


