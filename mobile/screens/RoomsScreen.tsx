import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { PageShell } from '../components/ui';
import type { MainTabsParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabsParamList, 'Rooms'>;

export function RoomsScreen(_props: Props) {
  return (
    <PageShell title="Rooms" contentStyle={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.title}>🎥 Rooms</Text>
          <Text style={styles.subtitle}>Live streaming rooms</Text>
          <Text style={styles.text}>
            Discover and join live streaming rooms. Watch live content, interact with hosts, and connect with other viewers.
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#c9c9c9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  text: {
    color: '#9aa0a6',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
});
