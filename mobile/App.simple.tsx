/**
 * Minimal Test App - Use this to verify the build works
 * Rename to App.tsx to test
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.text}>✅ MyLiveLinks Mobile</Text>
      <Text style={styles.subtitle}>Build is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    marginTop: 8,
  },
});





