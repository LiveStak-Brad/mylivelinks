/**
 * Main App entry point for MyLiveLinks Mobile
 */

import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  TextInput,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

// Lazy-load LiveRoomScreen to defer LiveKit/WebRTC native init until user action
const LiveRoomScreen = lazy(() => import('./screens/LiveRoomScreen').then(m => ({ default: m.LiveRoomScreen })));

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error('[LiveRoomScreen] crashed:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Something went wrong.</Text>
          <Text style={{ color: '#aaa', fontSize: 14 }}>Please try again later.</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Keep the native splash visible while we run our tiny zoom animation
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('[SPLASH] preventAutoHide failed:', err);
});

export default function App() {
  console.log('[BOOT] App.tsx render');
  
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSplashDone, setIsSplashDone] = useState(false);

  // Simple zoom + fade splash animation
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('[BOOT] Splash animation start');
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.08,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete - mark done and show login
      console.log('[BOOT] Splash animation end');
      setIsSplashDone(true);
      setShowLogin(true);
    });
  }, [opacity, scale]);

  // Hide native splash AFTER state updates (safe, non-blocking)
  useEffect(() => {
    if (isSplashDone) {
      SplashScreen.hideAsync().catch((err) => {
        console.warn('[SPLASH] hideAsync failed:', err);
      });
    }
  }, [isSplashDone]);

  // While splash is animating, show the splash image on top
  const renderSplash = () => (
    <View style={styles.splashContainer}>
      <Animated.Image
        source={require('./assets/splash.png')}
        style={[
          styles.splashImage,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
        resizeMode="cover"
      />
    </View>
  );

  if (!showLiveRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {!isSplashDone && renderSplash()}
        {showLogin ? (
          <ImageBackground
            source={require('./assets/login.png')}
            style={styles.loginBg}
            resizeMode="cover"
          >
            <View style={styles.loginOverlay} />
            <View style={styles.loginCard}>
              <Image source={require('./assets/500_500transparent.png')} style={styles.loginLogo} />
              <Text style={styles.loginTitle}>Welcome</Text>
              <Text style={styles.loginSubtitle}>Sign in to continue</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9aa0a6"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9aa0a6"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => {
                  console.log('[NAV] User entering Live Room');
                  setShowLiveRoom(true);
                }}
              >
                <Text style={styles.loginButtonText}>Enter Live Room</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.splash}>
            <Text style={styles.title}>✅ MyLiveLinks Mobile</Text>
            <Text style={styles.subtitle}>Ready to Test</Text>
            <View style={styles.buttonContainer}>
              <Button 
                title="Enter Live Room" 
                onPress={() => {
                  console.log('[NAV] User entering Live Room');
                  setShowLiveRoom(true);
                }}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" hidden />
        <ErrorBoundary>
          <Suspense fallback={
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color="#5E9BFF" />
              <Text style={{ color: '#fff', marginTop: 16 }}>Loading Live Room...</Text>
            </View>
          }>
            <LiveRoomScreen enabled={true} />
          </Suspense>
        </ErrorBoundary>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  splashImage: {
    width: '110%',
    height: '110%',
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginBg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  loginCard: {
    width: '80%',
    maxWidth: 480,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loginTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  loginSubtitle: {
    color: '#ccc',
    fontSize: 15,
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loginButton: {
    backgroundColor: '#5E9BFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loginLogo: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: 12,
    resizeMode: 'contain',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 40,
  },
  buttonContainer: {
    marginTop: 20,
  },
});

