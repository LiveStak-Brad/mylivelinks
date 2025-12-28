/**
 * HomeDashboardSimple - Home dashboard without React Navigation
 * 
 * Uses callbacks instead of navigation props.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, PageShell } from '../components/ui';

type HomeDashboardSimpleProps = {
  onEnterLive: () => void;
  onWallet: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

export function HomeDashboardSimple({
  onEnterLive,
  onWallet,
  onProfile,
  onLogout,
}: HomeDashboardSimpleProps) {
  return (
    <PageShell title="Home" contentStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MyLiveLinks</Text>
        <Text style={styles.subtitle}>Dashboard</Text>

        <Button title="Enter Live Room" onPress={onEnterLive} />
        <Button title="Profile" variant="secondary" onPress={onProfile} />
        <Button title="Wallet" variant="secondary" onPress={onWallet} />

        <View style={styles.spacer} />

        <Button
          title="Logout"
          variant="secondary"
          onPress={onLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        />
      </View>
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
  spacer: {
    height: 20,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutText: {
    color: '#ff6b6b',
  },
});

export default HomeDashboardSimple;




