/**
 * P0 Boot Status Tracking
 * 
 * Module-level boot state that works BEFORE React mounts.
 * This allows on-screen diagnostics even if React tree never renders.
 */

export type BootStep =
  | 'INDEX_LOADED'
  | 'APP_MODULE_LOADED'
  | 'THEME_PROVIDER_START'
  | 'THEME_PROVIDER_HYDRATED'
  | 'AUTH_PROVIDER_START'
  | 'AUTH_PROVIDER_READY'
  | 'NAV_CONTAINER_MOUNT'
  | 'NAV_READY'
  | 'SPLASH_HIDE_CALLED'
  | 'SPLASH_HIDE_OK'
  | 'SPLASH_FAILSAFE';

type BootState = {
  startTime: number;
  currentStep: BootStep | null;
  steps: Array<{ step: BootStep; timestamp: number; elapsed: number }>;
  lastError: string | null;
};

const state: BootState = {
  startTime: Date.now(),
  currentStep: null,
  steps: [],
  lastError: null,
};

type BootSubscriber = (state: BootState) => void;
const subscribers = new Set<BootSubscriber>();

function notifySubscribers() {
  const snapshot = getBootState();
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.warn('[boot] Subscriber failed:', err);
    }
  });
}

export function setBootStep(step: BootStep) {
  const now = Date.now();
  const elapsed = now - state.startTime;
  
  state.currentStep = step;
  state.steps.push({ step, timestamp: now, elapsed });
  
  // Keep only last 20 steps
  if (state.steps.length > 20) {
    state.steps = state.steps.slice(-20);
  }
  
  console.log(`[BOOT] ${step} (+${elapsed}ms)`);
  notifySubscribers();
}

export function setBootError(error: string) {
  state.lastError = error;
  console.error(`[BOOT ERROR] ${error}`);
  notifySubscribers();
}

export function getBootState(): BootState {
  return {
    startTime: state.startTime,
    currentStep: state.currentStep,
    steps: [...state.steps],
    lastError: state.lastError,
  };
}

export function subscribeToBootStatus(callback: BootSubscriber): () => void {
  subscribers.add(callback);
  // Immediately call with current state
  callback(getBootState());
  return () => {
    subscribers.delete(callback);
  };
}

export function getElapsedMs(): number {
  return Date.now() - state.startTime;
}
