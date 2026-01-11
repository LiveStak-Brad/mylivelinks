const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = appJson?.expo ?? config ?? {};
  const existingUpdates = typeof base.updates === 'object' && base.updates ? base.updates : undefined;

  return {
    ...base,
    updates: {
      ...(existingUpdates ?? {}),
      // Disable OTA/Expo Updates in all builds so dev-client always
      // attaches directly to Metro instead of waiting for OTA.
      enabled: false,
      fallbackToCacheTimeout: 0,
    },
  };
};
