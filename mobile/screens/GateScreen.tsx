import React, { useMemo } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthContext } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import type { RootStackParamList } from '../types/navigation';
import { BrandLogo } from '../components/ui/BrandLogo';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gate'>;

type Target = keyof RootStackParamList;

export function GateScreen({ navigation }: Props) {
  const { session, loading: authLoading } = useAuthContext();
  const userId = session?.user?.id ?? null;
  const { loading: profileLoading, needsOnboarding, isComplete } = useProfile(userId);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      target = 'MainTabs';
    }

    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    navigation.reset({
      index: 0,
      routes: [{ name: target }],
    });
  }, [authLoading, isComplete, needsOnboarding, navigation, profileLoading, session]);

  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native requires require() for static assets
      source={require('../assets/splash.png')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
        <View style={styles.center}>
          <BrandLogo size={150} />
          <ActivityIndicator size="large" color="#8B5CF6" style={styles.spinner} />
          <Text style={styles.text}>Loading…</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backgroundImageStyle: {
      opacity: theme.mode === 'light' ? 0.1 : 0.2,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'transparent',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    spinner: {
      marginTop: 8,
    },
    text: {
      color: theme.colors.mutedText,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
