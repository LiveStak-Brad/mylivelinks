// P0 BOOT LOGGING: This MUST print if JS executes at all
console.log('[BOOT] ========================================');
console.log('[BOOT] index.js EXECUTING at', new Date().toISOString());
console.log('[BOOT] ========================================');

// P0: Track boot status at module level (before React)
const { setBootStep } = require('./lib/bootStatus');
setBootStep('INDEX_LOADED');

// CRITICAL: Set up global error handler FIRST (before any other imports)
if (typeof ErrorUtils !== 'undefined') {
  // Ensure all downstream error handlers know not to rethrow into RN's fatal abort path during boot.
  global.__DISABLE_RN_FATAL_ABORT__ = true;
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 GLOBAL ERROR CAUGHT:', {
      message: error?.message,
      stack: error?.stack,
      isFatal,
      name: error?.name,
    });
    global.__BOOT_FATAL_ERROR__ = error;
    // Avoid calling the original handler so React Native doesn't abort the process.
  });
}

// P0: Catch unhandled promise rejections during boot
if (typeof global !== 'undefined' && global.Promise) {
  const originalUnhandled = global.Promise.prototype.catch;
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('unhandledrejection', (event) => {
      console.error('🔴 UNHANDLED PROMISE REJECTION:', {
        reason: event?.reason?.message || event?.reason,
        stack: event?.reason?.stack,
      });
    });
  }
}

import { registerRootComponent } from 'expo';

// CRITICAL: Gesture handler MUST be imported first
import 'react-native-gesture-handler';
// CRITICAL: Import reanimated second (required for Reanimated 3.x)
import 'react-native-reanimated';

require('react-native-url-polyfill/auto');
require('react-native-get-random-values');

const envBootDebug =
  typeof process !== 'undefined' && process?.env ? process.env.EXPO_PUBLIC_DEBUG_ENV_BOOT === '1' : false;

const envStartupOverlay =
  typeof process !== 'undefined' && process?.env ? process.env.EXPO_PUBLIC_STARTUP_OVERLAY === '1' : false;

global.__FORCE_STARTUP_OVERLAY__ = envStartupOverlay;

if (envBootDebug) {
  console.log('[ENV_BOOT]', {
    EXPO_PUBLIC_API_URL: typeof process !== 'undefined' && process?.env ? process.env.EXPO_PUBLIC_API_URL : undefined,
    SUPABASE_URL:
      typeof process !== 'undefined' && process?.env && process.env.EXPO_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  });
}

const { TextDecoder, TextEncoder } = require('text-encoding');

if (global.TextEncoder == null) global.TextEncoder = TextEncoder;
if (global.TextDecoder == null) global.TextDecoder = TextDecoder;

// P0: LiveKit/WebRTC globals MUST NOT be initialized at app startup.
// Live screens call `ensureLivekitGlobals()` lazily if/when user enters live features.
if (global.__LIVEKIT_GLOBALS_REGISTERED__ == null) {
  global.__LIVEKIT_GLOBALS_REGISTERED__ = false;
}
console.log('[BOOT] LiveKit globals init: lazy (skipped at startup)');

// P0 FIX: Prevent splash screen from auto-hiding (Expo SDK 50 requirement)
// App.tsx will call hideAsync() when navigation is ready
const SplashScreen = require('expo-splash-screen');
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe if already prevented
});

// CRITICAL: Catch any errors during App import
let App;
try {
  App = require('./App').default;
  console.log('[INDEX] App.tsx loaded successfully');
} catch (error) {
  console.error('[INDEX] FATAL: Failed to load App.tsx:', error);
  global.__BOOT_FATAL_ERROR__ = error;
  // Create a minimal error screen
  const React = require('react');
  const { View, Text, ScrollView, StyleSheet } = require('react-native');
  
  App = () => React.createElement(View, { style: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' } },
    React.createElement(Text, { style: { color: '#f00', fontSize: 20, marginBottom: 10 } }, '❌ STARTUP ERROR'),
    React.createElement(Text, { style: { color: '#fff', fontSize: 14, marginBottom: 10 } }, 'Failed to load App.tsx:'),
    React.createElement(ScrollView, { style: { maxHeight: 400 } },
      React.createElement(Text, { style: { color: '#ff0', fontSize: 12, fontFamily: 'monospace' } }, 
        (error?.stack || error?.message || String(error)))
    )
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
