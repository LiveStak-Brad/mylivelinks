import { registerRootComponent } from 'expo';

require('react-native-url-polyfill/auto');
require('react-native-get-random-values');

const __liveCrashFixNow = () => {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
};

if (global.__LIVE_CRASH_FIX_LOG_BUFFER__ == null) {
  global.__LIVE_CRASH_FIX_LOG_BUFFER__ = [];
}

const __liveCrashFixPushLog = (level, args) => {
  try {
    const buf = global.__LIVE_CRASH_FIX_LOG_BUFFER__;
    const entry = {
      ts: __liveCrashFixNow(),
      level,
      args: Array.isArray(args)
        ? args.map((a) => {
            try {
              if (a instanceof Error) return { name: a.name, message: a.message, stack: a.stack };
              if (typeof a === 'string') return a;
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
        : [],
    };
    buf.push(entry);
    if (buf.length > 200) buf.splice(0, buf.length - 200);
  } catch {
  }
};

if (global.__LIVE_CRASH_FIX_CONSOLE_PATCHED__ !== true) {
  global.__LIVE_CRASH_FIX_CONSOLE_PATCHED__ = true;
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  global.__LIVE_CRASH_FIX_ORIGINAL_CONSOLE__ = originalConsole;

  console.log = (...args) => {
    __liveCrashFixPushLog('log', args);
    return originalConsole.log(...args);
  };
  console.warn = (...args) => {
    __liveCrashFixPushLog('warn', args);
    return originalConsole.warn(...args);
  };
  console.error = (...args) => {
    __liveCrashFixPushLog('error', args);
    return originalConsole.error(...args);
  };
}

console.log('[LIVE_CRASH_FIX] boot_start', { ts: __liveCrashFixNow() });

try {
  const ErrorUtils = global.ErrorUtils;
  const originalHandler = ErrorUtils?.getGlobalHandler?.();
  if (ErrorUtils?.setGlobalHandler && global.__LIVE_CRASH_FIX_ERROR_HANDLER_SET__ !== true) {
    global.__LIVE_CRASH_FIX_ERROR_HANDLER_SET__ = true;
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      try {
        console.error('[LIVE_CRASH_FIX] global_error', {
          isFatal: !!isFatal,
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        });

        const buf = global.__LIVE_CRASH_FIX_LOG_BUFFER__ || [];
        const tail = buf.slice(Math.max(0, buf.length - 20));
        console.error('[LIVE_CRASH_FIX] last_js_logs', tail);
      } catch {
      }

      if (typeof originalHandler === 'function') {
        return originalHandler(error, isFatal);
      }
    });
  }
} catch {
}

try {
  const p = global.process;
  if (p?.on && global.__LIVE_CRASH_FIX_REJECTION_HANDLER_SET__ !== true) {
    global.__LIVE_CRASH_FIX_REJECTION_HANDLER_SET__ = true;
    p.on('unhandledRejection', (reason) => {
      console.error('[LIVE_CRASH_FIX] unhandled_rejection', reason);
    });
  }
} catch {
}

if (process.env.EXPO_PUBLIC_DEBUG_ENV_BOOT === '1') {
  console.log('[ENV_BOOT]', {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
  });
}

const { TextDecoder, TextEncoder } = require('text-encoding');

if (global.TextEncoder == null) global.TextEncoder = TextEncoder;
if (global.TextDecoder == null) global.TextDecoder = TextDecoder;

if (global.__LIVEKIT_GLOBALS_REGISTERED__ !== true) {
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
  global.__LIVEKIT_GLOBALS_REGISTERED__ = true;
}

console.log('[LIVE_CRASH_FIX] livekit_globals_registered', {
  registered: global.__LIVEKIT_GLOBALS_REGISTERED__ === true,
});

const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);










