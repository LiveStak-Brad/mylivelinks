import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  getStartupBreadcrumbs,
  logStartupBreadcrumb,
  StartupBreadcrumb,
  subscribeToStartupBreadcrumbs,
} from '../lib/startupTrace';

export function StartupDebugOverlay() {
  const forced = (globalThis as any)?.__FORCE_STARTUP_OVERLAY__ === true;
  if (!__DEV__ && !forced) return null;

  const [crumbs, setCrumbs] = React.useState<StartupBreadcrumb[]>(() => getStartupBreadcrumbs());

  React.useEffect(() => {
    logStartupBreadcrumb('STARTUP_OVERLAY_MOUNTED');
    return subscribeToStartupBreadcrumbs(setCrumbs);
  }, []);

  const lastCrumbs = crumbs.slice(-6).reverse();

  return (
    <View pointerEvents="none" style={styles.container}>
      {lastCrumbs.map((crumb) => (
        <Text style={styles.line} key={crumb.id}>
          {crumb.event}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  line: {
    color: '#9BE7FF',
    fontSize: 10,
    lineHeight: 14,
  },
});
