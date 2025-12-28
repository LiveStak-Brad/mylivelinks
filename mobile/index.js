import { registerRootComponent } from 'expo';

require('react-native-url-polyfill/auto');
require('react-native-get-random-values');

console.log('[ENV_BOOT]', {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
});

const { TextDecoder, TextEncoder } = require('text-encoding');

if (global.TextEncoder == null) global.TextEncoder = TextEncoder;
if (global.TextDecoder == null) global.TextDecoder = TextDecoder;

const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);








