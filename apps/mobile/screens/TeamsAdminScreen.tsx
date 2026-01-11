import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TeamsAdminScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.headerLabel}>TEAM ADMIN</Text>
          <Text style={styles.headerTitle}>Manage your team</Text>
          <Text style={styles.headerDescription}>
            Members, roles, settings, and moderation tools — streamlined for mobile.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>MEMBERS</Text>
          <Text style={styles.sectionTitle}>People</Text>
          <Text style={styles.sectionDescription}>Review and manage who has access to your team.</Text>

          <View style={styles.tileList}>
            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Member list</Text>
                <Text style={styles.tileSubtitle}>View members and basic details</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Invites</Text>
                <Text style={styles.tileSubtitle}>Create and track team invitations</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Requests</Text>
                <Text style={styles.tileSubtitle}>Approve or decline join requests</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>ROLES</Text>
          <Text style={styles.sectionTitle}>Roles & access</Text>
          <Text style={styles.sectionDescription}>Control what different members can do.</Text>

          <View style={styles.tileList}>
            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Role list</Text>
                <Text style={styles.tileSubtitle}>View roles and who has them</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Permissions</Text>
                <Text style={styles.tileSubtitle}>Configure admin/mod capabilities</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Default role</Text>
                <Text style={styles.tileSubtitle}>Pick the role assigned to new members</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <Text style={styles.sectionTitle}>Team settings</Text>
          <Text style={styles.sectionDescription}>Edit how your team looks and how people join.</Text>

          <View style={styles.tileList}>
            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Profile</Text>
                <Text style={styles.tileSubtitle}>Name, bio, and basic visibility</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Join rules</Text>
                <Text style={styles.tileSubtitle}>Invite-only, approvals, and link access</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Channels & features</Text>
                <Text style={styles.tileSubtitle}>Enable/disable team modules</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, styles.sectionCardWarning]}>
          <Text style={styles.sectionLabel}>MODERATION</Text>
          <Text style={styles.sectionTitle}>Safety</Text>
          <Text style={styles.sectionDescription}>
            Monitor activity and apply enforcement actions when needed.
          </Text>

          <View style={styles.tileList}>
            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Reports</Text>
                <Text style={styles.tileSubtitle}>Review reported members and content</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badgeWarning}>
                  <Text style={styles.badgeWarningText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Bans & timeouts</Text>
                <Text style={styles.tileSubtitle}>Remove or restrict problematic accounts</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badgeWarning}>
                  <Text style={styles.badgeWarningText}>COMING SOON</Text>
                </View>
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>Audit log</Text>
                <Text style={styles.tileSubtitle}>Track important admin actions</Text>
              </View>
              <View style={styles.tileMeta}>
                <View style={styles.badgeWarning}>
                  <Text style={styles.badgeWarningText}>COMING SOON</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Note: Tiles are currently view-only on mobile until subroutes are implemented.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  sectionCardWarning: {
    backgroundColor: 'rgba(244,63,94,0.08)',
    borderColor: 'rgba(244,63,94,0.25)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  sectionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  tileList: {
    marginTop: 6,
    gap: 10,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tileText: {
    flex: 1,
    gap: 4,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  tileSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  tileMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeWarningText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.85)',
  },
  footerNote: {
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  footerNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
});
