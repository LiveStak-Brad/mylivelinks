import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthContext } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import type { RootStackParamList } from '../types/navigation';
import { PageShell } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Gate'>;

type Target = keyof RootStackParamList;

export function GateScreen({ navigation }: Props) {
  const { session, loading: authLoading } = useAuthContext();
  const userId = session?.user?.id ?? null;
  const { loading: profileLoading, needsOnboarding, isComplete } = useProfile(userId);

  const lastTargetRef = React.useRef<Target | null>(null);

  React.useEffect(() => {
    if (authLoading) return;

    let target: Target;

    if (!session) {
      target = 'Auth';
    } else if (profileLoading) {
      return;
    } else if (needsOnboarding || !isComplete) {
      target = 'CreateProfile';
    } else {
      target = 'HomeDashboard';
    }

    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    navigation.reset({
      index: 0,
      routes: [{ name: target }],
    });
  }, [authLoading, isComplete, needsOnboarding, navigation, profileLoading, session]);

  return (
    <PageShell contentStyle={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5E9BFF" />
        <Text style={styles.text}>Loading…</Text>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: '#bdbdbd',
    fontSize: 14,
    fontWeight: '700',
  },
});
