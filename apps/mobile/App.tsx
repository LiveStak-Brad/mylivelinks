import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import TopBar from './components/TopBar';
import AppMenus from './components/AppMenus';
import { MenusProvider } from './state/MenusContext';
import { AuthProvider } from './state/AuthContext';
import { CurrentUserProvider } from './hooks/useCurrentUser';
import { CallProvider } from './state/CallContext';
import { ThemeProvider, useTheme } from './theme/useTheme';
import { brand } from './theme/colors';

enableScreens();

function AppWithTheme() {
  const { mode, colors } = useTheme();
  const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...baseTheme,
        dark: mode === 'dark',
        colors: {
          ...baseTheme.colors,
          primary: (brand as any).primary ?? brand.purple,
          background: colors.bg,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: (brand as any).primary ?? brand.pink,
        },
      }}
    >
      <RootNavigator header={() => <TopBar />} />
      <AppMenus />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrentUserProvider>
            <MenusProvider>
              <CallProvider>
                <AppWithTheme />
              </CallProvider>
            </MenusProvider>
          </CurrentUserProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
