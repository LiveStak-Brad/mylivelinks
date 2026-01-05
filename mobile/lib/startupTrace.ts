type PromiseRejectionEvent = {
  reason?: unknown;
};

export type StartupBreadcrumb = {
  id: number;
  event: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};

const MAX_BREADCRUMBS = 50;

let breadcrumbId = 0;
let breadcrumbs: StartupBreadcrumb[] = [];

type BreadcrumbSubscriber = (current: StartupBreadcrumb[]) => void;

const subscribers = new Set<BreadcrumbSubscriber>();

function emitUpdate() {
  const snapshot = [...breadcrumbs];
  subscribers.forEach((subscriber) => {
    try {
      subscriber(snapshot);
    } catch (err) {
      console.warn('[startup] subscriber failed', err);
    }
  });
}

export function subscribeToStartupBreadcrumbs(callback: BreadcrumbSubscriber) {
  subscribers.add(callback);
  callback([...breadcrumbs]);
  return () => {
    subscribers.delete(callback);
  };
}

export function getStartupBreadcrumbs() {
  return [...breadcrumbs];
}

function safeSerialize(payload?: Record<string, unknown>) {
  if (!payload) return '';
  try {
    return JSON.stringify(payload);
  } catch {
    return '[unserializable payload]';
  }
}

export function logStartupBreadcrumb(event: string, payload?: Record<string, unknown>) {
  try {
    const entry: StartupBreadcrumb = {
      id: ++breadcrumbId,
      event,
      timestamp: Date.now(),
      payload,
    };
    breadcrumbs = [...breadcrumbs, entry];
    if (breadcrumbs.length > MAX_BREADCRUMBS) {
      breadcrumbs = breadcrumbs.slice(-MAX_BREADCRUMBS);
    }
    const suffix = payload ? ` ${safeSerialize(payload)}` : '';
    const message = `[startup] ${event}${suffix}`;
    if (__DEV__) {
      console.info(message);
    } else {
      console.log(message);
    }
    emitUpdate();
  } catch (error) {
    console.warn('[startup] failed to log breadcrumb', error);
  }
}

let handlersInitialized = false;

export function initGlobalErrorHandlers() {
  if (handlersInitialized) return;
  handlersInitialized = true;

  const globalObj: any = globalThis as any;
  const errorUtils = globalObj?.ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.() ?? errorUtils?._globalHandler;

  if (typeof errorUtils?.setGlobalHandler === 'function') {
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      logStartupBreadcrumb('APP_FATAL_ERROR', {
        message: (error as any)?.message ?? 'Unknown error',
        isFatal: Boolean(isFatal),
      });
      console.error('[global-error-handler]', error);
      if (typeof previousHandler === 'function') {
        try {
          previousHandler(error, isFatal);
        } catch (prevErr) {
          console.error('[global-error-handler] previous handler failed', prevErr);
        }
      }
    });
  }

  const globalWindow: any = globalObj?.window;
  if (globalWindow) {
    const originalOnError = globalWindow.onerror;
    globalWindow.onerror = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      logStartupBreadcrumb('APP_WINDOW_ERROR', {
        message: String(message),
        source,
        line: lineno,
        column: colno,
      });
      if (typeof originalOnError === 'function') {
        return originalOnError(message, source, lineno ?? 0, colno ?? 0, error ?? undefined);
      }
      return false;
    };

    const originalOnUnhandledRejection = globalWindow.onunhandledrejection;
    globalWindow.onunhandledrejection = (event: PromiseRejectionEvent) => {
      logStartupBreadcrumb('APP_UNHANDLED_REJECTION', {
        reason: (event as PromiseRejectionEvent)?.reason ?? 'Unknown',
      });
      if (typeof originalOnUnhandledRejection === 'function') {
        return originalOnUnhandledRejection(event);
      }
      return undefined;
    };
  }
}
