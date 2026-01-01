import React, { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageShell } from '../components/ui';
import { LegalFooter } from '../components/LegalFooter';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

const WEB_BASE_URL = 'https://www.mylivelinks.com';

const POLICY_LINKS = [
  { id: 'terms-of-service', title: 'Terms of Service', path: '/policies/terms-of-service' },
  { id: 'privacy-policy', title: 'Privacy Policy', path: '/policies/privacy-policy' },
  { id: 'community-guidelines', title: 'Community Guidelines', path: '/policies/community-guidelines' },
  { id: 'payments-virtual-currency', title: 'Payments & Virtual Currency', path: '/policies/payments-virtual-currency' },
  { id: 'fraud-chargeback', title: 'Fraud & Chargeback', path: '/policies/fraud-chargeback' },
] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyPolicies'>;

export function SafetyPoliciesScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const openUrl = async (path: string) => {
    const url = `${WEB_BASE_URL}${path}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', url);
    }
  };

  return (
    <PageShell
      title="Safety & Policies"
      left={
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.subtitle}>Review our Terms, Privacy, and Community Guidelines.</Text>

          <View style={styles.list}>
            {POLICY_LINKS.map((policy) => (
              <Pressable
                key={policy.id}
                onPress={() => openUrl(policy.path)}
                style={styles.item}
              >
                <View style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{policy.title}</Text>
                  <Text style={styles.chevron} accessibilityLabel="Open">›</Text>
                </View>
              </Pressable>
            ))}

            <Pressable onPress={() => openUrl('/policies')} style={[styles.item, styles.itemSecondary]}>
              <View style={styles.itemRow}>
                <Text style={[styles.itemTitle, styles.itemTitleSecondary]}>All Policies (hub)</Text>
                <Text style={[styles.chevron, styles.chevronSecondary]} accessibilityLabel="Open">›</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Contact</Text>
            <Text style={styles.contactText}>Policy questions: brad@mylivelinks.com</Text>
          </View>
        </ScrollView>
      </View>

      <LegalFooter />
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    body: {
      flex: 1,
    },
    container: {
      padding: 16,
      paddingBottom: 28,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    backText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 12,
    },
    list: {
      gap: 10,
    },
    item: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 56,
      justifyContent: 'center',
    },
    itemSecondary: {
      backgroundColor: theme.colors.cardAlt,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      flex: 1,
    },
    itemTitleSecondary: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    chevron: {
      color: theme.colors.mutedText,
      fontSize: 22,
      fontWeight: '900',
      marginTop: -1,
    },
    chevronSecondary: {
      color: theme.colors.mutedText,
      opacity: 0.9,
    },
    itemSummary: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
    },
    itemMeta: {
      color: theme.colors.mutedText,
      fontSize: 11,
      fontWeight: '700',
    },
    contactBox: {
      marginTop: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 14,
      backgroundColor: theme.colors.card,
    },
    contactTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 6,
    },
    contactText: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}

