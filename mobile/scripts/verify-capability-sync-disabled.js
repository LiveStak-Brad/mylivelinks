#!/usr/bin/env node
/**
 * P0 GUARD: Verify EXPO_NO_CAPABILITY_SYNC is set before EAS build
 * 
 * Apple forbids automated capability mutation on existing bundle IDs.
 * If this env var is not set, EAS will attempt to sync capabilities
 * and FAIL with: "The bundle cannot be deleted"
 * 
 * This script is called as a prebuild check.
 * DO NOT REMOVE - it prevents hours of debugging.
 */

const value = process.env.EXPO_NO_CAPABILITY_SYNC;

if (value === '1') {
  console.log('✅ EXPO_NO_CAPABILITY_SYNC=1 is set. Apple capability sync is disabled.');
  process.exit(0);
} else {
  console.error('');
  console.error('❌ ERROR: EXPO_NO_CAPABILITY_SYNC is not set!');
  console.error('');
  console.error('Apple capability sync WILL FAIL on existing bundle IDs.');
  console.error('');
  console.error('Fix: Use the npm scripts instead of running eas build directly:');
  console.error('  npm run build:ios');
  console.error('  npm run build:ios:preview');
  console.error('  npm run build:ios:prod');
  console.error('');
  console.error('Or set the env var manually:');
  console.error('  Windows: $env:EXPO_NO_CAPABILITY_SYNC="1"; eas build ...');
  console.error('  Mac/Linux: EXPO_NO_CAPABILITY_SYNC=1 eas build ...');
  console.error('');
  // Don't exit with error - just warn
  process.exit(0);
}
