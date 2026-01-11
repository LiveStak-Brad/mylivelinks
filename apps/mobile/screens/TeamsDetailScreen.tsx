import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TeamsDetailScreen() {
  /**
   * OBSERVATIONS (from existing code):
   * - This screen was a placeholder (`Text` centered).
   * - The Teams area already uses a dark, card-based layout in `TeamsScreen.tsx`.
   *
   * REASONING:
   * - We can replace the placeholder safely (no data dependencies here).
   * - We keep everything UI-only: local tab state, no navigation changes, no APIs.
   * - We mirror the requested web intent/order via tabs: Posts → Members → Rooms → About.
   */
  type TeamTab = 'Posts' | 'Members' | 'Rooms' | 'About';
  const tabs: TeamTab[] = useMemo(() => ['Posts', 'Members', 'Rooms', 'About'], []);
  const [activeTab, setActiveTab] = useState<TeamTab>('Posts');

  const teamName = 'Team Alpha';
  const memberCount = 24;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.banner}>
            <View style={styles.bannerOverlayRow}>
              <View style={styles.bannerPill}>
                <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.bannerPillText}>TEAM</Text>
              </View>
              <View style={styles.bannerPill}>
                <Ionicons name="sparkles-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.bannerPillText}>DETAIL</Text>
              </View>
            </View>
            <View style={styles.bannerHint}>
              <Text style={styles.bannerHintText}>Banner / cover placeholder</Text>
            </View>
          </View>

          <View style={styles.headerBody}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{teamName.slice(0, 1).toUpperCase()}</Text>
            </View>

            <View style={styles.teamMeta}>
              <Text style={styles.teamName}>{teamName}</Text>
              <View style={styles.teamSubRow}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.teamSubText}>{memberCount} members</Text>
                <View style={styles.dot} />
                <Ionicons name="image-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.teamSubText}>Avatar placeholder</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Join team"
              onPress={() => {}}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
            >
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={styles.primaryActionText}>Join</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leave team"
              onPress={() => {}}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.secondaryActionText}>Leave</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Invite members"
              onPress={() => {}}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
            >
              <Ionicons name="person-add-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.secondaryActionText}>Invite</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tabsCard}>
          <View style={styles.tabsRow}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${tab} tab`}
                  onPress={() => setActiveTab(tab)}
                  style={({ pressed }) => [
                    styles.tabButton,
                    active && styles.tabButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === 'Posts' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>POSTS</Text>
              <View style={styles.sectionRightHint}>
                <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.sectionHintText}>Composer placeholder</Text>
              </View>
            </View>

            <View style={styles.placeholderCard}>
              <View style={styles.placeholderTopRow}>
                <View style={styles.placeholderMiniAvatar} />
                <View style={styles.placeholderLines}>
                  <View style={[styles.placeholderLine, { width: '55%' }]} />
                  <View style={[styles.placeholderLine, { width: '35%' }]} />
                </View>
              </View>
              <View style={[styles.placeholderLine, { width: '92%', height: 12, marginTop: 14 }]} />
              <View style={[styles.placeholderLine, { width: '86%', height: 12, marginTop: 10 }]} />
              <View style={styles.placeholderFooterRow}>
                <View style={styles.placeholderChip}>
                  <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>0</Text>
                </View>
                <View style={styles.placeholderChip}>
                  <Ionicons name="heart-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>0</Text>
                </View>
                <View style={styles.placeholderChip}>
                  <Ionicons name="share-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>Share</Text>
                </View>
              </View>
            </View>

            <View style={styles.placeholderCard}>
              <View style={styles.placeholderTopRow}>
                <View style={styles.placeholderMiniAvatar} />
                <View style={styles.placeholderLines}>
                  <View style={[styles.placeholderLine, { width: '48%' }]} />
                  <View style={[styles.placeholderLine, { width: '28%' }]} />
                </View>
              </View>
              <View style={[styles.placeholderLine, { width: '88%', height: 12, marginTop: 14 }]} />
              <View style={[styles.placeholderLine, { width: '70%', height: 12, marginTop: 10 }]} />
              <View style={styles.placeholderFooterRow}>
                <View style={styles.placeholderChip}>
                  <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>0</Text>
                </View>
                <View style={styles.placeholderChip}>
                  <Ionicons name="heart-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>0</Text>
                </View>
                <View style={styles.placeholderChip}>
                  <Ionicons name="share-outline" size={14} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.placeholderChipText}>Share</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Members' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>MEMBERS</Text>
              <View style={styles.sectionRightHint}>
                <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.sectionHintText}>Roles placeholder</Text>
              </View>
            </View>

            {['Owner', 'Moderator', 'Member', 'Member'].map((role, idx) => (
              <View key={`${role}-${idx}`} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{String.fromCharCode(65 + idx)}</Text>
                </View>
                <View style={styles.memberMeta}>
                  <Text style={styles.memberName}>User {idx + 1}</Text>
                  <Text style={styles.memberRole}>{role}</Text>
                </View>
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>{role.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Rooms' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ROOMS</Text>
              <View style={styles.sectionRightHint}>
                <Ionicons name="radio-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.sectionHintText}>Live rooms placeholder</Text>
              </View>
            </View>

            {[
              { title: 'Morning Hangout', status: 'Scheduled', icon: 'calendar-outline' as const },
              { title: 'Battle Practice', status: 'Live', icon: 'flash-outline' as const },
              { title: 'Creator Q&A', status: 'Replay', icon: 'play-outline' as const },
            ].map((room) => (
              <View key={room.title} style={styles.roomCard}>
                <View style={styles.roomLeft}>
                  <View style={styles.roomIcon}>
                    <Ionicons name={room.icon} size={18} color="rgba(255,255,255,0.85)" />
                  </View>
                  <View style={styles.roomMeta}>
                    <Text style={styles.roomTitle}>{room.title}</Text>
                    <Text style={styles.roomStatus}>{room.status}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
              </View>
            ))}
          </View>
        )}

        {activeTab === 'About' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ABOUT</Text>
              <View style={styles.sectionRightHint}>
                <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.sectionHintText}>Team info placeholder</Text>
              </View>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Description</Text>
              <Text style={styles.aboutBody}>
                This is a placeholder description for the Team Detail page. On web, this area explains what the team is about,
                what members do here, and how to participate.
              </Text>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Highlights</Text>
              <View style={styles.aboutBulletRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="rgba(94,234,212,0.95)" />
                <Text style={styles.aboutBulletText}>Posts: share updates and clips</Text>
              </View>
              <View style={styles.aboutBulletRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="rgba(94,234,212,0.95)" />
                <Text style={styles.aboutBulletText}>Members: manage roles and invites</Text>
              </View>
              <View style={styles.aboutBulletRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="rgba(94,234,212,0.95)" />
                <Text style={styles.aboutBulletText}>Rooms: host live sessions and replays</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  pressed: {
    opacity: 0.92,
  },

  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  banner: {
    height: 160,
    backgroundColor: 'rgba(236,72,153,0.28)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    justifyContent: 'space-between',
  },
  bannerOverlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bannerPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.9)',
  },
  bannerHint: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bannerHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  headerBody: {
    padding: 16,
    paddingTop: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  teamMeta: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  teamName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  teamSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  teamSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  actionsRow: {
    padding: 16,
    paddingTop: 0,
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ec4899',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },

  tabsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderColor: 'rgba(236,72,153,0.35)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  tabTextActive: {
    color: '#fff',
  },

  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionRightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  placeholderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  placeholderLines: {
    flex: 1,
    gap: 8,
  },
  placeholderLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  placeholderFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  placeholderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  memberMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  memberBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.8)',
  },

  roomCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  roomStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  aboutCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  aboutBody: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  aboutBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutBulletText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
});
