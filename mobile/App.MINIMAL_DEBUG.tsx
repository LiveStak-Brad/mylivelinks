/**
 * MINIMAL DEBUG VERSION - traces every step
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Log to console (will show in Metro if it connects)
console.log('[APP] 1. App.tsx module loading...');

export default function App() {
  console.log('[APP] 2. App() function called');
  
  React.useEffect(() => {
    console.log('[APP] 3. useEffect() running');
  }, []);

  console.log('[APP] 4. Rendering JSX...');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ APP IS RUNNING</Text>
      <Text style={styles.subtext}>If you see this, JS loaded successfully</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    color: '#0f0',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    color: '#fff',
    fontSize: 16,
  },
});

console.log('[APP] 5. App.tsx module loaded successfully');
