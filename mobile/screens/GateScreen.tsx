import React, { useMemo } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthContext } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import type { RootStackParamList } from '../types/navigation';
import { BrandLogo } from '../components/ui/BrandLogo';
import { LegalFooter } from '../components/LegalFooter';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import { logStartupBreadcrumb } from '../lib/startupTrace';

type Props = NativeStackScreenProps<RootStackParamList, 'Gate'>;

type Target = keyof RootStackParamList;

export function GateScreen({ navigation }: Props) {
  const { session, loading: authLoading } = useAuthContext();
  const userId = session?.user?.id ?? null;
  const { loading: profileLoading, needsOnboarding, isComplete, error: profileError } = useProfile(userId);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const lastTargetRef = React.useRef<Target | null>(null);

  React.useEffect(() => {
    logStartupBreadcrumb('SCREEN_MOUNT_Gate');
  }, []);

  React.useEffect(() => {
    console.log(`[GATE][${new Date().toISOString()}] effect tick`, {
      authLoading,
      hasSession: !!session,
      userId: session?.user?.id,
      profileLoading,
      profileError,
      needsOnboarding,
      isComplete,
    });

    if (authLoading) return;

    // Authoritative rule (P0):
    // - No session -> Auth
    // - Session exists -> immediately route to MainTabs (Home)
    // - In parallel, once profile is loaded, redirect to CreateProfile if missing/incomplete
    // - If profile query fails, stay in MainTabs (do not block / do not black screen)
    let target: Target;

    if (!session) {
      target = 'Auth';
    } else {
      target = 'MainTabs';
    }

    if (session && !profileLoading && !profileError && (needsOnboarding || !isComplete)) {
      target = 'CreateProfile';
    }

    logStartupBreadcrumb('GATE_NAV_DECISION', {
      target,
      hasSession: !!session,
      profileLoading,
      profileError,
      needsOnboarding,
      isComplete,
    });

    console.log(`[GATE][${new Date().toISOString()}] nav decision`, {
      target,
      lastTarget: lastTargetRef.current,
    });

    console.log('[NAV] GateScreen resetting to target route:', target);

    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    navigation.reset({
      index: 0,
      routes: [{ name: target }],
    });
  }, [authLoading, isComplete, navigation, needsOnboarding, profileError, profileLoading, session]);

  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native requires require() for static assets
      source={require('../assets/splash.png')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
        <View style={styles.centerWrap}>
          <View style={styles.center}>
            <BrandLogo size={150} />
            <ActivityIndicator size="large" color="#8B5CF6" style={styles.spinner} />
            <Text style={styles.text}>Loading…</Text>
          </View>
        </View>

        <LegalFooter />
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
      padding: 20,
      backgroundColor: 'transparent',
    },
    centerWrap: {
      flex: 1,
      justifyContent: 'center',
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
