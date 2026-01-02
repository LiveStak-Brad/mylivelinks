/**
 * TeamsTabScreen - Routing gate for Teams tab
 * 
 * This screen acts as the entry point for the Teams tab.
 * It checks the teams_onboarding_completed flag and routes accordingly:
 * - If false → TeamsSetup
 * - If true → TeamsHome
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TeamsSetupScreen } from './TeamsSetupScreen';
import { TeamsHomeScreen } from './TeamsHomeScreen';
import { getTeamsOnboardingCompleted } from '../lib/teamsOnboarding';
import { useThemeMode } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

export type TeamsStackParamList = {
  TeamsSetup: undefined;
  TeamsHome: undefined;
};

const TeamsStack = createNativeStackNavigator<TeamsStackParamList>();

type Props = { navigation: any };

export function TeamsTabScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const [initialRoute, setInitialRoute] = useState<keyof TeamsStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  // Check onboarding status on mount and when tab gains focus
  useFocusEffect(
    React.useCallback(() => {
      checkOnboardingStatus();
    }, [])
  );

  const checkOnboardingStatus = async () => {
    try {
      const completed = await getTeamsOnboardingCompleted();
      setInitialRoute(completed ? 'TeamsHome' : 'TeamsSetup');
    } catch (error) {
      console.warn('[TeamsTab] Failed to check onboarding status:', error);
      setInitialRoute('TeamsSetup');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !initialRoute) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <TeamsStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <TeamsStack.Screen name="TeamsSetup" component={TeamsSetupScreen} />
      <TeamsStack.Screen name="TeamsHome" component={TeamsHomeScreen} />
    </TeamsStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
