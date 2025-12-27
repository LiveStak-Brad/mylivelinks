/**
 * AuthScreenSimple - Auth screen without React Navigation
 * 
 * Uses callbacks instead of navigation props.
 * Auth state changes handled via AuthContext.
 */

import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Input, PageShell } from '../components/ui';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

export function AuthScreenSimple() {
  const { signIn, signUp } = useAuthContext();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const primaryCtaTitle = useMemo(
    () => (mode === 'signIn' ? 'Sign In' : 'Create Account'),
    [mode]
  );
  const secondaryCtaTitle = useMemo(
    () =>
      mode === 'signIn'
        ? 'Need an account? Sign Up'
        : 'Already have an account? Sign In',
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
      // Auth context will update session, triggering re-render to authenticated app
    } catch (e: any) {
      Alert.alert('Auth failed', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>MyLiveLinks</Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn' ? 'Sign in to continue' : 'Create your account'}
        </Text>

        {mode === 'signUp' && (
          <View style={styles.field}>
            <Input
              placeholder="Username (optional)"
              value={username}
              onChangeText={setUsername}
            />
          </View>
        )}

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
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      borderRadius: 16,
      backgroundColor: theme.mode === 'light' ? '#FFFFFF' : theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    title: {
      color: theme.colors.text,
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 6,
    },
    subtitle: {
      color: theme.colors.mutedText,
      fontSize: 14,
      marginBottom: 14,
    },
    field: {
      marginBottom: 12,
    },
    actions: {
      marginTop: 4,
      marginBottom: 12,
    },
  });
}

export default AuthScreenSimple;


