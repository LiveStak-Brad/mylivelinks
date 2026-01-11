import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import TopBar from './components/TopBar';
import AppMenus from './components/AppMenus';
import { MenusProvider } from './state/MenusContext';

enableScreens();

export default function App() {
  return (
    <SafeAreaProvider>
      <MenusProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator header={() => <TopBar />} />
          <AppMenus />
        </NavigationContainer>
      </MenusProvider>
    </SafeAreaProvider>
  );
}
