import React, { useState, useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import ProfileScreen from './ProfileScreen';
import { useAuthContext } from '../contexts/AuthContext';
import { useTopBarState } from '../hooks/topbar/useTopBarState';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileRoute'>;

export function ProfileRouteScreen({ navigation, route }: Props) {
  const { session } = useAuthContext();
  const topBar = useTopBarState();

  const [authToken, setAuthToken] = useState<string | undefined>();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Get username from route params or use a default
  const username = route.params?.username || 'demo';

  // Get the parent tab navigator
  const parentNav = navigation.getParent();

  useEffect(() => {
    const token = session?.access_token;
    const uid = session?.user?.id;
    setAuthToken(token);
    setCurrentUserId(uid);
  }, [session?.access_token, session?.user?.id]);

  const isOwnProfile = !!topBar.username && topBar.username === username;

  return (
    <ProfileScreen
      username={username}
      isOwnProfile={isOwnProfile}
      apiBaseUrl="https://mylivelinks.com"
      authToken={authToken}
      navigation={parentNav}
      onBack={() => navigation.goBack()}
      onEditProfile={() => {
        navigation.getParent?.()?.navigate?.('EditProfile');
      }}
      onMessage={(profileId) => {
        try {
          navigation.getParent?.()?.navigate?.('MainTabs', {
            screen: 'Messages',
            params: { openUserId: profileId },
          });
        } catch {
          // ignore
        }
      }}
      onStats={(username) => {
        navigation.getParent?.()?.navigate?.('MyAnalytics');
      }}
    />
  );
}
