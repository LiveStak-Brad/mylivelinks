/**
 * Expo App Config (Dynamic)
 * 
 * P0 CRITICAL: This file MUST always return ios.infoPlist.ITSAppUsesNonExemptEncryption.
 * If this field is missing or undefined, EAS build will crash with:
 *   "Cannot read properties of undefined (reading 'ITSAppUsesNonExemptEncryption')"
 * 
 * DO NOT remove or conditionally gate the ios.infoPlist block.
 * This ensures EAS builds are CI-safe with no interactive prompts.
 */

const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = appJson?.expo ?? config ?? {};

  const profile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE || '';
  const isDevBuild = String(profile).toLowerCase() === 'development';

  const existingUpdates = typeof base.updates === 'object' && base.updates ? base.updates : undefined;

  // P0: Ensure ios.infoPlist is ALWAYS defined with required encryption metadata.
  // This prevents EAS from crashing or prompting for encryption info.
  const iosConfig = {
    ...(base.ios ?? {}),
    infoPlist: {
      // P0: MUST be explicitly set to prevent EAS build crash.
      // false = app does not use non-exempt encryption (no US export compliance needed)
      ITSAppUsesNonExemptEncryption: false,
      // Merge any additional infoPlist fields from app.json
      ...(base.ios?.infoPlist ?? {}),
    },
  };

  return {
    ...base,
    ios: iosConfig,
    updates: isDevBuild
      ? {
          ...(existingUpdates ?? {}),
          enabled: false,
        }
      : existingUpdates,
  };
};
