import React, { useMemo, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Input } from '../components/ui';
import { BrandLogo } from '../components/ui/BrandLogo';
import { LegalFooter } from '../components/LegalFooter';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export function AuthScreen({ navigation }: Props) {
  const { signIn, signUp } = useAuthContext();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const primaryCtaTitle = useMemo(() => (mode === 'signIn' ? 'Sign In' : 'Create Account'), [mode]);
  const secondaryCtaTitle = useMemo(
    () => (mode === 'signIn' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'),
    [mode]
  );

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, username.trim() || undefined);
      }

      // Don't manually navigate - let GateScreen's useEffect detect the auth state change
      // This prevents race condition where Gate checks auth before session is set
    } catch (e: any) {
      Alert.alert('Auth failed', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native requires require() for static assets
      source={require('../assets/login.png')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <BrandLogo size={120} />
            </View>

            <Text style={styles.title}>{mode === 'signIn' ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>{mode === 'signIn' ? 'Sign in to continue' : 'Sign up to get started'}</Text>

          {mode === 'signUp' ? (
            <View style={styles.field}>
              <Input placeholder="Username (optional)" value={username} onChangeText={setUsername} />
            </View>
          ) : null}

          <View style={styles.field}>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <View style={styles.actions}>
            <Button title={primaryCtaTitle} onPress={submit} loading={submitting} />
          </View>

          <Button
            title={secondaryCtaTitle}
            variant="secondary"
            onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            disabled={submitting}
          />
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
      opacity: theme.mode === 'light' ? 0.08 : 0.3,
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      padding: 20,
    },
    cardWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      borderRadius: 16,
      backgroundColor: theme.mode === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      color: theme.colors.text,
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.mutedText,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    field: {
      marginBottom: 12,
    },
    actions: {
      marginTop: 4,
      marginBottom: 12,
    },
    linksRow: {
      marginTop: 10,
      gap: 10,
    },
  });
}
