import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OAuthConsentScreen() {
  const appName = 'Third-Party Application';
  const userEmail = 'user@example.com';
  const scope = 'basic';

  const handleDeny = () => {
    console.log('User denied consent');
  };

  const handleApprove = () => {
    console.log('User approved consent');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>ML</Text>
              </View>
            </View>
            <Text style={styles.title}>Authorize {appName}</Text>
            <Text style={styles.description}>
              Approve access so this app can use your MyLiveLinks account.
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.userSection}>
              <Text style={styles.sectionLabel}>Signed in as</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <Text style={styles.userHint}>
                If this is not you, please sign out and sign back in with the correct account.
              </Text>
            </View>

            <View style={styles.scopeSection}>
              <View style={styles.scopeHeader}>
                <Text style={styles.scopeLabel}>Requested scopes</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{scope}</Text>
                </View>
              </View>
              <View style={styles.permissionList}>
                <View style={styles.permissionItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.permissionText}>View your profile basics.</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.permissionText}>Update account data you explicitly allow.</Text>
                </View>
                <View style={styles.permissionItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.permissionText}>Act on your behalf within granted scopes.</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.denyButton} onPress={handleDeny}>
                <Text style={styles.denyButtonText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
                <Text style={styles.approveButtonText}>Approve & Continue</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>
              We never share your password. You can revoke access at any time in your account security settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 24,
  },
  userSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  userHint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  scopeSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  permissionList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    lineHeight: 20,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  approveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
});
