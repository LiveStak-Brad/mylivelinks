import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>My Profile</Text>
    </SafeAreaView>
  );
}

