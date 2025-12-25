'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
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

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div
        className={`
          relative w-full ${sizeStyles[size]} 
          bg-card border border-border rounded-xl shadow-lg
          animate-scale-in
          max-h-[90vh] overflow-hidden flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="space-y-1">
              {title && (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Modal parts for more flexible composition
function ModalHeader({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`px-6 py-4 border-b border-border ${className}`}>
      {children}
    </div>
  );
}

function ModalBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

function ModalFooter({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 ${className}`}>
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalBody, ModalFooter };

