/**
 * Debug logging helper - only logs in development mode
 * In production, all calls are no-ops to avoid performance overhead
 */
export const dbg = (...args: any[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export const dbgWarn = (...args: any[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export const dbgError = (...args: any[]) => {
  // Errors always log even in production
  console.error(...args);
};
