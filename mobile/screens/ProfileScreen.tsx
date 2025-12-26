import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, PageShell } from '../components/ui';

/* =============================================================================
   PROFILE SCREEN

   Mobile equivalent of web /[username] page.
   Contains:
   - Global header
   - Profile hero card (avatar, username, follow/message buttons)
   - Sub-navigation tabs: Profile | Feed | Photos
============================================================================= */

type ProfileTab = 'profile' | 'feed' | 'photos';

type ProfileScreenProps = {
  /** Called when user taps back arrow */
  onBack?: () => void;
  /** Called when user taps the Feed tab */
  onFeedTab?: () => void;
  /** Called when user taps the Photos tab */
  onPhotosTab?: () => void;
  /** Called when user taps Follow button */
  onFollow?: () => void;
  /** Called when user taps Message button */
  onMessage?: () => void;
  /** Called when user taps Share button */
  onShare?: () => void;
};

export function ProfileScreen({
  onBack,
  onFeedTab,
  onPhotosTab,
  onFollow,
  onMessage,
  onShare,
}: ProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  const handleTabPress = (tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === 'feed') onFeedTab?.();
    if (tab === 'photos') onPhotosTab?.();
  };

  return (
    <PageShell
      title="Profile"
      left={
        onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : undefined
      }
      right={
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Share profile"
          style={styles.headerButton}
        >
          <Text style={styles.shareIcon}>↗</Text>
        </Pressable>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>U</Text>
            </View>
            {/* Live indicator - hidden by default */}
            {/* <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View> */}
          </View>

          {/* Username & Display Name */}
          <Text style={styles.displayName}>User</Text>
          <Text style={styles.username}>@user</Text>

          {/* Bio placeholder */}
          <Text style={styles.bio}>
            This is a placeholder bio. Check out my links and live streams!
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Button
              title="Follow (Coming Soon)"
              onPress={() => onFollow?.()}
              variant="primary"
              style={styles.actionButton}
              disabled
            />
            <Button
              title="Message (Coming Soon)"
              onPress={() => onMessage?.()}
              variant="secondary"
              style={styles.actionButton}
              disabled
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>
        </View>

        {/* Sub Navigation Tabs - Web-consistent underline style */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => handleTabPress('profile')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'profile' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'profile' && styles.tabLabelActive,
              ]}
            >
              Profile
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
            onPress={() => handleTabPress('feed')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'feed' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'feed' && styles.tabLabelActive,
              ]}
            >
              Feed
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
            onPress={() => handleTabPress('photos')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'photos' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'photos' && styles.tabLabelActive,
              ]}
            >
              Photos
            </Text>
          </Pressable>
        </View>

        {/* Content Area - Profile Tab Content */}
        {activeTab === 'profile' && (
          <View style={styles.contentSection}>
            {/* Links Section Placeholder */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>My Links</Text>
              <View style={styles.linkItem}>
                <View style={styles.linkIcon}>
                  <Text style={styles.linkIconText}>🔗</Text>
                </View>
                <Text style={styles.linkText}>Link placeholder</Text>
              </View>
              <View style={styles.linkItem}>
                <View style={styles.linkIcon}>
                  <Text style={styles.linkIconText}>🌐</Text>
                </View>
                <Text style={styles.linkText}>Another link</Text>
              </View>
            </View>

            {/* Social Media Bar Placeholder */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Social</Text>
              <View style={styles.socialRow}>
                <View style={styles.socialIcon}>
                  <Text style={styles.socialIconText}>📸</Text>
                </View>
                <View style={styles.socialIcon}>
                  <Text style={styles.socialIconText}>🐦</Text>
                </View>
                <View style={styles.socialIcon}>
                  <Text style={styles.socialIconText}>📺</Text>
                </View>
                <View style={styles.socialIcon}>
                  <Text style={styles.socialIconText}>🎵</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Powered By Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by</Text>
          <Text style={styles.footerBrand}>MyLiveLinks</Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  shareIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },

  // Hero Card
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#5E9BFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  displayName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  username: {
    color: '#9aa0a6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bio: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    minWidth: 120,
    minHeight: 48,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Tab Bar - Web-consistent underline style
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 48, // Ensure 48pt touch target
  },
  tabActive: {
    borderBottomColor: '#5E9BFF',
  },
  tabLabel: {
    color: '#9aa0a6',
    fontSize: 15,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#5E9BFF',
  },

  // Content Sections
  contentSection: {
    marginTop: 16,
    gap: 16,
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  // Links
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(94, 155, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconText: {
    fontSize: 16,
  },
  linkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    fontSize: 22,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  footerBrand: {
    color: '#5E9BFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
});

export default ProfileScreen;

