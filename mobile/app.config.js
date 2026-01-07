const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = appJson?.expo ?? config ?? {};

  const profile = process.env.EAS_BUILD_PROFILE || process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE || '';
  const isDevBuild = String(profile).toLowerCase() === 'development';

  const existingUpdates = typeof base.updates === 'object' && base.updates ? base.updates : undefined;

  return {
    ...base,
    updates: isDevBuild
      ? {
          ...(existingUpdates ?? {}),
          enabled: false,
        }
      : existingUpdates,
  };
};
