import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { MainTabsParamList } from '../types/navigation';
import ProfileScreen from './ProfileScreen';
import { useAuthContext } from '../contexts/AuthContext';
import { useTopBarState } from '../hooks/topbar/useTopBarState';
import { supabase } from '../lib/supabase';

type Props = BottomTabScreenProps<MainTabsParamList, 'Profile'>;

export function ProfileTabScreen({ navigation, route }: Props) {
  const { session } = useAuthContext();
  const topBar = useTopBarState();

  const [authToken, setAuthToken] = useState<string | undefined>();
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);

  // Get username from route params or use current user
  const routeUsername = route.params?.username;

  useEffect(() => {
    const token = session?.access_token;
    setAuthToken(token);
  }, [session?.access_token]);

  useEffect(() => {
    const next = routeUsername || topBar.username || null;
    setResolvedUsername(next);
  }, [routeUsername, topBar.username]);

  useEffect(() => {
    const loadOwnUsername = async () => {
      if (resolvedUsername) return;
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (data?.username) {
        setResolvedUsername(data.username);
      }
    };

    void loadOwnUsername();
  }, [resolvedUsername, session?.user?.id]);

  const isLoggedIn = !!session?.user?.id;
  const isOwnProfile = (!!topBar.username && !!resolvedUsername && topBar.username === resolvedUsername) || (!routeUsername && isLoggedIn);

  // Prevent rendering a broken ProfileScreen (which will show "Profile Not Found")
  // while the username is still resolving.
  if (isLoggedIn && !resolvedUsername) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading profile…</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Please log in to view your profile.</Text>
      </View>
    );
  }

  if (!resolvedUsername) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Profile unavailable.</Text>
      </View>
    );
  }

  return (
    <ProfileScreen
      username={resolvedUsername}
      isOwnProfile={isOwnProfile}
      apiBaseUrl="https://mylivelinks.com"
      authToken={authToken}
      navigation={navigation}
      onBack={() => navigation.navigate('Home')}
      onEditProfile={() => {
        navigation.getParent?.()?.navigate?.('EditProfile');
      }}
      onMessage={(profileId) => {
        navigation.navigate('Messages', { openUserId: profileId });
      }}
      onStats={(username) => {
        navigation.getParent?.()?.navigate?.('MyAnalytics');
      }}
    />
  );
}



