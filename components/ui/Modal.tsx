'use client';

import { ReactNode, useEffect, useState, CSSProperties } from 'react';
import { X } from 'lucide-react';

/**
 * Modal Size Reference (from tokens.css):
 * - sm:   24rem (384px)  - Confirmations, alerts
 * - md:   28rem (448px)  - Simple forms, default
 * - lg:   32rem (512px)  - Complex forms
 * - xl:   36rem (576px)  - Rich content
 * - 2xl:  42rem (672px)  - Multi-column
 * - full: 56rem (896px)  - Dashboards, large forms
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** 
   * Size on desktop. All modals go full-screen on mobile by default.
   * Uses CSS tokens for consistent sizing.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  /** Force full screen even on desktop */
  fullScreen?: boolean;
  /** Disable full screen on mobile */
  disableMobileFullScreen?: boolean;
  /** Custom className for the modal container */
  className?: string;
  /** Footer content - uses consistent padding */
  footer?: ReactNode;
}

// Maps to CSS tokens
const sizeTokenMap: Record<string, string> = {
  sm: 'var(--modal-sm)',
  md: 'var(--modal-md)',
  lg: 'var(--modal-lg)',
  xl: 'var(--modal-xl)',
  '2xl': 'var(--modal-2xl)',
  full: 'var(--modal-full)',
};

function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  fullScreen = false,
  disableMobileFullScreen = false,
  className = '',
  footer,
}: ModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine if modal should be full screen
  const shouldBeFullScreen = fullScreen || (isMobile && !disableMobileFullScreen);

  // Use CSS tokens for sizing
  const modalStyle: CSSProperties = shouldBeFullScreen 
    ? {} 
    : {
        maxWidth: sizeTokenMap[size],
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
      };

  // Consistent padding from tokens
  const headerPadding = shouldBeFullScreen 
    ? 'var(--modal-padding-mobile)' 
    : 'var(--modal-padding)';
  
  const contentPadding = shouldBeFullScreen 
    ? 'var(--modal-padding-mobile)' 
    : 'var(--modal-padding)';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${shouldBeFullScreen ? '' : 'p-4'}`}
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={onClose}
    >
      {/* Backdrop - hidden on full screen mobile */}
      {!shouldBeFullScreen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" 
          style={{ zIndex: 'var(--z-modal-backdrop)' }}
        />
      )}
      
      {/* Modal */}
      <div
        className={`
          ${shouldBeFullScreen 
            ? 'fixed inset-0 w-full h-full' 
            : 'relative w-full max-h-[90vh]'
          }
          bg-card border border-border
          ${shouldBeFullScreen ? '' : 'animate-scale-in'}
          overflow-hidden flex flex-col
          ${className}
        `}
        style={{
          ...modalStyle,
          zIndex: 'var(--z-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - consistent height and padding */}
        {(title || showCloseButton) && (
          <div 
            className={`
              flex items-start justify-between border-b border-border flex-shrink-0
              ${shouldBeFullScreen ? 'pwa-safe-top' : ''}
            `}
            style={{ 
              padding: headerPadding,
              minHeight: 'var(--modal-header-height)',
              gap: 'var(--space-4)',
            }}
          >
            <div className="min-w-0 flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {title && (
                <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="flex-shrink-0 rounded-lg hover:bg-muted transition-colors mobile-touch-target"
                style={{ 
                  padding: 'var(--space-2)',
                  margin: 'calc(-1 * var(--space-1))',
                }}
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        
        {/* Content - scrollable */}
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{ padding: contentPadding }}
        >
          {children}
        </div>

        {/* Footer - consistent spacing */}
        {footer && (
          <div 
            className={`
              flex items-center justify-end border-t border-border bg-muted/30 flex-shrink-0
              ${shouldBeFullScreen ? 'pwa-safe-bottom' : ''}
            `}
            style={{ 
              padding: headerPadding,
              gap: 'var(--space-3)',
              minHeight: 'var(--modal-footer-height)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Modal parts for more flexible composition - use consistent tokens
function ModalHeader({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div 
      className={`border-b border-border ${className}`}
      style={{ padding: 'var(--card-header-padding)' }}
    >
      {children}
    </div>
  );
}

function ModalBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div 
      className={className}
      style={{ padding: 'var(--modal-padding)' }}
    >
      {children}
    </div>
  );
}

function ModalFooter({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div 
      className={`flex items-center justify-end border-t border-border bg-muted/30 ${className}`}
      style={{ 
        padding: 'var(--card-footer-padding)',
        gap: 'var(--space-3)',
      }}
    >
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalBody, ModalFooter };
