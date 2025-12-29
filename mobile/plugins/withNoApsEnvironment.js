const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withNoApsEnvironment(config) {
  return withEntitlementsPlist(config, (config) => {
    if (config.modResults && config.modResults['aps-environment']) {
      delete config.modResults['aps-environment'];
    }
    return config;
  });
};
