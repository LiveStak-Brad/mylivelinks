import React from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useCurrentUser } from '../hooks/useCurrentUser';
import ProfileViewScreen from './ProfileViewScreen';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { userId, loading } = useCurrentUser();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.text} />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 16, color: colors.mutedText }}>Please sign in to view your profile</Text>
      </SafeAreaView>
    );
  }

  return <ProfileViewScreen routeParams={{ profileId: userId }} />;
}

