'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

/* =============================================================================
   COMPOSER MODAL COMPONENT
   
   Theme-aware modal with OPAQUE backgrounds (following Global UI Rule):
   - Light mode: solid white surface (bg-card = 0 0% 100%)
   - Dark mode: solid near-black surface (bg-card = 240 12% 9%)
   - Backdrop: translucent (bg-black/50)
   - Content surfaces: NEVER translucent
   
   Used for all Composer dialogs, popups, and sheets.
============================================================================= */

export interface ComposerModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Max width class */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show close button */
  showClose?: boolean;
  /** Custom className for modal content */
  className?: string;
}

export default function ComposerModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showClose = true,
  className = '',
}: ComposerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop - Translucent */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />
      
      {/* Modal Content - OPAQUE */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full ${maxWidthClasses[maxWidth]}
          animate-scale-in
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Card with OPAQUE background */}
        <Card className="bg-card shadow-2xl">
          <CardHeader className="relative">
            <CardTitle id="modal-title" className="text-xl pr-8">
              {title}
            </CardTitle>
            {showClose && (
              <button
                onClick={onClose}
                className="
                  absolute top-4 right-4 p-1.5 rounded-lg
                  text-muted-foreground hover:text-foreground
                  hover:bg-muted transition-colors
                "
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Example: Actor Search Modal
   
   This shows how to use ComposerModal for the "Add Actor" feature.
----------------------------------------------------------------------------- */

export function ActorSearchModal({
  isOpen,
  onClose,
  onSelectActor,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectActor: (actor: { id: string; username: string }) => void;
}) {
  const handleSelect = (actor: { id: string; username: string }) => {
    onSelectActor(actor);
    onClose();
  };

  return (
    <ComposerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Actor"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search users..."
          className="
            w-full px-4 py-2.5 rounded-lg
            bg-muted border border-border
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/50
          "
          autoFocus
        />

        {/* Results (placeholder) */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Search results will appear here
          </p>
        </div>
      </div>
    </ComposerModal>
  );
}

