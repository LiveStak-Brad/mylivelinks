import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navTo(name: string, params?: any) {
  if (!navigationRef.isReady()) return;
  (navigationRef.navigate as any)(name, params);
}

export function navToTab(tabName: string) {
  navTo('Tabs', { screen: tabName });
}

