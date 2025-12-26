import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import { Button, PageShell } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfilePlaceholderScreen({ navigation }: Props) {
  return (
    <PageShell
      title="Profile"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Placeholder (mobile profile UI coming soon)</Text>

        <Button title="Go to Wallet" onPress={() => navigation.navigate('Wallet')} />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '700',
  },
});
