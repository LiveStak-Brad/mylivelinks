import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Modal, PageShell } from '../components/ui';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeDashboard'>;

export function HomeDashboardScreen({ navigation }: Props) {
  const { signOut } = useAuthContext();
  const [showLiveDisabled, setShowLiveDisabled] = React.useState(false);

  return (
    <PageShell title="Home" contentStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MyLiveLinks</Text>
        <Text style={styles.subtitle}>Dashboard</Text>

        <Button title="Live (Disabled)" variant="secondary" onPress={() => setShowLiveDisabled(true)} />
        <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
        <Button title="Wallet" onPress={() => navigation.navigate('Wallet')} />

        <Button
          title="Logout"
          variant="secondary"
          onPress={() => {
            void signOut().finally(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Gate' }],
              });
            });
          }}
        />
      </View>

      <Modal visible={showLiveDisabled} onRequestClose={() => setShowLiveDisabled(false)}>
        <Text style={styles.modalTitle}>Live is disabled</Text>
        <Text style={styles.modalText}>Live rooms are not available on mobile yet.</Text>
        <View style={styles.modalActions}>
          <Button title="Close" onPress={() => setShowLiveDisabled(false)} />
        </View>
      </Modal>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalText: {
    color: '#c9c9c9',
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    marginTop: 16,
  },
});
