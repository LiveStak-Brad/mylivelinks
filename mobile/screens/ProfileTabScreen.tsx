import React, { useState, useEffect } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { MainTabsParamList } from '../types/navigation';
import ProfileScreen from './ProfileScreen';
import { useAuthContext } from '../contexts/AuthContext';
import { useTopBarState } from '../hooks/topbar/useTopBarState';

type Props = BottomTabScreenProps<MainTabsParamList, 'Profile'>;

export function ProfileTabScreen({ navigation, route }: Props) {
  const { session } = useAuthContext();
  const topBar = useTopBarState();

  const [authToken, setAuthToken] = useState<string | undefined>();

  // Get username from route params or use current user
  const username = route.params?.username || topBar.username || 'demo';

  useEffect(() => {
    const token = session?.access_token;
    setAuthToken(token);
  }, [session?.access_token]);

  const isOwnProfile = !!topBar.username && topBar.username === username;

  return (
    <ProfileScreen
      username={username}
      isOwnProfile={isOwnProfile}
      apiBaseUrl="https://mylivelinks.com"
      authToken={authToken}
      navigation={navigation}
      onBack={() => navigation.navigate('Home')}
      onEditProfile={() => {
        navigation.getParent?.()?.navigate?.('EditProfile');
      }}
      onMessage={(profileId) => {
        navigation.navigate('Messages');
      }}
      onStats={(username) => {
        navigation.getParent?.()?.navigate?.('MyAnalytics');
      }}
    />
  );
}

