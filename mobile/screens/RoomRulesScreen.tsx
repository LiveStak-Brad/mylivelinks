import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomRules'>;

type Rule = {
  title: string;
  description: string;
  icon: string;
};

const RULES: Rule[] = [
  {
    icon: '🛡️',
    title: 'Be Respectful',
    description: 'Treat everyone with respect. Harassment, hate speech, and bullying are not tolerated.',
  },
  {
    icon: '🔞',
    title: 'Age Requirement',
    description: 'All users and streamers must be 18+ years old. No exceptions.',
  },
  {
    icon: '📷',
    title: 'Content Guidelines',
    description: 'Follow content guidelines for your room type. Adult content only in 18+ verified rooms.',
  },
  {
    icon: '💬',
    title: 'Chat Etiquette',
    description: 'No spam, excessive caps, or disruptive behavior in chat. Keep it positive!',
  },
  {
    icon: '❤️',
    title: 'Support Streamers',
    description: 'Tipping is appreciated but never required. Be generous when you can!',
  },
  {
    icon: '🚨',
    title: 'Report Issues',
    description: 'Report any violations using the Report button. Our moderators are here to help.',
  },
];

export function RoomRulesScreen({ navigation }: Props) {
  return (
    <PageShell
      title="Room Rules"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          To keep MyLiveLinks fun and safe for everyone, please follow these community guidelines:
        </Text>

        {RULES.map((r) => (
          <View key={r.title} style={styles.card}>
            <Text style={styles.cardTitle}>
              {r.icon} {r.title}
            </Text>
            <Text style={styles.cardBody}>{r.description}</Text>
          </View>
        ))}

        <View style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ Violations may result in: Chat mute, temporary timeout, or permanent ban from the platform.
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scroll: {
    paddingBottom: 24,
    gap: 12,
  },
  intro: {
    color: '#bdbdbd',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  cardBody: {
    color: '#bdbdbd',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 18,
  },
  warn: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderRadius: 14,
    padding: 12,
  },
  warnText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
});
