'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

/* =============================================================================
   INPUT COMPONENT
   
   Text input field with support for icons, error states, and sizes.
   
   @example
   <Input placeholder="Email address" type="email" />
   <Input error leftIcon={<Mail />} />
============================================================================= */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Show error styling */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Icon to show on the left */
  leftIcon?: ReactNode;
  /** Icon to show on the right */
  rightIcon?: ReactNode;
  /** Size variant */
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      error = false,
      errorMessage,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-8 text-sm px-3',
      md: 'h-10 text-sm px-3',
      lg: 'h-12 text-base px-4',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const paddingWithIcon = {
      sm: { left: 'pl-9', right: 'pr-9' },
      md: { left: 'pl-10', right: 'pr-10' },
      lg: { left: 'pl-11', right: 'pr-11' },
    };

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <span className={iconSizes[inputSize]}>{leftIcon}</span>
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          className={`
            flex w-full rounded-lg border bg-background py-2
            placeholder:text-muted-foreground 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
            disabled:cursor-not-allowed disabled:opacity-50
            transition-colors duration-150
            ${sizeStyles[inputSize]}
            ${leftIcon ? paddingWithIcon[inputSize].left : ''}
            ${rightIcon ? paddingWithIcon[inputSize].right : ''}
            ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
            ${className}
          `}
          aria-invalid={error}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <span className={iconSizes[inputSize]}>{rightIcon}</span>
          </div>
        )}
        
        {errorMessage && (
          <p className="mt-1.5 text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
