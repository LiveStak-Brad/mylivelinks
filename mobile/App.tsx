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

// Mobile Owner Panel Parity: Revenue + Feature Flags

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext';

import type { RootStackParamList } from './types/navigation';
import { GateScreen } from './screens/GateScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CreateProfileScreen } from './screens/CreateProfileScreen';
import { RoomsScreen } from './screens/RoomsScreen';
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
import { ReferralsScreen } from './screens/ReferralsScreen';
import { ReferralsLeaderboardScreen } from './screens/ReferralsLeaderboardScreen';
import { OwnerPanelScreen } from './screens/OwnerPanelScreen';
import { OwnerReferralsScreen } from './screens/OwnerReferralsScreen';
import { OwnerRevenueScreen } from './screens/OwnerRevenueScreen';
import { OwnerFeatureFlagsScreen } from './screens/OwnerFeatureFlagsScreen';
import { OwnerReportsScreen } from './screens/OwnerReportsScreen';
import { LiveOpsScreen } from './screens/LiveOpsScreen';
import { ModerationPanelScreen } from './screens/ModerationPanelScreen';
import { AdminApplicationsScreen } from './screens/AdminApplicationsScreen';
import { AdminGiftsScreen } from './screens/AdminGiftsScreen';
import { ComposerListScreen } from './screens/ComposerListScreen';
import { ComposerEditorScreen } from './screens/ComposerEditorScreen';
import { ApplyForRoomScreen } from './screens/ApplyForRoomScreen';
import { setPendingReferralCode } from './lib/referrals';

const Stack = createNativeStackNavigator<RootStackParamList>();

function extractReferralCode(url: string): string | null {
  const match = url.match(/[?&]ref=([^&#]+)/i);
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const cleaned = decoded.trim();
    return cleaned ? cleaned : null;
  } catch {
    const cleaned = match[1].trim();
    return cleaned ? cleaned : null;
  }
}

function AppNavigation() {
  const { navigationTheme, mode } = useThemeMode();

  useEffect(() => {
    const handleUrl = async (url: string | null | undefined) => {
      if (!url) return;
      const ref = extractReferralCode(url);
      if (!ref) return;
      try {
        await setPendingReferralCode(ref);
      } catch (e) {
        console.warn('[referrals] Failed to store pending referral code:', e);
      }
    };

    void Linking.getInitialURL().then(handleUrl);

    const sub = Linking.addEventListener('url', (evt: any) => {
      void handleUrl(evt?.url);
    });

    return () => {
      // RN compatibility: newer versions return subscription with remove()
      (sub as any)?.remove?.();
    };
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator initialRouteName="Gate" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Gate" component={GateScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
            <Stack.Screen name="Rooms" component={RoomsScreen} />
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
            <Stack.Screen name="Referrals" component={ReferralsScreen} />
            <Stack.Screen name="ReferralsLeaderboard" component={ReferralsLeaderboardScreen} />
            <Stack.Screen name="OwnerPanel" component={OwnerPanelScreen} />
            <Stack.Screen name="OwnerReferrals" component={OwnerReferralsScreen} />
            <Stack.Screen name="OwnerRevenue" component={OwnerRevenueScreen} />
            <Stack.Screen name="OwnerCoinsRevenue" component={OwnerRevenueScreen} />
            <Stack.Screen name="OwnerFeatureFlags" component={OwnerFeatureFlagsScreen} />
            <Stack.Screen name="OwnerReports" component={OwnerReportsScreen} />
            <Stack.Screen name="LiveOps" component={LiveOpsScreen} />
            <Stack.Screen name="ModerationPanel" component={ModerationPanelScreen} />
            <Stack.Screen name="AdminApplications" component={AdminApplicationsScreen} />
            <Stack.Screen name="AdminGifts" component={AdminGiftsScreen} />
            <Stack.Screen name="ComposerList" component={ComposerListScreen} />
            <Stack.Screen name="ComposerEditor" component={ComposerEditorScreen} />
            <Stack.Screen name="ApplyForRoom" component={ApplyForRoomScreen} />
            <Stack.Screen name="ProfileRoute" component={ProfileRouteScreen} options={{ presentation: 'card', animation: 'none' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </>
  );
}

/* =============================================================================
   MAIN APP EXPORT
============================================================================= */

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppNavigation />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
