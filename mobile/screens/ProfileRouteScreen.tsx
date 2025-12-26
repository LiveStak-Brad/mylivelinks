import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';
import ProfileScreen from './ProfileScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileRouteScreen({ navigation }: Props) {
  return <ProfileScreen onBack={() => navigation.goBack()} />;
}
