/**
 * Main App entry point for MyLiveLinks Mobile
 * 
 * Navigation Architecture:
 * =======================
 * Root Stack (Authentication flow):
 *   Gate → Auth → CreateProfile → MainTabs → Other screens
 * 
 * MainTabs (Bottom Tab Navigator - matches WEB BottomNav):
 *   Home | Feed | Rooms | Messages | Noties
 * 
 * WEB PARITY:
 * This structure mirrors the web app's BottomNav component (/components/BottomNav.tsx)
 * with the same 5-tab layout, icons, labels, and routing behavior.
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
import { MainTabs } from './navigation/MainTabs';
import { WalletScreen } from './screens/WalletScreen';
import { ProfileRouteScreen } from './screens/ProfileRouteScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { MyAnalyticsScreen } from './screens/MyAnalyticsScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { RoomRulesScreen } from './screens/RoomRulesScreen';
import { HelpFAQScreen } from './screens/HelpFAQScreen';
import { BlockedUsersScreen } from './screens/BlockedUsersScreen';
import { ReportUserScreen } from './screens/ReportUserScreen';
import { ThemeScreen } from './screens/ThemeScreen';
import { OwnerPanelScreen } from './screens/OwnerPanelScreen';
import { ModerationPanelScreen } from './screens/ModerationPanelScreen';
import { AdminApplicationsScreen } from './screens/AdminApplicationsScreen';
import { AdminGiftsScreen } from './screens/AdminGiftsScreen';

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
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="MyAnalytics" component={MyAnalyticsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="RoomRules" component={RoomRulesScreen} />
            <Stack.Screen name="HelpFAQ" component={HelpFAQScreen} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <Stack.Screen name="ReportUser" component={ReportUserScreen} />
            <Stack.Screen name="Theme" component={ThemeScreen} />
            <Stack.Screen name="OwnerPanel" component={OwnerPanelScreen} />
            <Stack.Screen name="ModerationPanel" component={ModerationPanelScreen} />
            <Stack.Screen name="AdminApplications" component={AdminApplicationsScreen} />
            <Stack.Screen name="AdminGifts" component={AdminGiftsScreen} />
            <Stack.Screen name="ProfileRoute" component={ProfileRouteScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
