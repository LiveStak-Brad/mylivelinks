import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

type MockPost = {
  id: string;
  authorName: string;
  authorUsername: string;
  timestamp: string;
  content: string;
  hasMedia?: boolean;
  reactionsCount: number;
  viewsCount: number;
};

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Button({
  label,
  variant = 'primary',
  iconName,
}: {
  label: string;
  variant?: 'primary' | 'outline';
  iconName?: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.buttonBase,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonOutline,
        pressed && styles.buttonPressed,
      ]}
    >
      {iconName ? (
        <Feather
          name={iconName}
          size={16}
          color="#FFFFFF"
        />
      ) : null}
      <Text style={variant === 'primary' ? styles.buttonPrimaryText : styles.buttonOutlineText}>
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function FeedPostCard({ post }: { post: MockPost }) {
  const initial = (post.authorName || post.authorUsername || '?').trim().slice(0, 1).toUpperCase();

  return (
    <Card>
      <View style={styles.postHeaderRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial || '•'}</Text>
        </View>

        <View style={styles.postHeaderTextCol}>
          <Text style={styles.postAuthorName}>{post.authorName}</Text>
          <Text style={styles.postTimestamp}>{post.timestamp}</Text>
        </View>

        <Pressable accessibilityRole="button" style={styles.iconButton}>
          <Feather name="more-horizontal" size={18} color={stylesVars.mutedText} />
        </Pressable>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postContent}>{post.content}</Text>
      </View>

      {post.hasMedia ? (
        <View style={styles.mediaPlaceholder}>
          <Feather name="image" size={18} color={stylesVars.mutedText} />
          <Text style={styles.mediaPlaceholderText}>Image</Text>
        </View>
      ) : null}

      <View style={styles.postActionsRow}>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="heart" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Like</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="message-circle" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Comment</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton}>
          <Feather name="gift" size={18} color={stylesVars.mutedText} />
          <Text style={styles.actionButtonText}>Gift</Text>
        </Pressable>
      </View>

      <View style={styles.reactionsRow}>
        <Text style={styles.reactionsText}>{post.reactionsCount} reactions</Text>
        <View style={styles.viewsRow}>
          <Feather name="eye" size={14} color={stylesVars.mutedText} />
          <Text style={styles.viewsText}>{post.viewsCount.toLocaleString()} views</Text>
        </View>
      </View>
    </Card>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();

  const posts = useMemo<MockPost[]>(
    () => [
      {
        id: 'p1',
        authorName: 'Creator Name',
        authorUsername: 'creatorname',
        timestamp: 'Jan 11 • 2:05 PM',
        content:
          'Text-only post. This is a placeholder post for the Public Feed.',
        reactionsCount: 12,
        viewsCount: 1204,
      },
      {
        id: 'p2',
        authorName: 'StreamQueen',
        authorUsername: 'streamqueen',
        timestamp: 'Jan 10 • 9:41 PM',
        content:
          'Post with image placeholder block. Swipe through the community and discover moments from creators across the platform.',
        hasMedia: true,
        reactionsCount: 48,
        viewsCount: 9821,
      },
      {
        id: 'p3',
        authorName: 'Brad',
        authorUsername: 'brad',
        timestamp: 'Jan 9 • 11:18 AM',
        content: 'Actions row placeholder: Like / Comment / Gift.',
        reactionsCount: 3,
        viewsCount: 214,
      },
      {
        id: 'p4',
        authorName: 'NightOwl',
        authorUsername: 'nightowl',
        timestamp: 'Jan 8 • 6:32 PM',
        content:
          'Another text post. Buttons can be present but inert—UI only.',
        reactionsCount: 0,
        viewsCount: 89,
      },
      {
        id: 'p5',
        authorName: 'Ava',
        authorUsername: 'ava',
        timestamp: 'Jan 7 • 1:09 PM',
        content:
          'Post with image placeholder. Keep typography and spacing consistent with the web feed layout.',
        hasMedia: true,
        reactionsCount: 22,
        viewsCount: 3310,
      },
      {
        id: 'p6',
        authorName: 'Leo',
        authorUsername: 'leo',
        timestamp: 'Jan 6 • 8:27 AM',
        content:
          'Discover posts from the community — mobile-native card layout.',
        reactionsCount: 7,
        viewsCount: 640,
      },
    ],
    []
  );

  const bottomGuard = insets.bottom + 88;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomGuard }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header (web: /feed) */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTitleRow}>
              <Feather name="rss" size={18} color={stylesVars.primary} />
              <Text style={styles.pageTitle}>Public Feed</Text>
            </View>
            <Text style={styles.pageSubtitle}>Discover posts from the community</Text>
          </View>

          {/* MLL PRO hero (web: components/mll-pro/MllProHero.tsx) */}
          <Card style={styles.proHeroCard}>
            <View style={styles.proHeroRow}>
              <View style={styles.proHeroTextCol}>
                <Text style={styles.proHeroTitle}>
                  MLL PRO is where top streamers build real communities.
                </Text>
                <Text style={styles.proHeroBody}>
                  Get recognized across the app, featured placement when live, and help grow the
                  platform by bringing your community with you. No contracts. No quotas. Just quality
                  + intent.
                </Text>
                <View style={styles.proHeroButtonsRow}>
                  <Button label="Apply for MLL PRO" variant="primary" />
                  <Button label="What is MLL PRO?" variant="outline" />
                </View>
              </View>
              <View style={styles.proBadgePlaceholder} accessibilityLabel="MLL PRO Badge">
                <MaterialCommunityIcons name="shield-star" size={26} color="#FFFFFF" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
          </Card>

          {/* Link or Nah promo (web: components/link/LinkOrNahPromoCard.tsx) */}
          <Card style={styles.linkOrNahCard}>
            <View style={styles.linkOrNahTopRow}>
              <Pressable accessibilityRole="button" style={styles.linkOrNahDismiss}>
                <Feather name="x" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.linkOrNahRow}>
              <View style={styles.linkOrNahIconCol}>
                <View style={styles.linkOrNahSparkleBadge}>
                  <MaterialCommunityIcons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.linkOrNahIconBox}>
                  <MaterialCommunityIcons name="link-variant" size={22} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.linkOrNahTextCol}>
                <Text style={styles.linkOrNahTitle}>Link or Nah</Text>
                <Text style={styles.linkOrNahBody}>Swipe to connect. Mutual links only. No DMs.</Text>
                <View style={styles.linkOrNahCtaRow}>
                  <Button label="Try It" variant="primary" iconName="arrow-right" />
                  <Text style={styles.linkOrNahMicroCopy}>No messages unless you both link</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Feed composer (mobile placeholder mirroring web copy) */}
          <Card>
            <Text style={styles.cardSectionTitle}>Create a post</Text>

            <View style={styles.composerRow}>
              <View style={styles.composerAvatar}>
                <Text style={styles.composerAvatarText}>✦</Text>
              </View>
              <View style={styles.composerInput}>
                <Text style={styles.composerPlaceholder}>Share something with the community...</Text>
                <Feather name="lock" size={16} color={stylesVars.mutedText} />
              </View>
            </View>

            <Divider />

            <View style={styles.composerActionsRow} accessibilityRole="tablist">
              <View style={styles.composerAction}>
                <Feather name="image" size={18} color={stylesVars.mutedText} />
                <Text style={styles.composerActionText}>Photo</Text>
              </View>
              <View style={styles.composerAction}>
                <Feather name="video" size={18} color={stylesVars.mutedText} />
                <Text style={styles.composerActionText}>Video</Text>
              </View>
              <View style={styles.composerAction}>
                <Feather name="smile" size={18} color={stylesVars.mutedText} />
                <Text style={styles.composerActionText}>Feeling</Text>
              </View>
            </View>

            <View style={styles.comingSoonRow} accessibilityRole="text">
              <View style={styles.comingSoonChip}>
                <MaterialCommunityIcons name="sparkles" size={14} color={stylesVars.primary} />
                <Text style={styles.comingSoonText}>Post creation coming soon</Text>
              </View>
            </View>
          </Card>

          {/* Feed list (static mock items) */}
          <View style={styles.feedList}>
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
  primary: '#4F46E5',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  scrollContent: {
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  pageHeader: {
    marginBottom: 10,
  },
  pageHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: stylesVars.text,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: stylesVars.mutedText,
    marginLeft: 26,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 12,
  },

  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonPrimary: {
    backgroundColor: '#EC4899',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonOutlineText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },

  proHeroCard: {
    backgroundColor: '#2E1065',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  proHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  proHeroTextCol: {
    flex: 1,
    gap: 10,
  },
  proHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  proHeroBody: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
  },
  proHeroButtonsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 2,
  },
  proBadgePlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  linkOrNahCard: {
    backgroundColor: '#4F46E5',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  linkOrNahTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  linkOrNahDismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkOrNahRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  linkOrNahIconCol: {
    width: 64,
  },
  linkOrNahIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkOrNahSparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginBottom: -10,
    zIndex: 1,
  },
  linkOrNahTextCol: {
    flex: 1,
    gap: 8,
  },
  linkOrNahTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  linkOrNahBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  linkOrNahCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  linkOrNahMicroCopy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: stylesVars.text,
    marginBottom: 10,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: stylesVars.primary,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  composerPlaceholder: {
    flex: 1,
    color: stylesVars.mutedText,
    fontSize: 14,
  },
  composerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  composerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  composerActionText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },
  comingSoonRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  comingSoonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  comingSoonText: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: '700',
  },

  feedList: {
    marginTop: 2,
  },

  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    color: stylesVars.mutedText,
  },
  postHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '800',
    color: stylesVars.text,
  },
  postTimestamp: {
    fontSize: 12,
    color: stylesVars.mutedText,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: {
    paddingBottom: 10,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.text,
  },
  mediaPlaceholder: {
    height: 180,
    borderRadius: 14,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mediaPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },
  reactionsRow: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewsText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
});

