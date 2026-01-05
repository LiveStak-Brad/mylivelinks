// CRITICAL: Set up global error handler FIRST (before any other imports)
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 GLOBAL ERROR CAUGHT:', {
      message: error?.message,
      stack: error?.stack,
      isFatal,
      name: error?.name,
    });
    // Still call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
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

if (global.__LIVEKIT_GLOBALS_REGISTERED__ !== true) {
  try {
    const { registerGlobals } = require('@livekit/react-native');
    registerGlobals();
    global.__LIVEKIT_GLOBALS_REGISTERED__ = true;
  } catch (error) {
    console.warn('[LIVEKIT] registerGlobals failed (non-blocking):', error);
    // Live features will be unavailable but app can still launch
    global.__LIVEKIT_GLOBALS_REGISTERED__ = false;
  }
}

// CRITICAL: Catch any errors during App import
let App;
try {
  App = require('./App').default;
  console.log('[INDEX] App.tsx loaded successfully');
} catch (error) {
  console.error('[INDEX] FATAL: Failed to load App.tsx:', error);
  // Create a minimal error screen
  const React = require('react');
  const { View, Text, ScrollView, StyleSheet } = require('react-native');
  
  App = () => React.createElement(View, { style: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' } },
    React.createElement(Text, { style: { color: '#f00', fontSize: 20, marginBottom: 10 } }, '❌ STARTUP ERROR'),
    React.createElement(Text, { style: { color: '#fff', fontSize: 14, marginBottom: 10 } }, 'Failed to load App.tsx:'),
    React.createElement(ScrollView, { style: { maxHeight: 400 } },
      React.createElement(Text, { style: { color: '#ff0', fontSize: 12, fontFamily: 'monospace' } }, 
        error?.message || String(error))
    )
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
