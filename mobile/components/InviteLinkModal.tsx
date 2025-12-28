/**
 * InviteLinkModal Component - Mobile
 * 
 * WEB PARITY: components/InviteLinkModal.tsx
 * Shows user's unique referral link with copy and share functionality
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useThemeMode, ThemeDefinition } from '../contexts/ThemeContext';

interface InviteLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteLinkModal({ visible, onClose }: InviteLinkModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string>('https://mylivelinks.com/join');

  useEffect(() => {
    if (visible) {
      loadReferralCode();
    }
  }, [visible]);

  const loadReferralCode = async () => {
    setLoading(true);
    try {
      if (!supabaseConfigured) {
        setReferralCode(null);
        setInviteUrl('https://mylivelinks.com/join');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        const uname = typeof (profile as any)?.username === 'string' ? String((profile as any).username).trim() : '';
        if (uname) {
          setInviteUrl(`https://mylivelinks.com/invite/${encodeURIComponent(uname)}`);
        }

        // Prefer DB-backed referral codes (stable + unique)
        const { data: referralData, error: referralErr } = await supabase.rpc('get_or_create_referral_code');
        const row = Array.isArray(referralData) ? referralData[0] : referralData;
        const code = typeof (row as any)?.code === 'string' ? String((row as any).code).trim() : '';
        if (!referralErr && code) {
          setReferralCode(code);
          if (!uname) {
            setInviteUrl(`https://mylivelinks.com/join?ref=${encodeURIComponent(code)}`);
          }
          return;
        }

        if (!uname) {
          setReferralCode(null);
          setInviteUrl('https://mylivelinks.com/join');
        }
        return;
      } else {
        setReferralCode(null);
        setInviteUrl('https://mylivelinks.com/join');
      }
    } catch (error) {
      console.error('Failed to load referral code:', error);
      setReferralCode(null);
      setInviteUrl('https://mylivelinks.com/join');
    } finally {
      setLoading(false);
    }
  };

  // inviteUrl is set during loadReferralCode; default is /join.

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy:', error);
      Alert.alert('Error', 'Failed to copy link. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: 'Join MyLiveLinks - Live Streaming Platform',
        message: `Join me on MyLiveLinks! Live streaming, exclusive content, and real connections. Sign up with my link and get started! 🚀\n\n${inviteUrl}`,
        url: inviteUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Error', error.message || 'Failed to share link.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />

        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>🔗</Text>
              </View>
              <Text style={styles.headerTitle}>Your Invite Link</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Explainer Section */}
            <View style={styles.explainerCard}>
              <View style={styles.explainerIconContainer}>
                <Text style={styles.explainerIcon}>📈</Text>
              </View>
              <View style={styles.explainerContent}>
                <Text style={styles.explainerTitle}>Grow Your Network</Text>
                <Text style={styles.explainerText}>
                  Share your unique invite link to bring quality members to MyLiveLinks. 
                  Every signup and their activity is tracked to your referral.
                </Text>
              </View>
            </View>

            {/* Link Display */}
            {loading ? (
              <View style={styles.linkCard}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : (
              <View style={styles.linkCard}>
                <View style={styles.linkHeader}>
                  <Text style={styles.linkIcon}>🔗</Text>
                  <Text style={styles.linkLabel}>Your Referral Link</Text>
                </View>
                <Text style={styles.linkUrl} numberOfLines={2}>
                  {inviteUrl}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Copy Link Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleCopyLink}
                disabled={loading}
              >
                <Text style={styles.buttonIcon}>{copied ? '✓' : '📋'}</Text>
                <Text style={styles.primaryButtonText}>
                  {copied ? 'Link Copied!' : 'Copy Link'}
                </Text>
              </Pressable>

              {/* Share Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleShare}
                disabled={loading}
              >
                <Text style={styles.buttonIcon}>📤</Text>
                <Text style={styles.secondaryButtonText}>Share</Text>
              </Pressable>
            </View>

            {/* Quality Note */}
            <View style={styles.qualityNote}>
              <Text style={styles.qualityNoteText}>
                <Text style={styles.qualityNoteEmoji}>💎 </Text>
                <Text style={styles.qualityNoteBold}>Quality matters:</Text>
                {' '}Focus on inviting engaged creators and viewers who'll actively participate in the community.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Build your network. Grow together. 🚀
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type Styles = ReturnType<typeof createStyles>;

function createStyles(theme: ThemeDefinition) {
  const isLight = theme.mode === 'light';
  const accent = theme.colors.accent;
  const textPrimary = theme.colors.textPrimary;
  const textSecondary = theme.colors.textSecondary;
  const textMuted = theme.colors.textMuted;

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.menuBackdrop,
      justifyContent: 'flex-end',
    },
    backdropTouchable: {
      flex: 1,
    },
    container: {
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      overflow: 'hidden',
      shadowColor: theme.colors.menuShadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.menuBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isLight ? 'rgba(139, 92, 246, 0.18)' : theme.colors.menuBorder,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 20,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: isLight ? accent : textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      color: textMuted,
      fontWeight: '300',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 20,
    },
    explainerCard: {
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.15)',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.3)',
      flexDirection: 'row',
      gap: 12,
    },
    explainerIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    explainerIcon: {
      fontSize: 20,
    },
    explainerContent: {
      flex: 1,
    },
    explainerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 6,
    },
    explainerText: {
      fontSize: 13,
      lineHeight: 18,
      color: textSecondary,
    },
    linkCard: {
      backgroundColor: isLight ? theme.colors.cardAlt : theme.colors.cardAlt,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 80,
      justifyContent: 'center',
    },
    linkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    linkIcon: {
      fontSize: 14,
    },
    linkLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    linkUrl: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: textPrimary,
      lineHeight: 18,
    },
    buttonsContainer: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: accent,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    secondaryButton: {
      backgroundColor: isLight ? theme.colors.cardAlt : theme.colors.cardAlt,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonPressed: {
      backgroundColor: isLight ? 'rgba(139, 92, 246, 0.1)' : theme.colors.highlight,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonIcon: {
      fontSize: 18,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButtonText: {
      color: textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    qualityNote: {
      backgroundColor: isLight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.15)',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: isLight ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.3)',
    },
    qualityNoteText: {
      fontSize: 12,
      lineHeight: 17,
      color: isLight ? 'rgba(30, 64, 175, 1)' : 'rgba(147, 197, 253, 1)',
    },
    qualityNoteEmoji: {
      fontSize: 12,
    },
    qualityNoteBold: {
      fontWeight: '700',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isLight ? '#F9FAFB' : '#0D1220',
      borderTopWidth: 1,
      borderTopColor: isLight ? 'rgba(139, 92, 246, 0.18)' : theme.colors.menuBorder,
    },
    footerText: {
      fontSize: 12,
      color: textMuted,
      textAlign: 'center',
    },
  });
}




