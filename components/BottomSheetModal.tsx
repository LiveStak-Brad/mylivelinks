'use client';

import { useEffect, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleIcon?: ReactNode;
  children: ReactNode;
  maxHeightVh?: number; // Default 50
  showCloseButton?: boolean;
  showGrabHandle?: boolean;
  /** Custom header content (replaces default title/close) */
  headerContent?: ReactNode;
  /** Custom footer content */
  footerContent?: ReactNode;
  /** Custom background gradient for header (mobile bottom sheet) */
  headerClassName?: string;
  /** Container className override */
  containerClassName?: string;
  /** z-index override (default 50) */
  zIndex?: number;
}

/**
 * BottomSheetModal - Unified modal component
 * 
 * On mobile: Renders as a bottom sheet (slides up from bottom, max-height ~50vh)
 * On desktop: Renders as a centered modal dialog
 * 
 * Features:
 * - Backdrop click to close
 * - ESC key to close
 * - Internal scroll region
 * - Safe area support for iOS
 * - Grab handle on mobile
 */
export default function BottomSheetModal({
  open,
  onClose,
  title,
  titleIcon,
  children,
  maxHeightVh = 50,
  showCloseButton = true,
  showGrabHandle = true,
  headerContent,
  footerContent,
  headerClassName,
  containerClassName,
  zIndex = 50,
}: BottomSheetModalProps) {
  const isMobileWeb = useIsMobileWeb();

  // ESC to close
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scroll on mobile when modal is open
    if (isMobileWeb) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isMobileWeb) {
        document.body.style.overflow = '';
      }
    };
  }, [open, onClose, isMobileWeb]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  // Mobile bottom sheet layout
  if (isMobileWeb) {
    return (
      <div 
        className="fixed inset-0 flex flex-col justify-end bg-black/40"
        style={{ zIndex }}
        onClick={handleBackdropClick}
      >
        <div 
          className={`
            bg-white dark:bg-gray-800 
            rounded-t-2xl rounded-b-none
            shadow-lg
            flex flex-col 
            overflow-hidden
            animate-slide-up
            ${containerClassName || ''}
          `}
          style={{
            maxHeight: `min(${maxHeightVh}vh, calc(100vh - env(safe-area-inset-top) - 120px))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grab Handle */}
          {showGrabHandle && (
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
          )}

          {/* Header */}
          {headerContent ? (
            <div className={`flex-shrink-0 ${headerClassName || ''}`}>
              {headerContent}
            </div>
          ) : (title || showCloseButton) ? (
            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${headerClassName || ''}`}>
              <div className="flex items-center gap-2">
                {titleIcon}
                {title && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>
          ) : null}

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className="flex-shrink-0">
              {footerContent}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0.5;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .animate-slide-up {
            animation: slide-up 0.25s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // Desktop centered modal layout
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          bg-white dark:bg-gray-800 
          rounded-2xl 
          shadow-xl
          max-w-md w-full 
          max-h-[80vh] 
          overflow-hidden 
          flex flex-col
          animate-in zoom-in-95 duration-200
          ${containerClassName || ''}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {headerContent ? (
          <div className={`flex-shrink-0 ${headerClassName || ''}`}>
            {headerContent}
          </div>
        ) : (title || showCloseButton) ? (
          <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${headerClassName || ''}`}>
            <div className="flex items-center gap-3">
              {titleIcon}
              {title && (
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h2>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        ) : null}

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}
