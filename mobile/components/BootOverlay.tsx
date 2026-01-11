/**
 * P0 Boot Status Overlay
 * 
 * Shows boot progression ON-SCREEN (not console) during dev.
 * Visible even if React tree fails to mount completely.
 * 
 * CRITICAL: This component must render with ZERO dependencies on app state/context.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBootState, subscribeToBootStatus, type BootStep } from '../lib/bootStatus';

const STEP_LABELS: Record<BootStep, string> = {
  INDEX_LOADED: '1️⃣ Index',
  APP_MODULE_LOADED: '2️⃣ App',
  THEME_PROVIDER_START: '3️⃣ Theme...',
  THEME_PROVIDER_HYDRATED: '✅ Theme',
  AUTH_PROVIDER_START: '4️⃣ Auth...',
  AUTH_PROVIDER_READY: '✅ Auth',
  NAV_CONTAINER_MOUNT: '5️⃣ Nav...',
  NAV_READY: '✅ Nav',
  SPLASH_HIDE_CALLED: '6️⃣ Splash...',
  SPLASH_HIDE_OK: '✅ Done',
  SPLASH_FAILSAFE: '⏰ Failsafe',
};

export function BootOverlay() {
  // Only show in dev or if forced
  const forced = (globalThis as any)?.__FORCE_STARTUP_OVERLAY__ === true;
  if (!__DEV__ && !forced) return null;

  const [bootState, setBootState] = useState(() => getBootState());

  useEffect(() => {
    return subscribeToBootStatus(setBootState);
  }, []);

  const { currentStep, steps, lastError, startTime } = bootState;
  const elapsed = Date.now() - startTime;

  // Show last 5 steps
  const recentSteps = steps.slice(-5);

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BOOT</Text>
        <Text style={styles.elapsed}>{elapsed}ms</Text>
      </View>

      {recentSteps.map((entry, idx) => {
        const label = STEP_LABELS[entry.step] || entry.step;
        const isLast = entry.step === currentStep;
        return (
          <Text key={`${entry.step}-${idx}`} style={[styles.step, isLast && styles.stepCurrent]}>
            {label} <Text style={styles.stepTime}>+{entry.elapsed}ms</Text>
          </Text>
        );
      })}

      {lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorLabel}>ERROR:</Text>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      )}

      {elapsed > 5000 && !currentStep?.includes('OK') && (
        <Text style={styles.warning}>⚠️ Slow boot</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 180,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  title: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  elapsed: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  step: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  stepCurrent: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  stepTime: {
    color: '#6B7280',
    fontSize: 9,
  },
  errorBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorLabel: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  warning: {
    color: '#F59E0B',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
});
