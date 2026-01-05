import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { getStartupBreadcrumbs, logStartupBreadcrumb } from '../lib/startupTrace';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

// CRITICAL FIX: Use function declaration instead of class to avoid Babel classCallCheck issue
export function SafeAppBoundary({ children }: Props) {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // Set up global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    const customHandler = (err: Error, isFatal?: boolean) => {
      logStartupBreadcrumb('GLOBAL_ERROR', {
        message: err?.message ?? 'Unknown error',
        isFatal: !!isFatal,
      });
      console.error('[SafeAppBoundary] Global error caught:', err);
      setError(err);
      
      // Don't call original handler - we're handling it
    };

    ErrorUtils.setGlobalHandler(customHandler);

    return () => {
      ErrorUtils.setGlobalHandler(originalHandler);
    };
  }, []);

  const handleRetry = () => {
    logStartupBreadcrumb('APP_BOUNDARY_RETRY');
    setError(null);
  };

  if (error) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>Restart or capture logs before retrying.</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {__DEV__ && (
          <ScrollView style={styles.logBox}>
            {getStartupBreadcrumbs().slice(-15).map((crumb) => (
              <Text style={styles.logLine} key={crumb.id}>
                {new Date(crumb.timestamp).toISOString()} · {crumb.event}
                {crumb.payload ? ` ${JSON.stringify(crumb.payload)}` : ''}
              </Text>
            ))}
          </ScrollView>
        )}
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#050505',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#bbbbbb',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    color: '#ff6666',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  logBox: {
    width: '100%',
    maxHeight: 220,
    marginBottom: 16,
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
  },
  logLine: {
    color: '#d0ffaf',
    fontSize: 11,
    marginBottom: 4,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#ff3366',
  },
  retryLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
