import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const TAB_BAR_SAFE_PADDING = 96;

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label }: { label: string }) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
      <Text style={styles.outlineButtonText}>{label}</Text>
    </Pressable>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function IconPill({ iconName, label }: { iconName: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.iconPill}>
      <Ionicons name={iconName} size={14} color="#FFFFFF" />
      <Text style={styles.iconPillText}>{label}</Text>
    </View>
  );
}

function SquareTile({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.squareTile}>
      <View style={styles.squareTileBadgeRow}>
        <Pill label="NEW" />
      </View>
      <View style={styles.squareTileBody}>
        <Text numberOfLines={2} style={styles.squareTileTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.squareTileSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  iconColor,
  label,
  overline,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label: string;
  overline?: string;
}) {
  return (
    <View style={styles.quickAction}>
      {overline ? <Text style={styles.quickActionOverline}>{overline}</Text> : null}
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_SAFE_PADDING }]}
        showsVerticalScrollIndicator={false}
      >
        {/* MLL PRO Hero */}
        <View style={styles.container}>
          <Card>
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroTitle}>MLL PRO is where top streamers build real communities.</Text>
              <View style={styles.heroBadgePlaceholder}>
                <Text style={styles.heroBadgePlaceholderText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.heroBody}>
              Get recognized across the app, featured placement when live, and help grow the platform by bringing your
              community with you. No contracts. No quotas. Just quality + intent.
            </Text>
            <View style={styles.heroButtonsRow}>
              <PrimaryButton label="Apply for MLL PRO" />
              <OutlineButton label="What is MLL PRO?" />
            </View>
          </Card>
        </View>

        {/* Section 1: Teams Banner */}
        <View style={styles.container}>
          <Card>
            <View style={styles.teamsHeaderRow}>
              <View style={styles.teamsTitleRow}>
                <Text style={styles.teamsTitle}>TEAMS</Text>
                <IconPill iconName="sparkles" label="New" />
              </View>
              <Text style={styles.teamsTagline}>My Team. My People. My Community.</Text>
              <Text style={styles.teamsSubtext}>
                Create communities around shared ideas. Chat, posts, lives, group gifting.
              </Text>
            </View>

            <View style={styles.teamsButtonsRow}>
              <PrimaryButton label="Create a Team" />
              <OutlineButton label="Download App" />
            </View>
          </Card>
        </View>

        {/* New Teams */}
        <View style={styles.container}>
          <Text style={styles.kicker}>New Teams</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            <View style={styles.tileWrap}>
              <SquareTile title="Your Team Here" subtitle="Start something new" />
              <Text style={styles.tileCaption} numberOfLines={1}>
                Your Team Here
              </Text>
            </View>
            <View style={styles.tileWrap}>
              <SquareTile title="New Team" />
              <Text style={styles.tileCaption} numberOfLines={1}>
                New Team
              </Text>
            </View>
            <View style={styles.tileWrap}>
              <SquareTile title="New Team" />
              <Text style={styles.tileCaption} numberOfLines={1}>
                New Team
              </Text>
            </View>
            <View style={styles.tileWrap}>
              <SquareTile title="New Team" />
              <Text style={styles.tileCaption} numberOfLines={1}>
                New Team
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Section 2: Referral Network */}
        <View style={styles.container}>
          <Card>
            <View style={styles.referralBadge}>
              <Ionicons name="people" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.referralTitle}>Build Your Network</Text>
            <Text style={styles.referralBody}>
              Invite friends and grow together. Every referral is tracked, and quality connections matter.
            </Text>
            <View style={styles.referralHintRow}>
              <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.referralHintText}>Top referrers unlock perks 👀</Text>
            </View>

            <PrimaryButton label="Get My Invite Link" />

            <View style={styles.referralGrid}>
              <View style={styles.referralGridItem}>
                <View style={styles.referralGridIcon}>
                  <Ionicons name="trending-up" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.referralGridText}>
                  <Text style={styles.referralGridTitle}>Track Growth</Text>
                  <Text style={styles.referralGridSubtitle}>Real-time analytics</Text>
                </View>
              </View>
              <View style={styles.referralGridItem}>
                <View style={styles.referralGridIcon}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={styles.referralGridText}>
                  <Text style={styles.referralGridTitle}>Earn Rewards</Text>
                  <Text style={styles.referralGridSubtitle}>Quality matters</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Section 2.5: Live Feature Highlight */}
        <View style={styles.container}>
          <Card>
            <Text style={styles.kickerTight}>Live feature</Text>
            <Text style={styles.liveTitle}>Live is happening</Text>
            <Text style={styles.liveBody}>
              Join Live Central to go live together, or start your own Solo Live stream!
            </Text>
            <Text style={styles.liveSubbody}>
              Discover live rooms on LiveTV. Trending and Discovery help streams get seen.
            </Text>

            <View style={styles.liveButtonsRow}>
              <PrimaryButton label="Watch Live" />
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}>
                <Text style={styles.textLinkText}>Go Live in Live Central</Text>
              </Pressable>
            </View>

            <View style={styles.liveMiniCard}>
              <View style={styles.liveMiniCardHeader}>
                <View style={styles.liveMiniCardHeaderLeft}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveMiniCardHeaderTitle}>Live Central</Text>
                </View>
                <Text style={styles.liveMiniCardHeaderRight}>Group room</Text>
              </View>
              <View style={styles.liveVideoPlaceholder}>
                <Text style={styles.liveVideoPlaceholderText}>livecentral.png</Text>
              </View>
              <View style={styles.liveMiniCardFooter}>
                <View style={styles.liveAvatars}>
                  <View style={styles.liveAvatar} />
                  <View style={styles.liveAvatar} />
                  <View style={styles.liveAvatar} />
                </View>
                <Text style={styles.liveMiniCardFooterText}>Rooms are filling up</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Section 3: What you can do right now */}
        <View style={styles.container}>
          <Card>
            <Text style={styles.kickerCenter}>What you can do right now</Text>

            <View style={styles.quickRow}>
              <QuickAction icon="logo-usd" iconColor="#FBBF24" label="Buy coins" />

              <View style={styles.quickGroup}>
                <QuickAction icon="gift" iconColor="#EC4899" label="Posts" overline="Gift" />
                <QuickAction icon="chatbubble-ellipses" iconColor="#A855F7" label="Comments" overline="Gift" />
                <QuickAction icon="mail" iconColor="#60A5FA" label="Messages" overline="Gift" />
                <QuickAction icon="musical-notes" iconColor="#34D399" label="Music" overline="Gift" />
              </View>

              <QuickAction icon="trending-up" iconColor="#A855F7" label="Gifter level" />
              <QuickAction icon="trophy" iconColor="#F59E0B" label="Rise board" />
            </View>

            <View style={styles.quickRow}>
              <QuickAction icon="gift" iconColor="#F472B6" label="Get gifted" />
              <QuickAction icon="diamond" iconColor="#22D3EE" label="Diamonds" />
              <QuickAction icon="trophy" iconColor="#F59E0B" label="Rise board" />

              <View style={styles.quickAction}>
                <View style={styles.cashOutRing}>
                  <Ionicons name="cash" size={20} color="#22C55E" />
                </View>
                <Text style={styles.quickActionLabel}>Cash out</Text>
              </View>

              <Text style={styles.orText}>or</Text>
              <QuickAction icon="logo-usd" iconColor="#FBBF24" label="Convert" />
            </View>
          </Card>
        </View>

        {/* Main Content Section */}
        <View style={styles.container}>
          <Card>
            <SectionTitle>Recommended for You</SectionTitle>
            <View style={styles.placeholderRow}>
              <View style={styles.profilePill} />
              <View style={styles.profilePill} />
              <View style={styles.profilePill} />
              <View style={styles.profilePill} />
            </View>
            <Text style={styles.placeholderHint}>ProfileCarousel placeholder</Text>
          </Card>
        </View>

        <View style={styles.container}>
          <Card>
            <SectionTitle>Coming Soon Rooms</SectionTitle>
            <View style={styles.placeholderRoom}>
              <Text style={styles.placeholderRoomText}>RoomsCarousel placeholder</Text>
            </View>
          </Card>
        </View>

        {/* Quick Actions CTA */}
        <View style={styles.container}>
          <Card>
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <View style={styles.ctaButtonsRow}>
              <PrimaryButton label="Complete Your Profile" />
              <OutlineButton label="Browse Live Streams" />
            </View>
          </Card>
        </View>

        {/* Coming Soon Email Signup */}
        <View style={styles.container}>
          <Card>
            <View style={styles.emailTitleRow}>
              <View style={styles.emailIconCircle}>
                <MaterialCommunityIcons name="cellphone" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.emailTitle}>Mobile app coming soon</Text>
            </View>
            <Text style={styles.emailSubtext}>Drop your email and we’ll notify you when it's live.</Text>

            <View style={styles.emailFormRow}>
              <TextInput
                editable={false}
                placeholder="you@email.com"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.emailInput}
              />
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.notifyButton, pressed && styles.pressed]}>
                <Text style={styles.notifyButtonText}>Notify me</Text>
              </Pressable>
            </View>

            <Text style={styles.emailFinePrint}>No spam. Unsubscribe anytime.</Text>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLinkStrong}>MLL PRO</Text>
            <Text style={styles.footerLink}>Safety &amp; Policies</Text>
          </View>
          <View style={styles.footerLinksWrap}>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLink}>Community Guidelines</Text>
            <Text style={styles.footerLink}>Payments &amp; Virtual Currency Policy</Text>
            <Text style={styles.footerLink}>Fraud &amp; Chargeback Policy</Text>
            <Text style={styles.footerLink}>Creator Earnings &amp; Payout Policy</Text>
            <Text style={styles.footerLink}>Dispute Resolution &amp; Arbitration</Text>
            <Text style={styles.footerLink}>Account Enforcement &amp; Termination Policy</Text>
          </View>
          <Text style={styles.footerCopy}>© 2026 MyLiveLinks. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2A0B4A',
  },
  scrollContent: {
    paddingTop: 12,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 16,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },

  kicker: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  kickerTight: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  kickerCenter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  primaryButton: {
    backgroundColor: '#EC4899',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EC4899',
  },
  iconPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  heroTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroBadgePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgePlaceholderText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  heroButtonsRow: {
    gap: 10,
  },

  teamsHeaderRow: {
    gap: 6,
    marginBottom: 12,
  },
  teamsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  teamsTagline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  teamsSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 16,
  },
  teamsButtonsRow: {
    gap: 10,
  },

  horizontalRow: {
    paddingHorizontal: 4,
    gap: 12,
  },
  tileWrap: {
    width: 120,
  },
  squareTile: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 10,
    justifyContent: 'space-between',
  },
  squareTileBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  squareTileBody: {
    gap: 4,
  },
  squareTileTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  squareTileSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
  },
  tileCaption: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },

  referralBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  referralTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  referralBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  referralHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  referralHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  referralGrid: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    gap: 12,
  },
  referralGridItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  referralGridIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralGridText: {
    flex: 1,
    gap: 2,
  },
  referralGridTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  referralGridSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },

  liveTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  liveBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  liveSubbody: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  liveButtonsRow: {
    gap: 10,
    marginBottom: 14,
  },
  textLink: {
    paddingVertical: 6,
  },
  textLinkText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  liveMiniCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    padding: 14,
    gap: 10,
  },
  liveMiniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveMiniCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#EF4444',
  },
  liveMiniCardHeaderTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  liveMiniCardHeaderRight: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
  },
  liveVideoPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveVideoPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '800',
  },
  liveMiniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveAvatars: {
    flexDirection: 'row',
    gap: 6,
  },
  liveAvatar: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  liveMiniCardFooterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '800',
  },

  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  quickGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  quickAction: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 64,
    gap: 2,
  },
  quickActionOverline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickActionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  cashOutRing: {
    width: 32,
    height: 32,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 4,
  },

  placeholderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profilePill: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  placeholderHint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderRoom: {
    height: 120,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderRoomText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '800',
  },

  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaButtonsRow: {
    gap: 10,
  },

  emailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  emailTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  emailSubtext: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  emailFormRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  notifyButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FF5AAE',
    minWidth: 98,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  emailFinePrint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  footer: {
    marginTop: 6,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  footerLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  footerLinksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  footerLinkStrong: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '900',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '700',
  },
  footerCopy: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
});

