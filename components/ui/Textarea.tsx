'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';

/* =============================================================================
   TEXTAREA COMPONENT
   
   Multi-line text input with validation support.
   
   @example
   <Textarea placeholder="Write your message..." />
   <Textarea error errorMessage="This field is required" />
============================================================================= */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Show error styling */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Size variant */
  textareaSize?: 'sm' | 'md' | 'lg';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = '',
      error = false,
      errorMessage,
      textareaSize = 'md',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'min-h-[60px] text-sm px-3 py-2',
      md: 'min-h-[100px] text-sm px-3 py-2',
      lg: 'min-h-[140px] text-base px-4 py-3',
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={`
            flex w-full rounded-lg border bg-background 
            placeholder:text-muted-foreground 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
            disabled:cursor-not-allowed disabled:opacity-50 
            resize-none transition-colors duration-150
            ${sizeStyles[textareaSize]}
            ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
            ${className}
          `}
          aria-invalid={error}
          {...props}
        />
        {errorMessage && (
          <p className="mt-1.5 text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
