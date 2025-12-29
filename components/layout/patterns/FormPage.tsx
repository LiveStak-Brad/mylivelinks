'use client';

/**
 * FormPage Pattern Template
 * 
 * Use for: Settings, create/edit forms, multi-step wizards
 * Examples: /settings/profile, /rooms/new, /apply
 * 
 * Features:
 * - Narrow max-width for readability
 * - Form sections with cards
 * - Sticky save button (optional)
 * - Validation feedback
 * - Loading state
 * - Cancel/discard flow
 */

import { ReactNode, FormEvent } from 'react';
import { PageShell, PageHeader, PageSection } from '../PageShell';
import { Button } from '@/components/ui';

export interface FormPageProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Back navigation */
  backLink?: string;
  backLabel?: string;
  /** Form sections */
  children: ReactNode;
  /** Form submission handler */
  onSubmit?: (e: FormEvent) => void | Promise<void>;
  /** Submit button text */
  submitLabel?: string;
  /** Cancel button text */
  cancelLabel?: string;
  /** Cancel action */
  onCancel?: () => void;
  /** Form is submitting */
  isSubmitting?: boolean;
  /** Disable submit button */
  submitDisabled?: boolean;
  /** Show sticky footer with actions */
  stickyFooter?: boolean;
  /** Additional footer content (left side) */
  footerLeft?: ReactNode;
  /** Success message */
  successMessage?: string;
  /** Error message */
  errorMessage?: string;
  /** Max width */
  maxWidth?: 'sm' | 'md';
  /** Show unsaved changes warning */
  hasUnsavedChanges?: boolean;
}

export function FormPage({
  title,
  description,
  backLink,
  backLabel,
  children,
  onSubmit,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  onCancel,
  isSubmitting = false,
  submitDisabled = false,
  stickyFooter = true,
  footerLeft,
  successMessage,
  errorMessage,
  maxWidth = 'md',
  hasUnsavedChanges = false,
}: FormPageProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <PageShell maxWidth={maxWidth} padding="md">
      <PageHeader
        title={title}
        description={description}
        backLink={backLink}
        backLabel={backLabel}
      />

      {/* Messages */}
      {successMessage && (
        <div 
          className="mb-6 p-4 rounded-xl bg-success/10 border border-success/30 text-success"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div 
          className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Form Content */}
        <div className="space-y-6">
          {children}
        </div>

        {/* Footer Actions */}
        <div 
          className={`
            mt-8 flex flex-col sm:flex-row items-center justify-between gap-4
            ${stickyFooter ? 'sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-t border-border' : ''}
          `}
        >
          <div>
            {footerLeft}
            {hasUnsavedChanges && !footerLeft && (
              <span className="text-sm text-muted-foreground">
                You have unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || submitDisabled}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </PageShell>
  );
}

/**
 * FormSection - A card-styled section within a form
 */
export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className = '',
}: FormSectionProps) {
  return (
    <PageSection card title={title} description={description} className={className}>
      <div className="space-y-4">
        {children}
      </div>
    </PageSection>
  );
}

/**
 * FormField - Consistent form field wrapper
 */
export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Required indicator */
  required?: boolean;
  /** Field content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

export function FormField({
  label,
  helperText,
  error,
  required,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export default FormPage;







