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

    let mounted = true;
    const onUpdate = (next: StartupBreadcrumb[]) => {
      const apply = () => {
        if (mounted) setCrumbs(next);
      };
      // Defer to avoid state updates during another component's render (SceneView warning).
      if (typeof (globalThis as any).queueMicrotask === 'function') {
        (globalThis as any).queueMicrotask(apply);
      } else {
        setTimeout(apply, 0);
      }
    };

    const unsubscribe = subscribeToStartupBreadcrumbs(onUpdate);
    return () => {
      mounted = false;
      unsubscribe();
    };
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
