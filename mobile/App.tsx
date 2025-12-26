/**
 * Main App entry point for MyLiveLinks Mobile
 * 
 * React Navigation (native-stack):
 * Gate 0 Auth 0 CreateProfile 0 HomeDashboard 0 Wallet 0 Profile
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './contexts/AuthContext';

import type { RootStackParamList } from './types/navigation';
import { GateScreen } from './screens/GateScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CreateProfileScreen } from './screens/CreateProfileScreen';
import { HomeDashboardScreen } from './screens/HomeDashboardScreen';
import { WalletScreen } from './screens/WalletScreen';
import { ProfileRouteScreen } from './screens/ProfileRouteScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/* =============================================================================
   MAIN APP EXPORT
============================================================================= */

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Gate" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Gate" component={GateScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
            <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Profile" component={ProfileRouteScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
