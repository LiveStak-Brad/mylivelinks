'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/* =============================================================================
   TOAST COMPONENT & PROVIDER
   
   A notification system for showing transient messages.
   
   @example
   // Wrap your app with ToastProvider
   <ToastProvider>
     <App />
   </ToastProvider>
   
   // Use the toast hook
   const { toast } = useToast();
   toast({ title: 'Success!', variant: 'success' });
============================================================================= */

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: (data: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/* -----------------------------------------------------------------------------
   Toast Provider
----------------------------------------------------------------------------- */

interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
  /** Default duration in ms */
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);

  // SSR safety
  useState(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  });

  const toast = useCallback(
    (data: Omit<ToastData, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = data.duration ?? defaultDuration;

      setToasts((prev) => {
        const next = [...prev, { ...data, id }];
        return next.slice(-maxToasts);
      });

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    [defaultDuration, maxToasts]
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      {mounted &&
        createPortal(
          <ToastViewport toasts={toasts} onDismiss={dismiss} />,
          document.body
        )}
    </ToastContext.Provider>
  );
}

/* -----------------------------------------------------------------------------
   Toast Viewport - Container for all toasts
----------------------------------------------------------------------------- */

interface ToastViewportProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      style={{ zIndex: 'var(--z-toast, 1600)' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Toast Item - Individual toast notification
----------------------------------------------------------------------------- */

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icons = {
    default: null,
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-info" />,
  };

  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-card border-success/30',
    error: 'bg-card border-destructive/30',
    warning: 'bg-card border-warning/30',
    info: 'bg-card border-info/30',
  };

  const variant = toast.variant ?? 'default';

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto relative flex items-start gap-3 
        w-full p-4 rounded-xl border shadow-lg
        ${variantStyles[variant]}
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
    >
      {icons[variant] && <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export { ToastContext };







