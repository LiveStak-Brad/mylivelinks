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
// Mobile Owner Panel: Reports Parity (canonical commit)

import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { NavigationContainer, createNavigationContainerRef, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext';
import { SafeAppBoundary } from './components/SafeAppBoundary';
import { StartupDebugOverlay } from './components/StartupDebugOverlay';

import type { RootStackParamList } from './types/navigation';
import { setPendingReferralCode } from './lib/referrals';
import { initGlobalErrorHandlers, logStartupBreadcrumb } from './lib/startupTrace';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

initGlobalErrorHandlers();
logStartupBreadcrumb('APP_MODULE_LOADED');

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
    logStartupBreadcrumb('APP_NAVIGATION_MOUNT', { mode });
  }, [mode]);

  const dumpRouteNames = useCallback(() => {
    try {
      const state = navigationRef.getRootState();
      const routes = state?.routes?.map((r) => r.name) ?? [];
      console.log('[NAV] Root state routes:', routes);
    } catch (e) {
      console.warn('[NAV] Failed to dump root state routes:', e);
    }
  }, []);

  const handleReferralFromUrl = useCallback(async (url: string | null | undefined) => {
    if (!url) return;

    const ref = extractReferralCode(url);
    if (!ref) return;
    try {
      await setPendingReferralCode(ref);
    } catch (e) {
      console.warn('[referrals] Failed to store pending referral code:', e);
    }
  }, []);

  const linking = React.useMemo((): LinkingOptions<RootStackParamList> => {
    return {
      prefixes: ['mylivelinks://', 'https://www.mylivelinks.com', 'https://mylivelinks.com'],
      config: {
        screens: {
          SoloHostStream: 'live/host',
          SoloStreamViewer: 'live/:username',
        },
      },
      getInitialURL: async () => {
        // P0 FIX: Wrap Linking.getInitialURL with timeout to prevent iOS splash freeze
        // ROOT CAUSE: Linking.getInitialURL() can hang indefinitely on iOS if deep linking
        // is slow/unresponsive, blocking NavigationContainer.onReady and splash hide.
        // PREVENTION: Always use Promise.race with timeout for any async init in linking config.
        // DO NOT await any blocking operations here without a timeout guard.
        try {
          const urlPromise = Linking.getInitialURL();
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
          const url = await Promise.race([urlPromise, timeoutPromise]);
          
          // Fire-and-forget referral handling (non-blocking)
          if (url) {
            void handleReferralFromUrl(url);
          }
          return url;
        } catch (error) {
          console.warn('[LINKING] getInitialURL failed (non-blocking):', error);
          return null;
        }
      },
      subscribe: (listener) => {
        const onReceiveURL = (evt: any) => {
          const url = evt?.url;
          void handleReferralFromUrl(url);
          listener(url);
        };

        const sub = Linking.addEventListener('url', onReceiveURL);

        return () => {
          (sub as any)?.remove?.();
        };
      },
    };
  }, [handleReferralFromUrl]);

  const handleNavReady = useCallback(() => {
    logStartupBreadcrumb('NAV_READY');

    // P0: If iOS is stuck on the native splash, we need an explicit, logged hide call.
    // This is safe even if SplashScreen was not manually prevented from auto-hiding.
    logStartupBreadcrumb('SPLASH_HIDE_CALLED', {
      at: Date.now(),
      iso: new Date().toISOString(),
    });
    void SplashScreen.hideAsync()
      .then(() => {
        logStartupBreadcrumb('SPLASH_HIDE_OK', {
          at: Date.now(),
          iso: new Date().toISOString(),
        });
      })
      .catch((err: any) => {
        logStartupBreadcrumb('SPLASH_HIDE_FAIL', {
          at: Date.now(),
          iso: new Date().toISOString(),
          message: err?.message ?? String(err),
        });
      });

    dumpRouteNames();
  }, []);

  const handleNavStateChange = useCallback(() => {
    try {
      const current = navigationRef.getCurrentRoute();
      logStartupBreadcrumb('NAV_CURRENT_ROUTE', {
        name: current?.name ?? 'unknown',
      });
    } catch {
      // ignore
    }
    dumpRouteNames();
  }, [dumpRouteNames]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          linking={linking}
          onReady={handleNavReady}
          onStateChange={handleNavStateChange}
        >
          <Stack.Navigator initialRouteName="Gate" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Gate" getComponent={() => require('./screens/GateScreen').GateScreen} />
            <Stack.Screen name="Auth" getComponent={() => require('./screens/AuthScreen').AuthScreen} />
            <Stack.Screen name="CreateProfile" getComponent={() => require('./screens/CreateProfileScreen').CreateProfileScreen} />
            <Stack.Screen name="SafetyPolicies" getComponent={() => require('./screens/SafetyPoliciesScreen').SafetyPoliciesScreen} />
            <Stack.Screen name="PolicyDetail" getComponent={() => require('./screens/PolicyDetailScreen').PolicyDetailScreen} />
            <Stack.Screen name="Rooms" getComponent={() => require('./screens/LiveTVScreen').default} />
            <Stack.Screen name="MainTabs" getComponent={() => require('./navigation/MainTabs').default} />
            <Stack.Screen name="SoloStreamViewer" getComponent={() => require('./screens/SoloStreamViewerScreen').SoloStreamViewerScreen} />
            <Stack.Screen name="SoloHostStream" getComponent={() => require('./screens/SoloHostStreamScreen').default} />
            <Stack.Screen name="Wallet" getComponent={() => require('./screens/WalletScreen').WalletScreen} />
            <Stack.Screen name="Transactions" getComponent={() => require('./screens/TransactionsScreen').TransactionsScreen} />
            <Stack.Screen name="MyAnalytics" getComponent={() => require('./screens/MyAnalyticsScreen').MyAnalyticsScreen} />
            <Stack.Screen name="EditProfile" getComponent={() => require('./screens/EditProfileScreen').EditProfileScreen} />
            <Stack.Screen name="RoomRules" getComponent={() => require('./screens/RoomRulesScreen').RoomRulesScreen} />
            <Stack.Screen name="HelpFAQ" getComponent={() => require('./screens/HelpFAQScreen').HelpFAQScreen} />
            <Stack.Screen name="BlockedUsers" getComponent={() => require('./screens/BlockedUsersScreen').BlockedUsersScreen} />
            <Stack.Screen name="ReportUser" getComponent={() => require('./screens/ReportUserScreen').ReportUserScreen} />
            <Stack.Screen name="Theme" getComponent={() => require('./screens/ThemeScreen').ThemeScreen} />
            <Stack.Screen name="Referrals" getComponent={() => require('./screens/ReferralsScreen').ReferralsScreen} />
            <Stack.Screen name="ReferralsLeaderboard" getComponent={() => require('./screens/ReferralsLeaderboardScreen').ReferralsLeaderboardScreen} />
            <Stack.Screen name="OwnerPanel" getComponent={() => require('./screens/OwnerPanelScreen').OwnerPanelScreen} />
            <Stack.Screen name="OwnerReferrals" getComponent={() => require('./screens/OwnerReferralsScreen').OwnerReferralsScreen} />
            <Stack.Screen name="OwnerRevenue" getComponent={() => require('./screens/OwnerRevenueScreen').OwnerRevenueScreen} />
            <Stack.Screen name="OwnerCoinsRevenue" getComponent={() => require('./screens/OwnerCoinsRevenueScreen').OwnerCoinsRevenueScreen} />
            <Stack.Screen name="OwnerFeatureFlags" getComponent={() => require('./screens/OwnerFeatureFlagsScreen').OwnerFeatureFlagsScreen} />
            <Stack.Screen name="OwnerReports" getComponent={() => require('./screens/OwnerReportsScreen').OwnerReportsScreen} />
            <Stack.Screen name="LiveOps" getComponent={() => require('./screens/LiveOpsScreen').LiveOpsScreen} />
            <Stack.Screen name="ModerationPanel" getComponent={() => require('./screens/ModerationPanelScreen').ModerationPanelScreen} />
            <Stack.Screen name="AdminApplications" getComponent={() => require('./screens/AdminApplicationsScreen').AdminApplicationsScreen} />
            <Stack.Screen name="AdminGifts" getComponent={() => require('./screens/AdminGiftsScreen').AdminGiftsScreen} />
            <Stack.Screen name="AdminLinklerPrompt" getComponent={() => require('./screens/AdminLinklerPromptScreen').AdminLinklerPromptScreen} />
            <Stack.Screen name="ComposerList" getComponent={() => require('./screens/ComposerListScreen').ComposerListScreen} />
            <Stack.Screen name="ComposerEditor" getComponent={() => require('./screens/ComposerEditorScreen').ComposerEditorScreen} />
            <Stack.Screen name="ApplyForRoom" getComponent={() => require('./screens/ApplyForRoomScreen').ApplyForRoomScreen} />
            <Stack.Screen
              name="ProfileRoute"
              getComponent={() => require('./screens/ProfileRouteScreen').ProfileRouteScreen}
              options={{ presentation: 'card', animation: 'none' }}
            />
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
  useEffect(() => {
    logStartupBreadcrumb('APP_START');
  }, []);

  // P0 Failsafe: Hide splash after 3s even if navigation never becomes ready
  // Prevents permanent splash freeze on iOS if nav init hangs
  // Increased from 1.5s to 3s to allow auth bootstrap to complete
  useEffect(() => {
    console.log('[SPLASH] Failsafe timer armed (3000ms)');
    const t = setTimeout(() => {
      console.log('[SPLASH] ⏰ FAILSAFE TRIGGERED - forcing splash hide');
      logStartupBreadcrumb('SPLASH_FAILSAFE_TRIGGERED', { at: Date.now() });
      SplashScreen.hideAsync().catch((err) => {
        console.warn('[SPLASH] Failsafe hide failed:', err);
      });
    }, 3000);
    return () => {
      console.log('[SPLASH] Failsafe timer cleared');
      clearTimeout(t);
    };
  }, []);

  const showBundleMarker = (globalThis as any)?.__FORCE_STARTUP_OVERLAY__ === true;

  return (
    <SafeAppBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppNavigation />
          <StartupDebugOverlay />
          {showBundleMarker ? (
            <View pointerEvents="none" style={styles.bundleMarkerWrap}>
              <Text style={styles.bundleMarkerText}>BUNDLE_MARKER 2026-01-06_1728</Text>
            </View>
          ) : null}
        </SafeAreaProvider>
      </ThemeProvider>
    </SafeAppBoundary>
  );
}

const styles = StyleSheet.create({
  bundleMarkerWrap: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,0,0,0.65)',
  },
  bundleMarkerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
