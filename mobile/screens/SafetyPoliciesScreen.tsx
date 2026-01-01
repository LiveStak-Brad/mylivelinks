import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageShell } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

import { getPoliciesForAudience } from '../../shared/policies';

type Props = NativeStackScreenProps<RootStackParamList, 'SafetyPolicies'>;

export function SafetyPoliciesScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const policies = useMemo(() => getPoliciesForAudience('mobile'), []);

  return (
    <PageShell
      title="Safety & Policies"
      left={
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>Read our policies any time. No login required.</Text>

        <View style={styles.list}>
          {policies.map((policy) => (
            <Pressable
              key={policy.id}
              onPress={() => navigation.navigate('PolicyDetail', { id: policy.id })}
              style={styles.item}
            >
              <Text style={styles.itemTitle}>{policy.title}</Text>
              {policy.summary ? <Text style={styles.itemSummary}>{policy.summary}</Text> : null}
              <Text style={styles.itemMeta}>Effective {policy.effectiveDate}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Contact</Text>
          <Text style={styles.contactText}>Policy questions: brad@mylivelinks.com</Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
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
      padding: 14,
      gap: 6,
    },
    itemTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
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

