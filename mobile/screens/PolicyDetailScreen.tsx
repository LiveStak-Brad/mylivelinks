import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { PageShell } from '../components/ui';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

import { getPolicyById } from '../../shared/policies';

type Props = NativeStackScreenProps<RootStackParamList, 'PolicyDetail'>;

export function PolicyDetailScreen({ navigation, route }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const policy = useMemo(() => getPolicyById(route.params.id), [route.params.id]);

  if (!policy) {
    return (
      <PageShell
        title="Policy"
        left={
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        }
      >
        <View style={styles.container}>
          <Text style={styles.title}>Policy not found</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={policy.title}
      left={
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{policy.title}</Text>
        <Text style={styles.meta}>Effective {policy.effectiveDate} · Last updated {policy.lastUpdated}</Text>

        <View style={styles.sections}>
          {policy.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
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
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 6,
    },
    meta: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 14,
    },
    sections: {
      gap: 14,
    },
    section: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    sectionHeading: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    sectionContent: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
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

