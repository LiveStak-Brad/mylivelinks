import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const stylesVars = {
  pageBg: '#F8FAFC', // web: bg-muted/30
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0F172A',
  mutedText: '#64748B',
  mutedBg: '#F1F5F9',
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function ChevronRow({
  iconName,
  title,
  subtitle,
  rightText,
  disabled,
}: {
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  rightText?: string;
  disabled?: boolean;
}) {
  const isDisabled = !!disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={() => {
        // UI only — navigation is visual only (no wiring changes)
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && !isDisabled ? styles.rowPressed : null,
        isDisabled ? styles.rowDisabled : null,
      ]}
    >
      <View style={styles.rowLeft}>
        {iconName ? (
          <View style={styles.rowIcon}>
            <Ionicons name={iconName} size={18} color={stylesVars.text} />
          </View>
        ) : null}

        <View style={styles.rowTextCol}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rowRight}>
        {rightText ? <Text style={styles.rowRightText}>{rightText}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={stylesVars.mutedText} />
      </View>
    </Pressable>
  );
}

function ProviderRow({
  provider,
  status = 'Not connected',
  leftIcon,
  badgeBg,
  badgeBorderColor,
  badgeIconColor,
}: {
  provider: 'Apple' | 'Google' | 'Facebook' | 'Twitch';
  status?: string;
  leftIcon: React.ComponentProps<typeof Ionicons>['name'];
  badgeBg: string;
  badgeBorderColor?: string;
  badgeIconColor: string;
}) {
  return (
    <View style={styles.providerRow}>
      <View style={styles.providerLeft}>
        <View
          style={[
            styles.providerBadge,
            {
              backgroundColor: badgeBg,
              borderColor: badgeBorderColor ?? 'transparent',
              borderWidth: badgeBorderColor ? StyleSheet.hairlineWidth : 0,
            },
          ]}
        >
          <Ionicons name={leftIcon} size={18} color={badgeIconColor} />
        </View>

        <View style={styles.providerTextCol}>
          <Text style={styles.providerName}>{provider}</Text>
          <Text style={styles.providerStatus}>{status}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Connect ${provider}`}
        onPress={() => {
          // UI only — no auth / no linking
        }}
        style={({ pressed }) => [styles.connectButton, pressed ? styles.connectButtonPressed : null]}
      >
        <Ionicons name="link" size={14} color={stylesVars.text} />
        <Text style={styles.connectButtonText}>Connect</Text>
      </Pressable>
    </View>
  );
}

export default function SettingsAccountScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Page header (web: Account & Security) */}
          <View style={styles.pageHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to profile settings"
              onPress={() => {
                // UI only — do not change nav wiring
              }}
              style={({ pressed }) => [styles.backLink, pressed ? styles.backLinkPressed : null]}
            >
              <Ionicons name="chevron-back" size={18} color={stylesVars.mutedText} />
              <Text style={styles.backLinkText}>Back to profile settings</Text>
            </Pressable>

            <View style={styles.pageTitleRow}>
              <View style={styles.pageTitleIcon}>
                <Ionicons name="shield-checkmark" size={18} color={stylesVars.text} />
              </View>
              <Text style={styles.pageTitle}>Account &amp; Security</Text>
            </View>
            <Text style={styles.pageSubtitle}>Update your login email and password.</Text>
          </View>

          <SectionCard
            title="Connected Accounts"
            description="Link your social accounts for easier sign-in"
          >
            <View style={styles.providersList}>
              <ProviderRow provider="Apple" leftIcon="logo-apple" badgeBg="#0B0B0E" badgeIconColor="#FFFFFF" />
              <Divider />
              <ProviderRow
                provider="Google"
                leftIcon="logo-google"
                badgeBg="#FFFFFF"
                badgeBorderColor={stylesVars.border}
                badgeIconColor="#0F172A"
              />
              <Divider />
              <ProviderRow provider="Facebook" leftIcon="logo-facebook" badgeBg="#1877F2" badgeIconColor="#FFFFFF" />
              <Divider />
              <ProviderRow provider="Twitch" leftIcon="logo-twitch" badgeBg="#9146FF" badgeIconColor="#FFFFFF" />
            </View>
          </SectionCard>

          <SectionCard title="Email" description="Update your login email.">
            <ChevronRow iconName="mail" title="Update Email" subtitle="Change the email you use to sign in" />
          </SectionCard>

          <SectionCard title="Password" description="Update your password.">
            <ChevronRow iconName="key" title="Update Password" subtitle="Choose a strong password" />
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.pageBg,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  pageHeader: {
    marginBottom: 14,
  },
  backLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  backLinkPressed: {
    opacity: 0.85,
  },
  backLinkText: {
    color: stylesVars.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitleIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 34,
  },

  card: {
    backgroundColor: stylesVars.cardBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 10,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: stylesVars.text,
  },
  cardDescription: {
    fontSize: 13,
    color: stylesVars.mutedText,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
  },

  row: {
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: stylesVars.mutedBg,
    borderWidth: 1,
    borderColor: stylesVars.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
  },
  rowRightText: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: '700',
  },

  providersList: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  providerRow: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  providerBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '800',
    color: stylesVars.text,
  },
  providerStatus: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: stylesVars.mutedText,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  connectButtonPressed: {
    opacity: 0.9,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: stylesVars.text,
  },
});
